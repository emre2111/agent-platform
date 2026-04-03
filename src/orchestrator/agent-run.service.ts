import { Injectable } from '@nestjs/common';
import { RunStatus } from '@prisma/client';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AgentRunService {
  constructor(private readonly db: DatabaseService) {}

  async create(agentId: string, roomId: string, turnNumber: number, provider: string, model: string) {
    return this.db.agentRun.create({
      data: {
        agentId,
        roomId,
        turnNumber,
        modelProvider: provider,
        modelName: model,
        status: RunStatus.QUEUED,
      },
    });
  }

  async markRunning(runId: string) {
    return this.db.agentRun.update({
      where: { id: runId },
      data: { status: RunStatus.RUNNING, startedAt: new Date() },
    });
  }

  async markCompleted(runId: string, tokens: { prompt: number; completion: number }, latencyMs: number) {
    return this.db.agentRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.COMPLETED,
        completedAt: new Date(),
        promptTokens: tokens.prompt,
        completionTokens: tokens.completion,
        totalTokens: tokens.prompt + tokens.completion,
        latencyMs,
      },
    });
  }

  async markFailed(runId: string, errorMessage: string) {
    return this.db.agentRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.FAILED,
        completedAt: new Date(),
        errorMessage,
      },
    });
  }

  async listByRoom(roomId: string) {
    return this.db.agentRun.findMany({
      where: { roomId },
      orderBy: { turnNumber: 'asc' },
    });
  }
}
