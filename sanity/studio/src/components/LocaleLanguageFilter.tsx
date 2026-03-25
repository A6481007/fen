'use client';

import { useMemo } from 'react';
import { Box, Card, Flex, Text } from '@sanity/ui';
import { useEditState } from 'sanity';
import { useDocumentPane } from 'sanity/desk';
import type { ObjectSchemaType } from 'sanity';
import LocaleTabBadge from './LocaleTabBadge';
import { LOCALE_FIELD_REQUIREMENTS, getLocaleCompleteness, getLocaleLabel } from '../utils/localeCompleteness';

type Props = {
  schemaType: ObjectSchemaType;
};

export function LocaleLanguageFilter({ schemaType }: Props) {
  const { documentId } = useDocumentPane();
  const editState = documentId ? useEditState(documentId, schemaType.name) : null;
  const documentValue = editState?.draft || editState?.published;

  const localeMap = LOCALE_FIELD_REQUIREMENTS[schemaType.name];
  const locales = useMemo(() => Object.entries(localeMap ?? {}), [localeMap]);

  if (!localeMap || locales.length === 0) return null;

  return (
    <Card padding={2} tone="transparent">
      <Flex gap={2} align="center">
        {locales.map(([locale, requiredFields]) => {
          const isComplete = getLocaleCompleteness(documentValue as Record<string, unknown>, locale, requiredFields);
          return <LocaleTabBadge key={locale} locale={locale} isComplete={isComplete} />;
        })}
      </Flex>
      <Box marginTop={1}>
        <Text size={0} muted>
          Locale completeness · {getLocaleLabel(locales[0]?.[0] ?? '')} / {getLocaleLabel(locales[1]?.[0] ?? '')}
        </Text>
      </Box>
    </Card>
  );
}

export default LocaleLanguageFilter;
