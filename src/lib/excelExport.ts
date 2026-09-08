import * as XLSX from "xlsx";
import type { BranchBusinessType, OrganizationListRow } from "@/types/database";
import { formatDate } from "@/lib/format";

const BRANCH_BUSINESS_TYPE_EXPORT_LABELS: Record<BranchBusinessType, string> = {
  EXISTING_ONLY: "기존만",
  NEW_ONLY: "신규만",
  BOTH: "기존+신규",
};

const EXPORT_HEADERS = [
  "구분",
  "지사코드",
  "지사운영구분",
  "권역",
  "소속지사",
  "지사명/기관명",
  "사업자명",
  "이름",
  "사업자등록번호",
  "전화번호",
  "휴대폰번호",
  "주소",
  "승인여부",
  "가입날짜",
  "아이디",
  "추천인",
  "비고",
] as const;

function toRow(org: OrganizationListRow): Record<(typeof EXPORT_HEADERS)[number], string> {
  return {
    구분: org.organization_type === "BRANCH" ? "지사" : "지사기관",
    지사코드: org.organization_type === "BRANCH" ? org.branch_code ?? "" : "",
    지사운영구분:
      org.organization_type === "BRANCH" && org.branch_business_type
        ? BRANCH_BUSINESS_TYPE_EXPORT_LABELS[org.branch_business_type]
        : "",
    권역: org.region ?? "",
    소속지사: org.parent?.organization_name ?? "",
    "지사명/기관명": org.organization_name,
    사업자명: org.business_name ?? "",
    이름: org.representative_name ?? "",
    사업자등록번호: org.business_registration_number ?? "",
    전화번호: org.telephone ?? "",
    휴대폰번호: org.mobile ?? "",
    주소: org.address ?? "",
    승인여부: org.approval_status ?? "",
    가입날짜: formatDate(org.join_date),
    아이디: org.login_id ?? "",
    추천인: org.recommender ?? "",
    비고: org.note ?? "",
  };
}

export function downloadOrganizationsExcel(rows: OrganizationListRow[], filenamePrefix: string) {
  const sheetData = rows.map(toRow);
  const worksheet = XLSX.utils.json_to_sheet(sheetData, { header: [...EXPORT_HEADERS] });
  worksheet["!cols"] = EXPORT_HEADERS.map((h) => ({ wch: h.length < 6 ? 12 : 20 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "데이터");

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}_${today}.xlsx`);
}
