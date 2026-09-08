import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TH } from "@/components/ui/table";
import { cn } from "@/lib/cn";

interface SortableTHProps {
  column: string;
  label: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (column: string) => void;
  className?: string;
}

export function SortableTH({ column, label, sortBy, sortDir, onSort, className }: SortableTHProps) {
  const active = sortBy === column;
  return (
    <TH
      onClick={() => onSort(column)}
      className={cn("cursor-pointer select-none hover:text-foreground", className)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </TH>
  );
}
