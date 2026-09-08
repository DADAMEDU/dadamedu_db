import { supabase } from "@/lib/supabase";
import { normalizeBranchCode, normalizeDigits } from "@/lib/format";
import type {
  BranchAgencyCount,
  DashboardSummary,
  Organization,
  OrganizationInput,
  OrganizationListRow,
  OrganizationType,
} from "@/types/database";

export const LIST_COLUMNS =
  "id, organization_type, parent_branch_id, branch_business_type, branch_code, region, organization_name, business_name, representative_name, business_registration_number, telephone, mobile, address, approval_status, join_date, login_id, recommender, note, created_at, parent:organizations!organizations_parent_branch_id_fkey(organization_name)";

export interface ListOrganizationsParams {
  search?: string;
  organizationType?: OrganizationType;
  region?: string;
  parentBranchId?: string;
  approvalStatus?: string;
  joinDateFrom?: string;
  joinDateTo?: string;
  /** "UNSET" = 미설정(NULL), 그 외 = EXISTING_ONLY/NEW_ONLY/BOTH */
  branchBusinessType?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

function escapeForOr(value: string) {
  return value.replace(/"/g, '\\"').replace(/[,()]/g, " ").trim();
}

// PostgREST의 or= 필터 문법에서 like/ilike 패턴의 와일드카드는 '%'가 아니라 '*'를 쓴다.
// (URL 쿼리 문자열에서 '%'는 퍼센트 인코딩 문자와 겹쳐 모호해지므로 PostgREST가 '*'를
// 표준 별칭으로 요구한다 — 원격 요청 형태의 raw 필터 문자열을 직접 만들 때는 반드시 '*' 사용.)
function buildSearchOrClause(term: string): string | null {
  const cleaned = escapeForOr(term);
  if (!cleaned) return null;

  const clauses = [
    `organization_name.ilike."*${cleaned}*"`,
    `branch_code.ilike."*${cleaned}*"`,
    `business_name.ilike."*${cleaned}*"`,
    `representative_name.ilike."*${cleaned}*"`,
    `address.ilike."*${cleaned}*"`,
    `note.ilike."*${cleaned}*"`,
    `login_id.ilike."*${cleaned}*"`,
    `recommender.ilike."*${cleaned}*"`,
    `region.ilike."*${cleaned}*"`,
  ];

  const digits = normalizeDigits(term);
  if (digits.length >= 2) {
    clauses.push(`mobile_normalized.ilike."*${digits}*"`);
    clauses.push(`telephone_normalized.ilike."*${digits}*"`);
    clauses.push(`business_registration_number_normalized.ilike."*${digits}*"`);
  }

  return clauses.join(",");
}

export async function listOrganizations(
  params: ListOrganizationsParams
): Promise<{ data: OrganizationListRow[]; count: number }> {
  const {
    search,
    organizationType,
    region,
    parentBranchId,
    approvalStatus,
    joinDateFrom,
    joinDateTo,
    branchBusinessType,
    page,
    pageSize,
    sortBy = "created_at",
    sortDir = "desc",
  } = params;

  let query = supabase.from("organizations").select(LIST_COLUMNS, { count: "exact" });

  if (organizationType) query = query.eq("organization_type", organizationType);
  if (region) query = query.eq("region", region);
  if (parentBranchId) query = query.eq("parent_branch_id", parentBranchId);
  if (approvalStatus) query = query.eq("approval_status", approvalStatus);
  if (joinDateFrom) query = query.gte("join_date", joinDateFrom);
  if (joinDateTo) query = query.lte("join_date", joinDateTo);
  if (branchBusinessType === "UNSET") {
    query = query.is("branch_business_type", null);
  } else if (branchBusinessType) {
    query = query.eq("branch_business_type", branchBusinessType);
  }

  if (search) {
    const clause = buildSearchOrClause(search);
    if (clause) query = query.or(clause);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (error) {
    if (import.meta.env.DEV) {
      // 검색/목록 조회 실패 원인을 조용히 숨기지 않고 개발 콘솔에 그대로 남긴다.
      console.error("[listOrganizations] query failed", { params, error });
    }
    throw error;
  }
  return { data: (data ?? []) as unknown as OrganizationListRow[], count: count ?? 0 };
}

/** Excel 다운로드용: 현재 필터에 해당하는 전체 행을 chunk 단위로 모두 가져온다 (페이지네이션 우회, 다운로드 전용). */
export async function fetchAllOrganizations(
  params: Omit<ListOrganizationsParams, "page" | "pageSize">
): Promise<OrganizationListRow[]> {
  const chunkSize = 1000;
  let page = 1;
  const all: OrganizationListRow[] = [];

  for (;;) {
    const { data, count } = await listOrganizations({ ...params, page, pageSize: chunkSize });
    all.push(...data);
    if (all.length >= (count ?? 0) || data.length < chunkSize) break;
    page += 1;
  }
  return all;
}

export async function getOrganization(id: string): Promise<Organization> {
  const { data, error } = await supabase.from("organizations").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Organization;
}

export async function listAgenciesOfBranch(branchId: string): Promise<OrganizationListRow[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select(LIST_COLUMNS)
    .eq("parent_branch_id", branchId)
    .order("organization_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as OrganizationListRow[];
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  const { data, error } = await supabase.from("organizations").insert(input).select().single();
  if (error) throw error;
  return data as Organization;
}

export async function updateOrganization(
  id: string,
  input: Partial<OrganizationInput>
): Promise<Organization> {
  const { data, error } = await supabase
    .from("organizations")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Organization;
}

export async function deleteOrganization(id: string): Promise<void> {
  const { error } = await supabase.from("organizations").delete().eq("id", id);
  if (error) throw error;
}

export interface BranchOption {
  id: string;
  organization_name: string;
  region: string | null;
  branch_code: string | null;
}

/** 신규등록/소속지사 콤보박스: 지사명 또는 지사코드로 부분검색 (지사가 많아져도 서버에서 필터링) */
export async function searchBranches(search: string, limit = 30): Promise<BranchOption[]> {
  let query = supabase
    .from("organizations")
    .select("id, organization_name, region, branch_code")
    .eq("organization_type", "BRANCH")
    .order("organization_name", { ascending: true })
    .limit(limit);

  const term = escapeForOr(search);
  if (term) {
    query = query.or(`organization_name.ilike."*${term}*",branch_code.ilike."*${term}*"`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BranchOption[];
}

/**
 * 지사코드 중복 여부 확인 (대소문자/공백 무시). 수정 화면에서는 excludeId로 자기 자신을 제외한다.
 * 최종 무결성은 DB의 partial unique index가 보장하며, 이 함수는 저장 전 즉시 피드백용이다.
 */
export async function isBranchCodeTaken(code: string, excludeId?: string): Promise<boolean> {
  const normalized = normalizeBranchCode(code);
  if (!normalized) return false;

  let query = supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("organization_type", "BRANCH")
    .eq("branch_code_normalized", normalized);

  if (excludeId) query = query.neq("id", excludeId);

  const { count, error } = await query;
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getBranchAgencyCounts(): Promise<BranchAgencyCount[]> {
  const { data, error } = await supabase
    .from("branch_agency_counts")
    .select("*")
    .order("branch_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BranchAgencyCount[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc("dashboard_summary").single();
  if (error) throw error;
  return data as DashboardSummary;
}

export async function getProfileNames(ids: (string | null | undefined)[]): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean))) as string[];
  if (uniqueIds.length === 0) return {};
  const { data, error } = await supabase.from("profiles").select("id, name").in("id", uniqueIds);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((p) => [p.id as string, p.name as string]));
}

export async function listRegions(): Promise<string[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("region")
    .not("region", "is", null)
    .limit(2000);
  if (error) throw error;
  const set = new Set((data ?? []).map((r: { region: string | null }) => r.region).filter(Boolean) as string[]);
  return Array.from(set).sort();
}
