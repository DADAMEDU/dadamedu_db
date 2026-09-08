/**
 * Excel 원본 헤더가 매핑되는 시스템 필드.
 * branch_name은 "지사명" 컬럼 전용(지사 행에서만 organization_name으로 사용),
 * business_name은 사업자명 컬럼 — 지사기관 행에서는 이 값이 곧 기관명(organization_name)이 된다.
 */
export type SystemField =
  | "region"
  | "member"
  | "recommender"
  | "number"
  | "login_id"
  | "branch_name"
  | "business_name"
  | "representative_name"
  | "business_registration_number"
  | "telephone"
  | "mobile"
  | "address"
  | "approval_status"
  | "join_date"
  | "bank"
  | "account_holder"
  | "account_number"
  | "note"
  | "branch_business_type"
  | "branch_code";

export const SYSTEM_FIELD_LABELS: Record<SystemField, string> = {
  region: "권역",
  member: "회원(구분마커)",
  recommender: "추천인",
  number: "번호",
  login_id: "아이디",
  branch_name: "지사명",
  business_name: "사업자명",
  representative_name: "이름",
  business_registration_number: "사업자등록번호",
  telephone: "전화번호",
  mobile: "휴대폰번호",
  address: "주소",
  approval_status: "승인여부",
  join_date: "가입날짜",
  bank: "은행",
  account_holder: "예금주",
  account_number: "계좌번호",
  note: "비고",
  branch_business_type: "지사운영구분",
  branch_code: "지사코드",
};

export const REQUIRED_SYSTEM_FIELDS: SystemField[] = ["member"];

/** 컬럼 인덱스 -> 매핑된 시스템 필드 (null이면 미매핑) */
export type ColumnMapping = Record<number, SystemField | null>;

export type RowStatus = "정상" | "확인필요" | "중복" | "오류";

export interface ImportRow {
  excelRowNumber: number;
  fields: Partial<Record<SystemField, string>>;
  organizationType: "BRANCH" | "AGENCY" | null;
  organizationName: string;
  parentBranchExcelRow: number | null; // 순서 기반으로 찾은 부모 지사 행번호 (검증/디버그용)
  status: RowStatus;
  messages: string[];
}
