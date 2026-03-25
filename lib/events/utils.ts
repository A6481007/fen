type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export const DEFAULT_EVENT_TIMEZONE = "Asia/Bangkok";

export const generateKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const slugifyEventSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

export const normalizeTargetAudience = (values?: string[] | null) => {
  if (!Array.isArray(values)) return [];
  const cleaned = values.map((value) => value.trim()).filter(Boolean);
  return Array.from(new Set(cleaned));
};

export const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => `${input}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const parseDateParts = (value: string): DateParts | null => {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  );
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? "0"),
    minute: Number(match[5] ?? "0"),
    second: Number(match[6] ?? "0"),
  };
};

const getTimeZoneOffset = (timeZone: string, date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const values: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        values[part.type] = part.value;
      }
    }
    const asUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
    return (asUtc - date.getTime()) / 60000;
  } catch {
    return 0;
  }
};

const zonedTimeToUtc = (parts: DateParts, timeZone: string) => {
  const utcDate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
  );
  const offsetMinutes = getTimeZoneOffset(timeZone, utcDate);
  return new Date(utcDate.getTime() - offsetMinutes * 60000);
};

export const parseLocalDateTimeToIso = (
  value?: string | null,
  timeZone: string = DEFAULT_EVENT_TIMEZONE,
) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const hasZoneSuffix = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const directDate = new Date(trimmed);
  if (hasZoneSuffix && !Number.isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  const parts = parseDateParts(trimmed);
  if (!parts) {
    return Number.isNaN(directDate.getTime()) ? undefined : directDate.toISOString();
  }

  const utcDate = zonedTimeToUtc(parts, timeZone);
  if (Number.isNaN(utcDate.getTime())) return undefined;
  return utcDate.toISOString();
};
