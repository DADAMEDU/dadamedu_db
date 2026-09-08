-- ============================================================================
-- 0006_add_branch_code.sql
-- 지사 고유코드(branch_code) 추가
--
-- 기존 migration 파일(0001~0005)은 수정하지 않는다. 이미 적용된 DB에도 안전하게
-- 추가 적용 가능한 증분 파일이다. 기존 데이터는 전혀 건드리지 않는다.
--
-- branch_code는 organization_type = 'BRANCH'인 행에서만 사용하는 지사 고유코드다.
-- 기존 데이터가 있으므로 nullable로 추가하며(신규등록 필수 여부는 애플리케이션
-- 레벨에서 강제), 대소문자/앞뒤 공백 차이로 중복이 생기지 않도록 정규화된 값
-- (branch_code_normalized)을 별도로 두고 그 컬럼에 partial unique index를 건다.
-- (business_registration_number/telephone/mobile과 동일한 "원본 보존 + 정규화
-- 컬럼" 패턴을 그대로 따른다.)
-- ============================================================================

alter table organizations
  add column if not exists branch_code text;

alter table organizations
  add column if not exists branch_code_normalized text;

comment on column organizations.branch_code is
  '지사 고유코드 (BRANCH 전용, 원본 표기 그대로 저장). 예: CJ001';
comment on column organizations.branch_code_normalized is
  'branch_code의 대소문자/공백 무시 정규화 값 (upper(trim(...))). 중복 판정/검색용, 트리거로 자동 생성.';

-- AGENCY 행에는 이 값을 직접 입력하지 않는다 (BRANCH 전용 필드, branch_business_type과 동일한 정책)
alter table organizations
  drop constraint if exists chk_branch_code_branch_only;
alter table organizations
  add constraint chk_branch_code_branch_only
  check (branch_code is null or organization_type = 'BRANCH');

-- ----------------------------------------------------------------------------
-- 정규화 함수: 대소문자/앞뒤 공백 차이를 무시하도록 upper(trim(...))
-- 예: "CJ001" / "cj001" / " CJ001 " -> "CJ001"
-- ----------------------------------------------------------------------------
create or replace function normalize_branch_code(input text)
returns text
language sql
immutable
as $$
  select nullif(upper(trim(coalesce(input, ''))), '')
$$;

-- ----------------------------------------------------------------------------
-- organizations_before_write() 재정의: branch_code_normalized 자동 계산 추가.
-- 이 함수는 0002에서 정의된 BEFORE INSERT/UPDATE 트리거에 이미 연결되어 있으므로
-- 트리거 자체는 그대로 두고 함수 본문만 CREATE OR REPLACE로 교체한다.
-- ----------------------------------------------------------------------------
create or replace function organizations_before_write()
returns trigger
language plpgsql
as $$
begin
  new.business_registration_number_normalized := normalize_digits(new.business_registration_number);
  new.telephone_normalized := normalize_digits(new.telephone);
  new.mobile_normalized := normalize_digits(new.mobile);
  new.branch_code_normalized := normalize_branch_code(new.branch_code);
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- BRANCH 데이터에 한해서만 branch_code 고유성 보장 (partial unique index)
-- ----------------------------------------------------------------------------
create unique index if not exists uq_org_branch_code_normalized
  on organizations (branch_code_normalized)
  where organization_type = 'BRANCH' and branch_code_normalized is not null;

-- 부분검색(ILIKE) 성능용
create index if not exists idx_org_branch_code_trgm
  on organizations using gin (branch_code gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- Excel 대량등록 RPC 재정의: branch_code 컬럼 반영 (시그니처는 그대로라 CREATE OR REPLACE)
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
        branch_business_type text, branch_code text
      )
    ),
    ins as (
      insert into organizations (
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, branch_code, created_by, updated_by
      )
      select
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, branch_code, auth.uid(), auth.uid()
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
        branch_code = excluded.branch_code,
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
        branch_business_type text, branch_code text
      )
    ),
    ins as (
      insert into organizations (
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, branch_code, created_by, updated_by
      )
      select
        organization_type, parent_branch_id, region, member, recommender, number, login_id,
        organization_name, business_name, representative_name, business_registration_number,
        telephone, mobile, address, approval_status, join_date, bank, account_holder,
        account_number, note, branch_business_type, branch_code, auth.uid(), auth.uid()
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
grant execute on function normalize_branch_code(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 기존 샘플 데이터(0004)에 지사코드 부여 — 실제 운영 데이터는 임의 생성하지 않음.
-- 샘플 지사가 존재할 때만 채운다 (0004를 건너뛴 환경에서는 아무 일도 하지 않음).
-- ----------------------------------------------------------------------------
update organizations set branch_code = 'SEOUL001'
  where organization_type = 'BRANCH' and organization_name = '서울지사' and branch_code is null;
update organizations set branch_code = 'CHEONGJU001'
  where organization_type = 'BRANCH' and organization_name = '청주지사' and branch_code is null;
update organizations set branch_code = 'GWANGJU001'
  where organization_type = 'BRANCH' and organization_name = '광주지사' and branch_code is null;
