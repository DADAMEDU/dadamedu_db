// admin-create-user
//
// 관리자 전용 팀원 계정 생성 Edge Function.
// service_role 키는 이 서버 함수 안에서만 사용되며 브라우저로 절대 전달되지 않는다.
//
// 요청 흐름:
//  1) 호출자의 Authorization 헤더(로그인한 ADMIN의 access token)로 신원 확인
//  2) profiles 테이블에서 호출자가 ADMIN인지 확인
//  3) service_role 클라이언트로 auth.admin.createUser() 호출 (팀원 계정 생성)
//  4) DB 트리거(handle_new_auth_user)가 profiles 행을 자동 생성
//  5) audit_logs에 사용자 생성 이력 기록
//
// 배포: supabase functions deploy admin-create-user
// 환경변수(Supabase에서 자동 주입): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "POST 요청만 허용됩니다." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "인증 정보가 없습니다." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // 호출자 신원 확인용 (RLS 그대로 적용되는 anon 클라이언트 + 호출자 토큰)
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: callerUser, error: callerErr } = await callerClient.auth.getUser();
  if (callerErr || !callerUser?.user) {
    return json({ error: "유효하지 않은 인증 정보입니다." }, 401);
  }

  const { data: callerProfile, error: profileErr } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", callerUser.user.id)
    .single();

  if (profileErr || callerProfile?.role !== "ADMIN") {
    return json({ error: "관리자만 팀원 계정을 생성할 수 있습니다." }, 403);
  }

  let payload: { email?: string; password?: string; name?: string; role?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "요청 본문이 올바르지 않습니다." }, 400);
  }

  const { email, password, name } = payload;
  const role = payload.role === "ADMIN" ? "ADMIN" : "USER";

  if (!email || !password || !name) {
    return json({ error: "email, password, name은 필수입니다." }, 400);
  }
  if (password.length < 8) {
    return json({ error: "비밀번호는 8자 이상이어야 합니다." }, 400);
  }

  // service_role: 서버(Edge Function) 내부에서만 사용, 브라우저로 노출되지 않음
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (createErr || !created?.user) {
    return json({ error: createErr?.message ?? "계정 생성에 실패했습니다." }, 400);
  }

  // handle_new_auth_user 트리거가 기본 role='USER'로 profile을 만들 수 있으므로 확정 반영
  await adminClient
    .from("profiles")
    .update({ name, role })
    .eq("id", created.user.id);

  await adminClient.from("audit_logs").insert({
    user_id: callerUser.user.id,
    action: "CREATE",
    target_type: "USER",
    target_id: created.user.id,
    after_data: { email, name, role },
  });

  return json({
    id: created.user.id,
    email: created.user.email,
    name,
    role,
  });
});
