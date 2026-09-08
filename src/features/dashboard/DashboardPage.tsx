import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Building, Database, CheckCircle2, Clock, History, Sparkles, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getBranchAgencyCounts, getDashboardSummary } from "@/features/organizations/api";
import type { BranchAgencyCount, DashboardSummary } from "@/types/database";

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [counts, setCounts] = React.useState<BranchAgencyCount[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([getDashboardSummary(), getBranchAgencyCounts()])
      .then(([s, c]) => {
        setSummary(s);
        setCounts(c);
      })
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
      <h1 className="text-lg font-semibold">대시보드</h1>

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

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-3 text-sm font-semibold">지사별 지사기관 수</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : counts.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 지사가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              {counts.map((c) => (
                <button
                  key={c.branch_id}
                  onClick={() => navigate(`/organizations/${c.branch_id}`)}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm hover:border-primary hover:bg-primary/5"
                >
                  <span className="font-medium">{c.branch_name}</span>
                  <span className="text-muted-foreground">기관 {c.agency_count}개</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
