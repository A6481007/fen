import { TrashIcon } from "@sanity/icons";
import { Box, Button, Card, Checkbox, Flex, Spinner, Stack, Text } from "@sanity/ui";
"use client";

import { useCallback, useEffect, useState } from "react";
import { definePlugin, useClient } from "sanity";
import { apiVersion } from "../env";

type CountRecord = Record<string, number>;
type ManualDoc = {
  _id: string;
  _type: string;
  title?: string;
  name?: string;
  slug?: { current?: string };
  _updatedAt?: string;
  _createdAt?: string;
};

const DELETABLE_TYPES = [
  { value: "category", label: "Categories" },
  { value: "product", label: "Products" },
  { value: "brand", label: "Brands" },
  { value: "banner", label: "Banners" },
  { value: "blog", label: "News / Blog" },
  { value: "news", label: "News (new schema)" },
  { value: "event", label: "Events" },
  { value: "promotion", label: "Promotions" },
  { value: "catalog", label: "Catalog Items" },
  { value: "download", label: "Downloads" },
  { value: "review", label: "Reviews" },
  { value: "order", label: "Orders" },
  { value: "subscription", label: "Subscriptions" },
  { value: "contact", label: "Contacts" },
  { value: "address", label: "Addresses" },
  { value: "userAccessRequest", label: "Access Requests" },
];

const formatCount = (value?: number) => {
  if (typeof value !== "number") return "...";
  return value === 1 ? "1 document" : `${value} documents`;
};

const DataCleanupTool = () => {
  const client = useClient({ apiVersion });
  const [selectedType, setSelectedType] = useState<string>(DELETABLE_TYPES[0]?.value || "");
  const [counts, setCounts] = useState<CountRecord>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [isDeletingType, setIsDeletingType] = useState(false);
  const [manualDocs, setManualDocs] = useState<ManualDoc[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isDeletingDocs, setIsDeletingDocs] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshCounts = useCallback(async () => {
    setLoadingCounts(true);
    setFeedback(null);
    try {
      const results = await Promise.all(
        DELETABLE_TYPES.map(async (item) => {
          const count = await client.fetch<number>("count(*[_type == $type])", { type: item.value });
          return [item.value, count] as const;
        })
      );
      setCounts(Object.fromEntries(results));
    } catch (error) {
      console.error("Failed to load cleanup counts", error);
      setFeedback("Failed to load counts. Please retry.");
    } finally {
      setLoadingCounts(false);
    }
  }, [client]);

  const refreshDocs = useCallback(
    async (type: string) => {
      if (!type) return;
      setLoadingDocs(true);
      setFeedback(null);
      try {
        const docs = await client.fetch<ManualDoc[]>(
          `*[_type == $type] | order(_updatedAt desc, _createdAt desc)[0...50]{
            _id,
            _type,
            _updatedAt,
            _createdAt,
            title,
            name,
            slug
          }`,
          { type }
        );
        setManualDocs(docs || []);
        setSelectedDocIds([]);
      } catch (error) {
        console.error("Failed to load documents for cleanup", error);
        setFeedback("Failed to load documents. Please retry.");
      } finally {
        setLoadingDocs(false);
      }
    },
    [client]
  );

  useEffect(() => {
    refreshCounts().catch((error) => {
      console.error("Failed initial cleanup count load", error);
    });
  }, [refreshCounts]);

  useEffect(() => {
    refreshDocs(selectedType).catch((error) => {
      console.error("Failed initial document load", error);
    });
  }, [selectedType, refreshDocs]);

  const selectedDocCount = selectedDocIds.length;

  const toggleDoc = (id: string) => {
    setSelectedDocIds((prev) => (prev.includes(id) ? prev.filter((docId) => docId !== id) : [...prev, id]));
  };

  const selectAllDocs = () => setSelectedDocIds(manualDocs.map((doc) => doc._id));
  const clearDocs = () => setSelectedDocIds([]);

  const handleDeleteType = async (typeOverride?: string) => {
    const type = typeOverride || selectedType;
    if (!type) return;

    const count = counts[type] ?? 0;
    const confirmed = window.confirm(
      `Delete ${count || "all"} documents of type "${type}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingType(true);
    setFeedback(null);
    try {
      await client.delete({ query: "*[_type == $type]", params: { type } });
      await Promise.all([refreshCounts(), refreshDocs(type)]);
      setFeedback(`All documents of type "${type}" deleted. Lists refreshed.`);
    } catch (error) {
      console.error("Cleanup deletion failed", error);
      setFeedback("Failed to delete documents for this type. Check console for details.");
    } finally {
      setIsDeletingType(false);
    }
  };

  const docLabel = (doc: ManualDoc) => {
    const slug = doc?.slug?.current;
    const base = doc.title || doc.name || slug || doc._id;
    return slug && base !== slug ? `${base} (${slug})` : base;
  };

  const handleDeleteDocs = async () => {
    if (!selectedDocIds.length) {
      setFeedback("Select one or more documents to delete.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedDocIds.length} document(s) from ${selectedType || "selected type"}? This cannot be undone.`
    );
    if (!confirmed) return;

    setIsDeletingDocs(true);
    setFeedback(null);
    try {
      for (const id of selectedDocIds) {
        await client.delete(id);
      }
      await Promise.all([refreshDocs(selectedType), refreshCounts()]);
      setFeedback("Selected documents deleted. Lists refreshed.");
    } catch (error) {
      console.error("Document deletion failed", error);
      setFeedback("Failed to delete one or more documents. Check console for details.");
    } finally {
      setIsDeletingDocs(false);
    }
  };

  const anyDeleting = isDeletingType || isDeletingDocs;

  return (
    <Box padding={4}>
      <Stack space={5}>
        <Card padding={4} radius={3} shadow={1} tone="caution">
          <Stack space={3}>
            <Text size={2} weight="semibold">
              Danger zone: delete content
            </Text>
            <Text size={1} muted>
              Choose a type on the left, then delete all documents or select individual ones on the right. Deletes drafts
              and published documents. This action cannot be undone.
            </Text>
          </Stack>
        </Card>

        <Flex gap={4} align="flex-start" style={{ flexWrap: "wrap" }}>
          <Card padding={4} radius={3} border style={{ flex: "1 1 280px", maxWidth: "360px" }}>
            <Stack space={3}>
              <Flex justify="space-between" align="center" style={{ gap: "0.75rem" }}>
                <Stack space={1}>
                  <Text size={2} weight="semibold">
                    Document types
                  </Text>
                  <Text size={1} muted>
                    Select a type to review and delete documents. Counts include drafts and published.
                  </Text>
                </Stack>
                <Button text="Refresh" onClick={refreshCounts} disabled={loadingCounts || anyDeleting} />
              </Flex>
              <Stack space={2}>
                {DELETABLE_TYPES.map((item) => {
                  const selected = item.value === selectedType;
                  return (
                    <Card
                      key={item.value}
                      padding={3}
                      radius={3}
                      border
                      tone={selected ? "primary" : "default"}
                      onClick={() => {
                        setSelectedType(item.value);
                        refreshDocs(item.value);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      <Flex align="center" justify="space-between" style={{ gap: "0.75rem" }}>
                        <Stack space={1} style={{ minWidth: 0 }}>
                          <Text weight="semibold">{item.label}</Text>
                          <Text size={1} muted>
                            _type: "{item.value}" - {formatCount(counts[item.value])}
                          </Text>
                        </Stack>
                        <Button
                          text="Delete all"
                          tone="critical"
                          mode="ghost"
                          disabled={anyDeleting || loadingCounts}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteType(item.value);
                          }}
                        />
                      </Flex>
                    </Card>
                  );
                })}
              </Stack>
            </Stack>
          </Card>

          <Card padding={4} radius={3} border style={{ flex: "2 1 420px" }}>
            <Stack space={3}>
              <Flex justify="space-between" align="center" style={{ gap: "0.75rem" }}>
                <Stack space={1}>
                  <Text size={2} weight="semibold">
                    Documents in {selectedType || "type"}
                  </Text>
                  <Text size={1} muted>
                    Showing {manualDocs.length} documents (latest first). Select items to delete.
                  </Text>
                </Stack>
                <Flex gap={2} align="center">
                  <Button text="Refresh" onClick={() => refreshDocs(selectedType)} disabled={loadingDocs || anyDeleting} />
                  {loadingDocs && <Spinner muted />}
                </Flex>
              </Flex>

              <Flex justify="space-between" align="center">
                <Text size={1} muted>
                  Selected {selectedDocCount}
                </Text>
                <Flex gap={2}>
                  <Button
                    mode="bleed"
                    text="Select all listed"
                    onClick={selectAllDocs}
                    disabled={loadingDocs || anyDeleting || manualDocs.length === 0}
                  />
                  <Button
                    mode="bleed"
                    text="Clear"
                    onClick={clearDocs}
                    disabled={loadingDocs || anyDeleting || selectedDocCount === 0}
                  />
                </Flex>
              </Flex>

              <Stack space={2}>
                {loadingDocs ? (
                  <Card padding={3} radius={2} tone="primary">
                    <Text size={1}>Loading documents...</Text>
                  </Card>
                ) : manualDocs.length === 0 ? (
                  <Card padding={3} radius={2} tone="primary">
                    <Text size={1}>No documents found for this type.</Text>
                  </Card>
                ) : (
                  manualDocs.map((doc) => {
                    const selected = selectedDocIds.includes(doc._id);
                    return (
                      <Card key={doc._id} padding={3} radius={3} border tone={selected ? "primary" : "default"}>
                        <Flex align="center" justify="space-between" style={{ gap: "0.75rem" }}>
                          <Stack space={1} style={{ minWidth: 0 }}>
                            <Text weight="semibold" style={{ wordBreak: "break-word" }}>
                              {docLabel(doc)}
                            </Text>
                            <Text size={1} muted>
                              {doc._id}
                            </Text>
                          </Stack>
                          <Checkbox
                            checked={selected}
                            disabled={loadingDocs || anyDeleting}
                            onChange={() => toggleDoc(doc._id)}
                          />
                        </Flex>
                      </Card>
                    );
                  })
                )}
              </Stack>

              <Button
                text={isDeletingDocs ? "Deleting..." : "Delete selected documents"}
                tone="critical"
                onClick={handleDeleteDocs}
                disabled={isDeletingDocs || loadingDocs || selectedDocCount === 0}
              />
            </Stack>
          </Card>
        </Flex>

        {feedback && (
          <Card padding={3} radius={2} tone={feedback.toLowerCase().includes("fail") ? "critical" : "positive"}>
            <Text size={1}>{feedback}</Text>
          </Card>
        )}
      </Stack>
    </Box>
  );
};

export const dataCleanupTool = definePlugin({
  name: "data-cleanup-tool",
  tools: [
    {
      name: "data-cleanup",
      title: "Data Cleanup",
      icon: TrashIcon,
      component: DataCleanupTool,
    },
  ],
});
