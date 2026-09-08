/**
 * 지사 운영구분(branch_business_type) 값 정규화 규칙 — 격리된 매핑 레이어.
 *
 * organization_type(BRANCH/AGENCY)과는 완전히 별개의 개념으로, Excel의
 * "지사운영구분" 또는 "운영구분" 컬럼 텍스트를 시스템 enum 값으로 변환한다.
 * 인식 규칙이 바뀌면 이 파일만 수정하면 된다.
 *
 *   기존, 기존만            -> EXISTING_ONLY
 *   신규, 신규만            -> NEW_ONLY
 *   기존+신규, 기존/신규, 둘다 -> BOTH
 *   그 외 / 빈 값             -> null (미설정)
 */
import type { BranchBusinessType } from "@/types/database";

const EXISTING_ONLY_ALIASES = ["기존", "기존만"];
const NEW_ONLY_ALIASES = ["신규", "신규만"];
const BOTH_ALIASES = ["기존+신규", "기존/신규", "신규+기존", "신규/기존", "둘다", "둘 다"];

export function normalizeBranchBusinessType(raw: string | null | undefined): BranchBusinessType | null {
  const value = (raw ?? "").replace(/\s/g, "");
  if (!value) return null;

  if (BOTH_ALIASES.some((alias) => alias.replace(/\s/g, "") === value)) return "BOTH";
  if (EXISTING_ONLY_ALIASES.includes(value)) return "EXISTING_ONLY";
  if (NEW_ONLY_ALIASES.includes(value)) return "NEW_ONLY";

  return null;
}
