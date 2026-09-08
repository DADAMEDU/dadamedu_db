import { Badge } from "@/components/ui/badge";
import type { BranchBusinessType } from "@/types/database";

export const BRANCH_BUSINESS_TYPE_LABELS: Record<BranchBusinessType, string> = {
  EXISTING_ONLY: "기존만",
  NEW_ONLY: "신규만",
  BOTH: "기존+신규",
};

export function branchBusinessTypeLabel(value: BranchBusinessType | null | undefined): string {
  if (!value) return "미설정";
  return BRANCH_BUSINESS_TYPE_LABELS[value] ?? value;
}

export function BranchBusinessTypeBadge({ value }: { value: BranchBusinessType | null | undefined }) {
  if (!value) return <Badge variant="outline">미설정</Badge>;
  if (value === "EXISTING_ONLY") return <Badge variant="default">기존만</Badge>;
  if (value === "NEW_ONLY") return <Badge variant="primary">신규만</Badge>;
  return <Badge variant="success">기존+신규</Badge>;
}

export function ApprovalStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">-</Badge>;
  if (status === "승인완료") return <Badge variant="success">승인완료</Badge>;
  if (status === "승인대기") return <Badge variant="warning">승인대기</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export function OrganizationTypeBadge({ type }: { type: "BRANCH" | "AGENCY" }) {
  return type === "BRANCH" ? (
    <Badge variant="primary">지사</Badge>
  ) : (
    <Badge variant="default">지사기관</Badge>
  );
}
