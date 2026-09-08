-- ============================================================================
-- 0001_schema.sql
-- 지사 및 지사기관 통합 관리 시스템 - 기본 테이블 / 확장 / 인덱스
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- 부분검색(ILIKE) 성능용 GIN 인덱스

-- ----------------------------------------------------------------------------
-- profiles: auth.users 1:1 확장 (권한/이름 보관)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text not null default 'USER' check (role in ('ADMIN','USER')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table profiles is 'Supabase Auth 사용자 확장 프로필 (권한 포함)';

-- ----------------------------------------------------------------------------
-- organizations: 지사(BRANCH) / 지사기관(AGENCY) 통합 테이블
-- ----------------------------------------------------------------------------
create table if not exists organizations (
  id                  uuid primary key default gen_random_uuid(),

  organization_type   text not null check (organization_type in ('BRANCH','AGENCY')),
  parent_branch_id    uuid references organizations(id) on delete restrict,

  -- 기존 Excel 원본 항목 (최대한 그대로 보존)
  region              text,             -- 권역
  member              text,             -- 회원 (Excel 원본 "구분" 표기, 참고용 원본 보존)
  recommender         text,             -- 추천인
  number              text,             -- 번호
  login_id            text,             -- 아이디
  business_name       text,             -- 사업자명
  representative_name text,             -- 이름(대표자)
  business_registration_number text,    -- 사업자등록번호 (원본 표기 그대로)
  telephone           text,             -- 전화번호
  mobile              text,             -- 휴대폰번호
  address             text,             -- 주소
  approval_status     text default '승인대기', -- 승인여부
  join_date           date,             -- 가입날짜
  bank                text,             -- 은행
  account_holder      text,             -- 예금주
  account_number      text,             -- 계좌번호
  note                text,             -- 비고

  -- 신규 개념 (시스템 관리용)
  organization_name   text not null,    -- 지사명 또는 기관명

  -- 검색용 정규화 컬럼 (숫자만 추출, 트리거로 자동 생성)
  business_registration_number_normalized text,
  telephone_normalized  text,
  mobile_normalized     text,

  created_by  uuid references profiles(id),
  updated_by  uuid references profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint chk_branch_no_parent
    check (organization_type <> 'BRANCH' or parent_branch_id is null),
  constraint chk_agency_needs_parent
    check (organization_type <> 'AGENCY' or parent_branch_id is not null)
);

comment on table organizations is '지사/지사기관 통합 조직 테이블';
comment on column organizations.member is 'Excel 원본 "회원" 컬럼 원본값 보존용 (지사/기관 판별은 organization_type 사용)';

-- 사업자등록번호 정규화값 기준 부분 유니크 인덱스 (Import upsert 충돌 대상 + 중복 방지)
create unique index if not exists uq_org_brn_normalized
  on organizations (business_registration_number_normalized)
  where business_registration_number_normalized is not null;

-- 부분검색(ILIKE '%...%') 성능용 trigram GIN 인덱스
create index if not exists idx_org_name_trgm on organizations using gin (organization_name gin_trgm_ops);
create index if not exists idx_org_business_name_trgm on organizations using gin (business_name gin_trgm_ops);
create index if not exists idx_org_rep_name_trgm on organizations using gin (representative_name gin_trgm_ops);
create index if not exists idx_org_address_trgm on organizations using gin (address gin_trgm_ops);
create index if not exists idx_org_note_trgm on organizations using gin (note gin_trgm_ops);
create index if not exists idx_org_recommender_trgm on organizations using gin (recommender gin_trgm_ops);

-- 정확/부분 일치 검색 및 필터/조인 성능용 B-tree 인덱스
create index if not exists idx_org_login_id on organizations (login_id);
create index if not exists idx_org_brn_normalized on organizations (business_registration_number_normalized);
create index if not exists idx_org_mobile_normalized on organizations (mobile_normalized);
create index if not exists idx_org_telephone_normalized on organizations (telephone_normalized);
create index if not exists idx_org_parent_branch on organizations (parent_branch_id);
create index if not exists idx_org_type on organizations (organization_type);
create index if not exists idx_org_region on organizations (region);
create index if not exists idx_org_approval on organizations (approval_status);
create index if not exists idx_org_join_date on organizations (join_date);

-- ----------------------------------------------------------------------------
-- audit_logs: 변경 이력
-- ----------------------------------------------------------------------------
create table if not exists audit_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id),
  action       text not null check (action in ('CREATE','UPDATE','DELETE','IMPORT')),
  target_type  text not null,           -- 'BRANCH' | 'AGENCY' | 'ORGANIZATION' | 'USER'
  target_id    uuid,
  before_data  jsonb,
  after_data   jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_target on audit_logs (target_type, target_id);
create index if not exists idx_audit_created_at on audit_logs (created_at desc);
create index if not exists idx_audit_user on audit_logs (user_id);
