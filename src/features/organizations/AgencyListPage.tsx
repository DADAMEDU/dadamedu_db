import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { SortableTH } from "@/components/ui/sortable-th";
import { Pagination } from "@/components/ui/pagination";
import { useOrganizationList } from "@/features/organizations/useOrganizationList";
import { OrganizationFilterBar } from "@/features/organizations/OrganizationFilterBar";
import { NewOrganizationButton } from "@/features/organizations/NewOrganizationButton";
import { ApprovalStatusBadge } from "@/features/organizations/StatusBadge";
import { fetchAllOrganizations, listRegions } from "@/features/organizations/api";
import { downloadOrganizationsExcel } from "@/lib/excelExport";
import { formatDate } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/auth/AuthProvider";

export function AgencyListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const list = useOrganizationList("AGENCY");
  const [regions, setRegions] = React.useState<string[]>([]);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    listRegions().then(setRegions);
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await fetchAllOrganizations({
        organizationType: "AGENCY",
        search: list.filters.search || undefined,
        region: list.filters.region || undefined,
        approvalStatus: list.filters.approvalStatus || undefined,
        joinDateFrom: list.filters.joinDateFrom || undefined,
        joinDateTo: list.filters.joinDateTo || undefined,
        parentBranchId: list.filters.parentBranchId || undefined,
      });
      downloadOrganizationsExcel(rows, "지사기관목록");
      toast({ title: `${rows.length}건을 다운로드했습니다.`, variant: "success" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">지사기관 관리</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4" /> {exporting ? "다운로드 중..." : "검색결과 다운로드"}
            </Button>
          )}
          <NewOrganizationButton />
        </div>
      </div>

      <OrganizationFilterBar
        filters={list.filters}
        onChange={list.setFilters}
        regions={regions}
        showParentBranch
      />

      <div className="rounded-md border border-border bg-card">
        <Table className="border-0">
          <THead>
            <TR>
              <TH>번호</TH>
              <SortableTH column="region" label="권역" sortBy={list.sortBy} sortDir={list.sortDir} onSort={list.toggleSort} />
              <TH>소속지사</TH>
              <SortableTH
                column="organization_name"
                label="기관명"
                sortBy={list.sortBy}
                sortDir={list.sortDir}
                onSort={list.toggleSort}
              />
              <TH>사업자명</TH>
              <TH>이름</TH>
              <TH>사업자등록번호</TH>
              <TH>전화번호</TH>
              <TH>휴대폰번호</TH>
              <TH>주소</TH>
              <SortableTH
                column="approval_status"
                label="승인여부"
                sortBy={list.sortBy}
                sortDir={list.sortDir}
                onSort={list.toggleSort}
              />
              <SortableTH
                column="join_date"
                label="가입날짜"
                sortBy={list.sortBy}
                sortDir={list.sortDir}
                onSort={list.toggleSort}
              />
            </TR>
          </THead>
          <TBody>
            {list.loading ? (
              <TR>
                <TD colSpan={12} className="py-8 text-center text-muted-foreground">
                  불러오는 중...
                </TD>
              </TR>
            ) : list.error ? (
              <TR>
                <TD colSpan={12} className="py-8 text-center text-destructive">
                  목록을 불러오는 중 오류가 발생했습니다.
                  <div className="mt-1 text-xs text-muted-foreground">{list.error}</div>
                </TD>
              </TR>
            ) : list.data.length === 0 ? (
              <TR>
                <TD colSpan={12} className="py-8 text-center text-muted-foreground">
                  등록된 지사기관이 없습니다.
                </TD>
              </TR>
            ) : (
              list.data.map((org, idx) => (
                <TR key={org.id} clickable onClick={() => navigate(`/organizations/${org.id}`)}>
                  <TD>{(list.page - 1) * list.pageSize + idx + 1}</TD>
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
                  <TD>{formatDate(org.join_date)}</TD>
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
