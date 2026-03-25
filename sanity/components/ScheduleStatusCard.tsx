import { Badge, Card, Flex, Stack, Text } from "@sanity/ui";
"use client";

import { useMemo } from "react";
import { useFormValue } from "sanity";

type ScheduleState = {
  label: string;
  tone: "default" | "primary" | "positive" | "caution" | "critical";
};

const parseDateMs = (value?: string | null) => {
  if (!value) return NaN;
  const parsed = new Date(value);
  return parsed.getTime();
};

const formatWithZone = (value?: string | null, timeZone?: string) => {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || "UTC",
    }).format(new Date(value));
  } catch {
    return null;
  }
};

const deriveScheduleState = (status?: string | null, startDate?: string | null, endDate?: string | null): ScheduleState => {
  const now = Date.now();
  const startMs = parseDateMs(startDate);
  const endMs = parseDateMs(endDate);

  const hasEnded =
    (typeof status === "string" && status.toLowerCase() === "ended") ||
    (Number.isFinite(endMs) && endMs < now);
  const isScheduled =
    (typeof status === "string" && status.toLowerCase() === "scheduled") ||
    (!hasEnded && Number.isFinite(startMs) && startMs > now);
  const isPaused = typeof status === "string" && status.toLowerCase() === "paused";

  if (hasEnded) return { label: "Ended", tone: "default" };
  if (isPaused) return { label: "Paused", tone: "caution" };
  if (isScheduled) return { label: "Scheduled", tone: "primary" };
  return { label: "Active", tone: "positive" };
};

const hasProductRef = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { _ref?: string; _id?: string };
  return Boolean(candidate._ref || candidate._id);
};

export function PromotionStatusInput(_props: any) {
  const status = useFormValue(["status"]) as string | null;
  const startDate = useFormValue(["startDate"]) as string | null;
  const endDate = useFormValue(["endDate"]) as string | null;
  const timezone = (useFormValue(["timezone"]) as string | null) || "UTC";
  const discountType = useFormValue(["discountType"]) as string | null;
  const promotionType = useFormValue(["type"]) as string | null;
  const defaultBundleItems = useFormValue(["defaultBundleItems"]) as Array<{ product?: unknown }> | null;
  const defaultProducts = useFormValue(["defaultProducts"]) as Array<{ product?: unknown }> | null;

  const schedule = useMemo(
    () => deriveScheduleState(status, startDate, endDate),
    [status, startDate, endDate]
  );

  const issues = useMemo(() => {
    const messages: string[] = [];
    const needsBundleDefaults = discountType === "bxgy" || promotionType === "bundle";
    const hasBundleDefaults = (defaultBundleItems || []).some((item) => hasProductRef(item?.product));
    const hasDefaultProducts = (defaultProducts || []).some((item) => hasProductRef(item?.product));

    if (needsBundleDefaults && !hasBundleDefaults) {
      messages.push("Add default bundle items so BXGY/bundle promos can auto-add correctly.");
    }

    if (!needsBundleDefaults && !hasDefaultProducts) {
      messages.push("Add default products to enable one-click apply on the storefront.");
    }

    return messages;
  }, [discountType, promotionType, defaultBundleItems, defaultProducts]);

  const startLabel = formatWithZone(startDate, timezone);
  const endLabel = formatWithZone(endDate, timezone);

  return (
    <Card padding={3} radius={2} shadow={1} tone="transparent" border>
      <Stack space={3}>
        <Flex align="center" justify="space-between">
          <Text size={1} weight="semibold">
            Schedule & guardrails
          </Text>
          <Badge mode="outline" tone={schedule.tone}>
            {schedule.label}
          </Badge>
        </Flex>

        <Flex gap={2} wrap="wrap">
          <Badge tone="primary" mode="outline">
            {timezone} timezone
          </Badge>
          {startLabel ? <Badge mode="outline">Starts {startLabel}</Badge> : null}
          {endLabel ? <Badge mode="outline">Ends {endLabel}</Badge> : null}
          {schedule.label === "Active" && endLabel ? (
            <Badge tone="positive" mode="outline">
              Live window
            </Badge>
          ) : null}
        </Flex>

        {issues.length ? (
          <Stack space={2}>
            {issues.map((message, idx) => (
              <Card key={idx} tone="caution" padding={2} radius={2} border>
                <Text size={1}>{message}</Text>
              </Card>
            ))}
          </Stack>
        ) : (
          <Text size={1} muted>
            Live preview uses schedule + status to show the current state for authors.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

export function DealStatusInput(_props: any) {
  const status = useFormValue(["status"]) as string | null;
  const startDate = useFormValue(["startDate"]) as string | null;
  const endDate = useFormValue(["endDate"]) as string | null;
  const quantityLimit = useFormValue(["quantityLimit"]) as number | null;
  const perCustomerLimit = useFormValue(["perCustomerLimit"]) as number | null;
  const soldCount = useFormValue(["soldCount"]) as number | null;

  const schedule = useMemo(
    () => deriveScheduleState(status, startDate, endDate),
    [status, startDate, endDate]
  );

  const limit = typeof quantityLimit === "number" && !Number.isNaN(quantityLimit) ? quantityLimit : null;
  const sold = typeof soldCount === "number" && !Number.isNaN(soldCount) ? soldCount : 0;
  const remaining = limit === null ? null : Math.max(limit - sold, 0);

  const startLabel = formatWithZone(startDate);
  const endLabel = formatWithZone(endDate);

  return (
    <Card padding={3} radius={2} shadow={1} tone="transparent" border>
      <Stack space={3}>
        <Flex align="center" justify="space-between">
          <Text size={1} weight="semibold">
            Status & limits
          </Text>
          <Badge mode="outline" tone={schedule.tone}>
            {schedule.label}
          </Badge>
        </Flex>

        <Flex gap={2} wrap="wrap">
          {startLabel ? <Badge mode="outline">Starts {startLabel}</Badge> : null}
          {endLabel ? <Badge mode="outline">Ends {endLabel}</Badge> : null}
          {limit !== null ? (
            <Badge tone={remaining === 0 ? "critical" : "primary"} mode="outline">
              {remaining} of {limit} remaining
            </Badge>
          ) : (
            <Badge mode="outline">Unlimited quantity</Badge>
          )}
          {perCustomerLimit ? (
            <Badge tone="primary" mode="outline">
              {perCustomerLimit} per customer
            </Badge>
          ) : null}
        </Flex>

        {schedule.label === "Active" && limit !== null && remaining <= 5 ? (
          <Card tone="caution" padding={2} radius={2} border>
            <Text size={1}>
              Scarcity alert: remaining quantity is low. Cart UI will block adds when it reaches zero.
            </Text>
          </Card>
        ) : (
          <Text size={1} muted>
            Deals respect schedule, status, and limits before rendering on the storefront.
          </Text>
        )}
      </Stack>
    </Card>
  );
}
