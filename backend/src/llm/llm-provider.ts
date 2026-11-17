export type LlmChatRole = 'system' | 'user' | 'assistant';

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export type LlmCompletionRequest = {
  messages: LlmChatMessage[];
  temperature: number;
  jsonMode: boolean;
};

export type LlmCompletionResult = {
  content: string;
  model: string;
};

export type LlmProvider = {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
};

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
