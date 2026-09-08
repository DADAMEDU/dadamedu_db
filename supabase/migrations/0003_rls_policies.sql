-- ============================================================================
-- 0003_rls_policies.sql
-- Row Level Security 활성화 및 정책
-- 원칙: ANON은 아무것도 못 봄. 인증된 사용자만 조회 가능.
--       삭제/사용자관리/일괄등록은 ADMIN만 (RLS + RPC 양쪽에서 검사).
-- ============================================================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table audit_logs enable row level security;

-- 익명 사용자 전면 차단 (명시적으로 grant 자체를 하지 않음)
revoke all on organizations from anon;
revoke all on profiles from anon;
revoke all on audit_logs from anon;

-- ----------------------------------------------------------------------------
-- organizations
-- ----------------------------------------------------------------------------
drop policy if exists org_select_authenticated on organizations;
create policy org_select_authenticated
  on organizations for select
  to authenticated
  using (true);

drop policy if exists org_insert_authenticated on organizations;
create policy org_insert_authenticated
  on organizations for insert
  to authenticated
  with check (true);

drop policy if exists org_update_authenticated on organizations;
create policy org_update_authenticated
  on organizations for update
  to authenticated
  using (true)
  with check (true);

-- 삭제는 ADMIN만 (요구사항 25)
drop policy if exists org_delete_admin_only on organizations;
create policy org_delete_admin_only
  on organizations for delete
  to authenticated
  using (is_admin());

grant select, insert, update, delete on organizations to authenticated;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
-- 변경이력/최근수정자 표시 등 팀원 간 이름 확인이 필요하므로 인증된 사용자는
-- 서로의 기본 프로필(이름/이메일/역할)을 볼 수 있게 한다. 계정 생성/삭제는
-- 별도로 Edge Function(service_role) + ADMIN 검사로 제한되어 있어 안전하다.
drop policy if exists profiles_select_authenticated on profiles;
create policy profiles_select_authenticated
  on profiles for select
  to authenticated
  using (true);

-- 본인 이름만 스스로 수정 가능, role/email은 아래 트리거로 비관리자 변경 차단
drop policy if exists profiles_update_self_or_admin on profiles;
create policy profiles_update_self_or_admin
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- INSERT/DELETE는 정책 없음 = 클라이언트 직접 불가.
-- 신규 계정은 auth.users 트리거(handle_new_auth_user) 또는 admin-create-user
-- Edge Function(service_role)을 통해서만 생성된다.
grant select, update on profiles to authenticated;

-- 비관리자가 자기 role을 직접 상향 조정하지 못하도록 트리거로 차단.
-- service_role(Edge Function 내부에서 계정 생성 직후 role을 확정하는 호출)은 예외로 허용한다 —
-- service_role 연결은 auth.uid()가 없어 is_admin()이 항상 false로 평가되기 때문.
create or replace function profiles_prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and not is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception '권한(role)은 관리자만 변경할 수 있습니다.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_prevent_role_escalation on profiles;
create trigger trg_profiles_prevent_role_escalation
  before update on profiles
  for each row execute function profiles_prevent_role_escalation();

-- ----------------------------------------------------------------------------
-- audit_logs: ADMIN만 조회, 클라이언트 직접 insert/update/delete 불가
-- (조직 변경은 트리거가, IMPORT 요약은 log_import_summary RPC가 기록)
-- ----------------------------------------------------------------------------
drop policy if exists audit_select_admin_only on audit_logs;
create policy audit_select_admin_only
  on audit_logs for select
  to authenticated
  using (is_admin());

grant select on audit_logs to authenticated;

-- ----------------------------------------------------------------------------
-- 함수 실행 권한
-- ----------------------------------------------------------------------------
grant execute on function is_admin() to authenticated;
grant execute on function dashboard_summary() to authenticated;
grant execute on function import_organizations(jsonb, text) to authenticated;
grant execute on function log_import_summary(jsonb) to authenticated;

grant select on branch_agency_counts to authenticated;
