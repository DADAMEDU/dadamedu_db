import * as React from "react";
import { Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAllOrganizations } from "@/features/organizations/api";
import { downloadOrganizationsExcel } from "@/lib/excelExport";
import { useToast } from "@/components/ui/toast";
import { formatErrorMessage } from "@/lib/errors";

export function ExportPage() {
  const { toast } = useToast();
  const [exporting, setExporting] = React.useState<"ALL" | "BRANCH" | "AGENCY" | null>(null);

  async function handleExport(target: "ALL" | "BRANCH" | "AGENCY", filename: string) {
    setExporting(target);
    try {
      const rows = await fetchAllOrganizations({
        organizationType: target === "ALL" ? undefined : target,
      });
      downloadOrganizationsExcel(rows, filename);
      toast({ title: `${rows.length.toLocaleString()}건을 다운로드했습니다.`, variant: "success" });
    } catch (e) {
      toast({
        title: "다운로드에 실패했습니다.",
        description: formatErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Excel 다운로드</h1>
        <p className="text-sm text-muted-foreground">
          현재 등록된 데이터를 Excel(.xlsx) 파일로 내려받습니다. 별도 비용 없이 브라우저에서 바로 생성됩니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4" /> 전체 데이터 백업
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">지사, 지사기관, 소속관계, 주요 정보를 한 파일로 백업합니다.</p>
          <Button onClick={() => handleExport("ALL", "지사관리백업")} disabled={exporting !== null}>
            <Download className="h-4 w-4" /> {exporting === "ALL" ? "다운로드 중..." : "전체 데이터 다운로드"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">지사만 다운로드</p>
              <p className="text-xs text-muted-foreground">지사 목록만 별도 파일로 받습니다.</p>
            </div>
            <Button variant="outline" onClick={() => handleExport("BRANCH", "지사목록")} disabled={exporting !== null}>
              <Download className="h-4 w-4" /> {exporting === "BRANCH" ? "다운로드 중..." : "다운로드"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">지사기관만 다운로드</p>
              <p className="text-xs text-muted-foreground">지사기관 목록만 별도 파일로 받습니다.</p>
            </div>
            <Button variant="outline" onClick={() => handleExport("AGENCY", "지사기관목록")} disabled={exporting !== null}>
              <Download className="h-4 w-4" /> {exporting === "AGENCY" ? "다운로드 중..." : "다운로드"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
