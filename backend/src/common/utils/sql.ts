/** ILIKE 패턴에 들어갈 사용자 입력에서 와일드카드 문자를 이스케이프한다. */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}
