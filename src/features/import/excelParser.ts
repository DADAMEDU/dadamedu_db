import * as XLSX from "xlsx";

export interface ParsedExcelResult {
  headers: string[];
  rows: { excelRowNumber: number; values: string[] }[];
}

const KNOWN_HEADER_HINTS = [
  "권역",
  "회원",
  "추천인",
  "번호",
  "아이디",
  "지사명",
  "사업자명",
  "이름",
  "사업자등록번호",
  "전화번호",
  "휴대폰번호",
  "주소",
  "승인여부",
  "가입날짜",
  "은행",
  "예금주",
  "계좌번호",
  "지사운영구분",
  "운영구분",
  "지사코드",
  "지사 코드",
  "branch_code",
  "비고",
];

function stringifyCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

/** .xlsx / .csv 파일을 파싱해 헤더 행을 자동으로 찾고, 데이터 행을 텍스트 배열로 반환한다. */
export async function parseExcelFile(file: File): Promise<ParsedExcelResult> {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("시트를 찾을 수 없습니다.");
  const sheet = workbook.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" }) as unknown[][];

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(grid.length, 15); i++) {
    const row = (grid[i] ?? []).map((c) => String(c ?? "").trim());
    const hits = row.filter((c) => KNOWN_HEADER_HINTS.includes(c)).length;
    if (hits >= 2) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 0;

  const headers = (grid[headerRowIdx] ?? []).map((c) => String(c ?? "").trim());
  const rows: ParsedExcelResult["rows"] = [];

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const raw = grid[i] ?? [];
    const values = headers.map((_, colIdx) => stringifyCell(raw[colIdx]));
    if (values.every((v) => v === "")) continue;
    rows.push({ excelRowNumber: i + 1, values });
  }

  return { headers, rows };
}
