import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listAuditLogs } from "@/features/audit/api";
import { labelFor } from "@/features/audit/columnLabels";
import { branchBusinessTypeLabel } from "@/features/organizations/StatusBadge";
import type { BranchBusinessType } from "@/types/database";
import { formatDateTime } from "@/lib/format";
import type { AuditAction, AuditLog } from "@/types/database";

const ACTION_VARIANT: Record<AuditAction, "success" | "primary" | "destructive" | "warning"> = {
  CREATE: "success",
  UPDATE: "primary",
  DELETE: "destructive",
  IMPORT: "warning",
};

const ACTION_LABEL: Record<AuditAction, string> = {
  CREATE: "등록",
  UPDATE: "수정",
  DELETE: "삭제",
  IMPORT: "일괄등록",
};

const ALL = "__all__";

export function AuditLogPage() {
  const [rows, setRows] = React.useState<AuditLog[]>([]);
  const [count, setCount] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(50);
  const [action, setAction] = React.useState<string>("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    listAuditLogs({ page, pageSize, action: action || undefined })
      .then((r) => {
        setRows(r.data);
        setCount(r.count);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, action]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">변경 이력</h1>
          <p className="text-sm text-muted-foreground">누가, 언제, 무엇을 변경했는지 확인합니다.</p>
        </div>
        <Select
          value={action || ALL}
          onValueChange={(v) => {
            setAction(v === ALL ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체 작업</SelectItem>
            <SelectItem value="CREATE">등록</SelectItem>
            <SelectItem value="UPDATE">수정</SelectItem>
            <SelectItem value="DELETE">삭제</SelectItem>
            <SelectItem value="IMPORT">일괄등록</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table className="border-0">
          <THead>
            <TR>
              <TH>일시</TH>
              <TH>작업자</TH>
              <TH>작업</TH>
              <TH>대상</TH>
              <TH>변경내용</TH>
            </TR>
          </THead>
          <TBody>
            {loading ? (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                  불러오는 중...
                </TD>
              </TR>
            ) : rows.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                  변경 이력이 없습니다.
                </TD>
              </TR>
            ) : (
              rows.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap">{formatDateTime(log.created_at)}</TD>
                  <TD>{log.actor_name ?? "-"}</TD>
                  <TD>
                    <Badge variant={ACTION_VARIANT[log.action]}>{ACTION_LABEL[log.action]}</Badge>
                  </TD>
                  <TD>{log.target_type}</TD>
                  <TD className="max-w-[420px] whitespace-normal text-xs">
                    <DiffSummary log={log} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
        <Pagination page={page} pageSize={pageSize} total={count} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}

function DiffSummary({ log }: { log: AuditLog }) {
  if (log.action === "IMPORT") {
    const s = log.after_data as Record<string, number> | null;
    if (!s) return <span className="text-muted-foreground">-</span>;
    return (
      <span>
        전체 {s.total} · 성공 {(s.inserted ?? 0) + (s.updated ?? 0)} · 건너뜀 {s.skipped ?? 0} · 실패 {s.failed ?? 0}
      </span>
    );
  }

  if (log.action === "CREATE") {
    const name = (log.after_data as Record<string, string> | null)?.organization_name;
    return <span className="text-muted-foreground">{name ? `"${name}" 등록됨` : "등록됨"}</span>;
  }

  if (log.action === "DELETE") {
    const name = (log.before_data as Record<string, string> | null)?.organization_name;
    return <span className="text-muted-foreground">{name ? `"${name}" 삭제됨` : "삭제됨"}</span>;
  }

  // UPDATE: before/after에는 실제로 바뀐 필드만 들어있다
  const before = (log.before_data ?? {}) as Record<string, unknown>;
  const after = (log.after_data ?? {}) as Record<string, unknown>;
  const keys = Object.keys(after).filter((k) => !["updated_at", "updated_by"].includes(k));

  if (keys.length === 0) return <span className="text-muted-foreground">-</span>;

  function displayValue(key: string, value: unknown): string {
    if (key === "branch_business_type") {
      return branchBusinessTypeLabel(value as BranchBusinessType | null);
    }
    return value === null || value === undefined ? "-" : String(value);
  }

  return (
    <ul className="space-y-0.5">
      {keys.map((key) => (
        <li key={key}>
          <span className="font-medium">{labelFor(key)}</span>: {displayValue(key, before[key])} →{" "}
          {displayValue(key, after[key])}
        </li>
      ))}
    </ul>
  );
}
