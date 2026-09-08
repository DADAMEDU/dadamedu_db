export type OrganizationType = "BRANCH" | "AGENCY";
export type UserRole = "ADMIN" | "USER";
export type ApprovalStatus = "승인완료" | "승인대기" | string;
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "IMPORT";

/**
 * 지사 운영구분 — organization_type(BRANCH/AGENCY)과는 완전히 별개의 개념.
 * BRANCH에만 의미가 있으며 AGENCY에서는 사용하지 않는다(NULL 고정).
 */
export type BranchBusinessType = "EXISTING_ONLY" | "NEW_ONLY" | "BOTH";

export interface Organization {
  id: string;
  organization_type: OrganizationType;
  parent_branch_id: string | null;

  /** 지사 운영구분 (BRANCH 전용, NULL=미설정) */
  branch_business_type: BranchBusinessType | null;

  /** 지사 고유코드 (BRANCH 전용, 원본 표기 그대로). 예: CJ001 */
  branch_code: string | null;

  region: string | null;
  member: string | null;
  recommender: string | null;
  number: string | null;
  login_id: string | null;
  business_name: string | null;
  representative_name: string | null;
  business_registration_number: string | null;
  telephone: string | null;
  mobile: string | null;
  address: string | null;
  approval_status: ApprovalStatus | null;
  join_date: string | null;
  bank: string | null;
  account_holder: string | null;
  account_number: string | null;
  note: string | null;

  organization_name: string;

  business_registration_number_normalized: string | null;
  telephone_normalized: string | null;
  mobile_normalized: string | null;
  branch_code_normalized: string | null;

  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** organizations 테이블 insert/upsert 시 사용하는 편집 가능 필드 subset */
export type OrganizationInput = Partial<
  Omit<
    Organization,
    | "id"
    | "business_registration_number_normalized"
    | "telephone_normalized"
    | "mobile_normalized"
    | "branch_code_normalized"
    | "created_by"
    | "updated_by"
    | "created_at"
    | "updated_at"
  >
> & {
  organization_type: OrganizationType;
  organization_name: string;
};

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction;
  target_type: string;
  target_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
  // list 조회 시 profiles를 조인해서 채우는 표시용 필드
  actor_name?: string | null;
}

/** 목록 조회 시 소속지사명을 함께 embed 해서 받아오는 행 타입 */
export interface OrganizationListRow extends Organization {
  parent?: { organization_name: string } | null;
}

export interface BranchAgencyCount {
  branch_id: string;
  branch_name: string;
  agency_count: number;
}

export interface DashboardSummary {
  total_branches: number;
  total_agencies: number;
  total_organizations: number;
  approved_count: number;
  pending_count: number;
  existing_only_branches: number;
  new_only_branches: number;
  both_branches: number;
}
