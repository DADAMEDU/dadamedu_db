/**
 * "추천인" 컬럼 조건부 변환 규칙 — 격리된 매핑 레이어.
 *
 * 실제 운영 Excel에서는 "추천인" 컬럼의 의미가 구분(organization_type)에 따라 다르다:
 *  - BRANCH(지사) 행: "추천인" 값은 사실 지사 고유코드다 (예: su000633).
 *    -> branch_code로 저장하고, recommender는 비운다(null).
 *  - AGENCY(지사기관) 행: "추천인" 값은 원래 의미(추천인) 그대로 recommender에 저장한다.
 *    -> branch_code는 AGENCY에 직접 저장하지 않는다.
 *
 * 별도의 "지사코드"/"branch_code" 컬럼이 엑셀에 이미 있고 값이 채워져 있다면
 * 그 값을 "추천인"보다 우선한다(더 명시적인 출처이므로).
 *
 * 이 규칙이 실제 전체 데이터에서 달라지면 이 파일만 수정하면 된다.
 */
import type { SystemField } from "@/features/import/types";

export function applyRecommenderConversion(
  organizationType: "BRANCH" | "AGENCY" | null,
  fields: Partial<Record<SystemField, string>>
): Partial<Record<SystemField, string>> {
  const next = { ...fields };

  if (organizationType === "BRANCH") {
    const explicitCode = (next.branch_code ?? "").trim();
    const fromRecommender = (next.recommender ?? "").trim();
    const derivedCode = explicitCode || fromRecommender;

    if (derivedCode) {
      next.branch_code = derivedCode;
    } else {
      delete next.branch_code;
    }
    delete next.recommender;
    return next;
  }

  if (organizationType === "AGENCY") {
    // AGENCY에는 branch_code를 직접 저장하지 않는다. recommender는 그대로 둔다.
    delete next.branch_code;
    return next;
  }

  return next;
}
