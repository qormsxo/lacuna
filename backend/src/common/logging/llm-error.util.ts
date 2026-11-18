export type LlmFailureClass = {
  errorCode: string;
  retryable: boolean;
};

export function classifyLlmError(
  message: string,
  statusCode?: number,
): LlmFailureClass {
  const normalized = message.toLowerCase();

  if (statusCode === 401 || statusCode === 403) {
    return { errorCode: 'AUTH', retryable: false };
  }

  if (
    statusCode === 429 ||
    normalized.includes('rate') ||
    normalized.includes('quota') ||
    normalized.includes('resource_exhausted')
  ) {
    return { errorCode: 'RATE_LIMIT', retryable: true };
  }

  if (
    statusCode !== undefined &&
    statusCode >= 500
  ) {
    return { errorCode: 'SERVER_ERROR', retryable: true };
  }

  if (
    normalized.includes('timeout') ||
    normalized.includes('etimedout') ||
    normalized.includes('econnreset') ||
    normalized.includes('network')
  ) {
    return { errorCode: 'TIMEOUT_NETWORK', retryable: true };
  }

  if (normalized.includes('schema validation')) {
    return { errorCode: 'SCHEMA', retryable: false };
  }

  if (normalized.includes('empty content')) {
    return { errorCode: 'EMPTY_RESPONSE', retryable: true };
  }

  return { errorCode: 'UNKNOWN', retryable: true };
}

export function isRetryableCollectError(errorCode: string): boolean {
  return (
    errorCode === 'NETWORK_ERROR' ||
    errorCode === 'TIMEOUT' ||
    errorCode === 'PARSE_ERROR' ||
    errorCode === 'STRUCTURE_CHANGED'
  );
}
