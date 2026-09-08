import * as React from "react";
import { Plus, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeamUser, listProfiles, updateProfileRole } from "@/features/users/api";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/auth/AuthProvider";
import { formatDateTime } from "@/lib/format";
import type { Profile, UserRole } from "@/types/database";

export function UsersPage() {
  const { toast } = useToast();
  const { profile: myProfile } = useAuth();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await listProfiles());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleRoleChange(id: string, role: UserRole) {
    try {
      await updateProfileRole(id, role);
      toast({ title: "권한이 변경되었습니다.", variant: "success" });
      load();
    } catch (e) {
      toast({
        title: "권한 변경에 실패했습니다.",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">사용자 관리</h1>
          <p className="text-sm text-muted-foreground">팀원 계정을 생성하고 권한을 관리합니다.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> 팀원 계정 생성
        </Button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>이름</TH>
            <TH>이메일</TH>
            <TH>권한</TH>
            <TH>가입일</TH>
          </TR>
        </THead>
        <TBody>
          {loading ? (
            <TR>
              <TD colSpan={4} className="py-8 text-center text-muted-foreground">
                불러오는 중...
              </TD>
            </TR>
          ) : (
            profiles.map((p) => (
              <TR key={p.id}>
                <TD className="flex items-center gap-1.5 font-medium">
                  <UserCog className="h-3.5 w-3.5 text-muted-foreground" />
                  {p.name}
                  {p.id === myProfile?.id && <Badge variant="outline">나</Badge>}
                </TD>
                <TD>{p.email}</TD>
                <TD>
                  <Select value={p.role} onValueChange={(v) => handleRoleChange(p.id, v as UserRole)}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="USER">USER</SelectItem>
                    </SelectContent>
                  </Select>
                </TD>
                <TD>{formatDateTime(p.created_at)}</TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<UserRole>("USER");
  const [submitting, setSubmitting] = React.useState(false);

  function resetForm() {
    setEmail("");
    setPassword("");
    setName("");
    setRole("USER");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTeamUser({ email, password, name, role });
      toast({ title: "계정이 생성되었습니다.", variant: "success" });
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast({
        title: "계정 생성에 실패했습니다.",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>팀원 계정 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">이름</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-email">이메일</Label>
            <Input id="new-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">초기 비밀번호</Label>
            <Input
              id="new-password"
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>권한</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER (일반사용자)</SelectItem>
                <SelectItem value="ADMIN">ADMIN (관리자)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "생성 중..." : "생성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
