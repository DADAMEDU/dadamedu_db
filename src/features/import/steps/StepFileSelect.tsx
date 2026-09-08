import * as React from "react";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { parseExcelFile, type ParsedExcelResult } from "@/features/import/excelParser";
import { useToast } from "@/components/ui/toast";
import { formatErrorMessage } from "@/lib/errors";

interface Props {
  onParsed: (file: File, parsed: ParsedExcelResult) => void;
}

export function StepFileSelect({ onParsed }: Props) {
  const { toast } = useToast();
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setAnalyzing(true);
    try {
      const parsed = await parseExcelFile(file);
      if (parsed.rows.length === 0) {
        toast({ title: "데이터 행을 찾을 수 없습니다.", description: "헤더 행 인식에 실패했을 수 있습니다.", variant: "destructive" });
        return;
      }
      onParsed(file, parsed);
    } catch (e) {
      toast({
        title: "파일을 분석하지 못했습니다.",
        description: formatErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div
          className="flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-10 text-center hover:border-primary hover:bg-primary/5"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
        >
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">엑셀 파일을 선택하거나 이곳에 끌어다 놓으세요</p>
            <p className="mt-1 text-xs text-muted-foreground">.xlsx, .csv 파일 지원</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </div>

        {fileName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            {fileName}
            {analyzing && <span>· 분석 중...</span>}
          </div>
        )}

        <Button variant="outline" onClick={() => inputRef.current?.click()}>
          파일 선택
        </Button>
      </CardContent>
    </Card>
  );
}
