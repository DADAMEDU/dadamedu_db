import { NavLink } from "react-router-dom";
import { cn } from "@/lib/cn";
import { useAuth } from "@/auth/AuthProvider";
import {
  LayoutDashboard,
  Search,
  Building2,
  Building,
  UploadCloud,
  Download,
  ShieldCheck,
  Users,
  History,
  Settings,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  { items: [{ to: "/dashboard", label: "대시보드", icon: LayoutDashboard }] },
  { items: [{ to: "/search", label: "통합검색", icon: Search }] },
  {
    title: "조직관리",
    items: [
      { to: "/branches", label: "지사 관리", icon: Building2 },
      { to: "/agencies", label: "지사기관 관리", icon: Building },
    ],
  },
  {
    title: "데이터 관리",
    items: [
      { to: "/import", label: "Excel 일괄등록", icon: UploadCloud, adminOnly: true },
      { to: "/export", label: "Excel 다운로드", icon: Download, adminOnly: true },
    ],
  },
  { items: [{ to: "/approvals", label: "승인 관리", icon: ShieldCheck }] },
  {
    title: "관리자",
    items: [
      { to: "/admin/users", label: "사용자 관리", icon: Users, adminOnly: true },
      { to: "/admin/audit-logs", label: "변경 이력", icon: History, adminOnly: true },
    ],
  },
  { items: [{ to: "/settings", label: "설정", icon: Settings }] },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavContent({ isAdmin, onNavigate }: { isAdmin: boolean; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
      {groups.map((group, i) => (
        <div key={i}>
          {group.title && (
            <div className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </div>
          )}
          <div className="space-y-0.5">
            {group.items
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/10"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { isAdmin } = useAuth();

  return (
    <>
      {/* 데스크톱: 항상 보이는 고정 사이드바 */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">지사통합관리</span>
        </div>
        <NavContent isAdmin={isAdmin} />
      </aside>

      {/* 모바일: 오버레이 + 슬라이드 드로어 */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="relative flex h-full w-64 flex-col border-r border-border bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">지사통합관리</span>
              </div>
              <button onClick={onMobileClose} aria-label="메뉴 닫기">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <NavContent isAdmin={isAdmin} onNavigate={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  );
}
