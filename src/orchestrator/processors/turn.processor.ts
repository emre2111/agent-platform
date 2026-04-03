import { Injectable, Logger } from '@nestjs/common';
import { SenderType, ParticipantType } from '@prisma/client';
import { DatabaseService } from '../../database/database.service';
import { MessagesService } from '../../messages/messages.service';
import { AgentRunService } from '../agent-run.service';
import { AdapterRegistry } from '../../adapters/adapter-registry';
import { CredentialsService } from '../../credentials/credentials.service';
import { RoundRobinStrategy } from '../strategies/round-robin.strategy';
import { ConversationMessage, ProviderRequest } from '../../adapters/types';
import { TurnResult } from '../types';

/**
 * Executes exactly one agent turn:
 *   pick speaker → build prompt → call LLM → persist message
 *
 * Returns a typed TurnResult. Does NOT handle loop logic,
 * scheduling, or room state transitions — that is the
 * ConversationLoopProcessor's job.
 */
@Injectable()
export class TurnProcessor {
  private readonly logger = new Logger(TurnProcessor.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly messages: MessagesService,
    private readonly agentRuns: AgentRunService,
    private readonly adapters: AdapterRegistry,
    private readonly credentials: CredentialsService,
    private readonly turnStrategy: RoundRobinStrategy,
  ) {}

  async execute(
    roomId: string,
    turnNumber: number,
    workspaceId: string,
  ): Promise<TurnResult> {
    // ── 1. Pick the next speaker ────────────────────────────
    const participants = await this.db.conversationParticipant.findMany({
      where: {
        roomId,
        participantType: ParticipantType.AGENT,
        leftAt: null,
      },
      include: { agent: true },
      orderBy: { seatOrder: 'asc' },
    });

    const nextParticipant = this.turnStrategy.pick(participants, turnNumber);
    if (!nextParticipant?.agent) {
      return {
        ok: false,
        agentId: 'none',
        turnNumber,
        error: 'No eligible agent found for this turn',
        retriable: false,
      };
    }

    const agent = nextParticipant.agent;

    // ── 2. Create the run record (QUEUED) ───────────────────
    const run = await this.agentRuns.create(
      agent.id,
      roomId,
      turnNumber,
      agent.modelProvider,
      agent.modelName,
    );

    try {
      await this.agentRuns.markRunning(run.id);

      // ── 3. Decrypt credential (workspace-scoped) ──────────
      const apiKey = await this.credentials.decryptKey(
        agent.id,
        agent.modelProvider,
        workspaceId,
      );

      // ── 4. Build prompt from conversation history ─────────
      const history = await this.messages.getConversationContext(roomId, 50);

      const providerMessages: ConversationMessage[] = history.map((m) => ({
        role:
          m.senderType === SenderType.AGENT
            ? ('assistant' as const)
            : ('user' as const),
        content: m.content,
      }));

      const modelConfig = (agent.modelConfig ?? {}) as Record<string, unknown>;

      const request: ProviderRequest = {
        model: agent.modelName,
        systemPrompt: agent.systemPrompt,
        messages: providerMessages,
        temperature:
          typeof modelConfig.temperature === 'number'
            ? modelConfig.temperature
            : undefined,
        maxTokens:
          typeof modelConfig.maxTokens === 'number'
            ? modelConfig.maxTokens
            : undefined,
        stopSequences: Array.isArray(modelConfig.stopSequences)
          ? (modelConfig.stopSequences as string[])
          : undefined,
      };

      // ── 5. Call the LLM ───────────────────────────────────
      const provider = this.adapters.get(agent.modelProvider);
      const startMs = Date.now();
      const result = await provider.generate(apiKey, request);
      const latencyMs = Date.now() - startMs;

      // ── 6. Persist the message ────────────────────────────
      const message = await this.messages.create({
        roomId,
        senderType: SenderType.AGENT,
        senderAgentId: agent.id,
        turnNumber,
        content: result.content,
        tokenCount: result.usage.totalTokens,
        metadata: {
          model: result.metadata.model,
          provider: result.metadata.provider,
          finishReason: result.finishReason,
          latencyMs,
        },
      });

      // ── 7. Mark run completed ─────────────────────────────
      await this.agentRuns.markCompleted(
        run.id,
        {
          prompt: result.usage.promptTokens,
          completion: result.usage.completionTokens,
        },
        latencyMs,
      );

      return {
        ok: true,
        messageId: message.id,
        agentId: agent.id,
        turnNumber,
        usage: result.usage,
        latencyMs,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';

      this.logger.error(
        `Turn ${turnNumber} failed for agent ${agent.id}: ${errorMessage}`,
      );
      await this.agentRuns.markFailed(run.id, errorMessage);

      const retriable = this.isRetriable(err);

      return {
        ok: false,
        agentId: agent.id,
        turnNumber,
        error: errorMessage,
        retriable,
      };
    }
  }

  private isRetriable(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('503') ||
      msg.includes('529')
    );
  }
}
