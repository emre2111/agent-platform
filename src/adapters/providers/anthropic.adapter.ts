import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  AgentProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderCapabilities,
  ToolCall,
  ConversationMessage,
} from '../types';

@Injectable()
export class AnthropicProvider implements AgentProvider {
  readonly providerId = 'anthropic';
  readonly displayName = 'Anthropic';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    jsonMode: false,
    vision: true,
  };

  private readonly logger = new Logger(AnthropicProvider.name);

  private createClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  }

  async generate(apiKey: string, request: ProviderRequest): Promise<ProviderResponse> {
    const client = this.createClient(apiKey);

    const messages = request.messages.map((m) => this.toAnthropicMessage(m));

    const tools: Anthropic.Messages.Tool[] | undefined =
      request.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Messages.Tool.InputSchema,
      }));

    this.logger.debug(
      `Anthropic request: model=${request.model} messages=${messages.length} tools=${tools?.length ?? 0}`,
    );

    const response = await client.messages.create({
      model: request.model,
      system: request.systemPrompt,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature,
      tools: tools?.length ? tools : undefined,
      stop_sequences: request.stopSequences,
    });

    const textContent = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    const toolCalls = this.extractToolCalls(response.content);
    const finishReason = this.mapStopReason(response.stop_reason);

    return {
      content: textContent,
      finishReason,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      metadata: {
        model: response.model,
        provider: this.providerId,
      },
    };
  }

  async validateCredential(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  private toAnthropicMessage(
    m: ConversationMessage,
  ): Anthropic.Messages.MessageParam {
    if (m.role === 'tool') {
      return {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: m.toolCallId!,
            content: m.content,
          },
        ],
      };
    }

    if (m.role === 'assistant' && m.toolCalls?.length) {
      const blocks: Anthropic.Messages.ContentBlockParam[] = [];
      if (m.content) {
        blocks.push({ type: 'text', text: m.content });
      }
      for (const tc of m.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.name,
          input: JSON.parse(tc.arguments),
        });
      }
      return { role: 'assistant', content: blocks };
    }

    const role: 'user' | 'assistant' =
      m.role === 'system' || m.role === 'user' ? 'user' : 'assistant';

    return { role, content: m.content };
  }

  private extractToolCalls(
    content: Anthropic.Messages.ContentBlock[],
  ): ToolCall[] {
    return content
      .filter(
        (block): block is Anthropic.Messages.ToolUseBlock =>
          block.type === 'tool_use',
      )
      .map((block) => ({
        id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input),
      }));
  }

  private mapStopReason(
    reason: string | null,
  ): ProviderResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'max_tokens';
      default:
        return 'stop';
    }
  }
}
