-- ============================================================================
-- 0005_branch_business_type.sql
-- 지사(BRANCH) 전용 신규 분류 필드 추가: branch_business_type
--
-- 이 파일은 이미 0001~0004가 적용된 운영 DB에 안전하게 추가 적용하기 위한
-- 증분(migration) 파일이다. 기존 migration 파일(0001~0004)은 절대 수정하지
-- 않는다 — 이미 실행된 migration을 고치면 재적용/재현이 불가능해지므로,
-- 스키마 변경은 항상 새 번호의 파일로만 추가한다.
--
-- organization_type(BRANCH/AGENCY)과는 완전히 별개의 개념이며, 지사가 법인
-- 업무 범위상 기존 회원만 관리하는지 / 신규 회원만 받는지 / 둘 다인지를 나타낸다.
-- 기존에 등록된 지사 데이터를 깨지 않도록 NULL 허용으로 추가한다 (NULL = 미설정).
-- ============================================================================

alter table organizations
  add column if not exists branch_business_type text;

comment on column organizations.branch_business_type is
  '지사 운영구분 (EXISTING_ONLY/NEW_ONLY/BOTH, BRANCH 전용, NULL=미설정). organization_type과 무관한 별개 분류.';

-- 허용값 제한 (NULL 허용)
alter table organizations
  drop constraint if exists chk_branch_business_type_values;
alter table organizations
  add constraint chk_branch_business_type_values
  check (branch_business_type is null or branch_business_type in ('EXISTING_ONLY', 'NEW_ONLY', 'BOTH'));

-- AGENCY 행에는 이 값을 직접 입력하지 않는다 (BRANCH 전용 필드)
alter table organizations
  drop constraint if exists chk_branch_business_type_branch_only;
alter table organizations
  add constraint chk_branch_business_type_branch_only
  check (branch_business_type is null or organization_type = 'BRANCH');

-- 목록 필터(전체/기존만/신규만/기존+신규/미설정) 성능용 인덱스
create index if not exists idx_org_branch_business_type on organizations (branch_business_type);

-- ----------------------------------------------------------------------------
-- 대시보드 요약 함수 재정의: 운영구분별 지사 수 3종 추가
-- 반환 테이블 컬럼이 늘어나므로 CREATE OR REPLACE 대신 DROP 후 재생성한다.
-- ----------------------------------------------------------------------------
drop function if exists dashboard_summary();

create function dashboard_summary()
returns table (
  total_branches bigint,
  total_agencies bigint,
  total_organizations bigint,
  approved_count bigint,
  pending_count bigint,
  existing_only_branches bigint,
  new_only_branches bigint,
  both_branches bigint
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
    count(*) filter (where approval_status is distinct from '승인완료'),
    count(*) filter (where organization_type = 'BRANCH' and branch_business_type = 'EXISTING_ONLY'),
    count(*) filter (where organization_type = 'BRANCH' and branch_business_type = 'NEW_ONLY'),
    count(*) filter (where organization_type = 'BRANCH' and branch_business_type = 'BOTH')
  from organizations
$$;

grant execute on function dashboard_summary() to authenticated;

-- ----------------------------------------------------------------------------
-- Excel 대량등록 RPC 재정의: branch_business_type 컬럼 반영
-- 인자/반환 타입이 그대로이므로 CREATE OR REPLACE로 안전하게 교체 가능하다.
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
        join_date date, bank text, account_holder text, account_number text, note text,
        branch_business_type text
      )
    ),
    ins as (
      insert into organizations (
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, created_by, updated_by
      )
      select
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, auth.uid(), auth.uid()
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
        branch_business_type = excluded.branch_business_type,
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
        join_date date, bank text, account_holder text, account_number text, note text,
        branch_business_type text
      )
    ),
    ins as (
      insert into organizations (
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, created_by, updated_by
      )
      select
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, auth.uid(), auth.uid()
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

grant execute on function import_organizations(jsonb, text) to authenticated;
