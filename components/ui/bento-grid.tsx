import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

export const BentoGrid = ({ children, className }: BentoGridProps): React.ReactElement => (
  <div className={cn("grid grid-cols-1 md:grid-cols-4 gap-6", className)}>{children}</div>
);

interface BentoItemProps {
  children: ReactNode;
  className?: string;
  span?: number;
}

export const BentoItem = ({ children, className, span = 4 }: BentoItemProps): React.ReactElement => (
  <div
    className={cn(
      "min-w-0",
      span === 1 && "md:col-span-1",
      span === 2 && "md:col-span-2",
      span === 3 && "md:col-span-3",
      span === 4 && "md:col-span-4",
      className,
    )}
  >
    {children}
  </div>
);
