import { supabase } from "@/lib/supabase";
import { normalizeBranchCode, normalizeDigits } from "@/lib/format";
import { normalizeBranchBusinessType } from "@/features/import/branchBusinessTypeRule";
import type { ImportRow, RowStatus } from "@/features/import/types";

const STATUS_PRIORITY: Record<RowStatus, number> = {
  정상: 0,
  확인필요: 1,
  중복: 2,
  오류: 3,
};

function escalate(row: ImportRow, status: RowStatus, message: string) {
  row.messages.push(message);
  if (STATUS_PRIORITY[status] > STATUS_PRIORITY[row.status]) {
    row.status = status;
  }
}

function parseJoinDate(value: string): boolean {
  if (!value) return true;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function isPlausiblePhone(digits: string): boolean {
  return digits.length >= 8 && digits.length <= 11;
}

/**
 * 행별 검증: 필수값 누락 / 형식 오류 / 파일 내부 중복 / DB 기존 중복.
 *
 * 사업자등록번호(business_registration_number/_normalized)는 더 이상 고유값도,
 * 중복판단 기준도 아니다 — 같은 사업자등록번호를 가진 지사/지사기관이 여러 건
 * 존재할 수 있으며 전부 정상 등록 대상이다. 그래서 이 함수는 사업자등록번호를
 * 검증/중복 판단에 전혀 사용하지 않는다(검색용 정규화 컬럼 자체는 계속 유지됨).
 *
 * 남아있는 실제 중복판단 기준: 지사코드(branch_code, BRANCH 전용, 하드 "중복"),
 * 아이디(login_id, 소프트 "확인필요").
 *
 * DB 조회는 정규화된 값들을 모아 한 번에 조회한다(N+1 방지).
 */
export async function validateRows(rows: ImportRow[]): Promise<ImportRow[]> {
  // 초기화
  rows.forEach((r) => {
    r.status = "정상";
    r.messages = [];
  });

  // 1) 필드 단위 검증
  for (const row of rows) {
    if (!row.organizationType) {
      escalate(row, "오류", '구분을 알 수 없습니다. "회원" 컬럼 값이 지사/기관이 아닙니다.');
    }
    if (!row.organizationName) {
      escalate(row, "오류", "지사명/기관명이 없습니다.");
    }
    if (row.organizationType === "AGENCY" && !row.parentBranchExcelRow) {
      escalate(row, "오류", "소속지사가 없습니다. (이 행보다 위에 지사 행이 없습니다)");
    }

    const mobile = row.fields.mobile ?? "";
    if (mobile && !isPlausiblePhone(normalizeDigits(mobile))) {
      escalate(row, "확인필요", `휴대폰번호 형식을 확인하세요. (${mobile})`);
    }
    const telephone = row.fields.telephone ?? "";
    if (telephone && !isPlausiblePhone(normalizeDigits(telephone))) {
      escalate(row, "확인필요", `전화번호 형식을 확인하세요. (${telephone})`);
    }
    if (!parseJoinDate(row.fields.join_date ?? "")) {
      escalate(row, "확인필요", `가입날짜 형식을 확인하세요. (${row.fields.join_date})`);
    }

    const rawBusinessType = (row.fields.branch_business_type ?? "").trim();
    if (row.organizationType === "BRANCH" && rawBusinessType && !normalizeBranchBusinessType(rawBusinessType)) {
      escalate(
        row,
        "확인필요",
        `지사운영구분 값을 인식할 수 없습니다. (${rawBusinessType}) 기존만/신규만/기존+신규 중 하나로 입력하세요.`
      );
    }
  }

  // 2) 파일 내부 중복 (지사코드, 아이디 — 사업자등록번호는 대상 아님)
  const loginIdSeen = new Map<string, number[]>();
  const branchCodeSeen = new Map<string, number[]>();
  for (const row of rows) {
    const loginId = (row.fields.login_id ?? "").trim();
    if (loginId) {
      loginIdSeen.set(loginId, [...(loginIdSeen.get(loginId) ?? []), row.excelRowNumber]);
    }
    if (row.organizationType === "BRANCH") {
      const code = normalizeBranchCode(row.fields.branch_code);
      if (code) {
        branchCodeSeen.set(code, [...(branchCodeSeen.get(code) ?? []), row.excelRowNumber]);
      }
    }
  }

  for (const row of rows) {
    const loginId = (row.fields.login_id ?? "").trim();
    if (loginId && (loginIdSeen.get(loginId)?.length ?? 0) > 1) {
      const others = loginIdSeen.get(loginId)!.filter((n) => n !== row.excelRowNumber);
      escalate(row, "확인필요", `엑셀 내부에 동일한 아이디가 있습니다. (${others.join(", ")}행)`);
    }
    if (row.organizationType === "BRANCH") {
      const code = normalizeBranchCode(row.fields.branch_code);
      if (code && (branchCodeSeen.get(code)?.length ?? 0) > 1) {
        const others = branchCodeSeen.get(code)!.filter((n) => n !== row.excelRowNumber);
        escalate(row, "중복", `엑셀 내부에 동일한 지사코드가 있습니다. (${others.join(", ")}행)`);
      }
    }
  }

  // 3) DB 기존 중복 조회 (배치, 지사코드/아이디만 — 사업자등록번호는 조회하지 않음)
  const loginIdList = Array.from(loginIdSeen.keys());
  const branchCodeList = Array.from(branchCodeSeen.keys());

  const [existingLoginId, existingBranchCode] = await Promise.all([
    loginIdList.length
      ? supabase.from("organizations").select("login_id").in("login_id", loginIdList)
      : Promise.resolve({ data: [] as { login_id: string }[] }),
    branchCodeList.length
      ? supabase
          .from("organizations")
          .select("branch_code_normalized")
          .eq("organization_type", "BRANCH")
          .in("branch_code_normalized", branchCodeList)
      : Promise.resolve({ data: [] as { branch_code_normalized: string }[] }),
  ]);

  const dbLoginIdSet = new Set((existingLoginId.data ?? []).map((r) => r.login_id));
  const dbBranchCodeSet = new Set((existingBranchCode.data ?? []).map((r) => r.branch_code_normalized));

  for (const row of rows) {
    const loginId = (row.fields.login_id ?? "").trim();
    if (loginId && dbLoginIdSet.has(loginId)) {
      escalate(row, "확인필요", "이미 DB에 등록된 아이디입니다.");
    }
    if (row.organizationType === "BRANCH") {
      const code = normalizeBranchCode(row.fields.branch_code);
      if (code && dbBranchCodeSet.has(code)) {
        escalate(row, "중복", "이미 사용 중인 지사코드입니다.");
      }
    }
  }

  return rows;
}

export function summarizeRows(rows: ImportRow[]) {
  const summary = { total: rows.length, 정상: 0, 확인필요: 0, 중복: 0, 오류: 0 };
  for (const r of rows) summary[r.status] += 1;
  return summary;
}
