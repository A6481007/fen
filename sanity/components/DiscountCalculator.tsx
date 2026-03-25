import { Card, Stack, Text, TextInput, Button, Flex } from "@sanity/ui";
"use client";

import { useEffect, useState, type ReactNode } from "react";

type PromotionDocument = {
  discountType?: "percentage" | "fixed" | "bxgy" | "freeShipping" | "points" | string;
  discountValue?: number;
  minimumOrderValue?: number;
  maximumDiscount?: number;
};

type CalculationResult = {
  original: number;
  discount: number;
  final: number;
  savingsPercent: number;
  appliedCap: number | null;
  discountType?: string;
  discountValue: number;
};

type DiscountCalculatorProps = {
  document?: PromotionDocument;
  renderDefault?: (props: any) => ReactNode;
};

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);
const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const DiscountCalculator = (props: DiscountCalculatorProps) => {
  const { document, renderDefault } = props;
  const [orderValue, setOrderValue] = useState<string>("100");
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discountType = document?.discountType;
  const discountValue = numberOrNull(document?.discountValue);
  const minimumOrderValue = numberOrNull(document?.minimumOrderValue);
  const maximumDiscount = numberOrNull(document?.maximumDiscount);

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [discountType, discountValue, minimumOrderValue, maximumDiscount]);

  const handleCalculate = () => {
    const parsedOrder = Number.parseFloat(orderValue);

    if (!Number.isFinite(parsedOrder) || parsedOrder <= 0) {
      setError("Enter a valid test order value above $0.");
      setResult(null);
      return;
    }

    if (!discountType || (discountType !== "percentage" && discountType !== "fixed")) {
      setError("Select a percentage or fixed discount to preview.");
      setResult(null);
      return;
    }

    if (discountValue === null || discountValue < 0) {
      setError("Add a discount value before calculating.");
      setResult(null);
      return;
    }

    if (minimumOrderValue !== null && parsedOrder < minimumOrderValue) {
      setError(`Order must be at least ${formatCurrency(minimumOrderValue)} to qualify.`);
      setResult(null);
      return;
    }

    let computedDiscount =
      discountType === "percentage" ? (parsedOrder * Math.max(0, discountValue)) / 100 : Math.max(0, discountValue);

    let appliedCap: number | null = null;
    if (maximumDiscount !== null && maximumDiscount >= 0) {
      appliedCap = maximumDiscount;
      computedDiscount = Math.min(computedDiscount, maximumDiscount);
    }

    const finalTotal = Math.max(0, parsedOrder - computedDiscount);
    const savingsPercent = parsedOrder > 0 ? (computedDiscount / parsedOrder) * 100 : 0;

    setResult({
      original: parsedOrder,
      discount: computedDiscount,
      final: finalTotal,
      savingsPercent,
      appliedCap,
      discountType,
      discountValue,
    });
    setError(null);
  };

  const renderDiscountRow = () => {
    if (!result) return null;

    if (result.discountType === "percentage") {
      return (
        <Text size={1} weight="semibold">
          -{formatCurrency(result.discount)} ({formatPercent(result.discountValue)})
        </Text>
      );
    }

    return (
      <Text size={1} weight="semibold">
        -{formatCurrency(result.discount)}
      </Text>
    );
  };

  return (
    <Stack space={3}>
      {renderDefault ? renderDefault(props as any) : null}
      <Card padding={3} radius={2} shadow={1} tone="transparent" border>
        <Stack space={3}>
          <Text size={2} weight="semibold">
            Discount calculator
          </Text>
          <Stack space={2}>
            <Text size={1} muted>
              Test order value
            </Text>
            <Flex gap={2}>
              <TextInput
                value={orderValue}
                type="number"
                min={0}
                step={0.01}
                onChange={(event) => setOrderValue(event.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button text="Calculate" tone="primary" onClick={handleCalculate} />
            </Flex>
          </Stack>
          {error ? (
            <Card padding={2} radius={2} tone="caution">
              <Text size={1}>{error}</Text>
            </Card>
          ) : null}
          {result ? (
            <Stack space={2}>
              <Flex justify="space-between">
                <Text size={1}>Original</Text>
                <Text size={1} weight="semibold">
                  {formatCurrency(result.original)}
                </Text>
              </Flex>
              <Flex justify="space-between">
                <Text size={1}>Discount</Text>
                {renderDiscountRow()}
              </Flex>
              <Flex justify="space-between">
                <Text size={1}>Final</Text>
                <Text size={1} weight="semibold">
                  {formatCurrency(result.final)}
                </Text>
              </Flex>
              <Flex justify="space-between">
                <Text size={1}>Customer saves</Text>
                <Text size={1} weight="semibold">
                  {formatPercent(result.savingsPercent)}
                </Text>
              </Flex>
              {result.appliedCap !== null ? (
                <Text size={1} muted>
                  Discount capped at {formatCurrency(result.appliedCap)}.
                </Text>
              ) : null}
            </Stack>
          ) : null}
        </Stack>
      </Card>
    </Stack>
  );
};

export default DiscountCalculator;
