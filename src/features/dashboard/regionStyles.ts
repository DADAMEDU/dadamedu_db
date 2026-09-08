/**
 * 대시보드에서 권역(region) 관련 UI가 공통으로 쓰는 색상/유틸.
 * "권역별 지사 현황" 요약 카드와 "지사별 지사기관 수" 상세 섹션 헤더가
 * 항상 같은 색을 쓰도록 클래스 문자열을 한 곳에서만 관리한다.
 */
export const REGION_ACCENT_CLASSES = "bg-yellow-50 hover:bg-yellow-100";

/** 요약 카드 클릭 시 스크롤할 상세 섹션의 DOM id (두 컴포넌트가 동일한 규칙을 써야 한다) */
export function regionSectionDomId(region: string): string {
  return `region-section-${encodeURIComponent(region)}`;
}
