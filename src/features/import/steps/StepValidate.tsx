import * as React from "react";
import { cn } from "@/lib/cn";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ImportRow, RowStatus } from "@/features/import/types";
import { summarizeRows } from "@/features/import/validateRows";

interface Props {
  rows: ImportRow[];
  validating: boolean;
}

const STATUS_VARIANT: Record<RowStatus, "default" | "success" | "warning" | "destructive"> = {
  정상: "success",
  확인필요: "warning",
  중복: "default",
  오류: "destructive",
};

export function StepValidate({ rows, validating }: Props) {
  const [filter, setFilter] = React.useState<RowStatus | "전체">("전체");
  const summary = summarizeRows(rows);

  const visible = filter === "전체" ? rows : rows.filter((r) => r.status === filter);

  if (validating) {
    return <p className="py-12 text-center text-sm text-muted-foreground">검증 중입니다...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2 text-center text-sm">
        <SummaryCard label="총 데이터" value={summary.total} active={filter === "전체"} onClick={() => setFilter("전체")} />
        <SummaryCard label="정상" value={summary.정상} tone="success" active={filter === "정상"} onClick={() => setFilter("정상")} />
        <SummaryCard label="확인필요" value={summary.확인필요} tone="warning" active={filter === "확인필요"} onClick={() => setFilter("확인필요")} />
        <SummaryCard label="중복" value={summary.중복} active={filter === "중복"} onClick={() => setFilter("중복")} />
        <SummaryCard label="오류" value={summary.오류} tone="destructive" active={filter === "오류"} onClick={() => setFilter("오류")} />
      </div>

      <Table>
        <THead>
          <TR>
            <TH>상태</TH>
            <TH>Excel 행번호</TH>
            <TH>권역</TH>
            <TH>구분</TH>
            <TH>소속지사</TH>
            <TH>기관명</TH>
            <TH>사업자명</TH>
            <TH>이름</TH>
            <TH>사업자등록번호</TH>
            <TH>오류내용</TH>
          </TR>
        </THead>
        <TBody>
          {visible.slice(0, 300).map((row) => (
            <TR key={row.excelRowNumber}>
              <TD>
                <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
              </TD>
              <TD>{row.excelRowNumber}행</TD>
              <TD>{row.fields.region || "-"}</TD>
              <TD>{row.organizationType === "BRANCH" ? "지사" : row.organizationType === "AGENCY" ? "지사기관" : "-"}</TD>
              <TD>{row.organizationType === "AGENCY" ? row.parentBranchExcelRow ? `${row.parentBranchExcelRow}행 지사` : "-" : "-"}</TD>
              <TD className="font-medium">{row.organizationName || "-"}</TD>
              <TD>{row.fields.business_name || "-"}</TD>
              <TD>{row.fields.representative_name || "-"}</TD>
              <TD>{row.fields.business_registration_number || "-"}</TD>
              <TD className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                {row.messages.join(" / ") || "-"}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {visible.length > 300 && (
        <p className="text-xs text-muted-foreground">상위 300건만 표시됩니다. (전체 {visible.length}건)</p>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn(
        "flex h-auto flex-col items-center gap-1 py-2.5",
        active && "border-primary bg-primary/5",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "destructive" && "text-destructive"
      )}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold">{value.toLocaleString()}</span>
    </Button>
  );
}
