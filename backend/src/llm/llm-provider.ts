export type LlmChatRole = 'system' | 'user' | 'assistant';

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export type LlmCompletionContext = {
  stage: string;
  articleId?: string;
  hypothesisId?: string;
};

export type LlmCompletionRequest = {
  messages: LlmChatMessage[];
  temperature: number;
  jsonMode: boolean;
  context?: LlmCompletionContext;
};

export type LlmCompletionResult = {
  content: string;
  model: string;
};

export type LlmProvider = {
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
};

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
