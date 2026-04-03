// ─── Conversation messages ─────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON Schema describing the function parameters */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  /** JSON-serialized arguments */
  arguments: string;
}

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  /** Identifies which tool produced this message (role = 'tool') */
  toolCallId?: string;
  /** Tool invocations requested by the model (role = 'assistant') */
  toolCalls?: ToolCall[];
}

// ─── Provider request / response ───────────────────────────────

export interface ProviderRequest {
  model: string;
  systemPrompt: string;
  messages: ConversationMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stopSequences?: string[];
  responseFormat?: 'text' | 'json';
}

export interface ProviderUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ProviderResponse {
  content: string;
  finishReason: 'stop' | 'tool_calls' | 'max_tokens' | 'error';
  toolCalls?: ToolCall[];
  usage: ProviderUsage;
  metadata: {
    model: string;
    provider: string;
  };
}

// ─── Streaming (future — types defined now, impl later) ────────

export type StreamEventType =
  | 'content_delta'
  | 'tool_call_delta'
  | 'usage'
  | 'done'
  | 'error';

export interface ProviderStreamEvent {
  type: StreamEventType;
  delta?: string;
  toolCall?: Partial<ToolCall>;
  usage?: ProviderUsage;
  error?: string;
}

// ─── Provider capabilities ─────────────────────────────────────

export interface ProviderCapabilities {
  streaming: boolean;
  toolCalling: boolean;
  jsonMode: boolean;
  vision: boolean;
}

// ─── The provider contract ─────────────────────────────────────
//
// apiKey is a SEPARATE argument — never embedded in the request
// object. This prevents accidental serialization or logging of
// credentials alongside prompt data.
//

export interface AgentProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  generate(apiKey: string, request: ProviderRequest): Promise<ProviderResponse>;

  /**
   * Validate that a credential works before persisting it.
   * Implementations should make a minimal API call (e.g. list models).
   */
  validateCredential(apiKey: string): Promise<boolean>;
}
