-- ============================================================================
-- 0002_functions_triggers.sql
-- 함수 / 트리거: 정규화, 무결성 보호, 변경이력 자동 기록, 권한 체크
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 숫자만 추출 (전화번호 / 사업자등록번호 정규화용)
-- ----------------------------------------------------------------------------
create or replace function normalize_digits(input text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(input, ''), '\D', '', 'g'), '')
$$;

-- ----------------------------------------------------------------------------
-- is_admin(): 현재 로그인 사용자가 ADMIN인지 확인 (RLS 정책에서 재사용)
-- profiles 자체가 RLS 적용 대상이므로 security definer + search_path 고정으로
-- 정책 평가 중 재귀적 RLS 평가를 피한다.
-- ----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'ADMIN'
  )
$$;

-- ----------------------------------------------------------------------------
-- organizations: INSERT/UPDATE 시 정규화 컬럼 + updated_at + 작성자/수정자 자동 설정
-- created_by/updated_by는 클라이언트가 보낸 값을 신뢰하지 않고 항상 서버에서
-- auth.uid() 기준으로 덮어써서, 다른 사용자로 위장해 기록되는 것을 막는다.
-- ----------------------------------------------------------------------------
create or replace function organizations_before_write()
returns trigger
language plpgsql
as $$
begin
  new.business_registration_number_normalized := normalize_digits(new.business_registration_number);
  new.telephone_normalized := normalize_digits(new.telephone);
  new.mobile_normalized := normalize_digits(new.mobile);
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_organizations_before_write on organizations;
create trigger trg_organizations_before_write
  before insert or update on organizations
  for each row execute function organizations_before_write();

-- ----------------------------------------------------------------------------
-- parent_branch_id는 실제로 organization_type='BRANCH'인 행만 가리킬 수 있음
-- ----------------------------------------------------------------------------
create or replace function organizations_validate_parent()
returns trigger
language plpgsql
as $$
declare
  v_parent_type text;
begin
  if new.parent_branch_id is not null then
    select organization_type into v_parent_type
    from organizations where id = new.parent_branch_id;

    if v_parent_type is null then
      raise exception '소속지사로 지정한 조직을 찾을 수 없습니다.' using errcode = '23514';
    end if;

    if v_parent_type <> 'BRANCH' then
      raise exception '소속지사는 반드시 지사(BRANCH)여야 합니다.' using errcode = '23514';
    end if;

    if new.parent_branch_id = new.id then
      raise exception '자기 자신을 소속지사로 지정할 수 없습니다.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_organizations_validate_parent on organizations;
create trigger trg_organizations_validate_parent
  before insert or update on organizations
  for each row execute function organizations_validate_parent();

-- ----------------------------------------------------------------------------
-- 지사기관이 소속된 지사는 삭제 차단 (요구사항 25)
-- ----------------------------------------------------------------------------
create or replace function organizations_block_branch_delete()
returns trigger
language plpgsql
as $$
begin
  if old.organization_type = 'BRANCH' and exists (
    select 1 from organizations where parent_branch_id = old.id
  ) then
    raise exception '현재 이 지사에 소속된 지사기관이 있습니다. 지사기관을 다른 지사로 이동하거나 삭제한 후 지사를 삭제할 수 있습니다.'
      using errcode = '23503';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_organizations_block_branch_delete on organizations;
create trigger trg_organizations_block_branch_delete
  before delete on organizations
  for each row execute function organizations_block_branch_delete();

-- ----------------------------------------------------------------------------
-- 변경 이력 자동 기록 (CREATE / UPDATE / DELETE)
-- 대량등록(RPC import_organizations_*)은 app.bulk_import 세션변수로 건별 기록을 끄고
-- RPC 마지막에 IMPORT 요약 1건만 남긴다 (요구사항 29: 무한정 중복 저장 방지).
-- ----------------------------------------------------------------------------
create or replace function organizations_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before jsonb;
  v_after jsonb;
begin
  if coalesce(current_setting('app.bulk_import', true), 'off') = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    insert into audit_logs (user_id, action, target_type, target_id, before_data, after_data)
    values (auth.uid(), 'CREATE', new.organization_type, new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    insert into audit_logs (user_id, action, target_type, target_id, before_data, after_data)
    values (
      auth.uid(), 'UPDATE', new.organization_type, new.id,
      -- 값이 실제로 바뀐 필드만 before/after에 남겨 저장 용량 절약
      (select jsonb_object_agg(key, v_before -> key) from jsonb_object_keys(v_before) as key
        where v_before -> key is distinct from v_after -> key),
      (select jsonb_object_agg(key, v_after -> key) from jsonb_object_keys(v_after) as key
        where v_before -> key is distinct from v_after -> key)
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_logs (user_id, action, target_type, target_id, before_data, after_data)
    values (auth.uid(), 'DELETE', old.organization_type, old.id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_organizations_audit_log on organizations;
create trigger trg_organizations_audit_log
  after insert or update or delete on organizations
  for each row execute function organizations_audit_log();

-- ----------------------------------------------------------------------------
-- auth.users 신규 가입 시 profiles 행 자동 생성 (기본 role=USER)
-- Supabase Dashboard에서 직접 만든 최초 ADMIN 계정도 이 트리거로 profiles가 생기며,
-- 이후 SQL로 role을 ADMIN으로 올려준다 (README 참고).
-- ----------------------------------------------------------------------------
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'USER')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_handle_new_auth_user on auth.users;
create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- profiles.updated_at 자동 갱신
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 지사별 지사기관 수 집계 뷰 (대시보드/지사 목록에서 사용, 수동 카운트 필드 없음)
-- ----------------------------------------------------------------------------
create or replace view branch_agency_counts
with (security_invoker = true) as
select
  b.id as branch_id,
  b.organization_name as branch_name,
  count(a.id) as agency_count
from organizations b
left join organizations a
  on a.parent_branch_id = b.id and a.organization_type = 'AGENCY'
where b.organization_type = 'BRANCH'
group by b.id, b.organization_name;

-- ----------------------------------------------------------------------------
-- 대시보드 요약 통계 함수 (한 번의 호출로 카드 5개 값 반환)
-- ----------------------------------------------------------------------------
create or replace function dashboard_summary()
returns table (
  total_branches bigint,
  total_agencies bigint,
  total_organizations bigint,
  approved_count bigint,
  pending_count bigint
)
language sql
stable
security invoker
as $$
  select
    count(*) filter (where organization_type = 'BRANCH'),
    count(*) filter (where organization_type = 'AGENCY'),
    count(*),
    count(*) filter (where approval_status = '승인완료'),
    count(*) filter (where approval_status is distinct from '승인완료')
  from organizations
$$;

-- ----------------------------------------------------------------------------
-- Excel 대량등록 RPC (ADMIN 전용, 서버측 권한 검사 포함)
-- 지사(BRANCH) 먼저 import 후, parent_branch_id를 채운 지사기관(AGENCY)을 import한다.
-- p_mode: 'skip'  -> 사업자등록번호 중복 시 건너뛰기 (기본값)
--         'update'-> 사업자등록번호 중복 시 기존 데이터 갱신
-- ----------------------------------------------------------------------------
create or replace function import_organizations(p_rows jsonb, p_mode text default 'skip')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int := 0;
  v_updated int := 0;
  v_total int;
begin
  if not is_admin() then
    raise exception 'Excel 일괄등록은 관리자만 수행할 수 있습니다.' using errcode = '42501';
  end if;

  v_total := jsonb_array_length(p_rows);
  perform set_config('app.bulk_import', 'on', true);

  if p_mode = 'update' then
    with src as (
      select * from jsonb_to_recordset(p_rows) as x(
        organization_type text, parent_branch_id uuid, region text, member text,
        recommender text, number text, login_id text, organization_name text,
        business_name text, representative_name text, business_registration_number text,
        telephone text, mobile text, address text, approval_status text,
        join_date date, bank text, account_holder text, account_number text, note text
      )
    ),
    ins as (
      insert into organizations (
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, created_by, updated_by
      )
      select
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, auth.uid(), auth.uid()
      from src
      on conflict (business_registration_number_normalized)
        where business_registration_number_normalized is not null
      do update set
        organization_name = excluded.organization_name,
        business_name = excluded.business_name,
        representative_name = excluded.representative_name,
        telephone = excluded.telephone,
        mobile = excluded.mobile,
        address = excluded.address,
        approval_status = excluded.approval_status,
        join_date = excluded.join_date,
        bank = excluded.bank,
        account_holder = excluded.account_holder,
        account_number = excluded.account_number,
        note = excluded.note,
        region = excluded.region,
        member = excluded.member,
        recommender = excluded.recommender,
        number = excluded.number,
        login_id = excluded.login_id,
        updated_by = auth.uid()
      returning (xmax = 0) as is_insert
    )
    select count(*) filter (where is_insert), count(*) filter (where not is_insert)
      into v_inserted, v_updated
      from ins;
  else
    with src as (
      select * from jsonb_to_recordset(p_rows) as x(
        organization_type text, parent_branch_id uuid, region text, member text,
        recommender text, number text, login_id text, organization_name text,
        business_name text, representative_name text, business_registration_number text,
        telephone text, mobile text, address text, approval_status text,
        join_date date, bank text, account_holder text, account_number text, note text
      )
    ),
    ins as (
      insert into organizations (
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, created_by, updated_by
      )
      select
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, auth.uid(), auth.uid()
      from src
      on conflict (business_registration_number_normalized)
        where business_registration_number_normalized is not null
      do nothing
      returning 1
    )
    select count(*) into v_inserted from ins;
  end if;

  perform set_config('app.bulk_import', 'off', true);

  return jsonb_build_object(
    'total', v_total,
    'inserted', v_inserted,
    'updated', v_updated,
    'skipped', v_total - v_inserted - v_updated
  );
exception when others then
  perform set_config('app.bulk_import', 'off', true);
  raise;
end;
$$;

-- ----------------------------------------------------------------------------
-- Import 완료 후 요약 감사이력 1건 기록 (ADMIN 전용)
-- ----------------------------------------------------------------------------
create or replace function log_import_summary(p_summary jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Excel 일괄등록은 관리자만 수행할 수 있습니다.' using errcode = '42501';
  end if;

  insert into audit_logs (user_id, action, target_type, target_id, before_data, after_data)
  values (auth.uid(), 'IMPORT', 'ORGANIZATION', null, null, p_summary);
end;
$$;
