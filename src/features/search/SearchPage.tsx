import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { useOrganizationList } from "@/features/organizations/useOrganizationList";
import { OrganizationFilterBar } from "@/features/organizations/OrganizationFilterBar";
import { ApprovalStatusBadge, BranchBusinessTypeBadge, OrganizationTypeBadge } from "@/features/organizations/StatusBadge";
import { fetchAllOrganizations, listRegions } from "@/features/organizations/api";
import { downloadOrganizationsExcel } from "@/lib/excelExport";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/auth/AuthProvider";
import type { OrganizationType } from "@/types/database";

export function SearchPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const { isAdmin } = useAuth();

  const [organizationType, setOrganizationType] = React.useState<OrganizationType | "">("");
  const list = useOrganizationList(organizationType || undefined, { search: initialQ });
  const [regions, setRegions] = React.useState<string[]>([]);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    listRegions().then(setRegions);
  }, []);

  React.useEffect(() => {
    list.setFilters((f) => ({ ...f, search: initialQ }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await fetchAllOrganizations({
        organizationType: organizationType || undefined,
        search: list.filters.search || undefined,
        region: list.filters.region || undefined,
        approvalStatus: list.filters.approvalStatus || undefined,
        joinDateFrom: list.filters.joinDateFrom || undefined,
        joinDateTo: list.filters.joinDateTo || undefined,
        parentBranchId: list.filters.parentBranchId || undefined,
        branchBusinessType: list.filters.branchBusinessType || undefined,
      });
      downloadOrganizationsExcel(rows, "검색결과");
      toast({ title: `${rows.length}건을 다운로드했습니다.`, variant: "success" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">통합검색</h1>
        {isAdmin && (
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" /> {exporting ? "다운로드 중..." : "검색결과 다운로드"}
          </Button>
        )}
      </div>

      <OrganizationFilterBar
        filters={list.filters}
        onChange={list.setFilters}
        regions={regions}
        organizationType={organizationType || undefined}
        onOrganizationTypeChange={setOrganizationType}
        showParentBranch
      />

      <div className="rounded-md border border-border bg-card">
        <Table className="border-0">
          <THead>
            <TR>
              <TH>구분</TH>
              <TH>운영구분</TH>
              <TH>권역</TH>
              <TH>소속지사</TH>
              <TH>지사명/기관명</TH>
              <TH>사업자명</TH>
              <TH>이름</TH>
              <TH>사업자등록번호</TH>
              <TH>전화번호</TH>
              <TH>휴대폰번호</TH>
              <TH>주소</TH>
              <TH>승인여부</TH>
            </TR>
          </THead>
          <TBody>
            {list.loading ? (
              <TR>
                <TD colSpan={12} className="py-8 text-center text-muted-foreground">
                  검색 중...
                </TD>
              </TR>
            ) : list.data.length === 0 ? (
              <TR>
                <TD colSpan={12} className="py-8 text-center text-muted-foreground">
                  검색 결과가 없습니다.
                </TD>
              </TR>
            ) : (
              list.data.map((org) => (
                <TR key={org.id} clickable onClick={() => navigate(`/organizations/${org.id}`)}>
                  <TD>
                    <OrganizationTypeBadge type={org.organization_type} />
                  </TD>
                  <TD>
                    {org.organization_type === "BRANCH" ? (
                      <BranchBusinessTypeBadge value={org.branch_business_type} />
                    ) : (
                      "-"
                    )}
                  </TD>
                  <TD>{org.region || "-"}</TD>
                  <TD>{org.parent?.organization_name || "-"}</TD>
                  <TD className="font-medium text-foreground">{org.organization_name}</TD>
                  <TD>{org.business_name || "-"}</TD>
                  <TD>{org.representative_name || "-"}</TD>
                  <TD>{org.business_registration_number || "-"}</TD>
                  <TD>{org.telephone || "-"}</TD>
                  <TD>{org.mobile || "-"}</TD>
                  <TD className="max-w-[220px] truncate">{org.address || "-"}</TD>
                  <TD>
                    <ApprovalStatusBadge status={org.approval_status} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
        <Pagination
          page={list.page}
          pageSize={list.pageSize}
          total={list.count}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
        />
      </div>
    </div>
  );
}
