-- ============================================================================
-- 0004_seed_sample_data.sql
-- 개발/데모 확인용 샘플 데이터 (요구사항 39)
-- 운영 DB에는 적용하지 않아도 됨 — 스킵해도 시스템 동작에는 영향 없음.
-- organization_name 기준으로 이미 존재하면 다시 넣지 않도록 방어.
-- ============================================================================

do $$
declare
  v_seoul uuid;
  v_cheongju uuid;
  v_gwangju uuid;
begin
  if exists (select 1 from organizations where organization_name = '서울지사' and organization_type = 'BRANCH') then
    raise notice '샘플 데이터가 이미 존재합니다. 건너뜁니다.';
    return;
  end if;

  insert into organizations (organization_type, organization_name, business_name, representative_name, region, approval_status, join_date)
  values ('BRANCH', '서울지사', '서울지사', '샘플대표', '서울', '승인완료', current_date)
  returning id into v_seoul;

  insert into organizations (organization_type, organization_name, business_name, representative_name, region, approval_status, join_date)
  values ('BRANCH', '청주지사', '청주지사', '샘플대표', '충청', '승인완료', current_date)
  returning id into v_cheongju;

  insert into organizations (organization_type, organization_name, business_name, representative_name, region, approval_status, join_date)
  values ('BRANCH', '광주지사', '광주지사', '샘플대표', '광주', '승인완료', current_date)
  returning id into v_gwangju;

  insert into organizations (organization_type, parent_branch_id, organization_name, business_name, representative_name, region, approval_status, join_date)
  values
    ('AGENCY', v_seoul, '강남기관', '강남기관', '샘플원장', '서울', '승인완료', current_date),
    ('AGENCY', v_seoul, '송파기관', '송파기관', '샘플원장', '서울', '승인완료', current_date),
    ('AGENCY', v_seoul, '서초기관', '서초기관', '샘플원장', '서울', '승인완료', current_date),

    ('AGENCY', v_cheongju, '상당기관', '상당기관', '샘플원장', '충청', '승인완료', current_date),
    ('AGENCY', v_cheongju, '흥덕기관', '흥덕기관', '샘플원장', '충청', '승인완료', current_date),
    ('AGENCY', v_cheongju, '오송기관', '오송기관', '샘플원장', '충청', '승인완료', current_date),

    ('AGENCY', v_gwangju, '북구기관', '북구기관', '샘플원장', '광주', '승인완료', current_date),
    ('AGENCY', v_gwangju, '서구기관', '서구기관', '샘플원장', '광주', '승인완료', current_date);
end $$;
