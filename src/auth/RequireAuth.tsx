import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

export function RequireAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        불러오는 중...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <p>이 화면은 관리자(ADMIN)만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return <Outlet />;
}
