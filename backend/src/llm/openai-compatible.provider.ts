import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { FailureFileLogger } from '../common/logging/failure-file.logger';
import { classifyLlmError } from '../common/logging/llm-error.util';
import {
  LlmCompletionRequest,
  LlmCompletionResult,
  LlmProvider,
} from './llm-provider';

type OpenAiChatResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class OpenAiCompatibleLlmProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiCompatibleLlmProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(
    configService: ConfigService,
    private readonly failureFileLogger: FailureFileLogger,
  ) {
    this.apiKey = configService.get<string>('llm.apiKey') ?? '';
    this.baseUrl =
      configService.get<string>('llm.baseUrl') ??
      'https://generativelanguage.googleapis.com/v1beta/openai';
    this.model =
      configService.get<string>('llm.model') ?? 'gemini-3.1-flash-lite';
    this.timeoutMs = configService.get<number>('llm.timeoutMs') ?? 60000;
  }

  async complete(
    request: LlmCompletionRequest,
  ): Promise<LlmCompletionResult> {
    if (this.apiKey.trim().length === 0) {
      throw new Error(
        'LLM_API_KEY is required for fact extraction. Set it in .env',
      );
    }

    const url = `${this.baseUrl.replace(/\/$/u, '')}/chat/completions`;

    try {
      const response = await axios.post<OpenAiChatResponse>(
        url,
        {
          model: this.model,
          messages: request.messages,
          temperature: request.temperature,
          response_format: request.jsonMode
            ? { type: 'json_object' }
            : undefined,
        },
        {
          timeout: this.timeoutMs,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const content = response.data.choices?.[0]?.message?.content;

      if (content === undefined || content === null || content.trim().length === 0) {
        const emptyError = new Error('LLM returned empty content');
        await this.logFailure(emptyError.message, request, undefined);
        throw emptyError;
      }

      return {
        content,
        model: response.data.model ?? this.model,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const apiMessage = error.response?.data as OpenAiChatResponse | undefined;
        const detail =
          apiMessage?.error?.message ??
          error.message ??
          'LLM request failed';

        this.logger.error(`LLM request failed: ${detail}`);
        await this.logFailure(detail, request, error.response?.status);
        throw new Error(detail);
      }

      throw error;
    }
  }

  private async logFailure(
    message: string,
    request: LlmCompletionRequest,
    statusCode: number | undefined,
  ): Promise<void> {
    const classified = classifyLlmError(message, statusCode);

    await this.failureFileLogger.append({
      kind: 'llm',
      retryable: classified.retryable,
      errorCode: classified.errorCode,
      message,
      statusCode,
      stage: request.context?.stage ?? 'unknown',
      articleId: request.context?.articleId,
      details: {
        hypothesisId: request.context?.hypothesisId,
        model: this.model,
      },
    });
  }
}
