export const NEWS_CATEGORY_OPTIONS = [
  { value: "announcement", label: "Announcement" },
  { value: "partnership", label: "Partnership" },
  { value: "event_announcement", label: "Event" },
  { value: "general", label: "General" },
];

export const formatNewsCategory = (value?: string | null) => {
  if (!value || typeof value !== "string") return "General";
  const found = NEWS_CATEGORY_OPTIONS.find((option) => option.value === value);
  return found?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};
