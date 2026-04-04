import { ReactNode } from "react";

interface DetailRowProps {
  label: string;
  value: ReactNode;
}

const DetailRow = ({ label, value }: DetailRowProps) => (
  <div className="flex items-center justify-between py-2 border-b border-border">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{typeof value === "string" ? value : value}</span>
  </div>
);

export default DetailRow;
