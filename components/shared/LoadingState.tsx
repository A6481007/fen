"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LoadingStateProps = {
  message?: string;
  className?: string;
  inline?: boolean;
};

const LoadingState = ({ message = "Loading...", className, inline = false }: LoadingStateProps) => {
  const content = (
    <div className={cn("flex items-center gap-2 text-sm text-ink-muted", className)}>
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      <span>{message}</span>
    </div>
  );

  if (inline) return content;

  return (
    <div className="flex min-h-[120px] items-center justify-center">
      {content}
    </div>
  );
};

export default LoadingState;
