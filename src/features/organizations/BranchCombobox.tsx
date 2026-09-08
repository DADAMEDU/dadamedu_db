import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/cn";
import { searchBranches, type BranchOption } from "@/features/organizations/api";

interface BranchComboboxProps {
  value: string | null;
  onChange: (branchId: string, branchName: string) => void;
  disabled?: boolean;
}

function formatBranchLabel(branch: BranchOption): string {
  return branch.branch_code ? `${branch.branch_code} · ${branch.organization_name}` : branch.organization_name;
}

/** 소속지사 선택용 검색 가능 콤보박스 (지사명 또는 지사코드로 검색, 지사가 많아져도 서버에서 검색) */
export function BranchCombobox({ value, onChange, disabled }: BranchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState<BranchOption[]>([]);
  const [selectedLabel, setSelectedLabel] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchBranches(search);
        if (!cancelled) setOptions(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  React.useEffect(() => {
    if (!value) {
      setSelectedLabel("");
      return;
    }
    const found = options.find((o) => o.id === value);
    if (found) setSelectedLabel(formatBranchLabel(found));
  }, [value, options]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {selectedLabel || (value ? value : "소속지사를 검색하세요 (지사명 또는 지사코드)")}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px]">
        <Command shouldFilter={false}>
          <CommandInput placeholder="지사명 또는 지사코드 검색..." value={search} onValueChange={setSearch} />
          <CommandList>
            {!loading && options.length === 0 && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
            {options.map((branch) => (
              <CommandItem
                key={branch.id}
                value={branch.id}
                onSelect={() => {
                  onChange(branch.id, branch.organization_name);
                  setSelectedLabel(formatBranchLabel(branch));
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", value === branch.id ? "opacity-100" : "opacity-0")}
                />
                <span>{formatBranchLabel(branch)}</span>
                {branch.region && (
                  <span className="ml-2 text-xs text-muted-foreground">{branch.region}</span>
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
