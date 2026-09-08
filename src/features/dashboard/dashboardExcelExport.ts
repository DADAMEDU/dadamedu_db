import * as XLSX from "xlsx";
import { branchBusinessTypeLabel } from "@/features/organizations/StatusBadge";
import type { RegionGroup } from "@/features/dashboard/useRegionGroupedBranches";
import type { DashboardSummary } from "@/types/database";

/**
 * 대시보드 현황을 Excel(.xlsx)로 내려받는다. 화면에서 이미 계산된 summary/groups를
 * 그대로 받아 시트만 구성하므로 별도 Supabase 조회는 전혀 없고, 숫자도 화면과 항상 같다.
 */
export function downloadDashboardExcel(summary: DashboardSummary, groups: RegionGroup[]) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: 전체현황 (전체 집계 + 운영구분별 집계, 두 개의 소표를 한 시트에)
  const overallSheetData: (string | number)[][] = [
    ["항목", "수량"],
    ["전체 지사", summary.total_branches],
    ["전체 지사기관", summary.total_agencies],
    ["전체 등록건수", summary.total_organizations],
    ["승인완료", summary.approved_count],
    ["승인대기", summary.pending_count],
    [],
    ["운영구분", "지사수"],
    ["기존만", summary.existing_only_branches],
    ["신규만", summary.new_only_branches],
    ["기존+신규", summary.both_branches],
  ];
  const overallSheet = XLSX.utils.aoa_to_sheet(overallSheetData);
  overallSheet["!cols"] = [{ wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, overallSheet, "전체현황");

  // Sheet 2: 권역별현황
  const regionSheetData: (string | number)[][] = [
    ["권역", "지사 수", "지사기관 수"],
    ...groups.map((g) => [g.region, g.branches.length, g.agencyTotal]),
  ];
  const regionSheet = XLSX.utils.aoa_to_sheet(regionSheetData);
  regionSheet["!cols"] = [{ wch: 16 }, { wch: 10 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, regionSheet, "권역별현황");

  // Sheet 3: 지사별현황 (전체 지사 개별 목록)
  const branchSheetData: (string | number)[][] = [
    ["권역", "지사코드", "지사명", "지사 운영구분", "지사기관 수"],
    ...groups.flatMap((g) =>
      g.branches.map((b) => [
        g.region,
        b.branchCode ?? "",
        b.name,
        branchBusinessTypeLabel(b.businessType),
        b.agencyCount,
      ])
    ),
  ];
  const branchSheet = XLSX.utils.aoa_to_sheet(branchSheetData);
  branchSheet["!cols"] = [{ wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, branchSheet, "지사별현황");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `지사통합관리_대시보드_${today}.xlsx`);
}
