"use client";

import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

type ProseProps<T extends ElementType = "div"> = {
  as?: T;
  className?: string;
  children?: ReactNode;
};

const Prose = <T extends ElementType = "div">({
  as,
  className,
  children,
}: ProseProps<T>) => {
  const Component = (as || "div") as ElementType;

  return (
    <Component
      className={cn(
        "prose prose-lg max-w-none text-ink prose-headings:text-ink-strong prose-h4:font-semibold prose-a:text-ink-strong hover:prose-a:text-ink",
        className
      )}
    >
      {children}
    </Component>
  );
};

export default Prose;
