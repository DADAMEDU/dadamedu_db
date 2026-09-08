import { branchBusinessTypeLabel } from "@/features/organizations/StatusBadge";
import type { RegionGroup } from "@/features/dashboard/useRegionGroupedBranches";
import type { DashboardSummary } from "@/types/database";

/**
 * 대시보드 현황을 A4 보고서 형태의 PDF로 내려받는다.
 *
 * 방식: 오프스크린 DOM에 보고서 내용을 "블록" 단위(제목, 전체현황, 운영구분별현황,
 * 권역별 요약표, 권역별 상세표 — 상세표는 페이지를 넘지 않도록 행 단위로 미리 청크)로
 * 만든 뒤 html2canvas로 블록마다 이미지를 캡처하고, jsPDF로 각 이미지를 순서대로
 * 배치한다. 블록 하나는 항상 통째로 한 이미지이므로 표 행이 페이지 중간에서 잘리는
 * 일이 없고(다음 페이지로 통째로 넘어감), 브라우저가 실제로 렌더링한 한글을 그대로
 * 캡처하므로 폰트 임베딩 없이도 한글이 깨지지 않는다. 전부 브라우저 안에서 끝나므로
 * 서버/외부 API 비용이 들지 않는다.
 *
 * jsPDF의 html()/새 창 렌더링 API는 전혀 사용하지 않는다(이미지 배치만 사용).
 */

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 14;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const CONTENT_WIDTH_PX = 700;
const ROWS_PER_CHUNK = 24;
const BLOCK_GAP_MM = 5;

const REPORT_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", Roboto, sans-serif';

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function createOffscreenContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-10000px";
  container.style.width = `${CONTENT_WIDTH_PX}px`;
  container.style.background = "#ffffff";
  container.style.fontFamily = REPORT_FONT_STACK;
  container.style.color = "hsl(var(--foreground))";
  document.body.appendChild(container);
  return container;
}

function buildSectionTitle(text: string): HTMLDivElement {
  const h = document.createElement("div");
  h.textContent = text;
  h.style.fontSize = "13px";
  h.style.fontWeight = "700";
  h.style.marginBottom = "8px";
  h.style.color = "hsl(var(--foreground))";
  return h;
}

function buildStatRow(items: { label: string; value: number }[]): HTMLDivElement {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";

  items.forEach((item) => {
    const box = document.createElement("div");
    box.style.flex = "1";
    box.style.border = "1px solid hsl(var(--border))";
    box.style.borderRadius = "6px";
    box.style.padding = "10px 12px";
    box.style.background = "#ffffff";

    const label = document.createElement("div");
    label.textContent = item.label;
    label.style.fontSize = "10px";
    label.style.color = "hsl(var(--muted-foreground))";

    const value = document.createElement("div");
    value.textContent = item.value.toLocaleString();
    value.style.fontSize = "18px";
    value.style.fontWeight = "700";
    value.style.color = "hsl(var(--primary))";
    value.style.marginTop = "4px";

    box.appendChild(label);
    box.appendChild(value);
    row.appendChild(box);
  });

  return row;
}

function buildTable(headers: string[], rows: string[][], colWidths?: string[]): HTMLTableElement {
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "10.5px";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headers.forEach((h, i) => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.textAlign = "left";
    th.style.padding = "5px 7px";
    th.style.background = "hsl(var(--muted))";
    th.style.borderBottom = "1px solid hsl(var(--border))";
    th.style.fontWeight = "700";
    if (colWidths?.[i]) th.style.width = colWidths[i];
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    r.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      td.style.padding = "5px 7px";
      td.style.borderBottom = "1px solid hsl(var(--border))";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

function buildHeaderBlock(now: Date): HTMLDivElement {
  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.textContent = "지사 및 지사기관 현황";
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";

  const pad = (n: number) => String(n).padStart(2, "0");
  const subtitle = document.createElement("div");
  subtitle.textContent = `작성일: ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}`;
  subtitle.style.fontSize = "11px";
  subtitle.style.color = "hsl(var(--muted-foreground))";
  subtitle.style.marginTop = "4px";

  const rule = document.createElement("div");
  rule.style.height = "2px";
  rule.style.background = "hsl(var(--primary))";
  rule.style.marginTop = "10px";

  wrap.appendChild(title);
  wrap.appendChild(subtitle);
  wrap.appendChild(rule);
  return wrap;
}

function buildOverallBlock(summary: DashboardSummary): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.appendChild(buildSectionTitle("전체 현황"));
  wrap.appendChild(
    buildStatRow([
      { label: "전체 지사", value: summary.total_branches },
      { label: "전체 지사기관", value: summary.total_agencies },
      { label: "전체 등록건수", value: summary.total_organizations },
      { label: "승인완료", value: summary.approved_count },
      { label: "승인대기", value: summary.pending_count },
    ])
  );
  return wrap;
}

function buildBusinessTypeBlock(summary: DashboardSummary): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.appendChild(buildSectionTitle("지사 운영구분별 현황"));
  wrap.appendChild(
    buildStatRow([
      { label: "기존만 지사", value: summary.existing_only_branches },
      { label: "신규만 지사", value: summary.new_only_branches },
      { label: "기존+신규 지사", value: summary.both_branches },
    ])
  );
  return wrap;
}

function buildRegionSummaryBlock(groups: RegionGroup[]): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.appendChild(buildSectionTitle("권역별 지사 현황"));
  const rows = groups.map((g) => [g.region, String(g.branches.length), String(g.agencyTotal)]);
  wrap.appendChild(buildTable(["권역", "지사 수", "지사기관 수"], rows, ["50%", "25%", "25%"]));
  return wrap;
}

/** 권역별 상세 표. 웹 화면의 접힘/펼침 상태와 무관하게 항상 전체 지사를 포함한다. */
function buildRegionDetailBlocks(groups: RegionGroup[]): HTMLDivElement[] {
  const blocks: HTMLDivElement[] = [];

  const intro = document.createElement("div");
  intro.appendChild(buildSectionTitle("권역별 상세 현황"));
  blocks.push(intro);

  for (const g of groups) {
    const rowChunks = chunkArray(g.branches, ROWS_PER_CHUNK);
    rowChunks.forEach((rowsChunk, idx) => {
      const wrap = document.createElement("div");

      const heading = document.createElement("div");
      heading.textContent =
        idx === 0 ? `${g.region}  (지사 ${g.branches.length}개 · 지사기관 ${g.agencyTotal}개)` : `${g.region} (계속)`;
      heading.style.fontSize = "11.5px";
      heading.style.fontWeight = "700";
      heading.style.marginBottom = "5px";
      wrap.appendChild(heading);

      const rows = rowsChunk.map((b) => [
        b.name,
        b.branchCode ?? "-",
        branchBusinessTypeLabel(b.businessType),
        String(b.agencyCount),
      ]);
      wrap.appendChild(
        buildTable(["지사명", "지사코드", "지사 운영구분", "소속 지사기관 수"], rows, ["34%", "20%", "26%", "20%"])
      );
      blocks.push(wrap);
    });
  }

  return blocks;
}

export async function downloadDashboardPdf(summary: DashboardSummary, groups: RegionGroup[]): Promise<void> {
  const [{ default: JsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = createOffscreenContainer();

  try {
    const blocks: HTMLDivElement[] = [
      buildHeaderBlock(new Date()),
      buildOverallBlock(summary),
      buildBusinessTypeBlock(summary),
      buildRegionSummaryBlock(groups),
      ...buildRegionDetailBlocks(groups),
    ];
    blocks.forEach((block) => container.appendChild(block));

    const doc = new JsPDF({ unit: "mm", format: "a4" });
    let cursorY = MARGIN_MM;
    let isFirstBlock = true;

    for (const block of blocks) {
      const canvas = await html2canvas(block, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const heightMm = (canvas.height / canvas.width) * CONTENT_WIDTH_MM;

      const wouldOverflow = cursorY + heightMm > PAGE_HEIGHT_MM - MARGIN_MM;
      if (!isFirstBlock && wouldOverflow) {
        doc.addPage();
        cursorY = MARGIN_MM;
      }

      doc.addImage(imgData, "PNG", MARGIN_MM, cursorY, CONTENT_WIDTH_MM, heightMm);
      cursorY += heightMm + BLOCK_GAP_MM;
      isFirstBlock = false;
    }

    const today = new Date().toISOString().slice(0, 10);
    doc.save(`지사통합관리_대시보드_${today}.pdf`);
  } finally {
    container.remove();
  }
}
