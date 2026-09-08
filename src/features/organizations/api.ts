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

// organizations는 parent_branch_id로 자기 자신을 참조하는 self-relation이다.
// PostgREST의 embed 힌트(`organizations!organizations_parent_branch_id_fkey(...)`)는
// self-relation에서 스키마 캐시가 관계를 못 찾아 PGRST200(400)을 내는 환경이 있으므로
// 절대 select 문자열에 embed를 넣지 않는다. parent_branch_id는 순수 UUID 컬럼으로만
// 가져오고, 소속지사명이 필요한 화면에서는 attachParentBranchNames()로 별도 조회해 붙인다.
export const LIST_COLUMNS =
  "id, organization_type, parent_branch_id, branch_business_type, branch_code, region, organization_name, business_name, representative_name, business_registration_number, telephone, mobile, address, approval_status, join_date, login_id, recommender, note, created_at";

/**
 * 목록/검색 결과에 소속지사명을 붙인다. embed 대신 parent_branch_id를 모아
 * 한 번의 별도 쿼리로 해당 BRANCH들만 조회해 매핑하는 방식이라 self-relation
 * embed 힌트에 전혀 의존하지 않는다. 대상 행이 없으면 추가 쿼리 자체를 생략한다.
 */
async function attachParentBranchNames<T extends { parent_branch_id: string | null }>(
  rows: T[]
): Promise<(T & { parent: { organization_name: string } | null })[]> {
  const parentIds = Array.from(new Set(rows.map((r) => r.parent_branch_id).filter(Boolean))) as string[];

  if (parentIds.length === 0) {
    return rows.map((r) => ({ ...r, parent: null }));
  }

  const { data, error } = await supabase
    .from("organizations")
    .select("id, organization_name")
    .in("id", parentIds);

  if (error) {
    if (import.meta.env.DEV) {
      console.error("[attachParentBranchNames] failed to resolve parent branch names", error);
    }
    // 소속지사명은 부가 정보이므로, 이 조회가 실패했다고 해서 본 목록/검색 자체를
    // 실패시키지 않는다 — 이름 없이(parent: null)라도 원래 결과는 그대로 보여준다.
    return rows.map((r) => ({ ...r, parent: null }));
  }

  const nameById = new Map((data ?? []).map((b) => [b.id as string, b.organization_name as string]));
  return rows.map((r) => ({
    ...r,
    parent: r.parent_branch_id ? { organization_name: nameById.get(r.parent_branch_id) ?? "" } : null,
  }));
}

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

  const withParent = await attachParentBranchNames((data ?? []) as unknown as OrganizationListRow[]);
  return { data: withParent, count: count ?? 0 };
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
