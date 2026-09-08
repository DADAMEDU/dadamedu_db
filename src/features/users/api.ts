import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types/database";

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) throw error;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

/** service_role 키 없이 Edge Function을 통해 팀원 계정을 생성한다. */
export async function createTeamUser(input: CreateUserInput): Promise<void> {
  const { error } = await supabase.functions.invoke("admin-create-user", { body: input });
  if (error) {
    // Edge Function이 4xx로 응답하면 supabase-js는 FunctionsHttpError를 던지는데,
    // 실제 한국어 에러 메시지는 응답 본문(context)에 있으므로 꺼내서 보여준다.
    const context = (error as { context?: Response }).context;
    let message: string | null = null;
    if (context) {
      try {
        const body = await context.clone().json();
        if (body?.error) message = body.error as string;
      } catch {
        // JSON 파싱 실패 시 무시하고 원본 에러 사용
      }
    }
    throw new Error(message ?? error.message);
  }
}
