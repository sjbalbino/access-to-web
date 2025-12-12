import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  iconColor?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  iconColor = "bg-primary/10 text-primary",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8", className)}>
      <div className="flex items-center gap-4">
        {icon && (
          <div className={cn("icon-badge", iconColor)}>
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}