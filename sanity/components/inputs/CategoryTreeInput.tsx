"use client";

import { Box, Card, Checkbox, Flex, Spinner, Stack, Text } from "@sanity/ui";
import { useEffect, useMemo, useState } from "react";
import { PatchEvent, set, unset, useClient } from "sanity";

type RawCategory = {
  _id?: string;
  title?: string;
  parentCategory?: {
    _id?: string;
    title?: string;
  } | null;
};

type CategoryNode = {
  id: string;
  title: string;
  parentId?: string;
  children: CategoryNode[];
};

const normalizeId = (id?: string | null) =>
  typeof id === "string" ? id.replace(/^drafts\./, "") : undefined;

const randomKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const buildTree = (
  categories: RawCategory[],
  excludeId?: string
): {
  tree: CategoryNode[];
  parentMap: Record<string, string | undefined>;
  childrenMap: Record<string, string[]>;
} => {
  const nodes: Record<string, CategoryNode> = {};
  const parentMap: Record<string, string | undefined> = {};
  const childrenMap: Record<string, string[]> = {};

  categories.forEach((cat) => {
    const id = normalizeId(cat._id);
    if (!id || id === excludeId) return;

    const parentId = normalizeId(cat.parentCategory?._id);
    const normalizedParentId = parentId === excludeId ? undefined : parentId;

    nodes[id] = {
      id,
      title: cat.title || "Untitled category",
      parentId: normalizedParentId,
      children: [],
    };
    parentMap[id] = normalizedParentId;
  });

  Object.values(nodes).forEach((node) => {
    if (!node.parentId) return;
    const siblings = childrenMap[node.parentId] || [];
    siblings.push(node.id);
    childrenMap[node.parentId] = siblings;
  });

  const attachChildren = (list: CategoryNode[]) =>
    list
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((node) => ({
        ...node,
        children: attachChildren((childrenMap[node.id] || []).map((childId) => nodes[childId]).filter(Boolean)),
      }));

  const roots = Object.values(nodes).filter((node) => !node.parentId || !nodes[node.parentId]);
  return {
    tree: attachChildren(roots),
    parentMap,
    childrenMap,
  };
};

const collectDescendants = (id: string, childrenMap: Record<string, string[]>) => {
  const result: string[] = [];
  const stack = [...(childrenMap[id] || [])];

  while (stack.length) {
    const current = stack.pop() as string;
    result.push(current);
    const children = childrenMap[current];
    if (children?.length) {
      stack.push(...children);
    }
  }

  return result;
};

const orderedSelection = (tree: CategoryNode[], selected: Set<string>) => {
  const order: string[] = [];

  const walk = (nodes: CategoryNode[]) => {
    nodes.forEach((node) => {
      if (selected.has(node.id)) {
        order.push(node.id);
      }
      if (node.children.length) {
        walk(node.children);
      }
    });
  };

  walk(tree);

  // Include any orphan ids that may not be in the tree (should be rare).
  selected.forEach((id) => {
    if (!order.includes(id)) {
      order.push(id);
    }
  });

  return order;
};

const countSelectedChildren = (node: CategoryNode, selected: Set<string>): number =>
  node.children.reduce((total, child) => {
    const self = selected.has(child.id) ? 1 : 0;
    return total + self + countSelectedChildren(child, selected);
  }, 0);

export const CategoryTreeInput = (props: any) => {
  const { value, onChange, schemaType, renderDefault, document, readOnly } = props;
  const isReadOnly = Boolean(readOnly || schemaType?.readOnly);
  const client = useClient({ apiVersion: "2023-10-01" });
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [parentMap, setParentMap] = useState<Record<string, string | undefined>>({});
  const [childrenMap, setChildrenMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const isArrayField =
    schemaType?.jsonType === "array" ||
    schemaType?.type?.jsonType === "array" ||
    Array.isArray(value);
  const currentDocId = normalizeId(document?._id);

  useEffect(() => {
    if (isReadOnly) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const categories = await client
        .fetch<RawCategory[]>('*[_type == "category"]{_id,title,parentCategory->{_id,title}}')
        .catch((error) => {
          console.error("Failed to load categories", error);
          return [];
        });

      if (cancelled) return;

      const { tree, parentMap, childrenMap } = buildTree(categories || [], currentDocId);
      setTree(tree);
      setParentMap(parentMap);
      setChildrenMap(childrenMap);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [client, currentDocId, isReadOnly]);

  const selectedIds = useMemo(() => {
    if (isArrayField) {
      const refs = Array.isArray(value) ? value : [];
      const ids = refs
        .map((ref) => normalizeId((ref as { _ref?: string } | undefined)?._ref))
        .filter((id): id is string => Boolean(id));
      return new Set(ids);
    }

    const id = normalizeId((value as { _ref?: string } | undefined)?._ref);
    return id ? new Set([id]) : new Set<string>();
  }, [isArrayField, value]);

  const existingKeys = useMemo(() => {
    const map = new Map<string, string>();
    if (Array.isArray(value)) {
      value.forEach((ref) => {
        const id = normalizeId((ref as { _ref?: string } | undefined)?._ref);
        if (id) {
          map.set(id, (ref as { _key?: string } | undefined)?._key || randomKey());
        }
      });
    }
    return map;
  }, [value]);

  // The input swaps to tree-mode only when editable; fall back to default render when read-only.
  if (isReadOnly) {
    return renderDefault(props);
  }

  const commitArraySelection = (ids: Set<string>) => {
    const orderedIds = orderedSelection(tree, ids);
    const next = orderedIds.map((id) => ({
      _type: "reference",
      _ref: id,
      _key: existingKeys.get(id) || randomKey(),
    }));

    onChange(PatchEvent.from(next.length ? [set(next)] : [unset()]));
  };

  const commitSingleSelection = (id?: string) => {
    if (id) {
      onChange(PatchEvent.from([set({ _type: "reference", _ref: id })]));
    } else {
      onChange(PatchEvent.from([unset()]));
    }
  };

  const handleToggle = (id: string, checked: boolean) => {
    if (!isArrayField) {
      commitSingleSelection(checked ? id : undefined);
      return;
    }

    const next = new Set(selectedIds);

    if (checked) {
      next.add(id);

      // Ensure every ancestor is included when a child is picked.
      let parentId = parentMap[id];
      while (parentId) {
        next.add(parentId);
        parentId = parentMap[parentId];
      }
    } else {
      next.delete(id);
      collectDescendants(id, childrenMap).forEach((descendant) => next.delete(descendant));
    }

    commitArraySelection(next);
  };

  const renderNode = (node: CategoryNode) => {
    const isSelected = selectedIds.has(node.id);
    const selectedChildren = countSelectedChildren(node, selectedIds);
    const hasChildren = node.children.length > 0;

    return (
      <Card key={node.id} padding={2} tone={isSelected ? "positive" : undefined} border radius={2}>
        <Flex align="center" gap={2}>
          <Checkbox
            checked={isSelected}
            onChange={(event) => handleToggle(node.id, event.currentTarget.checked)}
          />
          <Text weight="semibold">{node.title}</Text>
          {selectedChildren > 0 && (
            <Text size={1} muted>
              {selectedChildren} sub
            </Text>
          )}
        </Flex>
        {hasChildren ? (
          <Box paddingLeft={4} paddingTop={2} paddingBottom={1}>
            <Stack space={2}>{node.children.map((child) => renderNode(child))}</Stack>
          </Box>
        ) : null}
      </Card>
    );
  };

  return (
    <Stack space={3}>
      <Text size={1} muted>
        Categories are grouped by parent. Selecting a child will automatically include its ancestors.
      </Text>

      {loading ? (
        <Flex align="center" gap={2}>
          <Spinner size={2} />
          <Text size={1}>Loading categories…</Text>
        </Flex>
      ) : tree.length === 0 ? (
        <Text muted>No categories found.</Text>
      ) : (
        <Stack space={2}>{tree.map((node) => renderNode(node))}</Stack>
      )}
    </Stack>
  );
};
