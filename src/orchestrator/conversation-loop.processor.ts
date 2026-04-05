import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RoomStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { RealtimePublisher } from '../realtime/realtime.publisher';
import { TurnProcessor } from './processors/turn.processor';
import { LoopJobData, RoomSnapshot, StopReason } from './types';
import {
  evaluateStopConditions,
  shouldAwaitModeration,
  stopReasonMessage,
} from './stop-conditions';

const ROOM_QUEUE_PREFIX = 'room-';

@Injectable()
export class ConversationLoopProcessor {
  private readonly logger = new Logger(ConversationLoopProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly queue: QueueService,
    private readonly turnProcessor: TurnProcessor,
    private readonly publisher: RealtimePublisher,
  ) {}

  async handleJob(job: Job<JobPayload>): Promise<void> {
    const { type, data } = job.data;

    switch (type) {
      case 'loop.execute_turn':
        await this.executeTurnCycle(data as unknown as LoopJobData);
        break;
      default:
        this.logger.warn(`Unknown job type: ${type}`);
    }
  }

  private async executeTurnCycle(jobData: LoopJobData): Promise<void> {
    const { roomId, workspaceId, turnNumber } = jobData;
    const queueName = `${ROOM_QUEUE_PREFIX}${roomId}`;

    const room = await this.loadRoomSnapshot(roomId, workspaceId);
    if (!room) {
      this.logger.warn(`Room ${roomId} not found, dropping job`);
      return;
    }

    const activeAgentCount = await this.db.conversationParticipant.count({
      where: {
        roomId,
        participantType: 'AGENT',
        leftAt: null,
        agent: { status: 'ACTIVE' },
      },
    });

    const stopReason = evaluateStopConditions(room, activeAgentCount);
    if (stopReason) {
      await this.closeRoom(room, stopReason);
      return;
    }

    this.publisher.publishTurnStarted({
      roomId,
      turnNumber,
      agentId: '',
      agentName: '',
    });

    const result = await this.turnProcessor.execute(roomId, turnNumber, workspaceId);

    if (result.ok) {
      await this.db.conversationRoom.updateMany({
        where: { id: roomId, workspaceId },
        data: {
          turnCount: { increment: 1 },
          consecutiveFailures: 0,
        },
      });
    } else {
      await this.db.conversationRoom.updateMany({
        where: { id: roomId, workspaceId },
        data: {
          consecutiveFailures: { increment: 1 },
        },
      });

      this.publisher.publishTurnError({
        roomId,
        turnNumber,
        agentId: result.agentId,
        error: result.error,
      });

      if (room.consecutiveFailures + 1 >= room.maxConsecutiveFailures) {
        await this.closeRoom(room, StopReason.CIRCUIT_BREAKER);
        return;
      }
    }

    if (shouldAwaitModeration(room)) {
      await this.db.conversationRoom.updateMany({
        where: { id: roomId, workspaceId },
        data: { status: RoomStatus.PAUSED },
      });
      this.publisher.publishRoomStatus({
        roomId,
        status: 'PAUSED',
        reason: StopReason.AWAITING_MODERATION,
      });
      this.logger.log(`Room ${roomId} paused for moderation after turn ${turnNumber}`);
      return;
    }

    const nextTurn = turnNumber + 1;

    if (room.maxTurns !== null && nextTurn > room.maxTurns) {
      await this.closeRoom(room, StopReason.MAX_TURNS_REACHED);
      return;
    }

    await this.queue.enqueue(
      queueName,
      {
        type: 'loop.execute_turn',
        data: {
          roomId,
          workspaceId,
          turnNumber: nextTurn,
          triggeredBy: 'next_turn',
        } as unknown as Record<string, unknown>,
      },
      { delayMs: room.turnDelayMs },
    );

    this.logger.debug(
      `Scheduled turn ${nextTurn} for room ${roomId} (delay ${room.turnDelayMs}ms)`,
    );
  }

  private async loadRoomSnapshot(
    roomId: string,
    workspaceId: string,
  ): Promise<RoomSnapshot | null> {
    return this.db.conversationRoom.findFirst({
      where: { id: roomId, workspaceId },
      select: {
        id: true,
        workspaceId: true,
        createdById: true,
        status: true,
        turnPolicy: true,
        turnCount: true,
        maxTurns: true,
        consecutiveFailures: true,
        maxConsecutiveFailures: true,
        turnDelayMs: true,
        absoluteDeadline: true,
      },
    });
  }

  private async closeRoom(room: RoomSnapshot, reason: StopReason): Promise<void> {
    const message = stopReasonMessage(reason);

    await this.db.conversationRoom.updateMany({
      where: { id: room.id, workspaceId: room.workspaceId },
      data: {
        status: RoomStatus.CLOSED,
        closedAt: new Date(),
        closedReason: reason,
      },
    });

    const queueName = `${ROOM_QUEUE_PREFIX}${room.id}`;
    await this.queue.drain(queueName).catch(() => {});

    this.publisher.publishRoomStatus({
      roomId: room.id,
      status: 'CLOSED',
      reason: message,
    });

    this.logger.log(`Room ${room.id} closed: ${message}`);
  }
}
