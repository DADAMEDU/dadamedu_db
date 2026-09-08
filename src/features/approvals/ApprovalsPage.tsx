import * as React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { OrganizationTypeBadge } from "@/features/organizations/StatusBadge";
import { useOrganizationList } from "@/features/organizations/useOrganizationList";
import { updateOrganization } from "@/features/organizations/api";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";

export function ApprovalsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const list = useOrganizationList(undefined, { approvalStatus: "승인대기" });
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  async function approve(id: string) {
    setProcessingId(id);
    try {
      await updateOrganization(id, { approval_status: "승인완료" });
      toast({ title: "승인 처리되었습니다.", variant: "success" });
      list.reload();
    } catch (e) {
      toast({
        title: "처리에 실패했습니다.",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold">승인 관리</h1>
        <p className="text-sm text-muted-foreground">승인대기 상태인 지사/지사기관 목록입니다.</p>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table className="border-0">
          <THead>
            <TR>
              <TH>구분</TH>
              <TH>권역</TH>
              <TH>지사명/기관명</TH>
              <TH>이름</TH>
              <TH>휴대폰번호</TH>
              <TH>가입날짜</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {list.loading ? (
              <TR>
                <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                  불러오는 중...
                </TD>
              </TR>
            ) : list.data.length === 0 ? (
              <TR>
                <TD colSpan={7} className="py-8 text-center text-muted-foreground">
                  승인대기 중인 항목이 없습니다.
                </TD>
              </TR>
            ) : (
              list.data.map((org) => (
                <TR key={org.id}>
                  <TD>
                    <OrganizationTypeBadge type={org.organization_type} />
                  </TD>
                  <TD>{org.region || "-"}</TD>
                  <TD
                    className="cursor-pointer font-medium text-foreground hover:text-primary"
                    onClick={() => navigate(`/organizations/${org.id}`)}
                  >
                    {org.organization_name}
                  </TD>
                  <TD>{org.representative_name || "-"}</TD>
                  <TD>{org.mobile || "-"}</TD>
                  <TD>{formatDate(org.join_date)}</TD>
                  <TD>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={processingId === org.id}
                      onClick={() => approve(org.id)}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> 승인
                    </Button>
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
