import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ImportRow } from "@/features/import/types";
import type { DuplicatePolicy, ImportProgress, ImportSummary } from "@/features/import/importExecutor";
import { summarizeRows } from "@/features/import/validateRows";
import { cn } from "@/lib/cn";

interface Props {
  rows: ImportRow[];
  mode: DuplicatePolicy;
  onModeChange: (mode: DuplicatePolicy) => void;
  running: boolean;
  progress: ImportProgress | null;
  result: ImportSummary | null;
  onRun: () => void;
}

export function StepFinal({ rows, mode, onModeChange, running, progress, result, onRun }: Props) {
  const summary = summarizeRows(rows);
  const willImport = summary.total - summary.오류;

  if (result) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <h3 className="text-base font-semibold">등록이 완료되었습니다</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <span className="text-muted-foreground">전체</span>
            <span className="text-right font-medium">{result.total.toLocaleString()}</span>
            <span className="text-muted-foreground">등록성공</span>
            <span className="text-right font-medium text-success">
              {(result.inserted + result.updated).toLocaleString()}
            </span>
            <span className="text-muted-foreground">중복제외</span>
            <span className="text-right font-medium">{result.skipped.toLocaleString()}</span>
            <span className="text-muted-foreground">오류</span>
            <span className="text-right font-medium text-destructive">{result.failed.toLocaleString()}</span>
          </div>
          {result.failedRows.length > 0 && (
            <div className="mt-2 w-full rounded-md border border-border bg-muted/40 p-3 text-left text-xs">
              <p className="mb-1 font-medium">처리되지 못한 행</p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-muted-foreground">
                {result.failedRows.map((f) => (
                  <li key={f.excelRowNumber}>
                    {f.excelRowNumber}행 — {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">중복 데이터 처리 방식</p>
          <div className="flex gap-3">
            <PolicyOption
              label="중복 데이터 건너뛰기 (기본값)"
              description="사업자등록번호가 이미 있으면 새 데이터를 건너뜁니다."
              selected={mode === "skip"}
              onClick={() => onModeChange("skip")}
            />
            <PolicyOption
              label="기존 데이터 업데이트"
              description="사업자등록번호가 이미 있으면 엑셀 값으로 덮어씁니다."
              selected={mode === "update"}
              onClick={() => onModeChange("update")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            오류 {summary.오류}건을 제외한 <span className="font-medium text-foreground">{willImport.toLocaleString()}건</span>이
            등록됩니다.
          </p>

          {running && progress && (
            <div className="w-full max-w-sm">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{progress.phase} 등록 중</span>
                <span>
                  {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}건
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (progress.processed / Math.max(1, progress.total)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <Button onClick={onRun} disabled={running || willImport === 0} size="lg" className="mt-1">
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 등록 중...
              </>
            ) : (
              "최종 등록 실행"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PolicyOption({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md border p-3 text-left text-sm",
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
      )}
    >
      <div className="font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
    </button>
  );
}
