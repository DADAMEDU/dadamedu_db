-- ============================================================================
-- 진단 전용 스크립트 (읽기 전용, SELECT만 포함 — 어떤 데이터도 변경하지 않음)
-- Supabase Dashboard > SQL Editor에서 그대로 실행하세요.
-- 지사 상세페이지의 "소속 지사기관 0개" 버그 진단용.
-- 이 스크립트 자체는 아무것도 수정하지 않으므로 몇 번을 실행해도 안전합니다.
-- ============================================================================

-- 1) 전체 AGENCY 수
select count(*) as total_agency_count
from organizations
where organization_type = 'AGENCY';

-- 2) parent_branch_id가 NULL인 AGENCY 수 (있으면 안 됨 — 있다면 등록/Import 경로에 문제)
select count(*) as agency_with_null_parent
from organizations
where organization_type = 'AGENCY' and parent_branch_id is null;

-- 3) 존재하지 않는(또는 BRANCH가 아닌) 지사를 참조하는 AGENCY 수
--    DB에 FK 제약(on delete restrict)이 걸려 있어 정상적으로는 0이 나와야 한다.
--    0이 아니라면 FK 제약 자체가 깨져 있거나 우회 경로(예: service_role 직접 조작)가 있었다는 뜻.
select count(*) as agency_referencing_invalid_branch
from organizations a
where a.organization_type = 'AGENCY'
  and a.parent_branch_id is not null
  and not exists (
    select 1 from organizations b
    where b.id = a.parent_branch_id and b.organization_type = 'BRANCH'
  );

-- 4) 지사별 실제 parent_branch_id 기준 기관 수
--    (대시보드의 branch_agency_counts 뷰, 지사 상세페이지의 조회와 완전히 동일한 로직)
select
  b.id as branch_id,
  b.organization_name,
  b.branch_code,
  count(a.id) as agency_count
from organizations b
left join organizations a
  on a.parent_branch_id = b.id and a.organization_type = 'AGENCY'
where b.organization_type = 'BRANCH'
group by b.id, b.organization_name, b.branch_code
order by b.organization_name, b.id;

-- 5) [핵심 의심 지점] 동일한 지사명을 가진 BRANCH 행이 2개 이상 존재하는 경우
--    대시보드 카드와 상세페이지 모두 "이름"이 아니라 "id" 기준으로 동작하기 때문에,
--    같은 이름의 지사가 실수로 2건 이상 등록되어 있으면(예: 재-Import, 수동 중복 등록 등)
--    화면에는 이름이 똑같은 버튼/항목이 여러 개 보이고, 그중 기관이 실제로 연결된
--    "진짜" 지사가 아닌 "빈" 중복 지사를 클릭하면 0개로 보이게 된다.
select
  organization_name,
  count(*) as branch_row_count,
  array_agg(id order by created_at) as branch_ids,
  array_agg(branch_code order by created_at) as branch_codes,
  array_agg(created_at order by created_at) as created_ats
from organizations
where organization_type = 'BRANCH'
group by organization_name
having count(*) > 1
order by organization_name;

-- 6) 이번에 보고된 "*#강동송파" 사례를 직접 확인
--    (지사명이 다르면 아래 '*#강동송파' 부분을 실제 지사명으로 바꿔서 실행)
select
  b.id as branch_id,
  b.organization_name,
  b.branch_code,
  b.created_at,
  count(a.id) as agency_count
from organizations b
left join organizations a
  on a.parent_branch_id = b.id and a.organization_type = 'AGENCY'
where b.organization_type = 'BRANCH' and b.organization_name = '*#강동송파'
group by b.id, b.organization_name, b.branch_code, b.created_at
order by b.created_at;
