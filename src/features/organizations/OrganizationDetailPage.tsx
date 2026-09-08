import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/auth/AuthProvider";
import {
  deleteOrganization,
  getOrganization,
  getProfileNames,
  listAgenciesOfBranch,
} from "@/features/organizations/api";
import { ApprovalStatusBadge, BranchBusinessTypeBadge } from "@/features/organizations/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Organization, OrganizationListRow } from "@/types/database";
import { formatErrorMessage } from "@/lib/errors";

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [org, setOrg] = React.useState<Organization | null>(null);
  const [agencies, setAgencies] = React.useState<OrganizationListRow[]>([]);
  const [parentBranch, setParentBranch] = React.useState<Organization | null>(null);
  const [profileNames, setProfileNames] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getOrganization(id);
      setOrg(data);

      const names = await getProfileNames([data.created_by, data.updated_by]);
      setProfileNames(names);

      if (data.organization_type === "BRANCH") {
        const kids = await listAgenciesOfBranch(data.id);
        setAgencies(kids);
        setParentBranch(null);
      } else if (data.parent_branch_id) {
        const parent = await getOrganization(data.parent_branch_id);
        setParentBranch(parent);
        setAgencies([]);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!org) return;
    try {
      await deleteOrganization(org.id);
      toast({ title: "삭제되었습니다.", variant: "success" });
      navigate(org.organization_type === "BRANCH" ? "/branches" : "/agencies");
    } catch (e) {
      toast({
        title: "삭제할 수 없습니다.",
        description: formatErrorMessage(e),
        variant: "destructive",
      });
    }
  }

  if (loading || !org) {
    return <div className="p-6 text-sm text-muted-foreground">불러오는 중...</div>;
  }

  const label = org.organization_type === "BRANCH" ? "지사" : "지사기관";

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> 뒤로
      </button>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">{label} 상세정보</div>
            <CardTitle className="text-lg">{org.organization_name}</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/organizations/${org.id}/edit`)}>
              <Pencil className="h-3.5 w-3.5" /> 수정
            </Button>
            {isAdmin && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> 삭제
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {org.organization_type === "AGENCY" && parentBranch && (
            <div className="mb-4 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <Building2 className="h-4 w-4 text-primary" />
              소속지사:
              <Link to={`/organizations/${parentBranch.id}`} className="font-medium text-primary hover:underline">
                {parentBranch.organization_name}
              </Link>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="권역" value={org.region} />
            <Field label={org.organization_type === "BRANCH" ? "지사명" : "기관명"} value={org.organization_name} />
            {org.organization_type === "BRANCH" && (
              <Field label="지사코드" value={org.branch_code && <span className="font-mono">{org.branch_code}</span>} />
            )}
            {org.organization_type === "BRANCH" && (
              <Field label="지사 운영구분" value={<BranchBusinessTypeBadge value={org.branch_business_type} />} />
            )}
            <Field label="사업자명" value={org.business_name} />
            <Field label="이름(대표자)" value={org.representative_name} />
            <Field label="사업자등록번호" value={org.business_registration_number} />
            <Field label="전화번호" value={org.telephone} />
            <Field label="휴대폰번호" value={org.mobile} />
            <Field label="아이디" value={org.login_id} />
            <Field label="추천인" value={org.recommender} />
            <Field label="승인여부" value={<ApprovalStatusBadge status={org.approval_status} />} />
            <Field label="가입날짜" value={formatDate(org.join_date)} />
            <Field label="은행" value={org.bank} />
            <Field label="예금주" value={org.account_holder} />
            <Field label="계좌번호" value={org.account_number} />
            <div className="col-span-2">
              <Field label="주소" value={org.address} />
            </div>
            <div className="col-span-2">
              <Field label="비고" value={org.note} />
            </div>
          </dl>

          <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
            최근 수정 {formatDateTime(org.updated_at)}
            {org.updated_by && ` · ${profileNames[org.updated_by] ?? "-"}`}
          </div>
        </CardContent>
      </Card>

      {org.organization_type === "BRANCH" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>소속 지사기관 {agencies.length}개</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {agencies.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">소속된 지사기관이 없습니다.</p>
            ) : (
              <Table className="border-0">
                <THead>
                  <TR>
                    <TH>기관명</TH>
                    <TH>사업자명</TH>
                    <TH>이름</TH>
                    <TH>휴대폰번호</TH>
                    <TH>승인여부</TH>
                  </TR>
                </THead>
                <TBody>
                  {agencies.map((a) => (
                    <TR key={a.id} clickable onClick={() => navigate(`/organizations/${a.id}`)}>
                      <TD className="font-medium">{a.organization_name}</TD>
                      <TD>{a.business_name || "-"}</TD>
                      <TD>{a.representative_name || "-"}</TD>
                      <TD>{a.mobile || "-"}</TD>
                      <TD>
                        <ApprovalStatusBadge status={a.approval_status} />
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`${label}를 삭제하시겠습니까?`}
        description="삭제된 데이터는 복구할 수 없습니다."
        destructive
        confirmLabel="삭제"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value || "-"}</dd>
    </div>
  );
}
