export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

export function stripOpenInNewWindow(value: string): string {
  return collapseWhitespace(value.replace(/새 창 열림$/u, ''));
}

export function isBlank(value: string | null | undefined): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  return collapseWhitespace(value).length === 0;
}
