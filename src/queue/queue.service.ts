import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';

export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export type JobHandler = (job: Job<JobPayload>) => Promise<void>;

/**
 * Manages BullMQ queues and workers.
 *
 * Design: one queue per active room. This gives us the critical
 * invariant of concurrency=1 per room (only one turn executes at
 * a time) while allowing hundreds of rooms to run in parallel
 * across the worker pool.
 *
 * Queues are created lazily on first enqueue and cleaned up when
 * a room closes.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue<JobPayload>>();
  private readonly workers = new Map<string, Worker<JobPayload>>();
  private readonly connection: ConnectionOptions;
  private jobHandler: JobHandler | null = null;

  constructor(config: ConfigService) {
    this.connection = {
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      password: config.get<string>('REDIS_PASSWORD') ?? undefined,
    };
  }

  /**
   * Called once by the orchestrator module to register the
   * function that processes all job types. This keeps the queue
   * layer ignorant of domain logic.
   */
  registerHandler(handler: JobHandler): void {
    this.jobHandler = handler;
  }

  async enqueue(
    queueName: string,
    payload: JobPayload,
    options?: { delayMs?: number },
  ): Promise<string> {
    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.add(payload.type, payload, {
      delay: options?.delayMs,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });
    this.logger.debug(
      `Enqueued ${queueName}/${payload.type} → job ${job.id}${options?.delayMs ? ` (delay ${options.delayMs}ms)` : ''}`,
    );
    return job.id!;
  }

  async drain(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.drain();
      this.logger.debug(`Drained queue ${queueName}`);
    }
  }

  async removeQueue(queueName: string): Promise<void> {
    const worker = this.workers.get(queueName);
    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
    }
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.obliterate({ force: true });
      await queue.close();
      this.queues.delete(queueName);
    }
    this.logger.debug(`Removed queue ${queueName}`);
  }

  async onModuleDestroy(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    for (const worker of this.workers.values()) {
      closePromises.push(worker.close());
    }
    for (const queue of this.queues.values()) {
      closePromises.push(queue.close());
    }
    await Promise.all(closePromises);
    this.logger.log('All queues and workers closed');
  }

  private getOrCreateQueue(queueName: string): Queue<JobPayload> {
    let queue = this.queues.get(queueName);
    if (queue) return queue;

    queue = new Queue<JobPayload>(queueName, { connection: this.connection });
    this.queues.set(queueName, queue);

    const worker = new Worker<JobPayload>(
      queueName,
      async (job) => {
        if (!this.jobHandler) {
          this.logger.warn(`No handler registered, dropping job ${job.id}`);
          return;
        }
        await this.jobHandler(job);
      },
      {
        connection: this.connection,
        concurrency: 1,
      },
    );

    worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} in ${queueName} failed (attempt ${job?.attemptsMade}): ${err.message}`,
      );
    });

    this.workers.set(queueName, worker);
    this.logger.debug(`Created queue + worker for ${queueName}`);
    return queue;
  }
}
