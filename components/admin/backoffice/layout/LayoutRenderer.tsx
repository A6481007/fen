"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FieldId, FieldRegistry, LayoutColumnNode, LayoutFieldNode, LayoutGap, LayoutNode, LayoutRowNode, LayoutSpan } from "./layoutTypes";
import { useFieldRegistry } from "./fieldRegistry";

const gapClass: Record<LayoutGap, string> = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const columnWidthPercent = (width?: LayoutSpan) => `${((width ?? 12) / 12) * 100}%`;

type LayoutRendererProps = {
  node: LayoutNode;
  registry?: FieldRegistry;
  fallbackRenderer?: (fieldId: FieldId) => ReactNode;
};

const defaultFallback = (fieldId: FieldId) => (
  <div className="rounded border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
    Missing renderer for "{fieldId}"
  </div>
);

export function LayoutRenderer({ node, registry, fallbackRenderer = defaultFallback }: LayoutRendererProps) {
  const contextRegistry = useFieldRegistry();
  const activeRegistry = registry ?? contextRegistry;

  return <Fragment>{renderNode(node, activeRegistry, fallbackRenderer)}</Fragment>;
}

const renderNode = (
  node: LayoutNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => ReactNode,
): ReactNode => {
  switch (node.type) {
    case "row":
      return renderRow(node, registry, fallbackRenderer);
    case "column":
      return renderColumn(node, registry, fallbackRenderer);
    case "field":
      return renderField(node, registry, fallbackRenderer);
    default:
      return null;
  }
};

const renderRow = (
  node: LayoutRowNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => React.ReactNode,
) => {
  const gap = gapClass[node.gap ?? "md"];
  return (
    <div className={cn("flex flex-row flex-wrap", gap)} data-node-id={node.id}>
      {node.children.map((child) => (
        <Fragment key={child.id}>{renderNode(child, registry, fallbackRenderer)}</Fragment>
      ))}
    </div>
  );
};

const renderColumn = (
  node: LayoutColumnNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => React.ReactNode,
) => {
  const gap = gapClass[node.gap ?? "md"];
  const width = columnWidthPercent(node.width);

  return (
    <div
      key={node.id}
      className={cn("flex flex-col", gap, "min-w-[220px]")}
      style={{ flexBasis: width, maxWidth: width }}
      data-node-id={node.id}
    >
      {node.children.map((child) => (
        <Fragment key={child.id}>{renderNode(child, registry, fallbackRenderer)}</Fragment>
      ))}
    </div>
  );
};

const renderField = (
  node: LayoutFieldNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => React.ReactNode,
) => {
  const renderer = registry[node.fieldId];

  if (!renderer) {
    return <Fragment key={node.id}>{fallbackRenderer(node.fieldId)}</Fragment>;
  }

  const content = typeof renderer === "function" ? renderer(node.props) : renderer;
  return (
    <div key={node.id} data-node-id={node.id}>
      {content}
    </div>
  );
};
