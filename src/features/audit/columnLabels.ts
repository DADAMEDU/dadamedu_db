export const COLUMN_LABELS: Record<string, string> = {
  region: "권역",
  member: "회원",
  recommender: "추천인",
  number: "번호",
  login_id: "아이디",
  organization_name: "명칭",
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
  parent_branch_id: "소속지사",
  organization_type: "구분",
  branch_business_type: "지사 운영구분",
  name: "이름",
  role: "권한",
  email: "이메일",
};

export function labelFor(key: string): string {
  return COLUMN_LABELS[key] ?? key;
}
