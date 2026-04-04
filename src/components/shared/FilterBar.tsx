import { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}

const FilterBar = ({ searchValue, onSearchChange, searchPlaceholder = "Search...", children }: FilterBarProps) => (
  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}
      {children}
    </div>
  </div>
);

export default FilterBar;
