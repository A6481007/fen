export const statusOptions = [
  { value: "upcoming", label: "Upcoming" },
  { value: "ongoing", label: "Ongoing" },
  { value: "ended", label: "Ended" },
] as const;

export const publishStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export const eventTypeOptions = [
  { value: "seminar", label: "Seminar" },
  { value: "workshop", label: "Workshop" },
  { value: "webinar", label: "Webinar" },
  { value: "conference", label: "Conference" },
  { value: "training", label: "Training" },
] as const;

export const currencyOptions = [
  { value: "THB", label: "THB" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
  { value: "JPY", label: "JPY" },
  { value: "SGD", label: "SGD" },
] as const;
