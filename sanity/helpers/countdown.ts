import { computeEventStatus, type EventStatus } from "./eventStatus";

export type CountdownResult = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isPastWarning: boolean;
  isCritical: boolean;
  label: string;
};

export type RegistrationStatus =
  | "early_bird"
  | "open"
  | "closing_soon"
  | "closed"
  | "waitlist"
  | "ended";

export type RegistrationOpenResult = {
  isOpen: boolean;
  reason: string | null;
  status: RegistrationStatus;
};

type CountdownInput = string | Date | null | undefined;

type RegistrableEvent = {
  date?: string | Date | null;
  status?: EventStatus | string | null;
  statusOverride?: EventStatus | string | null;
  registrationOpen?: boolean | null;
  registrationDeadline?: string | Date | null;
  earlyBirdDeadline?: string | Date | null;
  maxAttendees?: number | null;
  attendeeCount?: number | null;
  attendees?: unknown[] | null;
};

const toDate = (value: CountdownInput): Date | null => {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const pluralize = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"}`;

const buildCountdownLabel = (days: number, hours: number, minutes: number, seconds: number) => {
  const parts: string[] = [];

  if (days > 0) {
    parts.push(pluralize(days, "day"));
  }
  if (hours > 0 && parts.length < 2) {
    parts.push(pluralize(hours, "hour"));
  }

  if (parts.length === 0 && minutes > 0) {
    parts.push(pluralize(minutes, "minute"));
  }

  if (parts.length === 0 && minutes === 0 && seconds > 0) {
    parts.push(pluralize(seconds, "second"));
  }

  const descriptor = parts.join(" ");
  return descriptor ? `${descriptor} left` : "Less than a second left";
};

export const computeCountdown = (targetDate?: CountdownInput, now: Date = new Date()): CountdownResult => {
  const target = toDate(targetDate);

  if (!target) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      isPastWarning: false,
      isCritical: false,
      label: "No deadline",
    };
  }

  const diffMs = target.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const isPastWarning = totalSeconds > 0 && totalSeconds <= 86_400;
  const isCritical = totalSeconds > 0 && totalSeconds <= 3_600;

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired,
    isPastWarning,
    isCritical,
    label: isExpired ? "Expired" : buildCountdownLabel(days, hours, minutes, seconds),
  };
};

const normalizeCount = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const resolveAttendeeCount = (event?: RegistrableEvent | null) => {
  const explicit = normalizeCount(event?.attendeeCount);
  if (explicit !== null) return explicit;

  if (Array.isArray(event?.attendees)) {
    return event.attendees.length;
  }

  return null;
};

export const getRegistrationStatus = (
  event?: RegistrableEvent | null,
  now: Date = new Date()
): RegistrationStatus => {
  if (!event) {
    return "closed";
  }

  const eventStatus = computeEventStatus(event, now);
  if (eventStatus === "ended") {
    return "ended";
  }

  if (event.registrationOpen === false) {
    return "closed";
  }

  const registrationDeadlineDate = toDate(event.registrationDeadline);
  const hasRegistrationDeadline = Boolean(registrationDeadlineDate);
  const registrationCountdown = computeCountdown(registrationDeadlineDate, now);
  const deadlinePassed = hasRegistrationDeadline && registrationCountdown.isExpired;

  if (deadlinePassed) {
    return "closed";
  }

  const capacity = normalizeCount(event.maxAttendees);
  const attendeeCount = resolveAttendeeCount(event);
  const isFull = capacity !== null && attendeeCount !== null && attendeeCount >= capacity;

  if (isFull) {
    return "waitlist";
  }

  const earlyBirdDeadlineDate = toDate(event.earlyBirdDeadline);
  const earlyBirdCountdown = computeCountdown(earlyBirdDeadlineDate, now);
  const hasEarlyBird = Boolean(earlyBirdDeadlineDate) && !earlyBirdCountdown.isExpired;

  if (hasRegistrationDeadline && !registrationCountdown.isExpired && registrationCountdown.isPastWarning) {
    return "closing_soon";
  }

  if (hasEarlyBird) {
    return "early_bird";
  }

  return "open";
};

export const formatDeadlineLabel = (deadline?: CountdownInput, now: Date = new Date()): string => {
  const parsed = toDate(deadline);
  if (!parsed) {
    return "No deadline";
  }

  const countdown = computeCountdown(parsed, now);
  if (countdown.isExpired) {
    return "Closed";
  }

  if (countdown.days > 0) {
    return `Closes in ${pluralize(countdown.days, "day")}`;
  }

  if (countdown.hours > 0) {
    return `Closes in ${pluralize(countdown.hours, "hour")}`;
  }

  if (countdown.minutes > 0) {
    return `Closes in ${pluralize(countdown.minutes, "minute")}`;
  }

  return "Closes soon";
};

export const isRegistrationOpen = (
  event?: RegistrableEvent | null,
  now: Date = new Date()
): RegistrationOpenResult => {
  if (!event) {
    return { isOpen: false, reason: "Event not provided", status: "closed" };
  }

  const status = getRegistrationStatus(event, now);

  if (status === "open" || status === "closing_soon" || status === "early_bird") {
    return { isOpen: true, reason: null, status };
  }

  if (status === "waitlist") {
    return { isOpen: false, reason: "Event is at capacity (waitlist only)", status };
  }

  if (status === "closed") {
    return { isOpen: false, reason: "Registration deadline has passed or registration is closed", status };
  }

  return { isOpen: false, reason: "Event has ended", status };
};
