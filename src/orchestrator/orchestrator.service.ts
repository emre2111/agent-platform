import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import { ConversationLoopProcessor } from './conversation-loop.processor';
import { LoopJobData } from './types';

const ROOM_QUEUE_PREFIX = 'room-';

@Injectable()
export class OrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly queue: QueueService,
    private readonly loopProcessor: ConversationLoopProcessor,
  ) {}

  /**
   * Register the conversation loop handler with the queue service
   * once all dependencies are resolved.
   */
  onModuleInit() {
    this.queue.registerHandler((job) => this.loopProcessor.handleJob(job));
    this.logger.log('Conversation loop handler registered');
  }

  /**
   * Begin the conversation loop for a room.
   * Called when a user hits POST /rooms/:id/start.
   */
  async startRoom(roomId: string, workspaceId: string): Promise<string> {
    this.logger.log(`Starting conversation loop for room ${roomId}`);
    const queueName = `${ROOM_QUEUE_PREFIX}${roomId}`;

    const jobData: LoopJobData = {
      roomId,
      workspaceId,
      turnNumber: 1,
      triggeredBy: 'start',
    };

    return this.queue.enqueue(queueName, {
      type: 'loop.execute_turn',
      data: jobData as unknown as Record<string, unknown>,
    });
  }

  /**
   * Resume a paused room (e.g. after moderation approval).
   * Loads the current turnCount to know where to continue.
   */
  async resumeRoom(
    roomId: string,
    workspaceId: string,
    currentTurnCount: number,
  ): Promise<string> {
    this.logger.log(`Resuming room ${roomId} at turn ${currentTurnCount + 1}`);
    const queueName = `${ROOM_QUEUE_PREFIX}${roomId}`;

    const jobData: LoopJobData = {
      roomId,
      workspaceId,
      turnNumber: currentTurnCount + 1,
      triggeredBy: 'resume',
    };

    return this.queue.enqueue(queueName, {
      type: 'loop.execute_turn',
      data: jobData as unknown as Record<string, unknown>,
    });
  }

  /**
   * Drain all pending jobs for a room. Called when a user
   * pauses or stops a room. The loop processor will see the
   * updated room status and stop naturally.
   */
  async drainRoom(roomId: string): Promise<void> {
    const queueName = `${ROOM_QUEUE_PREFIX}${roomId}`;
    await this.queue.drain(queueName);
    this.logger.log(`Drained queue for room ${roomId}`);
  }

  /**
   * Fully remove a room's queue and worker. Called after a room
   * is closed to free resources.
   */
  async cleanupRoom(roomId: string): Promise<void> {
    const queueName = `${ROOM_QUEUE_PREFIX}${roomId}`;
    await this.queue.removeQueue(queueName);
  }
}
