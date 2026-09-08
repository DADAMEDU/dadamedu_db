/** 검색/중복판정용: 숫자만 추출 (DB의 normalize_digits()와 동일한 규칙) */
export function normalizeDigits(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/\D/g, "");
}

/** 지사코드 중복판정/검색용 정규화: 대소문자·앞뒤 공백 무시 (DB의 normalize_branch_code()와 동일한 규칙) */
export function normalizeBranchCode(input: string | null | undefined): string {
  if (!input) return "";
  return input.trim().toUpperCase();
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** 다양한 표기(문자열, 날짜+시간 등)를 'YYYY-MM-DD'로 정규화. 파싱 불가하면 null. */
export function parseToISODate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}
