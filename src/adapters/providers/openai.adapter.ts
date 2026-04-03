import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  AgentProvider,
  ProviderRequest,
  ProviderResponse,
  ProviderCapabilities,
  ToolCall,
} from '../types';

@Injectable()
export class OpenAIProvider implements AgentProvider {
  readonly providerId = 'openai';
  readonly displayName = 'OpenAI';
  readonly capabilities: ProviderCapabilities = {
    streaming: true,
    toolCalling: true,
    jsonMode: true,
    vision: true,
  };

  private readonly logger = new Logger(OpenAIProvider.name);

  /**
   * Creates a short-lived client per call. Each call uses a
   * different tenant's API key, so we cannot share a singleton.
   */
  private createClient(apiKey: string): OpenAI {
    return new OpenAI({ apiKey, timeout: 120_000, maxRetries: 2 });
  }

  async generate(apiKey: string, request: ProviderRequest): Promise<ProviderResponse> {
    const client = this.createClient(apiKey);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages.map((m) => this.toOpenAIMessage(m)),
    ];

    const tools: OpenAI.Chat.ChatCompletionTool[] | undefined =
      request.tools?.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));

    this.logger.debug(
      `OpenAI request: model=${request.model} messages=${messages.length} tools=${tools?.length ?? 0}`,
    );

    const completion = await client.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      tools: tools?.length ? tools : undefined,
      stop: request.stopSequences,
      response_format:
        request.responseFormat === 'json'
          ? { type: 'json_object' }
          : undefined,
    });

    const choice = completion.choices[0];
    const toolCalls = this.extractToolCalls(choice);
    const finishReason = this.mapFinishReason(choice.finish_reason);

    return {
      content: choice.message.content ?? '',
      finishReason,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: completion.usage?.prompt_tokens ?? 0,
        completionTokens: completion.usage?.completion_tokens ?? 0,
        totalTokens: completion.usage?.total_tokens ?? 0,
      },
      metadata: {
        model: completion.model,
        provider: this.providerId,
      },
    };
  }

  async validateCredential(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  private toOpenAIMessage(
    m: ProviderRequest['messages'][number],
  ): OpenAI.Chat.ChatCompletionMessageParam {
    if (m.role === 'tool') {
      return {
        role: 'tool',
        content: m.content,
        tool_call_id: m.toolCallId!,
      };
    }

    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      };
    }

    return { role: m.role as 'user' | 'assistant' | 'system', content: m.content };
  }

  private extractToolCalls(
    choice: OpenAI.Chat.ChatCompletion.Choice,
  ): ToolCall[] {
    return (
      choice.message.tool_calls
        ?.filter((tc): tc is OpenAI.Chat.ChatCompletionMessageToolCall & { type: 'function' } =>
          tc.type === 'function',
        )
        .map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        })) ?? []
    );
  }

  private mapFinishReason(
    reason: string | null,
  ): ProviderResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'max_tokens';
      default:
        return 'stop';
    }
  }
}
