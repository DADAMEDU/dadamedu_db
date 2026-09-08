import type { ColumnMapping, SystemField } from "@/features/import/types";

/** 기존 Excel 헤더명 -> 시스템 필드 자동 매핑 규칙. 컬럼 순서가 바뀌어도 헤더명으로 매칭한다. */
const HEADER_ALIASES: Record<string, SystemField> = {
  권역: "region",
  회원: "member",
  구분: "member",
  추천인: "recommender",
  번호: "number",
  아이디: "login_id",
  지사명: "branch_name",
  사업자명: "business_name",
  이름: "representative_name",
  대표자: "representative_name",
  사업자등록번호: "business_registration_number",
  사업자번호: "business_registration_number",
  전화번호: "telephone",
  휴대폰번호: "mobile",
  핸드폰번호: "mobile",
  주소: "address",
  승인여부: "approval_status",
  가입날짜: "join_date",
  가입일: "join_date",
  은행: "bank",
  예금주: "account_holder",
  계좌번호: "account_number",
  비고: "note",
  지사운영구분: "branch_business_type",
  운영구분: "branch_business_type",
  지사코드: "branch_code",
  branch_code: "branch_code",
};

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((header, idx) => {
    const normalized = header.replace(/\s/g, "");
    mapping[idx] = HEADER_ALIASES[normalized] ?? HEADER_ALIASES[normalized.toLowerCase()] ?? null;
  });
  return mapping;
}
