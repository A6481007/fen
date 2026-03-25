"use client";

import React, { useEffect, useState } from "react";
import { Stack, Card, Text, Heading, Flex, Badge } from "@sanity/ui";
import { useClient, useFormValue, ObjectInputProps } from "sanity";

export function PriceDisplayInput(props: ObjectInputProps) {
  const { renderDefault } = props;
  const client = useClient({ apiVersion: "2023-10-01" });

  const price = useFormValue(["price"]) as number | undefined;
  const dealerPrice = useFormValue(["dealerPrice"]) as number | undefined;
  const discount = useFormValue(["discount"]) as number | undefined;

  const [markup, setMarkup] = useState<number>(30);

  useEffect(() => {
    client
      .fetch<number | null>('*[_type == "pricingSettings"][0].userMarkupPercent')
      .then((result) => {
        if (typeof result === "number") setMarkup(result);
      })
      .catch(() => {});
  }, [client]);

  const userPrice = price || 0;
  const calculatedDealerPrice = dealerPrice || userPrice / (1 + markup / 100);
  const discountedPrice = discount ? userPrice * (1 - discount / 100) : userPrice;
  const margin = userPrice - calculatedDealerPrice;
  const marginPercent = userPrice > 0 ? (margin / userPrice) * 100 : 0;

  return (
    <Stack space={4}>
      {renderDefault(props)}

      <Card padding={4} radius={2} tone="positive" shadow={1}>
        <Stack space={4}>
          <Heading size={1}>💰 Price Calculator</Heading>

          <Flex gap={4} wrap="wrap">
            <Stack space={2}>
              <Text size={1} muted>
                User Price
              </Text>
              <Heading size={3}>${userPrice.toFixed(2)}</Heading>
            </Stack>

            <Stack space={2}>
              <Text size={1} muted>
                Dealer Price
              </Text>
              <Heading size={3}>${calculatedDealerPrice.toFixed(2)}</Heading>
            </Stack>

            <Stack space={2}>
              <Text size={1} muted>
                Margin
              </Text>
              <Flex gap={2} align="center">
                <Heading size={3}>${margin.toFixed(2)}</Heading>
                <Badge tone="positive">{marginPercent.toFixed(1)}%</Badge>
              </Flex>
            </Stack>

            {discount > 0 && (
              <Stack space={2}>
                <Text size={1} muted>
                  After {discount}% Discount
                </Text>
                <Heading size={3} style={{ color: "#EF4444" }}>
                  ${discountedPrice.toFixed(2)}
                </Heading>
              </Stack>
            )}
          </Flex>

          <Text size={1} muted>
            Markup rate: {markup}% (from Pricing Settings)
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
