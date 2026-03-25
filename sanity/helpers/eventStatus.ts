export type EventStatus = "upcoming" | "ongoing" | "ended";

export const isEventStatus = (value?: string | null): value is EventStatus =>
  value === "upcoming" || value === "ongoing" || value === "ended";

type EventStatusInput = {
  date?: string | null;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
};

/**
 * Computes the event status where a valid `statusOverride` wins, then stored status,
 * and finally a date-vs-now comparison (missing/invalid dates return "upcoming").
 * Pass `now` to keep server/client paths deterministic; the helper uses a single ISO snapshot.
 */
export const computeEventStatus = (
  input?: EventStatusInput | null,
  now: Date = new Date()
): EventStatus => {
  const dateValue = input?.date;
  const override = input?.statusOverride;
  const storedStatus = input?.status;

  if (isEventStatus(override)) {
    return override;
  }

  if (isEventStatus(storedStatus)) {
    return storedStatus;
  }

  if (!dateValue) {
    return "upcoming";
  }

  const eventDate = new Date(dateValue);
  if (Number.isNaN(eventDate.getTime())) {
    return "upcoming";
  }

  const nowIso = now.toISOString();
  const eventIso = eventDate.toISOString();

  if (eventIso > nowIso) {
    return "upcoming";
  }

  if (eventIso.slice(0, 10) === nowIso.slice(0, 10)) {
    return "ongoing";
  }

  return "ended";
};
