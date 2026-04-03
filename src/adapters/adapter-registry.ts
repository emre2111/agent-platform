import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { AgentProvider, ProviderCapabilities } from './types';
import { OpenAIProvider } from './providers/openai.adapter';
import { AnthropicProvider } from './providers/anthropic.adapter';
import { WebhookProvider } from './providers/webhook.adapter';

export interface ProviderInfo {
  providerId: string;
  displayName: string;
  capabilities: ProviderCapabilities;
}

/**
 * Central registry and factory for all model providers.
 *
 * Consumers never instantiate providers directly — they call
 * `registry.get(providerId)` and receive a provider that
 * implements the AgentProvider interface.
 */
@Injectable()
export class AdapterRegistry implements OnModuleInit {
  private readonly providers = new Map<string, AgentProvider>();
  private readonly logger = new Logger(AdapterRegistry.name);

  constructor(
    private readonly openai: OpenAIProvider,
    private readonly anthropic: AnthropicProvider,
    private readonly webhook: WebhookProvider,
  ) {}

  onModuleInit() {
    this.register(this.openai);
    this.register(this.anthropic);
    this.register(this.webhook);

    this.logger.log(
      `Registered ${this.providers.size} providers: ${this.listProviderIds().join(', ')}`,
    );
  }

  register(provider: AgentProvider): void {
    if (this.providers.has(provider.providerId)) {
      this.logger.warn(`Overwriting existing provider: ${provider.providerId}`);
    }
    this.providers.set(provider.providerId, provider);
  }

  get(providerId: string): AgentProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new NotFoundException(
        `Unknown provider "${providerId}". Available: ${this.listProviderIds().join(', ')}`,
      );
    }
    return provider;
  }

  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  listProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  listProviders(): ProviderInfo[] {
    return Array.from(this.providers.values()).map((p) => ({
      providerId: p.providerId,
      displayName: p.displayName,
      capabilities: p.capabilities,
    }));
  }
}
