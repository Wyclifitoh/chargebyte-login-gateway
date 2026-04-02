interface StatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const STATUS_VARIANTS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  online: "bg-green-100 text-green-700",
  completed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  inactive: "bg-muted text-muted-foreground",
  offline: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  overdue: "bg-orange-100 text-orange-700",
  scheduled: "bg-blue-100 text-blue-700",
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const classes = STATUS_VARIANTS[status] || "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${classes}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
