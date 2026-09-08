/**
 * 지사/지사기관 판별 및 소속관계 결정 규칙 — 격리된 매핑 레이어.
 *
 * 실제 샘플 Excel 분석 결과 확인된 규칙 (요구사항 42 참고):
 *  - "회원" 컬럼 값이 그대로 구분자다: "지사" -> BRANCH, "기관" -> AGENCY.
 *  - 지사기관은 별도의 "기관명" 컬럼이 없다. "사업자명" 컬럼 값을 기관명(organization_name)으로 쓴다.
 *    반대로 지사는 "지사명" 컬럼 값을 organization_name으로 쓴다.
 *  - 소속관계(부모 지사)는 컬럼이 아니라 "엑셀 행 순서"로 표현된다: 지사 행 다음에 나오는
 *    기관 행들은 다음 지사 행이 나오기 전까지 모두 그 지사에 속한다.
 *  - "권역" 등 일부 컬럼은 병합셀 특성상 그룹의 첫 행에만 값이 있다 (forward-fill 필요).
 *
 * 이 규칙이 실제 전체 데이터에서 달라지면 이 파일만 수정하면 된다.
 */
import type { ColumnMapping, ImportRow, SystemField } from "@/features/import/types";
import type { ParsedExcelResult } from "@/features/import/excelParser";

/** 병합셀로 인해 그룹 첫 행에만 값이 채워지는 컬럼 목록 */
export const FORWARD_FILL_FIELDS: SystemField[] = ["region"];

export function buildFieldsForRow(
  values: string[],
  mapping: ColumnMapping
): Partial<Record<SystemField, string>> {
  const fields: Partial<Record<SystemField, string>> = {};
  for (const [idxStr, field] of Object.entries(mapping)) {
    if (!field) continue;
    const idx = Number(idxStr);
    const v = (values[idx] ?? "").trim();
    if (v) fields[field as SystemField] = v;
  }
  return fields;
}

export function determineOrganizationType(
  fields: Partial<Record<SystemField, string>>
): "BRANCH" | "AGENCY" | null {
  const marker = (fields.member ?? "").trim();
  if (marker === "지사") return "BRANCH";
  if (marker === "기관") return "AGENCY";
  return null;
}

export function resolveOrganizationName(
  type: "BRANCH" | "AGENCY" | null,
  fields: Partial<Record<SystemField, string>>
): string {
  if (type === "BRANCH") return (fields.branch_name ?? "").trim();
  // 지사기관: 별도 기관명 컬럼이 없으므로 사업자명을 기관명으로 사용
  return (fields.business_name ?? fields.branch_name ?? "").trim();
}

export function buildImportRows(parsed: ParsedExcelResult, mapping: ColumnMapping): ImportRow[] {
  const rows: ImportRow[] = [];
  const lastValues: Partial<Record<SystemField, string>> = {};
  let lastBranchExcelRow: number | null = null;

  for (const row of parsed.rows) {
    const fields = buildFieldsForRow(row.values, mapping);

    for (const field of FORWARD_FILL_FIELDS) {
      if (!fields[field] && lastValues[field]) fields[field] = lastValues[field];
      if (fields[field]) lastValues[field] = fields[field];
    }

    const organizationType = determineOrganizationType(fields);
    const organizationName = resolveOrganizationName(organizationType, fields);

    let parentBranchExcelRow: number | null = null;
    if (organizationType === "BRANCH") {
      lastBranchExcelRow = row.excelRowNumber;
    } else if (organizationType === "AGENCY") {
      parentBranchExcelRow = lastBranchExcelRow;
    }

    rows.push({
      excelRowNumber: row.excelRowNumber,
      fields,
      organizationType,
      organizationName,
      parentBranchExcelRow,
      status: "정상",
      messages: [],
    });
  }

  return rows;
}
