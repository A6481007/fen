import { Badge, Box, Button, Card, Flex, Stack, Text } from "@sanity/ui";
import type { ReactNode } from "react";

type PromotionDocument = {
  badgeLabel?: string;
  badgeColor?: string;
  heroMessage?: string;
  name?: string;
  discountType?: string;
  discountValue?: number;
  shortDescription?: string;
  ctaText?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  status?: string;
};

type PromotionPreviewProps = {
  document?: PromotionDocument | { displayed?: PromotionDocument };
  renderDefault?: (props: any) => ReactNode;
};

type BadgeTone = "default" | "primary" | "positive" | "caution" | "critical";

const fallbackBadgeColor = "#FF6B00";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const textOrFallback = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const safeBadgeColor = (value?: string) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(trimmed) ? trimmed : fallbackBadgeColor;
};

const formatDiscount = (type?: string, rawValue?: unknown) => {
  const value = typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : null;

  switch (type) {
    case "percentage":
      return value !== null ? `${value}% OFF` : "Percentage discount";
    case "fixed":
      return value !== null ? `${currencyFormatter.format(value)} OFF` : "Fixed discount";
    case "freeShipping":
      return "Free shipping";
    case "bxgy":
      return "Buy X Get Y";
    case "points":
      return "Earn points";
    default:
      return value !== null ? `${value}% OFF` : "Add discount details";
  }
};

const formatDate = (value?: string, timeZone?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: timeZone || "UTC",
    }).format(parsed);
  } catch {
    return null;
  }
};

const formatDateRange = (start?: string, end?: string, timeZone?: string) => {
  const startLabel = formatDate(start, timeZone);
  const endLabel = formatDate(end, timeZone);

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `Starts ${startLabel}`;
  if (endLabel) return `Ends ${endLabel}`;
  return "Add start and end dates";
};

const statusMeta = (status?: string): { label: string; tone: BadgeTone; dot: string } => {
  const map: Record<string, { label: string; tone: BadgeTone; dot: string }> = {
    active: { label: "Active", tone: "positive", dot: "#16a34a" },
    scheduled: { label: "Scheduled", tone: "primary", dot: "#0ea5e9" },
    paused: { label: "Paused", tone: "caution", dot: "#f59e0b" },
    ended: { label: "Ended", tone: "default", dot: "#94a3b8" },
    archived: { label: "Archived", tone: "default", dot: "#94a3b8" },
    draft: { label: "Draft", tone: "default", dot: "#cbd5e1" },
  };

  const key = typeof status === "string" ? status.toLowerCase() : "";
  return map[key] || { label: status || "Draft", tone: "default", dot: "#cbd5e1" };
};

const deriveScheduleState = (status?: string, startDate?: string, endDate?: string): { label: string; tone: BadgeTone } => {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : NaN;
  const end = endDate ? new Date(endDate).getTime() : NaN;

  const hasEnded = Number.isFinite(end) && end < now;
  const isScheduled = Number.isFinite(start) && start > now;

  if (hasEnded || status === "ended") return { label: "Ended", tone: "default" };
  if (status === "paused") return { label: "Paused", tone: "caution" };
  if (isScheduled || status === "scheduled") return { label: "Scheduled", tone: "primary" };
  return { label: "Active", tone: "positive" };
};

const formatCountdown = (endDate?: string) => {
  if (!endDate) return null;
  const end = new Date(endDate).getTime();
  if (!Number.isFinite(end)) return null;

  const diff = end - Date.now();
  if (diff <= 0) return "Ended";

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
};

const normalizeDocument = (doc?: PromotionDocument | { displayed?: PromotionDocument } | null): PromotionDocument => {
  if (doc && "displayed" in (doc as Record<string, unknown>)) {
    return ((doc as { displayed?: PromotionDocument }).displayed || {}) as PromotionDocument;
  }
  return (doc || {}) as PromotionDocument;
};

const PromotionPreview = (props: PromotionPreviewProps) => {
  const { document, renderDefault } = props;
  const doc = normalizeDocument(document);

  const heroTitle = textOrFallback(doc?.heroMessage, textOrFallback(doc?.name, "Add a headline"));
  const badgeLabel = textOrFallback(doc?.badgeLabel, "Badge label");
  const badgeColor = safeBadgeColor(doc?.badgeColor);
  const description = textOrFallback(doc?.shortDescription, "Short description will appear here.");
  const discountDisplay = formatDiscount(doc?.discountType, doc?.discountValue);
  const ctaText = textOrFallback(doc?.ctaText, "Shop now");
  const timezone = textOrFallback(doc?.timezone, "UTC");
  const status = statusMeta(doc?.status);
  const schedule = deriveScheduleState(doc?.status, doc?.startDate, doc?.endDate);
  const dateRange = formatDateRange(doc?.startDate, doc?.endDate, timezone);
  const countdown = formatCountdown(doc?.endDate);

  return (
    <Stack space={3}>
      {renderDefault ? renderDefault(props as any) : null}
      <Card padding={3} radius={2} shadow={1} tone="transparent" border>
        <Stack space={3}>
          <Flex align="center" justify="space-between">
            <Text size={2} weight="semibold">
              Promotion preview
            </Text>
            <Flex align="center" gap={2}>
              <Badge mode="outline" tone={schedule.tone}>
                {schedule.label}
              </Badge>
              <Badge mode="outline" tone={status.tone}>
                {status.label}
              </Badge>
            </Flex>
          </Flex>

          <Card
            radius={3}
            shadow={2}
            tone="transparent"
            style={{ overflow: "hidden", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}
          >
            <Box
              padding={4}
              style={{
                background: `linear-gradient(135deg, ${badgeColor} 0%, #0f172a 70%)`,
                color: "#ffffff",
              }}
            >
              <Flex align="flex-start" justify="space-between">
                <Box
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "6px 12px",
                    backgroundColor: badgeColor,
                    color: "#ffffff",
                    borderRadius: "999px",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    fontSize: "12px",
                  }}
                >
                  {badgeLabel}
                </Box>
                <Card
                  padding={3}
                  radius={2}
                  shadow={1}
                  tone="transparent"
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#0f172a",
                    minWidth: "140px",
                    textAlign: "right",
                  }}
                >
                  <Text size={1} muted>
                    Discount
                  </Text>
                  <Text size={3} weight="semibold">
                    {discountDisplay}
                  </Text>
                </Card>
              </Flex>

              <Stack space={3} style={{ marginTop: "16px", maxWidth: "640px" }}>
                <Text size={3} weight="semibold">
                  {heroTitle}
                </Text>
                <Text size={1} muted style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                  {description}
                </Text>
              </Stack>

              <Flex align="center" gap={3} style={{ marginTop: "20px" }}>
                <Button
                  text={ctaText}
                  tone="primary"
                  style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
                />
                <Text size={1} muted style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                  CTA preview
                </Text>
              </Flex>
            </Box>

            <Card padding={3} tone="transparent">
              <Flex align="center" justify="space-between">
                <Stack space={1}>
                  <Text size={1} muted>
                    Valid
                  </Text>
                  <Text size={1} weight="semibold">
                    {dateRange}
                  </Text>
                  {countdown ? (
                    <Text size={1} muted>
                      Ends in {countdown}
                    </Text>
                  ) : null}
                </Stack>

                <Flex align="center" gap={3}>
                  <Flex align="center" gap={2}>
                    <Box
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: status.dot,
                        border: "1px solid #e5e7eb",
                      }}
                    />
                    <Text size={1}>{schedule.label}</Text>
                  </Flex>
                  <Badge mode="outline" tone="primary">
                    {timezone}
                  </Badge>
                  {countdown ? (
                    <Badge mode="outline" tone="caution">
                      Ends in {countdown}
                    </Badge>
                  ) : null}
                </Flex>
              </Flex>
            </Card>
          </Card>

          <Text size={1} muted>
            Live preview updates as you edit promotion fields.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};

export default PromotionPreview;
