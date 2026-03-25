import { UploadIcon } from "@sanity/icons";
import { Box, Button, Card, Code, Flex, Stack, Text } from "@sanity/ui";
"use client";

import { useCallback, useMemo, useState } from "react";
import { definePlugin, useClient } from "sanity";

type ParsedDoc = Record<string, unknown>;

const MAX_DOCS = 500;
const DEFAULT_TYPE = "product";
const TYPE_OPTIONS = [
  { value: "category", label: "Categories" },
  { value: "product", label: "Products" },
  { value: "productTypeOption", label: "Product Types" },
  { value: "order", label: "Order" },
  { value: "banner", label: "Banner" },
  { value: "brand", label: "Brand" },
  { value: "blog", label: "Blog" },
  { value: "event", label: "Event" },
  { value: "news", label: "News" },
  { value: "blogCategory", label: "Blog Category" },
  { value: "author", label: "Author" },
  { value: "address", label: "Addresses" },
  { value: "contact", label: "Contact Messages" },
  { value: "sentNotification", label: "Sent Notification" },
  { value: "user", label: "User" },
  { value: "userAccessRequest", label: "User Access Request" },
  { value: "review", label: "Product Reviews" },
  { value: "subscription", label: "Newsletter Subscriptions" },
  { value: "download", label: "Download" },
  { value: "eventRsvp", label: "Event RSVPs" },
  { value: "catalog", label: "Catalog" },
  { value: "promotion", label: "Promotion" },
  { value: "pricingSettings", label: "Pricing Settings" },
];
const TYPE_HINTS: Record<string, string> = {
  category:
    'Fields: title, slug.current, parentCategory (as reference _ref), isParentCategory, depth, displayOrder, isActive, seoMetadata.*. Ensure parent categories exist first.',
  product:
    'Fields: name, slug.current, price, brand (reference _ref), categories (array of references), primaryCategory (reference _ref), description, images (image references), stock, status, variant (reference to productTypeOption).',
  productTypeOption: "Fields: title, slug.current, description.",
  order:
    "Fields: customer info, line items, totals per your schema. Include references for products and user if needed.",
  banner: "Fields: title, description, link, image/media per schema.",
  brand: "Fields: title, slug.current, description, image.",
  blog: "Fields: title, slug.current, content, categories (references), author (reference), publishedAt.",
  event: "Fields: title, slug.current, dates, location, description; images; related references.",
  news: "Fields: title, slug.current, content, publishedAt; similar to blog/news schema.",
  blogCategory: "Fields: title, slug.current, description.",
  author: "Fields: name, slug.current, image, bio.",
  address: "Fields: name, addressLine1, city, country, phone, etc., per schema.",
  contact: "Fields: name, email, message, subject.",
  sentNotification: "Fields: channel, to, subject, payload; timestamps.",
  user: "Fields: email, name, role, metadata; ensure auth IDs match your schema.",
  userAccessRequest: "Fields: email, requestedRole, reason, status.",
  review: "Fields: product (reference), rating, title, body, user (reference), status, createdAt.",
  subscription: "Fields: email, status, source, createdAt.",
  download: "Fields: title, slug.current, file (asset ref), relatedProducts (references).",
  eventRsvp: "Fields: event (reference), name, email, status, metadata.",
  catalog: "Fields: title, slug.current, description, publishDate, file (asset ref), metadata.*.",
  promotion: "Fields: campaignId, slug.current, name, type, status, startDate, endDate, conditions per schema.",
  pricingSettings: "Singleton. Fields: userMarkupPercent, vatPercent, notes. Typically one document; set _id to a stable value if upserting.",
};

const validType = (type?: string | null) =>
  TYPE_OPTIONS.find((option) => option.value === (type || "").trim())?.value || DEFAULT_TYPE;

const parseCsvLine = (line: string) => {
  const matches = line.match(/(?:\"([^\"]*)\")|([^,]+)/g);
  if (!matches) return [];
  return matches.map((segment) => segment.replace(/^"(.*)"$/, "$1").trim());
};

const parseCsv = (text: string): ParsedDoc[] => {
  const rows = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (rows.length < 2) return [];
  const headers = parseCsvLine(rows[0]).map((h) => h.trim());
  const docs: ParsedDoc[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const values = parseCsvLine(rows[i]);
    if (!values.length) continue;
    const doc: ParsedDoc = {};
    headers.forEach((header, idx) => {
      doc[header || `col${idx}`] = values[idx] ?? "";
    });
    docs.push(doc);
  }
  return docs;
};

const normalizeDocs = (docs: ParsedDoc[], targetType: string, useIdColumn: boolean) =>
  docs.map((doc, index) => {
    const normalized: ParsedDoc = { ...doc };
    normalized._type = targetType;
    if (useIdColumn && doc.id && typeof doc.id === "string") {
      normalized._id = doc.id;
    }
    if (!normalized._id) {
      normalized._id = `${targetType}-${crypto.randomUUID?.() || `${Date.now()}-${index}`}`;
    }
    return normalized;
  });

const ImportTool = () => {
  const client = useClient({ apiVersion: "2023-10-01" });
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawDocs, setRawDocs] = useState<ParsedDoc[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [targetType, setTargetType] = useState(DEFAULT_TYPE);
  const [useIdColumn, setUseIdColumn] = useState(false);

  const docCount = rawDocs.length;

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setStatus(null);
    setRawDocs([]);
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    let parsed: ParsedDoc[] = [];
    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsed = json;
        } else if (Array.isArray((json as any).documents)) {
          parsed = (json as any).documents;
        } else {
          parsed = [json];
        }
      } catch (err) {
        setError("Invalid JSON file");
        return;
      }
    } else if (file.name.toLowerCase().endsWith(".csv")) {
      parsed = parseCsv(text);
    } else {
      setError("Unsupported file type. Use .csv or .json");
      return;
    }

    if (!parsed.length) {
      setError("No documents found in file");
      return;
    }

    if (parsed.length > MAX_DOCS) {
      setError(`Too many documents (${parsed.length}). Limit ${MAX_DOCS}. Split the file and retry.`);
      return;
    }

    const nextType = validType(targetType);
    setTargetType(nextType);
    setRawDocs(parsed);
    setStatus(`Loaded ${parsed.length} documents`);
  }, [targetType]);

  const runImport = useCallback(async () => {
    if (!rawDocs.length) {
      setError("Load a file first");
      return;
    }
    const type = validType(targetType);
    const docs = normalizeDocs(rawDocs, type, useIdColumn);
    setIsImporting(true);
    setError(null);
    setStatus("Importing...");
    try {
      const chunkSize = 25;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const tx = client.transaction();
        chunk.forEach((doc) => tx.createOrReplace(doc));
        await tx.commit({ visibility: "async" });
      }
      setStatus(`Imported ${docs.length} documents into type "${type}".`);
    } catch (err) {
      console.error("Import failed", err);
      setError("Import failed. Check console for details.");
    } finally {
      setIsImporting(false);
    }
  }, [client, rawDocs, targetType, useIdColumn]);

  const samplePreview = useMemo(() => JSON.stringify(rawDocs.slice(0, 2), null, 2), [rawDocs]);

  return (
    <Box padding={4}>
      <Stack space={4}>
        <Card padding={4} radius={3} shadow={1}>
          <Stack space={3}>
            <Text size={2} weight="semibold">
              Import CSV/JSON
            </Text>
            <Text size={1} muted>
              Upload a CSV (header row required) or JSON array. _type will be set to the target type; an "id" column
              can be used as _id when "Use id as _id" is enabled.
            </Text>
            <Flex gap={2} align="center">
              <input
                type="file"
                accept=".csv,.json,application/json,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <Text size={1} muted>
                {fileName || "No file selected"}
              </Text>
            </Flex>
            <Flex gap={2} align="center">
              <Text size={1}>Target _type</Text>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                style={{ minWidth: 220, padding: "6px 10px", border: "1px solid #dcdcdc", borderRadius: 6 }}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.value})
                  </option>
                ))}
              </select>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={useIdColumn}
                  onChange={(e) => setUseIdColumn(e.target.checked)}
                  style={{ width: 14, height: 14 }}
                />
                Use "id" column as _id
              </label>
            </Flex>
          </Stack>
        </Card>

        <Card padding={4} radius={3} border>
          <Stack space={3}>
            <Flex justify="space-between" align="center">
              <Text size={2} weight="semibold">
                Summary
              </Text>
              <Button
                text={isImporting ? "Importing..." : "Import"}
                tone="primary"
                icon={UploadIcon}
                disabled={isImporting || !rawDocs.length || !targetType}
                onClick={() => void runImport()}
              />
            </Flex>
            <Text size={1} muted>
              Loaded documents: {docCount || 0} • Type: {targetType || DEFAULT_TYPE}
            </Text>
            <Text size={1} muted>
              Supported types: {TYPE_OPTIONS.map((opt) => opt.value).join(", ")}
            </Text>
            <Card padding={3} radius={2} tone="transparent">
              <Stack space={2}>
                <Text size={1} weight="semibold">
                  Expected fields for {targetType}
                </Text>
                <Text size={1} muted>
                  {TYPE_HINTS[targetType] || "Provide fields matching the schema for this type."}
                </Text>
              </Stack>
            </Card>
            {samplePreview && (
              <Card padding={3} radius={2} tone="transparent" style={{ maxHeight: 220, overflow: "auto" }}>
                <Code language="json">{samplePreview}</Code>
              </Card>
            )}
            {status && (
              <Card padding={3} radius={2} tone="positive">
                <Text size={1}>{status}</Text>
              </Card>
            )}
            {error && (
              <Card padding={3} radius={2} tone="critical">
                <Text size={1}>{error}</Text>
              </Card>
            )}
          </Stack>
        </Card>
      </Stack>
    </Box>
  );
};

export const importTool = definePlugin({
  name: "csv-json-import-tool",
  tools: [
    {
      name: "import-tool",
      title: "Import",
      icon: UploadIcon,
      component: ImportTool,
    },
  ],
});
