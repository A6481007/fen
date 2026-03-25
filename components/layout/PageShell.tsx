import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  anchorOffset?: number;
}

const PageShell = ({ children, className, anchorOffset }: PageShellProps) => {
  const style =
    typeof anchorOffset === "number"
      ? { scrollPaddingTop: `${anchorOffset}px` }
      : undefined;

  return (
    <div className={cn("min-h-screen", className)} style={style}>
      {children}
    </div>
  );
};

export default PageShell;
