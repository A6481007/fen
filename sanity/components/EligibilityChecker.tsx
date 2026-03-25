import { Badge, Button, Card, Flex, Select, Stack, Text, TextInput } from "@sanity/ui";
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

type SegmentOption = "allCustomers" | "firstTime" | "returning" | "vip" | "cartAbandoner" | "inactive" | string;

type ReferenceValue = {
  _ref?: string;
  _id?: string;
  title?: string;
  name?: string;
  slug?: { current?: string };
};

type TargetAudience = {
  segmentType?: SegmentOption;
  minLTVThreshold?: number;
  products?: ReferenceValue[];
  categories?: ReferenceValue[];
};

type PromotionDocument = {
  targetAudience?: TargetAudience;
  minimumOrderValue?: number;
  name?: string;
};

type EligibilityCheckerProps = {
  document?: PromotionDocument;
  renderDefault?: (props: any) => ReactNode;
};

type Option = {
  value: string;
  label: string;
};

type CriteriaResult = {
  field: string;
  ok: boolean;
  detail: string;
};

type EligibilityResult = {
  eligible: boolean;
  matches: string[];
  failures: string[];
  breakdown: CriteriaResult[];
};

const segmentLabels: Record<string, string> = {
  allCustomers: "All customers",
  firstTime: "First time",
  returning: "Returning",
  vip: "VIP",
  cartAbandoner: "Cart abandoner",
  inactive: "Inactive",
};

const segmentOptions: Option[] = [
  { value: "allCustomers", label: "All customers" },
  { value: "firstTime", label: "First time" },
  { value: "returning", label: "Returning" },
  { value: "vip", label: "VIP" },
  { value: "cartAbandoner", label: "Cart abandoner" },
  { value: "inactive", label: "Inactive" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const parseInputNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const refId = (value: ReferenceValue | string | undefined | null) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._ref || value._id || value.slug?.current || value.name || value.title || null;
};

const refLabel = (value: ReferenceValue | string | undefined | null) => {
  if (!value) return "Untitled";
  if (typeof value === "string") return value;
  return value.title || value.name || value.slug?.current || value._ref || value._id || "Untitled";
};

const buildOptions = (items: unknown[]): Option[] =>
  items
    .map((item) => (item && typeof item === "object" ? (item as ReferenceValue) : null))
    .map((item) => {
      const value = refId(item);
      if (!value) return null;
      return { value, label: refLabel(item) };
    })
    .filter((option): option is Option => Boolean(option));

const formatCurrency = (value: number) => currencyFormatter.format(value);
const segmentLabel = (value?: string) => segmentLabels[value || ""] || value || "Unspecified";

const EligibilityChecker = (props: EligibilityCheckerProps) => {
  const { document, renderDefault } = props;
  const docSegment = document?.targetAudience?.segmentType;
  const docMinLTV = numberOrNull(document?.targetAudience?.minLTVThreshold);
  const docMinOrder = numberOrNull(document?.minimumOrderValue);

  const productOptions = useMemo(
    () => buildOptions(Array.isArray(document?.targetAudience?.products) ? document?.targetAudience?.products : []),
    [document?.targetAudience?.products]
  );

  const categoryOptions = useMemo(
    () => buildOptions(Array.isArray(document?.targetAudience?.categories) ? document?.targetAudience?.categories : []),
    [document?.targetAudience?.categories]
  );

  const [testSegment, setTestSegment] = useState<string>(docSegment || "allCustomers");
  const [ltvInput, setLtvInput] = useState<string>(docMinLTV !== null ? String(docMinLTV) : "");
  const [cartValueInput, setCartValueInput] = useState<string>(docMinOrder !== null ? String(docMinOrder) : "");
  const [testProduct, setTestProduct] = useState<string>(productOptions[0]?.value || "untargeted");
  const [testCategory, setTestCategory] = useState<string>(categoryOptions[0]?.value || "untargeted");
  const [result, setResult] = useState<EligibilityResult | null>(null);

  useEffect(() => {
    setTestSegment(docSegment || "allCustomers");
    setResult(null);
  }, [docSegment]);

  useEffect(() => {
    setLtvInput(docMinLTV !== null ? String(docMinLTV) : "");
    setResult(null);
  }, [docMinLTV]);

  useEffect(() => {
    setCartValueInput(docMinOrder !== null ? String(docMinOrder) : "");
    setResult(null);
  }, [docMinOrder]);

  useEffect(() => {
    setTestProduct(productOptions[0]?.value || "untargeted");
    setResult(null);
  }, [productOptions]);

  useEffect(() => {
    setTestCategory(categoryOptions[0]?.value || "untargeted");
    setResult(null);
  }, [categoryOptions]);

  const evaluateEligibility = () => {
    const matches: string[] = [];
    const failures: string[] = [];
    const breakdown: CriteriaResult[] = [];
    const targetedProductIds = productOptions.map((option) => option.value);
    const targetedCategoryIds = categoryOptions.map((option) => option.value);
    const parsedLtv = parseInputNumber(ltvInput);
    const parsedCart = parseInputNumber(cartValueInput);

    const addResult = (field: string, ok: boolean, detail: string) => {
      breakdown.push({ field, ok, detail });
      if (ok) {
        matches.push(detail);
      } else {
        failures.push(detail);
      }
    };

    if (!docSegment || docSegment === "allCustomers") {
      addResult("Segment", true, "Segment allows all customers");
    } else if (testSegment === docSegment) {
      addResult("Segment", true, `Segment matches (${segmentLabel(docSegment)})`);
    } else {
      addResult("Segment", false, `Segment requires ${segmentLabel(docSegment)}`);
    }

    if (docMinLTV === null) {
      addResult("Min LTV", true, "No minimum LTV requirement");
    } else if (parsedLtv === null) {
      addResult("Min LTV", false, `Provide LTV to test threshold of ${formatCurrency(docMinLTV)}`);
    } else if (parsedLtv >= docMinLTV) {
      addResult("Min LTV", true, `LTV meets minimum (${formatCurrency(docMinLTV)})`);
    } else {
      addResult("Min LTV", false, `LTV ${formatCurrency(parsedLtv)} is below minimum ${formatCurrency(docMinLTV)}`);
    }

    if (docMinOrder === null) {
      addResult("Min order", true, "No minimum order value requirement");
    } else if (parsedCart === null) {
      addResult("Min order", false, `Provide cart value to test minimum of ${formatCurrency(docMinOrder)}`);
    } else if (parsedCart >= docMinOrder) {
      addResult("Min order", true, `Cart value meets minimum (${formatCurrency(docMinOrder)})`);
    } else {
      addResult(
        "Min order",
        false,
        `Cart value ${formatCurrency(parsedCart)} is below minimum ${formatCurrency(docMinOrder)}`
      );
    }

    if (targetedProductIds.length === 0) {
      addResult("Products", true, "No product targeting configured");
    } else if (testProduct !== "untargeted" && targetedProductIds.includes(testProduct)) {
      const label = productOptions.find((option) => option.value === testProduct)?.label || "Selected product";
      addResult("Products", true, `${label} is targeted`);
    } else {
      const list = productOptions.map((option) => option.label).join(", ");
      addResult("Products", false, `Select a targeted product (${list || "configure products"})`);
    }

    if (targetedCategoryIds.length === 0) {
      addResult("Categories", true, "No category targeting configured");
    } else if (testCategory !== "untargeted" && targetedCategoryIds.includes(testCategory)) {
      const label = categoryOptions.find((option) => option.value === testCategory)?.label || "Selected category";
      addResult("Categories", true, `${label} is targeted`);
    } else {
      const list = categoryOptions.map((option) => option.label).join(", ");
      addResult("Categories", false, `Select a targeted category (${list || "configure categories"})`);
    }

    setResult({
      eligible: failures.length === 0,
      matches,
      failures,
      breakdown,
    });
  };

  return (
    <Stack space={3}>
      {renderDefault ? renderDefault(props as any) : null}
      <Card padding={3} radius={2} shadow={1} tone="transparent" border>
        <Stack space={3}>
          <Text size={2} weight="semibold">
            Eligibility checker
          </Text>
          <Text size={1} muted>
            Simulate a customer profile against this promotion&apos;s targeting rules.
          </Text>

          <Stack space={3}>
            <Stack space={2}>
              <Text size={1} muted>
                User segment
              </Text>
              <Select value={testSegment} onChange={(event) => setTestSegment(event.currentTarget.value)}>
                {segmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Stack>

            <Flex gap={3} wrap="wrap">
              <Stack space={2} style={{ minWidth: "220px", flex: 1 }}>
                <Text size={1} muted>
                  LTV (for VIP)
                </Text>
                <TextInput
                  type="number"
                  value={ltvInput}
                  min={0}
                  step={0.01}
                  onChange={(event) => setLtvInput(event.currentTarget.value)}
                />
              </Stack>
              <Stack space={2} style={{ minWidth: "220px", flex: 1 }}>
                <Text size={1} muted>
                  Cart value
                </Text>
                <TextInput
                  type="number"
                  value={cartValueInput}
                  min={0}
                  step={0.01}
                  onChange={(event) => setCartValueInput(event.currentTarget.value)}
                />
              </Stack>
            </Flex>

            <Flex gap={3} wrap="wrap">
              <Stack space={2} style={{ minWidth: "220px", flex: 1 }}>
                <Text size={1} muted>
                  Test product
                </Text>
                <Select
                  value={testProduct}
                  onChange={(event) => setTestProduct(event.currentTarget.value)}
                  disabled={productOptions.length === 0}
                >
                  <option value="untargeted">{productOptions.length ? "Other product" : "No products configured"}</option>
                  {productOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Stack>
              <Stack space={2} style={{ minWidth: "220px", flex: 1 }}>
                <Text size={1} muted>
                  Test category
                </Text>
                <Select
                  value={testCategory}
                  onChange={(event) => setTestCategory(event.currentTarget.value)}
                  disabled={categoryOptions.length === 0}
                >
                  <option value="untargeted">
                    {categoryOptions.length ? "Other category" : "No categories configured"}
                  </option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Stack>
            </Flex>

            <Flex justify="flex-end">
              <Button tone="primary" text="Check Eligibility" onClick={evaluateEligibility} />
            </Flex>
          </Stack>

          <Card padding={3} radius={2} shadow={0} tone={result ? (result.eligible ? "positive" : "caution") : "transparent"} border>
            {result ? (
              <Stack space={3}>
                <Flex align="center" gap={3}>
                  <Text size={2} weight="semibold">
                    {result.eligible ? "✅ Eligible" : "❌ Not eligible"}
                  </Text>
                  <Badge mode="outline" tone={result.eligible ? "positive" : "caution"}>
                    {document?.targetAudience?.segmentType ? segmentLabel(document.targetAudience.segmentType) : "Segment"}
                  </Badge>
                </Flex>

                <Flex gap={4} wrap="wrap">
                  <Stack space={2} style={{ minWidth: "240px", flex: 1 }}>
                    <Text size={1} weight="semibold">
                      Matched
                    </Text>
                    {result.matches.length ? (
                      result.matches.map((item, index) => (
                        <Text key={item + index} size={1}>
                          • {item}
                        </Text>
                      ))
                    ) : (
                      <Text size={1} muted>
                        No matching criteria yet.
                      </Text>
                    )}
                  </Stack>
                  <Stack space={2} style={{ minWidth: "240px", flex: 1 }}>
                    <Text size={1} weight="semibold">
                      Reasons / blockers
                    </Text>
                    {result.failures.length ? (
                      result.failures.map((item, index) => (
                        <Text key={item + index} size={1}>
                          • {item}
                        </Text>
                      ))
                    ) : (
                      <Text size={1} muted>
                        No blockers; all configured criteria pass.
                      </Text>
                    )}
                  </Stack>
                </Flex>

                <Stack space={2}>
                  <Text size={1} weight="semibold">
                    Target audience checks
                  </Text>
                  {result.breakdown.map((entry) => (
                    <Flex key={entry.field} align="center" justify="space-between">
                      <Text size={1}>{entry.field}</Text>
                      <Text size={1} tone={entry.ok ? "positive" : "critical"}>
                        {entry.ok ? "✅" : "❌"} {entry.detail}
                      </Text>
                    </Flex>
                  ))}
                </Stack>
              </Stack>
            ) : (
              <Text size={1} muted>
                Enter test values and click &ldquo;Check Eligibility&rdquo; to see which targeting rules match or fail.
              </Text>
            )}
          </Card>
        </Stack>
      </Card>
    </Stack>
  );
};

export default EligibilityChecker;
