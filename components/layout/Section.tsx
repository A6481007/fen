import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SectionSpacing = "sm" | "md" | "lg";

interface SectionProps extends HTMLAttributes<HTMLElement> {
  spacing?: SectionSpacing;
}

const spacingClasses: Record<SectionSpacing, string> = {
  sm: "py-6",
  md: "py-8 sm:py-10 lg:py-12",
  lg: "py-10 sm:py-12 lg:py-16",
};

const Section = ({ spacing = "md", className, ...props }: SectionProps) => {
  return <section className={cn(spacingClasses[spacing], className)} {...props} />;
};

export default Section;
