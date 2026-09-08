import * as React from "react";
import { fetchAllOrganizations, getBranchAgencyCounts } from "@/features/organizations/api";
import { formatErrorMessage } from "@/lib/errors";

export const UNSPECIFIED_REGION = "미지정 권역";

export interface BranchRow {
  id: string;
  name: string;
  agencyCount: number;
}

export interface RegionGroup {
  region: string;
  branches: BranchRow[];
  agencyTotal: number;
}

/**
 * 지사를 권역(region)별로 그룹화한 데이터를 한 번만 가져와서 계산한다.
 * 대시보드의 "권역별 지사 현황" 요약 카드와 "지사별 지사기관 수" 상세 목록이
 * 이 훅 하나(=같은 계산 결과)를 공유하므로 두 영역의 숫자가 항상 정확히 일치하고,
 * Supabase 쿼리도 지사 목록 1번 + branch_agency_counts 뷰 1번으로 끝난다
 * (권역/지사마다 반복 조회하는 N+1 구조가 아니다).
 *
 * 지사기관 수는 항상 branch_agency_counts 뷰(= AGENCY.parent_branch_id = BRANCH.id
 * 기준 COUNT)를 그대로 재사용한다. 지사명 문자열 비교로 계산하지 않는다.
 */
export function useRegionGroupedBranches() {
  const [groups, setGroups] = React.useState<RegionGroup[] | null>(null);
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

  return { groups, loading, error };
}
