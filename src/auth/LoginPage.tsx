import * as React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  if (session) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) {
      setError(
        error === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : error
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Building2 className="h-6 w-6" />
            <CardTitle className="text-lg">지사·지사기관 통합 관리 시스템</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">팀 계정으로 로그인하세요</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? "로그인 중..." : "로그인"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            계정이 없으신가요? 관리자에게 계정 생성을 요청하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
