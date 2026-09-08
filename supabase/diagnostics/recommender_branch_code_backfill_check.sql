-- ============================================================================
-- 진단 전용 스크립트 (읽기 전용, SELECT만 포함 — 어떤 데이터도 변경하지 않음)
-- Supabase Dashboard > SQL Editor에서 그대로 실행하세요.
--
-- 배경: 이번 변경 전까지는 Excel의 "추천인" 컬럼이 BRANCH 행에서도 그대로
-- recommender에 저장되고 있었다. 새 규칙에서는 BRANCH의 "추천인" 값이 사실
-- 지사코드(branch_code)이므로, 과거에 이 규칙 없이 Import된 BRANCH 데이터는
-- recommender에 코드값이 들어있고 branch_code는 비어 있을 수 있다.
-- 이 스크립트는 그런 행이 실제로 있는지, 그리고 보정 시 다른 지사와 코드가
-- 충돌하지는 않는지만 확인한다. UPDATE는 전혀 하지 않는다.
-- ============================================================================

-- 1) recommender에는 값이 있지만 branch_code는 비어 있는 BRANCH 행 (보정 후보)
select id, organization_name, recommender, branch_code, created_at
from organizations
where organization_type = 'BRANCH'
  and recommender is not null and recommender <> ''
  and (branch_code is null or branch_code = '')
order by created_at;

-- 2) 위 후보들을 실제로 recommender -> branch_code로 보정한다면 충돌이 생기는지 미리 확인
--    (다른 지사가 이미 같은 코드를 branch_code로 쓰고 있는 경우 conflict_* 컬럼에 표시됨)
select
  o.id,
  o.organization_name,
  o.recommender,
  normalize_branch_code(o.recommender) as would_be_branch_code,
  conflict.id as conflict_branch_id,
  conflict.organization_name as conflict_branch_name
from organizations o
left join organizations conflict
  on conflict.organization_type = 'BRANCH'
  and conflict.branch_code_normalized = normalize_branch_code(o.recommender)
  and conflict.id <> o.id
where o.organization_type = 'BRANCH'
  and o.recommender is not null and o.recommender <> ''
  and (o.branch_code is null or o.branch_code = '')
order by o.organization_name;

-- 3) 참고: AGENCY 쪽은 이번 규칙 변경으로 아무 영향이 없어야 한다 (recommender 그대로 유지).
--    혹시 과거에 AGENCY에 branch_code가 잘못 들어간 경우가 있는지만 확인 (정상이면 0건).
select id, organization_name, branch_code, recommender
from organizations
where organization_type = 'AGENCY' and branch_code is not null;
