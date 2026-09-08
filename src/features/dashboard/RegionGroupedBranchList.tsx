import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { REGION_ACCENT_CLASSES, regionSectionDomId } from "@/features/dashboard/regionStyles";
import type { RegionGroup } from "@/features/dashboard/useRegionGroupedBranches";

interface Props {
  groups: RegionGroup[] | null;
  loading: boolean;
  error: string | null;
}

/**
 * 지사별 지사기관 수를 권역(region)별로 그룹화해서 보여준다.
 * 데이터는 부모(DashboardPage)로부터 받는다 — RegionSummaryCards와 동일한
 * useRegionGroupedBranches() 결과를 공유해서 숫자가 항상 일치하고, Supabase
 * 쿼리도 대시보드 전체에서 한 번만 실행된다.
 */
export function RegionGroupedBranchList({ groups, loading, error }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  function toggle(region: string) {
    setExpanded((prev) => ({ ...prev, [region]: !(prev[region] ?? true) }));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">불러오는 중...</p>;
  }
  if (error) {
    return (
      <p className="text-sm text-destructive">
        지사별 지사기관 수를 불러오는 중 오류가 발생했습니다.
        <span className="mt-0.5 block text-xs text-muted-foreground">{error}</span>
      </p>
    );
  }
  if (!groups || groups.length === 0) {
    return <p className="text-sm text-muted-foreground">등록된 지사가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => {
        const isOpen = expanded[g.region] ?? true;
        return (
          <Card key={g.region} id={regionSectionDomId(g.region)} className="overflow-hidden scroll-mt-4">
            <button
              type="button"
              onClick={() => toggle(g.region)}
              className={`flex w-full items-center justify-between px-4 py-3 text-left ${REGION_ACCENT_CLASSES} ${
                isOpen ? "border-b border-border" : ""
              }`}
              aria-expanded={isOpen}
            >
              <span className="flex items-center gap-1.5">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-bold">{g.region}</span>
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                지사 {g.branches.length}개 · 지사기관 {g.agencyTotal}개
              </span>
            </button>

            {isOpen && (
              <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-4">
                {g.branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate(`/organizations/${b.id}`)}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5"
                  >
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground">기관 {b.agencyCount}개</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
