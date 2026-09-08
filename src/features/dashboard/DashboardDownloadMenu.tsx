import * as React from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/auth/AuthProvider";
import { formatErrorMessage } from "@/lib/errors";
import type { RegionGroup } from "@/features/dashboard/useRegionGroupedBranches";
import type { DashboardSummary } from "@/types/database";

interface Props {
  summary: DashboardSummary | null;
  groups: RegionGroup[] | null;
}

/**
 * 대시보드 상단의 "다운로드" 버튼. PDF는 로그인한 누구나, Excel은 기존 다운로드
 * 권한 정책(ADMIN)을 그대로 따른다 — 다른 화면의 "검색결과/전체 데이터 다운로드"
 * 버튼과 동일하게 isAdmin일 때만 노출한다.
 *
 * PDF/Excel 생성 라이브러리(jspdf, html2canvas, xlsx)는 이 메뉴를 실제로 열기
 * 전까지 번들에 포함되지 않도록 동적 import로 지연 로딩한다.
 */
export function DashboardDownloadMenu({ summary, groups }: Props) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  const dataReady = Boolean(summary && groups);

  async function handlePdf() {
    if (!summary || !groups) return;
    setOpen(false);
    setGenerating(true);
    try {
      const { downloadDashboardPdf } = await import("@/features/dashboard/dashboardPdfExport");
      await downloadDashboardPdf(summary, groups);
    } catch (e) {
      toast({
        title: "대시보드 파일을 생성하지 못했습니다.",
        description: formatErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleExcel() {
    if (!summary || !groups) return;
    setOpen(false);
    setGenerating(true);
    try {
      const { downloadDashboardExcel } = await import("@/features/dashboard/dashboardExcelExport");
      downloadDashboardExcel(summary, groups);
    } catch (e) {
      toast({
        title: "대시보드 파일을 생성하지 못했습니다.",
        description: formatErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={generating || !dataReady} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          {generating ? "생성 중..." : "다운로드"}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button
          type="button"
          onClick={handlePdf}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
        >
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          PDF 다운로드
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={handleExcel}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
            Excel 다운로드
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
