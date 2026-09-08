import * as React from "react";
import { listOrganizations, type ListOrganizationsParams } from "@/features/organizations/api";
import type { OrganizationListRow, OrganizationType } from "@/types/database";

/** branchBusinessType: "" = 전체, "UNSET" = 미설정(NULL), 그 외 = EXISTING_ONLY/NEW_ONLY/BOTH */
export const BRANCH_BUSINESS_TYPE_UNSET_FILTER = "UNSET";

export interface OrganizationFilters {
  search: string;
  region: string;
  approvalStatus: string;
  joinDateFrom: string;
  joinDateTo: string;
  parentBranchId: string;
  branchBusinessType: string;
}

export const emptyFilters: OrganizationFilters = {
  search: "",
  region: "",
  approvalStatus: "",
  joinDateFrom: "",
  joinDateTo: "",
  parentBranchId: "",
  branchBusinessType: "",
};

export function useOrganizationList(organizationType: OrganizationType | undefined, initialFilters?: Partial<OrganizationFilters>) {
  const [filters, setFilters] = React.useState<OrganizationFilters>({ ...emptyFilters, ...initialFilters });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("created_at");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  const [data, setData] = React.useState<OrganizationListRow[]>([]);
  const [count, setCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListOrganizationsParams = {
        organizationType,
        search: filters.search || undefined,
        region: filters.region || undefined,
        approvalStatus: filters.approvalStatus || undefined,
        joinDateFrom: filters.joinDateFrom || undefined,
        joinDateTo: filters.joinDateTo || undefined,
        parentBranchId: filters.parentBranchId || undefined,
        branchBusinessType: filters.branchBusinessType || undefined,
        page,
        pageSize,
        sortBy,
        sortDir,
      };
      const result = await listOrganizations(params);
      setData(result.data);
      setCount(result.count);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [organizationType, filters, page, pageSize, sortBy, sortDir]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  React.useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  function toggleSort(column: string) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  return {
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortBy,
    sortDir,
    toggleSort,
    data,
    count,
    loading,
    error,
    reload,
  };
}
