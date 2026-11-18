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

const TRANSIENT_ERROR_CODES = new Set([
  'RATE_LIMIT',
  'SERVER_ERROR',
  'TIMEOUT_NETWORK',
  'EMPTY_RESPONSE',
]);

const MAX_RETRY_AFTER_MS = 60_000;

export class LlmRequestError extends Error {
  readonly errorCode: string;

  constructor(
    message: string,
    readonly statusCode: number | undefined,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.errorCode = classifyLlmError(message, statusCode).errorCode;
  }
}

export function parseRetryAfter(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return undefined;
  }

  const seconds = Number(raw);

  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const date = Date.parse(raw);

  if (Number.isNaN(date)) {
    return undefined;
  }

  return Math.min(Math.max(0, date - Date.now()), MAX_RETRY_AFTER_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class OpenAiCompatibleLlmProvider implements LlmProvider {
  private readonly logger = new Logger(OpenAiCompatibleLlmProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

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
    this.maxRetries = configService.get<number>('llm.maxRetries') ?? 2;
    this.retryBaseDelayMs =
      configService.get<number>('llm.retryBaseDelayMs') ?? 2000;
  }

  /**
   * 429·5xx·타임아웃·빈 응답만 지수 백오프로 재시도한다.
   * 인증/스키마 오류는 재시도해도 결과가 같으므로 바로 실패시킨다.
   */
  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    let attempt = 0;

    for (;;) {
      try {
        return await this.completeOnce(request);
      } catch (error) {
        if (!(error instanceof LlmRequestError)) {
          throw error;
        }

        const transient = TRANSIENT_ERROR_CODES.has(error.errorCode);

        if (!transient || attempt >= this.maxRetries) {
          await this.logFailure(error.message, request, error.statusCode);
          throw new Error(error.message);
        }

        const delayMs =
          error.retryAfterMs ?? this.retryBaseDelayMs * 2 ** attempt;
        attempt += 1;
        this.logger.warn(
          `LLM ${error.errorCode} (${error.message}); retry ${attempt}/${this.maxRetries} in ${delayMs}ms`,
        );
        await sleep(delayMs);
      }
    }
  }

  private async completeOnce(
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

      if (
        content === undefined ||
        content === null ||
        content.trim().length === 0
      ) {
        throw new LlmRequestError('LLM returned empty content', undefined);
      }

      return {
        content,
        model: response.data.model ?? this.model,
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const apiMessage = error.response?.data as
          OpenAiChatResponse | undefined;
        const detail =
          apiMessage?.error?.message ?? error.message ?? 'LLM request failed';

        this.logger.error(`LLM request failed: ${detail}`);
        throw new LlmRequestError(
          detail,
          error.response?.status,
          parseRetryAfter(error.response?.headers?.['retry-after']),
        );
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
