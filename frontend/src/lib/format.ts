function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** ISO 문자열을 `YYYY-MM-DD HH:mm` (로컬 시간)으로 바꾼다. 비어 있거나 잘못되면 null. */
export function formatDateTime(
  value: string | null | undefined,
  withSeconds = false,
): string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const base = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  return withSeconds ? `${base}:${pad2(date.getSeconds())}` : base;
}

export function formatDateTimeOr(
  value: string | null | undefined,
  fallback = '-',
): string {
  return formatDateTime(value) ?? fallback;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    // SAFETY: guarded by the `'response' in error` check above (axios error shape).
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;

    const message = response?.data?.message;

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(', ');
    }
  }

  return error instanceof Error ? error.message : fallback;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}
