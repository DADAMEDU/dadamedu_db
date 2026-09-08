import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { fetchAllOrganizations, getBranchAgencyCounts } from "@/features/organizations/api";
import { formatErrorMessage } from "@/lib/errors";

const UNSPECIFIED_REGION = "미지정 권역";

interface BranchRow {
  id: string;
  name: string;
  agencyCount: number;
}

interface RegionGroup {
  region: string;
  branches: BranchRow[];
  agencyTotal: number;
}

/**
 * 지사별 지사기관 수를 권역(region)별로 그룹화해서 보여준다.
 * 기관 수는 항상 branch_agency_counts 뷰(= parent_branch_id 기준 COUNT)를 그대로 재사용하고,
 * 권역 정보만 지사 목록 조회로 추가로 가져와 프론트에서 합친다 — 지사별로 반복 조회하는
 * N+1 구조가 아니라 요청 2번으로 끝난다.
 */
export function RegionGroupedBranchList() {
  const navigate = useNavigate();
  const [groups, setGroups] = React.useState<RegionGroup[] | null>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [branches, counts] = await Promise.all([
          fetchAllOrganizations({ organizationType: "BRANCH" }),
          getBranchAgencyCounts(),
        ]);
        if (!mounted) return;

        const agencyCountByBranchId = new Map(counts.map((c) => [c.branch_id, c.agency_count]));
        const byRegion = new Map<string, BranchRow[]>();

        for (const branch of branches) {
          const region = branch.region?.trim() || UNSPECIFIED_REGION;
          const row: BranchRow = {
            id: branch.id,
            name: branch.organization_name,
            agencyCount: agencyCountByBranchId.get(branch.id) ?? 0,
          };
          const bucket = byRegion.get(region);
          if (bucket) bucket.push(row);
          else byRegion.set(region, [row]);
        }

        const result: RegionGroup[] = Array.from(byRegion.entries()).map(([region, list]) => ({
          region,
          branches: [...list].sort((a, b) => a.name.localeCompare(b.name, "ko")),
          agencyTotal: list.reduce((sum, r) => sum + r.agencyCount, 0),
        }));

        result.sort((a, b) => {
          if (a.region === UNSPECIFIED_REGION) return 1;
          if (b.region === UNSPECIFIED_REGION) return -1;
          return a.region.localeCompare(b.region, "ko");
        });

        setGroups(result);
        setExpanded((prev) => {
          // 이미 사용자가 접었다 폈다 한 상태는 유지하고, 새로 나타난 권역만 기본 펼침으로 추가한다.
          const next = { ...prev };
          for (const g of result) {
            if (!(g.region in next)) next[g.region] = true;
          }
          return next;
        });
      } catch (e) {
        if (mounted) setError(formatErrorMessage(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

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
          <Card key={g.region} className="overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(g.region)}
              className={`flex w-full items-center justify-between bg-yellow-50 px-4 py-3 text-left hover:bg-yellow-100 ${
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
