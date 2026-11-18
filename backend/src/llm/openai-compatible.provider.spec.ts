import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosHeaders } from 'axios';
import { FailureFileLogger } from '../common/logging/failure-file.logger';
import {
  OpenAiCompatibleLlmProvider,
  parseRetryAfter,
} from './openai-compatible.provider';

function makeProvider(appended: unknown[]): OpenAiCompatibleLlmProvider {
  const values: Record<string, unknown> = {
    'llm.apiKey': 'test-key',
    'llm.baseUrl': 'http://llm.test',
    'llm.model': 'test-model',
    'llm.timeoutMs': 1000,
    'llm.maxRetries': 2,
    'llm.retryBaseDelayMs': 1,
  };

  const config = new ConfigService(values);
  jest.spyOn(config, 'get').mockImplementation((key: string) => values[key]);
  const failureLogger = new FailureFileLogger(config);
  jest.spyOn(failureLogger, 'append').mockImplementation((entry: unknown) => {
    appended.push(entry);

    return Promise.resolve();
  });

  return new OpenAiCompatibleLlmProvider(config, failureLogger);
}

function httpError(status: number): AxiosError {
  const headers = new AxiosHeaders();

  return new AxiosError('fail', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    headers,
    config: { headers },
    data: { error: { message: `status ${status}` } },
  });
}

const request = {
  messages: [{ role: 'user' as const, content: 'hi' }],
  temperature: 0,
  jsonMode: true,
};

describe('OpenAiCompatibleLlmProvider retry', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retries 429 then succeeds without logging a failure', async () => {
    const appended: unknown[] = [];
    const provider = makeProvider(appended);

    const post = jest
      .spyOn(axios, 'post')
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValueOnce({
        data: { model: 'm', choices: [{ message: { content: '{}' } }] },
      });

    await expect(provider.complete(request)).resolves.toEqual({
      content: '{}',
      model: 'm',
    });
    expect(post).toHaveBeenCalledTimes(2);
    expect(appended).toHaveLength(0);
  });

  it('gives up after maxRetries on 503 and logs once', async () => {
    const appended: unknown[] = [];
    const provider = makeProvider(appended);
    const post = jest.spyOn(axios, 'post').mockRejectedValue(httpError(503));

    await expect(provider.complete(request)).rejects.toThrow('status 503');
    expect(post).toHaveBeenCalledTimes(3);
    expect(appended).toHaveLength(1);
  });

  it('does not retry auth errors', async () => {
    const appended: unknown[] = [];
    const provider = makeProvider(appended);
    const post = jest.spyOn(axios, 'post').mockRejectedValue(httpError(401));

    await expect(provider.complete(request)).rejects.toThrow('status 401');
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('parseRetryAfter', () => {
  it('parses seconds and caps long waits', () => {
    expect(parseRetryAfter('3')).toBe(3000);
    expect(parseRetryAfter('9999')).toBe(60_000);
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('garbage')).toBeUndefined();
  });
});
