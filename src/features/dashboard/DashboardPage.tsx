import * as React from "react";
import { Building2, Building, Database, CheckCircle2, Clock, History, Sparkles, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardSummary } from "@/features/organizations/api";
import { RegionGroupedBranchList } from "@/features/dashboard/RegionGroupedBranchList";
import { RegionSummaryCards } from "@/features/dashboard/RegionSummaryCards";
import { DashboardDownloadMenu } from "@/features/dashboard/DashboardDownloadMenu";
import { useRegionGroupedBranches } from "@/features/dashboard/useRegionGroupedBranches";
import type { DashboardSummary } from "@/types/database";

export function DashboardPage() {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  // 권역별 지사/기관 데이터는 한 번만 불러와서 요약 카드와 상세 목록이 함께 쓴다
  // (숫자가 항상 일치하고, Supabase 쿼리도 중복되지 않는다).
  const regionGroups = useRegionGroupedBranches();

  React.useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "전체 지사", value: summary?.total_branches ?? 0, icon: Building2, color: "text-primary" },
    { label: "전체 지사기관", value: summary?.total_agencies ?? 0, icon: Building, color: "text-primary" },
    { label: "전체 등록건수", value: summary?.total_organizations ?? 0, icon: Database, color: "text-foreground" },
    { label: "승인완료", value: summary?.approved_count ?? 0, icon: CheckCircle2, color: "text-success" },
    { label: "승인대기", value: summary?.pending_count ?? 0, icon: Clock, color: "text-warning" },
  ];

  const businessTypeCards = [
    { label: "기존만 지사", value: summary?.existing_only_branches ?? 0, icon: History, color: "text-foreground" },
    { label: "신규만 지사", value: summary?.new_only_branches ?? 0, icon: Sparkles, color: "text-primary" },
    { label: "기존+신규 지사", value: summary?.both_branches ?? 0, icon: Layers, color: "text-success" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">대시보드</h1>
        <DashboardDownloadMenu summary={summary} groups={regionGroups.groups} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <div className="mt-1 text-2xl font-semibold">
                  {loading ? "-" : c.value.toLocaleString()}
                </div>
              </div>
              <c.icon className={`h-8 w-8 opacity-80 ${c.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">지사 운영구분별 현황</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {businessTypeCards.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
              >
                <div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  <div className="mt-0.5 text-xl font-semibold">
                    {loading ? "-" : c.value.toLocaleString()}
                  </div>
                </div>
                <c.icon className={`h-6 w-6 opacity-80 ${c.color}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold">권역별 지사 현황</h2>
        <RegionSummaryCards
          groups={regionGroups.groups}
          loading={regionGroups.loading}
          error={regionGroups.error}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold">지사별 지사기관 수</h2>
        <RegionGroupedBranchList
          groups={regionGroups.groups}
          loading={regionGroups.loading}
          error={regionGroups.error}
        />
      </div>
    </div>
  );
}
