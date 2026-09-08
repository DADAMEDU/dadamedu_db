-- ============================================================================
-- 0007_allow_duplicate_business_registration_number.sql
--
-- 업무 규칙 변경: 사업자등록번호(business_registration_number)는 더 이상
-- 고유값도 아니고 Excel Import 중복판단 기준도 아니다. 같은 사업자등록번호를
-- 가진 지사/지사기관이 여러 건 존재할 수 있으며, 모두 별도의 organizations
-- 레코드로 등록되어야 한다.
--
-- 이 파일은 새 번호(0007)로 추가하는 증분 migration이다. 기존 migration
-- 파일(0001~0006)은 수정하지 않는다. 기존 데이터는 전혀 삭제/변경하지 않는다
-- — business_registration_number_normalized 컬럼과 그 트리거 계산 로직은
-- 검색용으로 계속 유지한다(제거하는 것은 "고유성 제약"과 "Import 충돌 대상"
-- 역할뿐이다).
--
-- [사전 확인 결과 — 이번 변경 전 실제 상태]
--  - business_registration_number_normalized: partial UNIQUE INDEX 존재
--    (uq_org_brn_normalized, 0001_schema.sql). -> 이번에 제거.
--  - business_registration_number(원본 컬럼): UNIQUE 제약 없음(원래도 없었음).
--  - import_organizations RPC: `on conflict (business_registration_number_normalized)`
--    를 유일한 충돌 대상으로 사용 중(0002/0005/0006에서 반복 재정의됨). -> 제거하고
--    지사(BRANCH)는 branch_code_normalized를, 지사기관(AGENCY)은 아예 충돌
--    대상 없이(항상 신규 INSERT) 처리하도록 재작성.
--  - branch_code_normalized: partial UNIQUE INDEX 존재(uq_org_branch_code_normalized,
--    0006_add_branch_code.sql, BRANCH 전용). -> 그대로 유지(이번 변경과 무관).
--  - login_id: UNIQUE 제약/인덱스 자체가 존재한 적이 없음(idx_org_login_id는
--    일반 B-tree 인덱스일 뿐). -> 건드릴 것이 없으므로 그대로 둔다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 사업자등록번호 UNIQUE 인덱스 제거 (데이터는 그대로 둔다)
-- ----------------------------------------------------------------------------
drop index if exists uq_org_brn_normalized;

-- 검색 성능용 일반 인덱스는 계속 필요하므로 유지한다(요구사항 3: 검색용으로는 계속 사용).
-- idx_org_brn_normalized(B-tree)가 이미 0001에 있으므로 별도 생성은 불필요.
-- 혹시 없는 환경을 대비해 존재 보장만 해 둔다.
create index if not exists idx_org_brn_normalized
  on organizations (business_registration_number_normalized);

-- ----------------------------------------------------------------------------
-- 2) Excel 대량등록 RPC 재작성
--    - BRANCH: branch_code_normalized 기준으로만 충돌(upsert) 판단 (skip/update 모드 적용)
--    - AGENCY: 충돌 대상 없음. 항상 새 레코드로 INSERT (같은 사업자등록번호가
--      여러 건이어도 전부 등록되며, "ON CONFLICT ... cannot affect row a second
--      time" 오류가 구조적으로 발생할 수 없다)
-- ----------------------------------------------------------------------------
create or replace function import_organizations(p_rows jsonb, p_mode text default 'skip')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_branch_inserted int := 0;
  v_branch_updated int := 0;
  v_agency_inserted int := 0;
begin
  if not is_admin() then
    raise exception 'Excel 일괄등록은 관리자만 수행할 수 있습니다.' using errcode = '42501';
  end if;

  v_total := jsonb_array_length(p_rows);
  perform set_config('app.bulk_import', 'on', true);

  -- ---------------- BRANCH: branch_code 기준 upsert ----------------
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
      where organization_type = 'BRANCH'
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
      on conflict (branch_code_normalized)
        where organization_type = 'BRANCH' and branch_code_normalized is not null
      do update set
        organization_name = excluded.organization_name,
        business_name = excluded.business_name,
        representative_name = excluded.representative_name,
        business_registration_number = excluded.business_registration_number,
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
      into v_branch_inserted, v_branch_updated
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
      where organization_type = 'BRANCH'
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
      on conflict (branch_code_normalized)
        where organization_type = 'BRANCH' and branch_code_normalized is not null
      do nothing
      returning 1
    )
    select count(*) into v_branch_inserted from ins;
  end if;

  -- ---------------- AGENCY: 충돌 대상 없음, 항상 신규 INSERT ----------------
  -- 사업자등록번호가 같은 여러 지사기관도 전부 별도 레코드로 등록된다.
  with src as (
    select * from jsonb_to_recordset(p_rows) as x(
      organization_type text, parent_branch_id uuid, region text, member text,
      recommender text, number text, login_id text, organization_name text,
      business_name text, representative_name text, business_registration_number text,
      telephone text, mobile text, address text, approval_status text,
      join_date date, bank text, account_holder text, account_number text, note text,
      branch_business_type text, branch_code text
    )
    where organization_type = 'AGENCY'
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
    returning 1
  )
  select count(*) into v_agency_inserted from ins;

  perform set_config('app.bulk_import', 'off', true);

  return jsonb_build_object(
    'total', v_total,
    'inserted', v_branch_inserted + v_agency_inserted,
    'updated', v_branch_updated,
    'skipped', v_total - (v_branch_inserted + v_agency_inserted) - v_branch_updated
  );
exception when others then
  perform set_config('app.bulk_import', 'off', true);
  raise;
end;
$$;

grant execute on function import_organizations(jsonb, text) to authenticated;
