import { ReactNode, FC } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

const Skeleton: FC<SkeletonProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn("animate-pulse bg-muted rounded-md", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export { Skeleton };
