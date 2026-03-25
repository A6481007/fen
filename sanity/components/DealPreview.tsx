import { Badge, Box, Card, Flex, Stack, Text } from "@sanity/ui";
import type { ReactNode } from "react";

type DealDocument = {
  title?: string | null;
  dealType?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  dealPrice?: number | null;
  originalPrice?: number | null;
  discountPercent?: number | null;
  quantityLimit?: number | null;
  perCustomerLimit?: number | null;
  soldCount?: number | null;
};

type DealPreviewProps = {
  document?: DealDocument | { displayed?: DealDocument };
  renderDefault?: (props: any) => ReactNode;
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatPrice = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? currency.format(value) : "—";

const deriveScheduleState = (status?: string | null, startDate?: string | null, endDate?: string | null) => {
  const now = Date.now();
  const start = startDate ? new Date(startDate).getTime() : NaN;
  const end = endDate ? new Date(endDate).getTime() : NaN;

  const hasEnded = Number.isFinite(end) && end < now;
  const isScheduled = Number.isFinite(start) && start > now;

  if (hasEnded || status === "ended") return { label: "Ended", tone: "default" as const };
  if (status === "paused") return { label: "Paused", tone: "caution" as const };
  if (isScheduled || status === "scheduled") return { label: "Scheduled", tone: "primary" as const };
  return { label: "Active", tone: "positive" as const };
};

const formatCountdown = (endDate?: string | null) => {
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

const normalizeDoc = (doc?: DealDocument | { displayed?: DealDocument } | null) => {
  if (doc && "displayed" in (doc as Record<string, unknown>)) {
    return ((doc as { displayed?: DealDocument }).displayed || {}) as DealDocument;
  }
  return (doc || {}) as DealDocument;
};

const DealPreview = (props: DealPreviewProps) => {
  const doc = normalizeDoc(props.document);
  const schedule = deriveScheduleState(doc.status, doc.startDate, doc.endDate);
  const countdown = formatCountdown(doc.endDate);

  const limit = typeof doc.quantityLimit === "number" && !Number.isNaN(doc.quantityLimit) ? doc.quantityLimit : null;
  const sold = typeof doc.soldCount === "number" && !Number.isNaN(doc.soldCount) ? doc.soldCount : 0;
  const remaining = limit === null ? null : Math.max(limit - sold, 0);

  const priceLabel =
    doc.discountPercent && Number.isFinite(doc.discountPercent)
      ? `${doc.discountPercent}% off`
      : doc.originalPrice
        ? `${formatPrice(doc.originalPrice)} → ${formatPrice(doc.dealPrice)}`
        : formatPrice(doc.dealPrice);

  return (
    <Stack space={3}>
      {props.renderDefault ? props.renderDefault(props as any) : null}

      <Card padding={3} radius={2} shadow={1} tone="transparent" border>
        <Stack space={3}>
          <Flex align="center" justify="space-between">
            <Text size={2} weight="semibold">
              Deal preview
            </Text>
            <Badge mode="outline" tone={schedule.tone}>
              {schedule.label}
            </Badge>
          </Flex>

          <Card
            radius={3}
            shadow={2}
            tone="transparent"
            style={{ overflow: "hidden", border: "1px solid #e5e7eb", backgroundColor: "#ffffff" }}
          >
            <Box padding={4} style={{ background: "linear-gradient(135deg, #0f172a 0%, #111827 70%)", color: "#ffffff" }}>
              <Stack space={2}>
                <Text size={3} weight="semibold">
                  {doc.title || "Untitled deal"}
                </Text>
                <Text size={1} muted>
                  {doc.dealType || "Deal"} • {schedule.label}
                </Text>
              </Stack>

              <Flex gap={3} wrap="wrap" style={{ marginTop: "12px" }}>
                <Badge tone="positive" mode="outline">
                  {priceLabel}
                </Badge>
                {remaining !== null ? (
                  <Badge tone={remaining === 0 ? "critical" : "primary"} mode="outline">
                    {remaining} of {limit} remaining
                  </Badge>
                ) : (
                  <Badge mode="outline">Unlimited quantity</Badge>
                )}
                {doc.perCustomerLimit ? (
                  <Badge tone="primary" mode="outline">
                    {doc.perCustomerLimit} per customer
                  </Badge>
                ) : null}
                {countdown ? (
                  <Badge tone="caution" mode="outline">
                    Ends in {countdown}
                  </Badge>
                ) : null}
              </Flex>
            </Box>

            <Card padding={3} tone="transparent">
              <Flex align="center" gap={3} justify="space-between">
                <Stack space={1}>
                  <Text size={1} muted>
                    Schedule
                  </Text>
                  <Text size={1} weight="semibold">
                    {doc.startDate ? new Date(doc.startDate).toLocaleString() : "No start"} →{" "}
                    {doc.endDate ? new Date(doc.endDate).toLocaleString() : "No end"}
                  </Text>
                </Stack>
                <Badge mode="outline">{doc.status || "draft"}</Badge>
              </Flex>
            </Card>
          </Card>

          <Text size={1} muted>
            Preview mirrors the storefront card: badge, countdown, and limits use current values.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};

export default DealPreview;
