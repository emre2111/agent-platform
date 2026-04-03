import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { DatabaseService } from '../database/database.service';
import {
  MessagePayload,
  TurnStartedPayload,
  TurnErrorPayload,
  RoomStatusPayload,
} from './events';

/**
 * Single point of truth for publishing real-time events.
 *
 * All code that creates messages or changes room state calls
 * this service instead of the gateway directly. This guarantees:
 *
 *  1. Consistent payload shape (the gateway enforces typed events,
 *     but the publisher builds the payload from DB records)
 *  2. Sender name resolution happens once, here
 *  3. Future concerns like Redis pub/sub fan-out across multiple
 *     WS gateway instances get added in one place
 */
@Injectable()
export class RealtimePublisher {
  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Publish a new message event. Called after the message is
   * persisted in the database. The message ID is the
   * deduplication key — clients that receive a message with
   * an ID they already have should ignore it.
   */
  async publishMessage(message: {
    id: string;
    roomId: string;
    senderType: string;
    senderUserId: string | null;
    senderAgentId: string | null;
    turnNumber: number;
    content: string;
    tokenCount: number | null;
    createdAt: Date;
  }): Promise<void> {
    const senderName = await this.resolveSenderName(
      message.senderType,
      message.senderUserId,
      message.senderAgentId,
    );

    const payload: MessagePayload = {
      id: message.id,
      roomId: message.roomId,
      senderType: message.senderType as MessagePayload['senderType'],
      senderUserId: message.senderUserId,
      senderAgentId: message.senderAgentId,
      senderName,
      turnNumber: message.turnNumber,
      content: message.content,
      tokenCount: message.tokenCount,
      createdAt: message.createdAt.toISOString(),
    };

    this.gateway.emitMessage(message.roomId, payload);
  }

  publishTurnStarted(payload: TurnStartedPayload): void {
    this.gateway.emitTurnStarted(payload.roomId, payload);
  }

  publishTurnError(payload: TurnErrorPayload): void {
    this.gateway.emitTurnError(payload.roomId, payload);
  }

  publishRoomStatus(payload: RoomStatusPayload): void {
    this.gateway.emitRoomStatus(payload.roomId, payload);
  }

  private async resolveSenderName(
    senderType: string,
    userId: string | null,
    agentId: string | null,
  ): Promise<string> {
    if (senderType === 'SYSTEM') return 'System';

    if (senderType === 'USER' && userId) {
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      return user?.name ?? 'Unknown User';
    }

    if (senderType === 'AGENT' && agentId) {
      const agent = await this.db.agent.findUnique({
        where: { id: agentId },
        select: { name: true },
      });
      return agent?.name ?? 'Unknown Agent';
    }

    return 'Unknown';
  }
}
