import Link from "next/link";

import { cn } from "@/lib/utils";

export type OutlineEntry = {
  id: string;
  label: string;
  kind?: "objective" | "section" | "quiz" | "reference";
  level?: number;
};

type LearningOutlineProps = {
  slug?: string;
  sections: OutlineEntry[];
  objectives?: string[];
  condensed?: boolean;
  className?: string;
};

const kindDot: Record<NonNullable<OutlineEntry["kind"]>, string> = {
  objective: "bg-emerald-500",
  section: "bg-ink",
  quiz: "bg-amber-500",
  reference: "bg-sky-500",
};

const LearningOutline = ({
  sections,
  objectives = [],
  condensed = false,
  className,
}: LearningOutlineProps) => {
  if (!sections.length) {
    return null;
  }

  return (
    <nav
      className={cn(
        "rounded-2xl border border-border bg-surface-0",
        condensed ? "p-4" : "p-5",
        className
      )}
      aria-label="Lesson outline"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">
            On this page
          </p>
          {condensed ? null : (
            <p className="text-sm text-ink-muted">Navigate the lesson</p>
          )}
        </div>
        {objectives.length ? (
          <span className="rounded-full border border-border bg-surface-1 px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            {objectives.length} objectives
          </span>
        ) : null}
      </div>

      <ul className={cn("mt-4 space-y-2 text-sm", condensed && "mt-3")}>
        {sections.map((section) => {
          const level = section.level ?? 1;
          const dotClass = section.kind ? kindDot[section.kind] : "bg-ink";

          return (
            <li key={section.id}>
              <Link
                href={`#${section.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-surface-1",
                  level > 1 ? "pl-6 text-ink-muted" : "text-ink"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", dotClass)} />
                <span className="leading-relaxed">{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default LearningOutline;
