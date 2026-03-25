"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AgendaItem = {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
};

type AgendaTimelineProps = {
  agenda: AgendaItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  className?: string;
};

const AgendaTimeline = ({
  agenda,
  collapsible,
  defaultExpanded,
  className,
}: AgendaTimelineProps) => {
  const items = Array.isArray(agenda) ? agenda : [];
  const isCollapsible = collapsible ?? items.length > 5;
  const [isExpanded, setIsExpanded] = useState<boolean>(() => defaultExpanded ?? !isCollapsible);

  if (!items.length) {
    return (
      <div
        className={cn(
          "rounded-xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-gray-600 shadow-sm",
          className
        )}
      >
        Agenda will be announced soon
      </div>
    );
  }

  const visibleItems = !isCollapsible || isExpanded ? items : items.slice(0, 3);

  return (
    <div className={cn("space-y-5", className)}>
      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-200" aria-hidden="true" />
        <div className="space-y-4">
          {visibleItems.map((item, index) => {
            const title = item.title?.trim() || "Agenda item";
            const time = item.time?.trim() || `Session ${index + 1}`;

            return (
              <div key={`${title}-${index}`} className="relative flex gap-4 pl-8 sm:pl-10">
                <div className="absolute left-1.5 top-4 flex h-5 w-5 items-center justify-center">
                  <span className="h-3 w-3 rounded-full border-2 border-white bg-shop_light_green shadow-sm" />
                </div>

                <article className="flex-1 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-shop_light_bg px-3 py-1 text-xs font-semibold uppercase tracking-wide text-shop_dark_green">
                        {time}
                      </span>
                      <h3 className="text-base font-semibold text-shop_dark_green">{title}</h3>
                    </div>
                    {item.speaker ? (
                      <span className="text-xs font-semibold uppercase tracking-wide text-shop_light_green">
                        {item.speaker}
                      </span>
                    ) : null}
                  </div>
                  {item.description ? <p className="mt-2 text-sm text-gray-600">{item.description}</p> : null}
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {isCollapsible && items.length > 3 ? (
        <div className="pt-1">
          <Button
            variant="outline"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full border-shop_light_green/40 text-shop_dark_green hover:bg-shop_light_bg hover:text-shop_dark_green"
          >
            {isExpanded ? "Show less" : `Show all ${items.length} sessions`}
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export default AgendaTimeline;
export type { AgendaItem };
