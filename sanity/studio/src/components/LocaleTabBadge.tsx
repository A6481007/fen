'use client';

import { Badge, Box, Card, Flex, Text } from '@sanity/ui';
import { getLocaleLabel } from '../utils/localeCompleteness';

type LocaleTabBadgeProps = {
  isComplete: boolean;
  locale: string;
};

export function LocaleTabBadge({ isComplete, locale }: LocaleTabBadgeProps) {
  const label = getLocaleLabel(locale);
  const tone = isComplete ? 'positive' : 'critical';
  const statusText = isComplete ? 'Done ✓' : 'Empty !';

  return (
    <Card paddingX={3} paddingY={2} radius={2} border tone={tone} style={{ whiteSpace: 'nowrap' }}>
      <Flex as="span" gap={2} align="center">
        <Badge tone={tone} mode="outline">
          {label}
        </Badge>
        <Flex align="center" gap={2}>
          <Box
            aria-hidden
            style={{
              width: 10,
              height: 10,
              borderRadius: '9999px',
              backgroundColor: isComplete ? '#16a34a' : '#ef4444',
            }}
          />
          <Text size={1} weight="medium">
            {statusText}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}

export default LocaleTabBadge;
