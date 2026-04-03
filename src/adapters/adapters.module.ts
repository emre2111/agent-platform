import { Module } from '@nestjs/common';
import { AdapterRegistry } from './adapter-registry';
import { OpenAIProvider } from './providers/openai.adapter';
import { AnthropicProvider } from './providers/anthropic.adapter';
import { WebhookProvider } from './providers/webhook.adapter';

@Module({
  providers: [
    AdapterRegistry,
    OpenAIProvider,
    AnthropicProvider,
    WebhookProvider,
  ],
  exports: [AdapterRegistry],
})
export class AdaptersModule {}
