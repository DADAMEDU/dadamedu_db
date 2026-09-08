import * as React from "react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { OrganizationTypeBadge } from "@/features/organizations/StatusBadge";
import type { ImportRow } from "@/features/import/types";

interface Props {
  rows: ImportRow[];
}

export function StepPreview({ rows }: Props) {
  const [showAll, setShowAll] = React.useState(false);
  const visible = showAll ? rows : rows.slice(0, 50);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        총 {rows.length.toLocaleString()}건이 인식되었습니다. 매핑이 올바른지 확인하세요.
      </p>
      <Table>
        <THead>
          <TR>
            <TH>Excel 행번호</TH>
            <TH>구분</TH>
            <TH>권역</TH>
            <TH>지사명/기관명</TH>
            <TH>사업자명</TH>
            <TH>이름</TH>
            <TH>사업자등록번호</TH>
          </TR>
        </THead>
        <TBody>
          {visible.map((row) => (
            <TR key={row.excelRowNumber}>
              <TD>{row.excelRowNumber}</TD>
              <TD>{row.organizationType ? <OrganizationTypeBadge type={row.organizationType} /> : "-"}</TD>
              <TD>{row.fields.region || "-"}</TD>
              <TD className="font-medium">{row.organizationName || "-"}</TD>
              <TD>{row.fields.business_name || "-"}</TD>
              <TD>{row.fields.representative_name || "-"}</TD>
              <TD>{row.fields.business_registration_number || "-"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      {!showAll && rows.length > 50 && (
        <button className="text-sm text-primary hover:underline" onClick={() => setShowAll(true)}>
          나머지 {rows.length - 50}건 모두 보기
        </button>
      )}
    </div>
  );
}
