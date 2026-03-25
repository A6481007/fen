"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Heading,
  Label,
  NumberInput,
  Select,
  Spinner,
  Stack,
  Switch,
  Text,
  TextArea,
  TextInput,
} from "@sanity/ui";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  RefreshIcon,
  SearchIcon,
  TrashIcon,
  WarningOutlineIcon,
  ErrorOutlineIcon,
  PlayIcon,
  PauseIcon,
} from "@sanity/icons";
import { definePlugin, defineTool, useClient } from "sanity";
import type { SanityDocument } from "sanity";

import { moveCategoryBranch, validateCategoryHierarchy, type CategoryHierarchyError } from "../../../lib/sanity/category.utils";

type RawCategoryDocument = {
  _id: string;
  title?: string;
  slug?: string | null;
  depth?: number | null;
  description?: string | null;
  isActive?: boolean | null;
  displayOrder?: number | null;
  parentCategory?: { _ref?: string | null } | null;
  productCount?: number | null;
  range?: number | null;
  featured?: boolean | null;
  isParentCategory?: boolean | null;
  metadata?: { icon?: string | null; color?: string | null } | null;
  seoMetadata?: {
    seoTitle?: string | null;
    seoDescription?: string | null;
    metaKeywords?: string[] | null;
    canonicalUrl?: string | null;
  } | null;
};

type NormalizedCategory = {
  id: string;
  documentId: string;
  title: string;
  slug: string;
  depth: number;
  description: string;
  isActive: boolean;
  displayOrder: number;
  parentId?: string;
  productCount: number;
  range?: number | null;
  featured: boolean;
  isParentCategory: boolean;
  metadata?: { icon?: string; color?: string };
  seoMetadata?: {
    seoTitle?: string;
    seoDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
};

type CategoryNode = NormalizedCategory & { children: CategoryNode[] };

type CategoryFormState = {
  title: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  isParentCategory: boolean;
  parentId?: string | null;
  description: string;
  range?: number | null;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  icon?: string;
  color?: string;
};

type TreeBuildResult = { roots: CategoryNode[]; lookup: Map<string, CategoryNode> };

const CATEGORY_QUERY = `
*[_type == "category"] | order(depth asc, displayOrder asc, title asc) {
  _id,
  title,
  "slug": slug.current,
  depth,
  description,
  isActive,
  displayOrder,
  parentCategory,
  isParentCategory,
  range,
  featured,
  metadata,
  seoMetadata,
  "productCount": count(*[_type == "product" && references(^._id)])
}
`;

const CACHE_TTL_MS = 5 * 60 * 1000;
let categoryCache: { fetchedAt: number; records: NormalizedCategory[] } | null = null;
let inflightPromise: Promise<NormalizedCategory[]> | null = null;

const normalizeId = (value?: string | null) =>
  typeof value === "string" ? value.replace(/^drafts\./, "") : undefined;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 96);

const normalizeCategoryDocs = (docs: RawCategoryDocument[]): NormalizedCategory[] => {
  const records = new Map<string, NormalizedCategory>();

  for (const doc of docs) {
    const baseId = normalizeId(doc._id);
    if (!baseId) continue;

    const normalized: NormalizedCategory = {
      id: baseId,
      documentId: doc._id,
      title: doc.title || "Untitled category",
      slug: typeof doc.slug === "string" ? doc.slug : "",
      depth: typeof doc.depth === "number" && doc.depth >= 0 ? doc.depth : 0,
      description: typeof doc.description === "string" ? doc.description : "",
      isActive: doc.isActive !== false,
      displayOrder:
        typeof doc.displayOrder === "number" && doc.displayOrder >= 0
          ? doc.displayOrder
          : Number.MAX_SAFE_INTEGER,
      parentId: normalizeId(doc.parentCategory?._ref),
      productCount: typeof doc.productCount === "number" ? Math.max(0, doc.productCount) : 0,
      range: typeof doc.range === "number" && !Number.isNaN(doc.range) ? doc.range : null,
      featured: doc.featured === true,
      isParentCategory: doc.isParentCategory === true,
      metadata: {
        icon: doc.metadata?.icon ?? "",
        color: doc.metadata?.color ?? "",
      },
      seoMetadata: {
        seoTitle: doc.seoMetadata?.seoTitle ?? "",
        seoDescription: doc.seoMetadata?.seoDescription ?? "",
        metaKeywords: doc.seoMetadata?.metaKeywords ?? [],
        canonicalUrl: doc.seoMetadata?.canonicalUrl ?? "",
      },
    };

    const existing = records.get(baseId);
    const isDraft = doc._id.startsWith("drafts.");
    if (!existing) {
      records.set(baseId, normalized);
      continue;
    }

    const mergedProductCount = Math.max(normalized.productCount, existing.productCount);
    const keepDraft = existing.documentId.startsWith("drafts.") && !isDraft;
    if (keepDraft) {
      records.set(baseId, { ...existing, productCount: mergedProductCount });
      continue;
    }

    records.set(baseId, { ...normalized, productCount: mergedProductCount });
  }

  return Array.from(records.values());
};

const fetchCategoriesWithCache = async (client: ReturnType<typeof useClient>) => {
  const now = Date.now();
  if (categoryCache && now - categoryCache.fetchedAt < CACHE_TTL_MS) {
    return categoryCache.records;
  }

  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = client
    .fetch<RawCategoryDocument[]>(CATEGORY_QUERY)
    .then((docs) => {
      const normalized = normalizeCategoryDocs(docs);
      categoryCache = { fetchedAt: Date.now(), records: normalized };
      inflightPromise = null;
      return normalized;
    })
    .catch((error) => {
      inflightPromise = null;
      throw error;
    });

  return inflightPromise;
};

const buildTree = (records: NormalizedCategory[]): TreeBuildResult => {
  const lookup = new Map<string, CategoryNode>();
  records.forEach((record) => lookup.set(record.id, { ...record, children: [] }));

  const comparator = (a: CategoryNode, b: CategoryNode) => {
    const orderDiff = a.displayOrder - b.displayOrder;
    if (orderDiff !== 0) return orderDiff;
    return a.title.localeCompare(b.title, "en", { sensitivity: "base" });
  };

  const roots: CategoryNode[] = [];
  lookup.forEach((node) => {
    const parent = node.parentId ? lookup.get(node.parentId) : undefined;
    if (parent && parent.depth < node.depth) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNode = (node: CategoryNode) => {
    node.children.sort(comparator);
    node.children.forEach(sortNode);
  };

  roots.sort(comparator);
  roots.forEach(sortNode);

  return { roots, lookup };
};

const filterTree = (nodes: CategoryNode[], query: string, activeOnly: boolean): CategoryNode[] => {
  const normalizedQuery = query.trim().toLowerCase();

  const matchNode = (node: CategoryNode): CategoryNode | null => {
    if (activeOnly && !node.isActive) return null;

    const filteredChildren = node.children
      .map((child) => matchNode(child))
      .filter(Boolean) as CategoryNode[];

    const matchesQuery =
      normalizedQuery.length === 0 || node.title.toLowerCase().includes(normalizedQuery);

    if (matchesQuery || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  return nodes
    .map((node) => matchNode(node))
    .filter(Boolean) as CategoryNode[];
};

const collectIds = (nodes: CategoryNode[]) => {
  const ids: string[] = [];
  const walk = (node: CategoryNode) => {
    ids.push(node.id);
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return ids;
};

const collectDescendantIds = (nodeId: string, lookup: Map<string, CategoryNode>) => {
  const node = lookup.get(nodeId);
  if (!node) return [] as string[];
  const ids: string[] = [];

  const walk = (current: CategoryNode) => {
    ids.push(current.id);
    current.children.forEach((child) => walk(child));
  };

  walk(node);
  return ids;
};

const buildBreadcrumb = (nodeId: string, lookup: Map<string, CategoryNode>) => {
  const path: string[] = [];
  let currentId: string | undefined = nodeId;
  const seen = new Set<string>();

  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);

    const node = lookup.get(currentId);
    if (!node) break;

    path.unshift(node.title);
    currentId = node.parentId;
  }

  return path;
};

const truncate = (value: string, max = 160) => {
  if (!value) return "";
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}...`;
};

const CategoryTreeToolComponent = () => {
  const client = useClient({ apiVersion: "2023-10-01" });
  const [records, setRecords] = useState<NormalizedCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formState, setFormState] = useState<CategoryFormState | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<
    | null
    | "move"
    | "reorder"
    | "activate"
    | "archive"
    | "duplicate"
    | "delete"
  >(null);
  const [branchTarget, setBranchTarget] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<CategoryHierarchyError[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const { roots, lookup } = useMemo(() => buildTree(records), [records]);
  const filteredTree = useMemo(
    () => filterTree(roots, search, activeOnly),
    [roots, search, activeOnly]
  );
  const visibleIds = useMemo(() => collectIds(filteredTree), [filteredTree]);

  const selectedCategory = selectedId ? lookup.get(selectedId) ?? null : null;
  const breadcrumb = useMemo(
    () => (selectedId ? buildBreadcrumb(selectedId, lookup) : []),
    [selectedId, lookup]
  );

  const rootWithoutChildren = useMemo(() => {
    const ids = new Set<string>();
    roots.forEach((node) => {
      if (node.depth === 0 && node.children.length === 0) {
        ids.add(node.id);
      }
    });
    return ids;
  }, [roots]);

  const depthOneNoProducts = useMemo(() => {
    const ids = new Set<string>();
    records.forEach((record) => {
      if (record.depth === 1 && record.productCount === 0) {
        ids.add(record.id);
      }
    });
    return ids;
  }, [records]);

  const circularIds = useMemo(() => {
    const ids = new Set<string>();
    validationErrors
      .filter((error) => error.type === "circular_reference")
      .forEach((error) => ids.add(error.categoryId));
    return ids;
  }, [validationErrors]);

  const parentOptions = useMemo(() => {
    if (!selectedCategory) return [] as NormalizedCategory[];
    const blocked = new Set<string>(collectDescendantIds(selectedCategory.id, lookup));
    blocked.add(selectedCategory.id);

    return records.filter((record) => record.depth <= 1 && !blocked.has(record.id));
  }, [records, selectedCategory, lookup]);

  const clearCacheAndReload = () => {
    categoryCache = null;
    inflightPromise = null;
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCategoriesWithCache(client)
      .then((data) => {
        if (cancelled) return;
        setRecords(data);
        if (!selectedId && data.length) {
          setSelectedId(data[0].id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to load categories";
        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, selectedId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    validateCategoryHierarchy(client)
      .then((result) => {
        if (!cancelled) {
          setValidationErrors(result.errors);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValidationErrors([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, refreshKey]);

  useEffect(() => {
    if (!selectedCategory) {
      setFormState(null);
      return;
    }

    setFormState({
      title: selectedCategory.title,
      slug: selectedCategory.slug,
      displayOrder: Number.isFinite(selectedCategory.displayOrder)
        ? selectedCategory.displayOrder
        : 0,
      isActive: selectedCategory.isActive,
      isParentCategory: selectedCategory.isParentCategory,
      parentId: selectedCategory.parentId || null,
      description: selectedCategory.description,
      range: typeof selectedCategory.range === "number" ? selectedCategory.range : null,
      featured: selectedCategory.featured,
      seoTitle: selectedCategory.seoMetadata?.seoTitle ?? "",
      seoDescription: selectedCategory.seoMetadata?.seoDescription ?? "",
      metaKeywords: (selectedCategory.seoMetadata?.metaKeywords || []).join(", "),
      canonicalUrl: selectedCategory.seoMetadata?.canonicalUrl ?? "",
      icon: selectedCategory.metadata?.icon ?? "",
      color: selectedCategory.metadata?.color ?? "",
    });
  }, [selectedCategory]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    visibleIds.forEach((id) => {
      allExpanded[id] = true;
    });
    setExpanded(allExpanded);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const selectCategory = (id: string) => {
    setSelectedId(id);
    setStatus(null);
    setExpanded((prev) => ({ ...prev, [id]: true }));
  };

  const handleSave = async () => {
    if (!selectedCategory || !formState) return;
    setSaving(true);
    setStatus(null);

    try {
      const slugValue = (formState.slug || slugify(formState.title)).trim();
      const keywords = formState.metaKeywords
        ? formState.metaKeywords
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean)
        : [];

      const patchPayload: Record<string, unknown> = {
        title: formState.title.trim() || "Untitled category",
        slug: { _type: "slug", current: slugValue },
        displayOrder: Number.isFinite(formState.displayOrder)
          ? Math.max(0, formState.displayOrder)
          : 0,
        isActive: formState.isActive,
        isParentCategory: formState.isParentCategory,
        description: formState.description,
        range: typeof formState.range === "number" ? formState.range : null,
        featured: formState.featured,
        seoMetadata: {
          seoTitle: formState.seoTitle,
          seoDescription: formState.seoDescription,
          metaKeywords: keywords,
          canonicalUrl: formState.canonicalUrl,
        },
        metadata: {
          icon: formState.icon,
          color: formState.color,
        },
      };

      await client
        .patch(selectedCategory.documentId)
        .set(patchPayload)
        .commit({ autoGenerateArrayKeys: true });

      if (formState.parentId !== (selectedCategory.parentId || null)) {
        await moveCategoryBranch(client, selectedCategory.id, formState.parentId || null);
      }

      clearCacheAndReload();
      setStatus("Saved changes");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save category";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    const confirmDelete = window.confirm(
      `Delete category "${selectedCategory.title}" and its draft/published versions?`
    );
    if (!confirmDelete) return;

    setWorking("delete");
    setStatus(null);

    try {
      const baseId = selectedCategory.id;
      const tx = client.transaction();
      tx.delete(baseId);
      tx.delete(`drafts.${baseId}`);
      await tx.commit({ autoGenerateArrayKeys: true });

      setSelectedId(null);
      clearCacheAndReload();
      setStatus("Category deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete category";
      setError(message);
    } finally {
      setWorking(null);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedCategory || !formState) return;
    setWorking("duplicate");
    setStatus(null);

    try {
      const doc = await client.getDocument<SanityDocument>(selectedCategory.documentId);
      if (!doc) {
        throw new Error("Category not found for duplication");
      }

      const copySlug = `${slugify(formState.slug || formState.title)}-copy-${Date.now()}`;
      const clone: SanityDocument = {
        ...(doc as any),
        _id: undefined,
        _rev: undefined,
        _createdAt: undefined,
        _updatedAt: undefined,
        _type: "category",
        title: `${doc.title ?? "Untitled category"} (Copy)`,
        slug: { _type: "slug", current: copySlug },
        isActive: false,
      };

      const created = await client.create(clone, { autoGenerateArrayKeys: true });
      setStatus(`Duplicated as ${created._id}`);
      clearCacheAndReload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to duplicate category";
      setError(message);
    } finally {
      setWorking(null);
    }
  };

  const handleMoveBranch = async () => {
    if (!selectedCategory) return;
    setWorking("move");
    setStatus(null);

    try {
      await moveCategoryBranch(client, selectedCategory.id, branchTarget || null);
      clearCacheAndReload();
      setStatus("Branch moved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to move branch";
      setError(message);
    } finally {
      setWorking(null);
    }
  };

  const handleReorder = async () => {
    const scope = selectedCategory ? selectedCategory.children : roots;
    if (!scope.length) {
      setStatus("No categories to reorder");
      return;
    }

    setWorking("reorder");
    setStatus(null);

    try {
      const sorted = [...scope].sort((a, b) =>
        a.title.localeCompare(b.title, "en", { sensitivity: "base" })
      );

      const tx = client.transaction();
      sorted.forEach((node, index) => {
        tx.patch(node.documentId, { set: { displayOrder: index } });
      });

      await tx.commit({ autoGenerateArrayKeys: true });
      clearCacheAndReload();
      setStatus("Display order reset");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reorder";
      setError(message);
    } finally {
      setWorking(null);
    }
  };

  const handleToggleBranch = async (nextActive: boolean) => {
    if (!selectedCategory) return;
    setWorking("activate");
    setStatus(null);

    try {
      const ids = collectDescendantIds(selectedCategory.id, lookup);
      const tx = client.transaction();
      ids.forEach((id) => {
        const node = lookup.get(id);
        if (!node) return;
        tx.patch(node.documentId, { set: { isActive: nextActive } });
      });

      await tx.commit({ autoGenerateArrayKeys: true });
      clearCacheAndReload();
      setStatus(nextActive ? "Branch activated" : "Branch deactivated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update branch";
      setError(message);
    } finally {
      setWorking(null);
    }
  };

  const handleArchiveEmpty = async () => {
    if (!selectedCategory) return;
    setWorking("archive");
    setStatus(null);

    try {
      const ids = collectDescendantIds(selectedCategory.id, lookup);
      const emptyNodes = ids
        .map((id) => lookup.get(id))
        .filter((node): node is CategoryNode => Boolean(node && node.productCount === 0));

      if (emptyNodes.length === 0) {
        setStatus("No empty categories to archive");
        setWorking(null);
        return;
      }

      const tx = client.transaction();
      emptyNodes.forEach((node) => {
        tx.patch(node.documentId, { set: { isActive: false } });
      });

      await tx.commit({ autoGenerateArrayKeys: true });
      clearCacheAndReload();
      setStatus(`Archived ${emptyNodes.length} empty categor${
        emptyNodes.length === 1 ? "y" : "ies"
      }`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to archive empty categories";
      setError(message);
    } finally {
      setWorking(null);
    }
  };

  const renderNode = (node: CategoryNode) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded[node.id] || search.trim().length > 0;
    const isSelected = node.id === selectedId;
    const depthWarning = rootWithoutChildren.has(node.id);
    const productWarning = depthOneNoProducts.has(node.id);
    const isCircular = circularIds.has(node.id);

    const tone = isCircular
      ? "critical"
      : depthWarning || productWarning
        ? "caution"
        : node.isActive
          ? "default"
          : "caution";

    return (
      <Box key={node.id} marginLeft={node.depth > 0 ? 3 : 0}>
        <Card
          padding={3}
          radius={3}
          shadow={isSelected ? 2 : 1}
          tone={tone as any}
          style={{
            border: `2px solid ${isSelected ? "#2563eb" : "transparent"}`,
            cursor: "pointer",
          }}
          onClick={() => selectCategory(node.id)}
        >
          <Stack space={3}>
            <Flex align="center" gap={3}>
              {hasChildren ? (
                <Button
                  mode="bleed"
                  padding={2}
                  icon={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleNode(node.id);
                  }}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                />
              ) : (
                <Box width={4} />
              )}

              <Stack space={2} flex={1}>
                <Flex align="center" gap={2}>
                  <Text weight="semibold" size={1}>
                    {node.depth === 0 ? "🏢" : node.depth === 1 ? "📂" : "📄"} {node.title}
                  </Text>
                  <Badge radius={2} tone={node.isActive ? "positive" : "caution"}>
                    {node.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge radius={2} tone="default" mode="ghost">
                    Depth {node.depth}
                  </Badge>
                  {node.productCount >= 0 ? (
                    <Badge radius={2} tone={node.productCount > 0 ? "positive" : "default"} mode="ghost">
                      {node.productCount} products
                    </Badge>
                  ) : null}
                  {depthWarning ? (
                    <Badge radius={2} tone="caution" mode="ghost">
                      No subcategories
                    </Badge>
                  ) : null}
                  {productWarning ? (
                    <Badge radius={2} tone="caution" mode="ghost">
                      No products
                    </Badge>
                  ) : null}
                  {isCircular ? (
                    <Badge radius={2} tone="critical" mode="ghost">
                      Circular ref
                    </Badge>
                  ) : null}
                </Flex>
                {node.description ? (
                  <Text muted size={1}>
                    {truncate(node.description, 160)}
                  </Text>
                ) : null}
              </Stack>
            </Flex>

            {hasChildren && (isExpanded || search.trim().length > 0) ? (
              <Stack paddingLeft={4} space={2}>
                {node.children.map((child) => renderNode(child))}
              </Stack>
            ) : null}
          </Stack>
        </Card>
      </Box>
    );
  };

  return (
    <Card padding={4} radius={3} shadow={2}>
      <Stack space={4}>
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Stack space={2}>
            <Heading size={3}>Category Tree Organizer</Heading>
            <Text muted size={1}>
              Manage hierarchy, validate branches, and bulk-move categories.
            </Text>
          </Stack>
          <Flex gap={2} align="center">
            <Button
              mode="ghost"
              icon={RefreshIcon}
              text="Refresh"
              onClick={() => {
                clearCacheAndReload();
                setExpanded({});
                setStatus(null);
              }}
            />
            <Button mode="ghost" text="Expand all" onClick={expandAll} disabled={!visibleIds.length} />
            <Button mode="ghost" text="Collapse all" onClick={collapseAll} disabled={!visibleIds.length} />
          </Flex>
        </Flex>

        {status ? (
          <Card tone="positive" padding={3} radius={2}>
            <Text>{status}</Text>
          </Card>
        ) : null}
        {error ? (
          <Card tone="critical" padding={3} radius={2}>
            <Text>{error}</Text>
          </Card>
        ) : null}

        <Grid columns={[1, 1, 2]} gap={4}>
          <Stack space={3}>
            <Card padding={3} radius={2} shadow={1}>
              <Stack space={3}>
                <Flex gap={3} align="center" wrap="wrap">
                  <Box flex={1} minWidth={240}>
                    <TextInput
                      value={search}
                      onChange={(event) => setSearch(event.currentTarget.value)}
                      placeholder="Filter categories..."
                      icon={SearchIcon}
                    />
                  </Box>
                  <Flex align="center" gap={2}>
                    <Switch
                      id="active-only-switch"
                      checked={activeOnly}
                      onChange={(event) => setActiveOnly(event.currentTarget.checked)}
                    />
                    <Text as="label" htmlFor="active-only-switch" size={1}>
                      Active only
                    </Text>
                  </Flex>
                </Flex>

                {loading ? (
                  <Flex align="center" gap={3}>
                    <Spinner />
                    <Text>Loading categories...</Text>
                  </Flex>
                ) : filteredTree.length === 0 ? (
                  <Card padding={3} radius={2}>
                    <Text muted>No categories match the filters.</Text>
                  </Card>
                ) : (
                  <Stack space={2}>{filteredTree.map((node) => renderNode(node))}</Stack>
                )}
              </Stack>
            </Card>

            <Card padding={3} radius={2} shadow={1} tone={validationErrors.length ? "caution" : "default"}>
              <Stack space={2}>
                <Flex align="center" gap={2}>
                  {validationErrors.length ? <WarningOutlineIcon /> : null}
                  <Heading size={1}>Validation warnings</Heading>
                </Flex>
                {validationErrors.length === 0 ? (
                  <Text muted size={1}>No hierarchy warnings detected.</Text>
                ) : (
                  <Stack space={2}>
                    {validationErrors.map((warning) => (
                      <Card key={`${warning.categoryId}-${warning.type}`} padding={2} radius={2} tone={
                        warning.type === "circular_reference" ? "critical" : "caution"
                      }>
                        <Text size={1}>
                          [{warning.type}] {warning.message}
                        </Text>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Card>
          </Stack>

          <Stack space={3}>
            <Card padding={3} radius={2} shadow={1}>
              <Stack space={3}>
                <Heading size={2}>Edit category</Heading>
                {!selectedCategory || !formState ? (
                  <Text muted size={1}>Select a category to edit.</Text>
                ) : (
                  <Stack space={3}>
                    <Stack space={1}>
                      <Text size={1} muted>
                        Depth {selectedCategory.depth} • {breadcrumb.join(" > ") || "Root"}
                      </Text>
                      <Text size={1} muted>
                        ID: {selectedCategory.id}
                      </Text>
                    </Stack>

                    <Stack space={2}>
                      <Label>Title</Label>
                      <TextInput
                        value={formState.title}
                        onChange={(event) =>
                          setFormState({ ...formState, title: event.currentTarget.value })
                        }
                      />
                    </Stack>

                    <Stack space={2}>
                      <Label>Slug</Label>
                      <TextInput
                        value={formState.slug}
                        onChange={(event) =>
                          setFormState({ ...formState, slug: event.currentTarget.value })
                        }
                        placeholder="auto-generate from title"
                      />
                    </Stack>

                    <Grid columns={[1, 1, 2]} gap={3}>
                      <Stack space={2}>
                        <Label>Display order</Label>
                        <NumberInput
                          value={formState.displayOrder}
                          onChange={(value) =>
                            setFormState({ ...formState, displayOrder: Number(value) || 0 })
                          }
                        />
                      </Stack>
                      <Stack space={2}>
                        <Label>Range</Label>
                        <NumberInput
                          value={formState.range ?? undefined}
                          onChange={(value) =>
                            setFormState({ ...formState, range: value === null ? null : Number(value) })
                          }
                        />
                      </Stack>
                    </Grid>

                    <Grid columns={[1, 1, 2]} gap={3}>
                      <Flex align="center" gap={2}>
                        <Switch
                          checked={formState.isActive}
                          onChange={(event) =>
                            setFormState({ ...formState, isActive: event.currentTarget.checked })
                          }
                        />
                        <Text>Active</Text>
                      </Flex>
                      <Flex align="center" gap={2}>
                        <Switch
                          checked={formState.featured}
                          onChange={(event) =>
                            setFormState({ ...formState, featured: event.currentTarget.checked })
                          }
                        />
                        <Text>Featured</Text>
                      </Flex>
                      <Flex align="center" gap={2}>
                        <Switch
                          checked={formState.isParentCategory}
                          onChange={(event) =>
                            setFormState({
                              ...formState,
                              isParentCategory: event.currentTarget.checked,
                            })
                          }
                        />
                        <Text>Is parent category</Text>
                      </Flex>
                    </Grid>

                    <Stack space={2}>
                      <Label>Parent (depth 0 or 1)</Label>
                      <Select
                        value={formState.parentId || ""}
                        onChange={(event) =>
                          setFormState({
                            ...formState,
                            parentId: event.currentTarget.value || null,
                          })
                        }
                      >
                        <option value="">(Root)</option>
                        {parentOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {`[L${option.depth}] ${option.title}`}
                          </option>
                        ))}
                      </Select>
                    </Stack>

                    <Stack space={2}>
                      <Label>Description</Label>
                      <TextArea
                        value={formState.description}
                        rows={4}
                        onChange={(event) =>
                          setFormState({ ...formState, description: event.currentTarget.value })
                        }
                      />
                    </Stack>

                    <Divider />

                    <Stack space={2}>
                      <Label>SEO Title</Label>
                      <TextInput
                        value={formState.seoTitle}
                        onChange={(event) =>
                          setFormState({ ...formState, seoTitle: event.currentTarget.value })
                        }
                      />
                    </Stack>
                    <Stack space={2}>
                      <Label>SEO Description</Label>
                      <TextArea
                        value={formState.seoDescription}
                        rows={3}
                        onChange={(event) =>
                          setFormState({ ...formState, seoDescription: event.currentTarget.value })
                        }
                      />
                    </Stack>
                    <Stack space={2}>
                      <Label>Meta Keywords (comma separated)</Label>
                      <TextInput
                        value={formState.metaKeywords}
                        onChange={(event) =>
                          setFormState({ ...formState, metaKeywords: event.currentTarget.value })
                        }
                      />
                    </Stack>
                    <Stack space={2}>
                      <Label>Canonical URL</Label>
                      <TextInput
                        value={formState.canonicalUrl}
                        onChange={(event) =>
                          setFormState({ ...formState, canonicalUrl: event.currentTarget.value })
                        }
                      />
                    </Stack>

                    <Grid columns={[1, 1, 2]} gap={3}>
                      <Stack space={2}>
                        <Label>Icon</Label>
                        <TextInput
                          value={formState.icon}
                          onChange={(event) =>
                            setFormState({ ...formState, icon: event.currentTarget.value })
                          }
                          placeholder="icon-electronics"
                        />
                      </Stack>
                      <Stack space={2}>
                        <Label>Brand Color (hex)</Label>
                        <TextInput
                          value={formState.color}
                          onChange={(event) =>
                            setFormState({ ...formState, color: event.currentTarget.value })
                          }
                          placeholder="#2563eb"
                        />
                      </Stack>
                    </Grid>

                    <Flex gap={2} wrap="wrap">
                      <Button
                        text="Save"
                        tone="primary"
                        onClick={handleSave}
                        disabled={saving}
                      />
                      <Button
                        text="Duplicate"
                        icon={CopyIcon}
                        mode="ghost"
                        onClick={handleDuplicate}
                        disabled={working === "duplicate"}
                      />
                      <Button
                        text="Delete"
                        icon={TrashIcon}
                        tone="critical"
                        mode="ghost"
                        onClick={handleDelete}
                        disabled={working === "delete"}
                      />
                    </Flex>
                  </Stack>
                )}
              </Stack>
            </Card>

            <Card padding={3} radius={2} shadow={1} tone="default">
              <Stack space={3}>
                <Heading size={2}>Bulk operations</Heading>

                <Stack space={2}>
                  <Label>Move branch</Label>
                  <Select
                    value={branchTarget || ""}
                    onChange={(event) => setBranchTarget(event.currentTarget.value || null)}
                    disabled={!selectedCategory}
                  >
                    <option value="">(Move to root)</option>
                    {records
                      .filter((option) => option.id !== selectedId)
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {`[L${option.depth}] ${option.title}`}
                        </option>
                      ))}
                  </Select>
                  <Button
                    text="Move branch"
                    onClick={handleMoveBranch}
                    disabled={!selectedCategory || working === "move"}
                  />
                </Stack>

                <Stack space={2}>
                  <Label>Reorganize by displayOrder</Label>
                  <Text muted size={1}>
                    Auto-number children from 0 in alphabetical order.
                  </Text>
                  <Button
                    text="Reorganize"
                    onClick={handleReorder}
                    disabled={working === "reorder" || (!selectedCategory && roots.length === 0)}
                  />
                </Stack>

                <Stack space={2}>
                  <Label>Activate / Deactivate branch</Label>
                  <Flex gap={2}>
                    <Button
                      text="Activate"
                      icon={PlayIcon}
                      tone="positive"
                      onClick={() => handleToggleBranch(true)}
                      disabled={!selectedCategory || working === "activate"}
                    />
                    <Button
                      text="Deactivate"
                      icon={PauseIcon}
                      tone="caution"
                      onClick={() => handleToggleBranch(false)}
                      disabled={!selectedCategory || working === "activate"}
                    />
                  </Flex>
                </Stack>

                <Stack space={2}>
                  <Label>Archive empty categories</Label>
                  <Text muted size={1}>
                    Deactivates categories in the selected branch with zero products.
                  </Text>
                  <Button
                    text="Archive empties"
                    tone="critical"
                    onClick={handleArchiveEmpty}
                    disabled={!selectedCategory || working === "archive"}
                  />
                </Stack>
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Stack>
    </Card>
  );
};

export const categoryTreeTool = definePlugin({
  name: "category-tree-tool",
  tools: [
    defineTool({
      name: "categoryTreeOrganizer",
      title: "Category Tree Organizer",
      icon: () => "🌳",
      component: CategoryTreeToolComponent,
    }),
  ],
});

export default categoryTreeTool;
