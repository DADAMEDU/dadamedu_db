import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, LogOut, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = React.useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4">
      <button
        onClick={onMenuClick}
        className="shrink-0 rounded-md p-1.5 hover:bg-accent md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={handleSearch} className="flex max-w-md flex-1 items-center gap-2">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="지사명, 기관명, 이름, 전화번호, 사업자번호로 통합검색..."
            className="pl-8"
          />
        </div>
      </form>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-1.5 text-sm text-foreground/80 sm:flex">
          <User className="h-4 w-4" />
          <span className="font-medium">{profile?.name ?? "-"}</span>
          <span className="text-xs text-muted-foreground">
            ({isAdmin ? "관리자" : "일반사용자"})
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="gap-1">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">로그아웃</span>
        </Button>
      </div>
    </header>
  );
}
