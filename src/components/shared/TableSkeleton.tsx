import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

const TableSkeleton = ({ rows = 6, columns = 5, showHeader = true }: TableSkeletonProps) => (
  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
    <div className="p-4 space-y-3">
      {showHeader && (
        <div className="flex gap-4 pb-3 border-b border-border">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default TableSkeleton;
