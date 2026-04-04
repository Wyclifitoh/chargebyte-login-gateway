import { ReactNode } from "react";

interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  noPadding?: boolean;
}

const SectionCard = ({ title, description, children, actions, className = "", noPadding }: SectionCardProps) => (
  <div className={`rounded-xl border border-border bg-card shadow-sm ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between px-5 pt-5 pb-0">
        <div>
          {title && <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </div>
    )}
    <div className={noPadding ? "" : "p-5"}>{children}</div>
  </div>
);

export default SectionCard;
