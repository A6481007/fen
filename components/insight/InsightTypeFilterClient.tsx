"use client";

import { useEffect, useState } from "react";
import InsightTypeFilter, {
  type InsightTypeFilterProps,
} from "@/components/insight/InsightTypeFilter";

interface InsightTypeFilterClientProps {
  section: InsightTypeFilterProps["section"];
  activeType: string | null;
  counts?: Record<string, number>;
  showCounts?: boolean;
}

const InsightTypeFilterClient = ({
  section,
  activeType,
  counts,
  showCounts,
}: InsightTypeFilterClientProps) => {
  const [selectedType, setSelectedType] = useState<string | null>(activeType);

  useEffect(() => {
    setSelectedType(activeType);
  }, [activeType]);

  return (
    <InsightTypeFilter
      section={section}
      activeType={selectedType}
      onTypeChange={setSelectedType}
      counts={counts}
      showCounts={showCounts}
    />
  );
};

export default InsightTypeFilterClient;
