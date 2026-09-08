import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WizardStepper } from "@/features/import/WizardStepper";
import { StepFileSelect } from "@/features/import/steps/StepFileSelect";
import { StepMapping } from "@/features/import/steps/StepMapping";
import { StepPreview } from "@/features/import/steps/StepPreview";
import { StepValidate } from "@/features/import/steps/StepValidate";
import { StepRelationship } from "@/features/import/steps/StepRelationship";
import { StepFinal } from "@/features/import/steps/StepFinal";
import type { ParsedExcelResult } from "@/features/import/excelParser";
import type { ColumnMapping, ImportRow } from "@/features/import/types";
import { guessColumnMapping } from "@/features/import/columnMapping";
import { buildImportRows } from "@/features/import/branchAgencyRule";
import { validateRows, summarizeRows } from "@/features/import/validateRows";
import { runImport, type DuplicatePolicy, type ImportProgress, type ImportSummary } from "@/features/import/importExecutor";
import { useToast } from "@/components/ui/toast";

export function ImportWizardPage() {
  const { toast } = useToast();
  const [step, setStep] = React.useState(1);

  const [parsed, setParsed] = React.useState<ParsedExcelResult | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [validating, setValidating] = React.useState(false);

  const [mode, setMode] = React.useState<DuplicatePolicy>("skip");
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState<ImportProgress | null>(null);
  const [result, setResult] = React.useState<ImportSummary | null>(null);

  function resetAll() {
    setStep(1);
    setParsed(null);
    setMapping({});
    setImportRows([]);
    setResult(null);
    setProgress(null);
  }

  function handleParsed(_file: File, parseResult: ParsedExcelResult) {
    setParsed(parseResult);
    setMapping(guessColumnMapping(parseResult.headers));
    setStep(2);
  }

  function handleMappingNext() {
    if (!parsed) return;
    const built = buildImportRows(parsed, mapping);
    setImportRows(built);
    setStep(3);
  }

  async function handlePreviewNext() {
    setStep(4);
    setValidating(true);
    try {
      const validated = await validateRows([...importRows]);
      setImportRows(validated);
    } catch (e) {
      toast({
        title: "검증 중 오류가 발생했습니다.",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleRunImport() {
    setRunning(true);
    setProgress(null);
    try {
      const summary = await runImport(importRows, mode, setProgress);
      setResult(summary);
      toast({ title: "일괄등록이 완료되었습니다.", variant: "success" });
    } catch (e) {
      toast({
        title: "일괄등록에 실패했습니다.",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }

  const validationSummary = summarizeRows(importRows);
  const canProceedFromValidate = validationSummary.total > 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Excel 일괄등록</h1>
        <p className="text-sm text-muted-foreground">기존 Excel 목록을 한 번에 등록합니다. (관리자 전용)</p>
      </div>

      <WizardStepper current={step} />

      {step === 1 && <StepFileSelect onParsed={handleParsed} />}

      {step === 2 && parsed && (
        <>
          <StepMapping parsed={parsed} mapping={mapping} onChange={setMapping} />
          <WizardNav onBack={resetAll} onNext={handleMappingNext} nextLabel="다음: 데이터 미리보기" />
        </>
      )}

      {step === 3 && (
        <>
          <StepPreview rows={importRows} />
          <WizardNav onBack={() => setStep(2)} onNext={handlePreviewNext} nextLabel="다음: 오류·중복 검사" />
        </>
      )}

      {step === 4 && (
        <>
          <StepValidate rows={importRows} validating={validating} />
          {!validating && (
            <WizardNav
              onBack={() => setStep(3)}
              onNext={() => setStep(5)}
              nextLabel="다음: 관계 확인"
              nextDisabled={!canProceedFromValidate}
            />
          )}
        </>
      )}

      {step === 5 && (
        <>
          <StepRelationship rows={importRows} />
          <WizardNav onBack={() => setStep(4)} onNext={() => setStep(6)} nextLabel="다음: 최종 등록" />
        </>
      )}

      {step === 6 && (
        <>
          <StepFinal
            rows={importRows}
            mode={mode}
            onModeChange={setMode}
            running={running}
            progress={progress}
            result={result}
            onRun={handleRunImport}
          />
          <div className="flex justify-between">
            {!result && (
              <Button variant="outline" onClick={() => setStep(5)} disabled={running}>
                이전
              </Button>
            )}
            {result && (
              <Button variant="outline" onClick={resetAll} className="ml-auto">
                새 파일 등록하기
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function WizardNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex justify-between p-3">
        <Button variant="outline" onClick={onBack}>
          이전
        </Button>
        <Button onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
