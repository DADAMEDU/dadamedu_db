import { AlertCircle } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ParsedExcelResult } from "@/features/import/excelParser";
import type { ColumnMapping, SystemField } from "@/features/import/types";
import { SYSTEM_FIELD_LABELS, REQUIRED_SYSTEM_FIELDS } from "@/features/import/types";

const NONE = "__none__";

interface Props {
  parsed: ParsedExcelResult;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
}

export function StepMapping({ parsed, mapping, onChange }: Props) {
  const mappedFields = new Set(Object.values(mapping).filter(Boolean));
  const missingRequired = REQUIRED_SYSTEM_FIELDS.filter((f) => !mappedFields.has(f));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        엑셀 헤더명을 기준으로 자동 매핑했습니다. 자동으로 판단할 수 없는 컬럼은 직접 선택하세요.
      </p>

      {missingRequired.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          다음 필드는 지사/지사기관 구분에 반드시 필요합니다: {missingRequired.map((f) => SYSTEM_FIELD_LABELS[f]).join(", ")}
        </div>
      )}

      <Table>
        <THead>
          <TR>
            <TH>엑셀 컬럼</TH>
            <TH>미리보기</TH>
            <TH>매핑될 필드</TH>
          </TR>
        </THead>
        <TBody>
          {parsed.headers.map((header, idx) => {
            const sample = parsed.rows.slice(0, 3).map((r) => r.values[idx]).filter(Boolean)[0] ?? "";
            return (
              <TR key={idx}>
                <TD className="font-medium">{header || `(${idx + 1}번째 컬럼)`}</TD>
                <TD className="text-muted-foreground">{sample || "-"}</TD>
                <TD>
                  <Select
                    value={mapping[idx] ?? NONE}
                    onValueChange={(v) => onChange({ ...mapping, [idx]: v === NONE ? null : (v as SystemField) })}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>매핑 안함</SelectItem>
                      {(Object.keys(SYSTEM_FIELD_LABELS) as SystemField[]).map((field) => (
                        <SelectItem key={field} value={field}>
                          {SYSTEM_FIELD_LABELS[field]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
