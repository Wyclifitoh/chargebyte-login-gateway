import { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  prefix?: string;
}

const MetricCard = ({ title, value, change, icon, prefix = "" }: MetricCardProps) => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold text-foreground">
      {prefix}{typeof value === "number" ? value.toLocaleString() : value}
    </p>
    {change !== undefined && (
      <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${change >= 0 ? "text-green-600" : "text-destructive"}`}>
        {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(change)}% vs last month
      </div>
    )}
  </div>
);

export default MetricCard;
