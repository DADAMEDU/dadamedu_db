import { Card } from "@/components/ui/card";
import { REGION_ACCENT_CLASSES, regionSectionDomId } from "@/features/dashboard/regionStyles";
import type { RegionGroup } from "@/features/dashboard/useRegionGroupedBranches";

interface Props {
  groups: RegionGroup[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * "권역별 지사 현황" 요약 카드. 지사 수/지사기관 수만 보여주는 작은 카드이며,
 * 클릭하면 아래쪽 "지사별 지사기관 수" 상세 영역의 같은 권역 섹션으로 스크롤한다.
 * 집계는 useRegionGroupedBranches()의 결과를 그대로 받아 쓰므로 상세 영역과
 * 숫자가 항상 동일하다 — 별도로 다시 계산하지 않는다.
 */
export function RegionSummaryCards({ groups, loading, error }: Props) {
  function scrollToRegion(region: string) {
    document.getElementById(regionSectionDomId(region))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        권역별 지사 현황을 불러오는 중 오류가 발생했습니다.
        <span className="mt-0.5 block text-xs text-muted-foreground">{error}</span>
      </p>
    );
  }
  if (!groups || groups.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 지사가 없습니다.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {groups.map((g) => (
        <Card key={g.region} className={`overflow-hidden ${REGION_ACCENT_CLASSES}`}>
          <button
            type="button"
            onClick={() => scrollToRegion(g.region)}
            className="w-full px-3 py-2.5 text-left"
          >
            <div className="truncate text-sm font-bold">{g.region}</div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">지사</span>
              <span className="font-bold">{g.branches.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">지사기관</span>
              <span className="font-bold">{g.agencyTotal}</span>
            </div>
          </button>
        </Card>
      ))}
    </div>
  );
}
