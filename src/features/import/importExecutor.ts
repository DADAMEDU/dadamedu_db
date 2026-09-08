import { supabase } from "@/lib/supabase";
import { normalizeBranchCode, parseToISODate } from "@/lib/format";
import { normalizeBranchBusinessType } from "@/features/import/branchBusinessTypeRule";
import type { ImportRow } from "@/features/import/types";

export type DuplicatePolicy = "skip" | "update";

export interface ImportProgress {
  processed: number;
  total: number;
  phase: "지사" | "지사기관";
}

export interface ImportSummary {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  failedRows: { excelRowNumber: number; reason: string }[];
}

const CHUNK_SIZE = 100;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toBranchPayload(row: ImportRow) {
  return {
    organization_type: "BRANCH" as const,
    parent_branch_id: null,
    region: row.fields.region || null,
    member: row.fields.member || null,
    recommender: row.fields.recommender || null,
    number: row.fields.number || null,
    login_id: row.fields.login_id || null,
    organization_name: row.organizationName,
    business_name: row.fields.business_name || null,
    representative_name: row.fields.representative_name || null,
    business_registration_number: row.fields.business_registration_number || null,
    telephone: row.fields.telephone || null,
    mobile: row.fields.mobile || null,
    address: row.fields.address || null,
    approval_status: row.fields.approval_status || "승인대기",
    join_date: parseToISODate(row.fields.join_date),
    bank: row.fields.bank || null,
    account_holder: row.fields.account_holder || null,
    account_number: row.fields.account_number || null,
    note: row.fields.note || null,
    // 지사 운영구분/지사코드는 BRANCH 전용 (organization_type과 무관한 별개 분류)
    branch_business_type: normalizeBranchBusinessType(row.fields.branch_business_type),
    branch_code: row.fields.branch_code?.trim() || null,
  };
}

function toAgencyPayload(row: ImportRow, parentBranchId: string) {
  return {
    ...toBranchPayload(row),
    organization_type: "AGENCY" as const,
    parent_branch_id: parentBranchId,
    // AGENCY에는 지사 운영구분/지사코드를 직접 입력하지 않는다 (DB CHECK 제약과도 일치)
    branch_business_type: null,
    branch_code: null,
  };
}

/**
 * 지사 -> 지사기관 순서로 2단계 대량등록을 수행한다.
 * 지사를 먼저 등록해 실제 id를 받아온 뒤, 그 id를 지사기관의 parent_branch_id로 채워 등록한다.
 */
export async function runImport(
  rows: ImportRow[],
  mode: DuplicatePolicy,
  onProgress: (p: ImportProgress) => void
): Promise<ImportSummary> {
  const importable = rows.filter((r) => r.status !== "오류");
  const branchRows = importable.filter((r) => r.organizationType === "BRANCH");
  const agencyRows = importable.filter((r) => r.organizationType === "AGENCY");

  const summary: ImportSummary = { total: importable.length, inserted: 0, updated: 0, skipped: 0, failed: 0, failedRows: [] };

  let processed = 0;

  // 1단계: 지사 등록
  for (const group of chunk(branchRows, CHUNK_SIZE)) {
    const payload = group.map(toBranchPayload);
    const { data, error } = await supabase.rpc("import_organizations", {
      p_rows: payload,
      p_mode: mode,
    });
    if (error) {
      group.forEach((r) => summary.failedRows.push({ excelRowNumber: r.excelRowNumber, reason: error.message }));
      summary.failed += group.length;
    } else {
      summary.inserted += data.inserted ?? 0;
      summary.updated += data.updated ?? 0;
      summary.skipped += data.skipped ?? 0;
    }
    processed += group.length;
    onProgress({ processed, total: importable.length, phase: "지사" });
  }

  // 지사명 -> id 매핑 (방금 등록/기존 지사 모두 포함, 2순위 매칭용)
  const branchNames = Array.from(new Set(branchRows.map((r) => r.organizationName).filter(Boolean)));
  const branchNameToId = new Map<string, string>();
  if (branchNames.length > 0) {
    for (const namesChunk of chunk(branchNames, 200)) {
      const { data } = await supabase
        .from("organizations")
        .select("id, organization_name")
        .eq("organization_type", "BRANCH")
        .in("organization_name", namesChunk);
      (data ?? []).forEach((b) => branchNameToId.set(b.organization_name, b.id));
    }
  }

  // 지사코드(정규화) -> id 매핑 (1순위 매칭용)
  const branchCodes = Array.from(
    new Set(branchRows.map((r) => normalizeBranchCode(r.fields.branch_code)).filter(Boolean))
  );
  const branchCodeToId = new Map<string, string>();
  if (branchCodes.length > 0) {
    for (const codesChunk of chunk(branchCodes, 200)) {
      const { data } = await supabase
        .from("organizations")
        .select("id, branch_code_normalized")
        .eq("organization_type", "BRANCH")
        .in("branch_code_normalized", codesChunk);
      (data ?? []).forEach((b) => {
        if (b.branch_code_normalized) branchCodeToId.set(b.branch_code_normalized, b.id);
      });
    }
  }

  // 2단계: 지사기관 등록 (부모 지사 id 해석)
  // 매칭 우선순위: 1순위 지사코드, 2순위 정확한 지사명.
  // 지사코드가 지정되어 있는데 DB에서 찾지 못하면 이름으로 잘못 연결하지 않고 오류 처리한다.
  const resolvedAgencyRows: { row: ImportRow; parentId: string }[] = [];
  for (const row of agencyRows) {
    // parentBranchExcelRow로 소속 지사 행을 찾아야 하므로, rows 전체에서 역참조한다.
    const parentBranch = rows.find(
      (r) => r.excelRowNumber === row.parentBranchExcelRow && r.organizationType === "BRANCH"
    );
    if (!parentBranch) {
      summary.failed += 1;
      summary.failedRows.push({ excelRowNumber: row.excelRowNumber, reason: "소속지사 등록에 실패하여 함께 처리되지 못했습니다." });
      continue;
    }

    const parentCode = normalizeBranchCode(parentBranch.fields.branch_code);
    let parentId: string | undefined;

    if (parentCode) {
      parentId = branchCodeToId.get(parentCode);
      if (!parentId) {
        summary.failed += 1;
        summary.failedRows.push({ excelRowNumber: row.excelRowNumber, reason: "해당 지사코드를 찾을 수 없습니다." });
        continue;
      }
    } else {
      parentId = branchNameToId.get(parentBranch.organizationName);
      if (!parentId) {
        summary.failed += 1;
        summary.failedRows.push({ excelRowNumber: row.excelRowNumber, reason: "소속지사 등록에 실패하여 함께 처리되지 못했습니다." });
        continue;
      }
    }

    resolvedAgencyRows.push({ row, parentId });
  }

  for (const group of chunk(resolvedAgencyRows, CHUNK_SIZE)) {
    const payload = group.map((g) => toAgencyPayload(g.row, g.parentId));
    const { data, error } = await supabase.rpc("import_organizations", {
      p_rows: payload,
      p_mode: mode,
    });
    if (error) {
      group.forEach((g) => summary.failedRows.push({ excelRowNumber: g.row.excelRowNumber, reason: error.message }));
      summary.failed += group.length;
    } else {
      summary.inserted += data.inserted ?? 0;
      summary.updated += data.updated ?? 0;
      summary.skipped += data.skipped ?? 0;
    }
    processed += group.length;
    onProgress({ processed, total: importable.length, phase: "지사기관" });
  }

  await supabase.rpc("log_import_summary", {
    p_summary: {
      total: summary.total,
      inserted: summary.inserted,
      updated: summary.updated,
      skipped: summary.skipped,
      failed: summary.failed,
      mode,
    },
  });

  return summary;
}
