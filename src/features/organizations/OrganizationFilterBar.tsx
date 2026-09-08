import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BranchCombobox } from "@/features/organizations/BranchCombobox";
import type { OrganizationFilters } from "@/features/organizations/useOrganizationList";
import type { OrganizationType } from "@/types/database";

interface Props {
  filters: OrganizationFilters;
  onChange: (filters: OrganizationFilters) => void;
  regions: string[];
  showParentBranch?: boolean;
  showBranchBusinessType?: boolean;
  organizationType?: OrganizationType;
  onOrganizationTypeChange?: (type: OrganizationType | "") => void;
}

const ALL = "__all__";

export function OrganizationFilterBar({
  filters,
  onChange,
  regions,
  showParentBranch,
  showBranchBusinessType,
  organizationType,
  onOrganizationTypeChange,
}: Props) {
  const [search, setSearch] = React.useState(filters.search);

  React.useEffect(() => setSearch(filters.search), [filters.search]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    onChange({ ...filters, search });
  }

  function resetAll() {
    setSearch("");
    onChange({
      search: "",
      region: "",
      approvalStatus: "",
      joinDateFrom: "",
      joinDateTo: "",
      parentBranchId: "",
      branchBusinessType: "",
    });
    onOrganizationTypeChange?.("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 기관명, 전화번호, 사업자번호, 주소 등으로 검색"
            className="pl-8"
          />
        </div>
        <Button type="submit" variant="outline">
          검색
        </Button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        {onOrganizationTypeChange && (
          <FilterField label="구분">
            <Select
              value={organizationType || ALL}
              onValueChange={(v) => onOrganizationTypeChange(v === ALL ? "" : (v as OrganizationType))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체</SelectItem>
                <SelectItem value="BRANCH">지사</SelectItem>
                <SelectItem value="AGENCY">지사기관</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        )}

        <FilterField label="권역">
          <Select
            value={filters.region || ALL}
            onValueChange={(v) => onChange({ ...filters, region: v === ALL ? "" : v })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        {showBranchBusinessType && (
          <FilterField label="지사 운영구분">
            <Select
              value={filters.branchBusinessType || ALL}
              onValueChange={(v) => onChange({ ...filters, branchBusinessType: v === ALL ? "" : v })}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>전체</SelectItem>
                <SelectItem value="EXISTING_ONLY">기존만</SelectItem>
                <SelectItem value="NEW_ONLY">신규만</SelectItem>
                <SelectItem value="BOTH">기존+신규</SelectItem>
                <SelectItem value="UNSET">미설정</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        )}

        {showParentBranch && (
          <FilterField label="소속지사">
            <div className="w-56">
              <BranchCombobox
                value={filters.parentBranchId || null}
                onChange={(id) => onChange({ ...filters, parentBranchId: id })}
              />
            </div>
          </FilterField>
        )}

        <FilterField label="승인여부">
          <Select
            value={filters.approvalStatus || ALL}
            onValueChange={(v) => onChange({ ...filters, approvalStatus: v === ALL ? "" : v })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>전체</SelectItem>
              <SelectItem value="승인완료">승인완료</SelectItem>
              <SelectItem value="승인대기">승인대기</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="가입일 시작">
          <Input
            type="date"
            className="w-40"
            value={filters.joinDateFrom}
            onChange={(e) => onChange({ ...filters, joinDateFrom: e.target.value })}
          />
        </FilterField>
        <FilterField label="가입일 종료">
          <Input
            type="date"
            className="w-40"
            value={filters.joinDateTo}
            onChange={(e) => onChange({ ...filters, joinDateTo: e.target.value })}
          />
        </FilterField>

        <Button variant="ghost" size="sm" onClick={resetAll} className="gap-1 text-muted-foreground">
          <X className="h-3.5 w-3.5" /> 필터 초기화
        </Button>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
