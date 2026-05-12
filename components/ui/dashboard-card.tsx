import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  children: ReactNode;
  className?: string;
}

export const DashboardCard = ({ children, className }: DashboardCardProps): React.ReactElement => (
  <div
    className={cn(
      "bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-[32px]",
      className,
    )}
  >
    {children}
  </div>
);
