/**
 * Supabase/PostgREST 오류(PostgrestError 등)는 항상 `instanceof Error`가 아닐 수 있어
 * `e instanceof Error ? e.message : String(e)` 패턴을 쓰면 "[object Object]"로만 보이는
 * 경우가 있다. message/code/details/hint를 직접 꺼내 사람이 읽을 수 있는 문자열로 만든다.
 */
export function formatErrorMessage(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts: string[] = [];
    if (typeof err.message === "string" && err.message) parts.push(err.message);
    if (typeof err.details === "string" && err.details) parts.push(err.details);
    if (typeof err.hint === "string" && err.hint) parts.push(`힌트: ${err.hint}`);
    if (typeof err.code === "string" && err.code) parts.push(`(code: ${err.code})`);
    if (parts.length > 0) return parts.join(" — ");
  }
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
