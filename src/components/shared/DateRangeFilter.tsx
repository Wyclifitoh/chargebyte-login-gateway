import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import type { DatePeriod } from "@/hooks/useDashboardData";

interface Props {
  period: DatePeriod;
  dateFrom?: string;
  dateTo?: string;
  onChange: (next: { period: DatePeriod; date_from?: string; date_to?: string }) => void;
}

const DateRangeFilter = ({ period, dateFrom, dateTo, onChange }: Props) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>Period</span>
      </div>
      <Select
        value={period}
        onValueChange={(v) => onChange({ period: v as DatePeriod, date_from: dateFrom, date_to: dateTo })}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="yesterday">Yesterday</SelectItem>
          <SelectItem value="week">Last 7 days</SelectItem>
          <SelectItem value="month">Last 30 days</SelectItem>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="custom">Custom range</SelectItem>
        </SelectContent>
      </Select>

      {period === "custom" && (
        <>
          <Input
            type="date"
            value={dateFrom ?? ""}
            onChange={(e) => onChange({ period, date_from: e.target.value, date_to: dateTo })}
            className="h-9 w-[160px]"
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            value={dateTo ?? ""}
            onChange={(e) => onChange({ period, date_from: dateFrom, date_to: e.target.value })}
            className="h-9 w-[160px]"
          />
        </>
      )}
    </div>
  );
};

export default DateRangeFilter;
