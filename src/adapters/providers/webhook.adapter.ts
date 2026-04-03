import { Injectable, Logger } from '@nestjs/common';
import {
  AgentProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderCapabilities,
} from '../types';

/**
 * Webhook-based provider: forwards the prompt to an arbitrary HTTPS
 * endpoint controlled by the user.
 *
 * The "apiKey" is a JSON-encoded config:
 *   { "url": "https://...", "secret": "bearer-token" }
 *
 * The endpoint must respond with a JSON body matching WebhookResponseBody.
 */
interface WebhookConfig {
  url: string;
  secret: string;
  timeoutMs?: number;
}

interface WebhookResponseBody {
  content: string;
  finish_reason?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

@Injectable()
export class WebhookProvider implements AgentProvider {
  readonly providerId = 'webhook';
  readonly displayName = 'Custom Webhook';
  readonly capabilities: ProviderCapabilities = {
    streaming: false,
    toolCalling: true,
    jsonMode: false,
    vision: false,
  };

  private readonly logger = new Logger(WebhookProvider.name);

  private parseConfig(apiKey: string): WebhookConfig {
    try {
      const config = JSON.parse(apiKey) as WebhookConfig;
      if (!config.url || !config.secret) {
        throw new Error('Webhook config must include "url" and "secret"');
      }
      return config;
    } catch (err) {
      throw new Error(
        `Invalid webhook credential format: ${err instanceof Error ? err.message : 'parse error'}`,
      );
    }
  }

  async generate(apiKey: string, request: ProviderRequest): Promise<ProviderResponse> {
    const config = this.parseConfig(apiKey);

    this.logger.debug(
      `Webhook request: url=${config.url} model=${request.model} messages=${request.messages.length}`,
    );

    const payload = {
      model: request.model,
      system_prompt: request.systemPrompt,
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      tools: request.tools,
      stop_sequences: request.stopSequences,
    };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.timeoutMs ?? 120_000,
    );

    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.secret}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Webhook returned ${res.status}: ${body.slice(0, 200)}`);
      }

      const body = (await res.json()) as WebhookResponseBody;

      const promptTokens = body.usage?.prompt_tokens ?? 0;
      const completionTokens = body.usage?.completion_tokens ?? 0;

      return {
        content: body.content ?? '',
        finishReason: body.tool_calls?.length
          ? 'tool_calls'
          : (body.finish_reason as ProviderResponse['finishReason']) ?? 'stop',
        toolCalls: body.tool_calls,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
        },
        metadata: {
          model: request.model,
          provider: this.providerId,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async validateCredential(apiKey: string): Promise<boolean> {
    try {
      const config = this.parseConfig(apiKey);
      const res = await fetch(config.url, {
        method: 'HEAD',
        headers: { Authorization: `Bearer ${config.secret}` },
        signal: AbortSignal.timeout(10_000),
      });
      return res.ok || res.status === 405;
    } catch {
      return false;
    }
  }
}
