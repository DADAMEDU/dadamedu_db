import { Building2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportRow } from "@/features/import/types";

interface Props {
  rows: ImportRow[];
}

export function StepRelationship({ rows }: Props) {
  const branches = rows.filter((r) => r.organizationType === "BRANCH");
  const agencies = rows.filter((r) => r.organizationType === "AGENCY");
  const orphanAgencies = agencies.filter((a) => !a.parentBranchExcelRow);

  const groups = branches.map((branch) => ({
    branch,
    children: agencies.filter((a) => a.parentBranchExcelRow === branch.excelRowNumber),
  }));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        엑셀 행 순서를 기준으로 지사기관을 바로 위 지사에 연결했습니다. 아래 관계를 확인하세요.
      </p>

      {orphanAgencies.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            소속지사를 찾지 못한 지사기관이 {orphanAgencies.length}건 있습니다. (Excel 행:{" "}
            {orphanAgencies.map((a) => a.excelRowNumber).join(", ")}) 이 행들은 오류로 표시되어 등록에서 제외됩니다.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {groups.map(({ branch, children }) => (
          <Card key={branch.excelRowNumber}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 font-medium">
                <Building2 className="h-4 w-4 text-primary" />
                {branch.organizationName || `(${branch.excelRowNumber}행, 지사명 없음)`}
                <span className="ml-auto text-xs font-normal text-muted-foreground">기관 {children.length}개</span>
              </div>
              {children.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {children.slice(0, 6).map((c) => (
                    <li key={c.excelRowNumber}>· {c.organizationName || `(${c.excelRowNumber}행)`}</li>
                  ))}
                  {children.length > 6 && <li>· 외 {children.length - 6}건</li>}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
