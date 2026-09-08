import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/toast";

export function SettingsPage() {
  const { profile, session } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "비밀번호는 8자 이상이어야 합니다.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "비밀번호가 변경되었습니다.", variant: "success" });
      setPassword("");
    } catch (e) {
      toast({
        title: "변경에 실패했습니다.",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4">
      <h1 className="text-lg font-semibold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>내 계정</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">이름</div>
            <div className="mt-0.5">{profile?.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">이메일</div>
            <div className="mt-0.5">{session?.user.email}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">권한</div>
            <div className="mt-0.5">{profile?.role === "ADMIN" ? "관리자" : "일반사용자"}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-pw">새 비밀번호</Label>
              <Input
                id="new-pw"
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
              />
            </div>
            <Button type="submit" disabled={submitting} className="self-start">
              {submitting ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
