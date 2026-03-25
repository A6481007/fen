"use client";

"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";
import type { SanityImageSource } from "@sanity/image-url/lib/types/types";
import { Mic } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export type EventSpeaker = {
  _key?: string;
  name?: string | null;
  title?: string | null;
  company?: string | null;
  bio?: string | null;
  image?: SanityImageSource | null;
};

type SpeakersGridProps = {
  speakers?: EventSpeaker[] | null;
  columns?: 2 | 3 | 4;
};

const columnClasses: Record<NonNullable<SpeakersGridProps["columns"]>, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

const SpeakerCard = ({ speaker }: { speaker: EventSpeaker }) => {
  const [expanded, setExpanded] = useState(false);

  const imageUrl = speaker.image
    ? urlFor(speaker.image).width(240).height(240).fit("crop").url()
    : null;
  const subtitle =
    speaker.title && speaker.company
      ? `${speaker.title} at ${speaker.company}`
      : speaker.title || speaker.company || "Guest speaker";
  const initial =
    typeof speaker.name === "string" && speaker.name.trim()
      ? speaker.name.trim().charAt(0).toUpperCase()
      : "S";
  const bio = typeof speaker.bio === "string" ? speaker.bio.trim() : "";

  return (
    <Card className="group flex h-full flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-shop_light_bg">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={speaker.name || "Event speaker"}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full object-cover"
              sizes="80px"
            />
          ) : (
            <span className="text-lg font-semibold text-shop_dark_green">{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-shop_dark_green">
            {speaker.name || "Speaker"}
          </p>
          <p className="mt-0.5 truncate text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>

      {bio ? (
        <div className="space-y-2">
          <p
            className={cn(
              "text-sm leading-relaxed text-gray-700",
              expanded ? "line-clamp-none" : "line-clamp-2"
            )}
          >
            {bio}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-shop_light_green hover:text-shop_dark_green focus:outline-none"
            aria-expanded={expanded}
          >
            <Mic className="h-4 w-4" aria-hidden="true" />
            {expanded ? "Show less" : "Read bio"}
          </button>
        </div>
      ) : null}
    </Card>
  );
};

const SpeakersGrid = ({ speakers = [], columns = 3 }: SpeakersGridProps) => {
  const items = Array.isArray(speakers) ? speakers.filter(Boolean) : [];

  if (!items.length) {
    return null;
  }

  const resolvedColumns = columnClasses[columns] || columnClasses[3];

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", resolvedColumns)}>
      {items.map((speaker, index) => (
        <SpeakerCard
          key={speaker?._key || speaker?.name || `speaker-${index}`}
          speaker={speaker}
        />
      ))}
    </div>
  );
};

export default SpeakersGrid;
