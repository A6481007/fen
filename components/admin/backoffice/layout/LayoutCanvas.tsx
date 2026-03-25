"use client";

import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type {
  FieldId,
  FieldRegistry,
  LayoutColumnNode,
  LayoutFieldNode,
  LayoutGap,
  LayoutNode,
  LayoutRowNode,
  LayoutSpan,
} from "./layoutTypes";

type LayoutCanvasProps = {
  layout: LayoutNode[];
  registry: FieldRegistry;
  fallbackRenderer?: (fieldId: FieldId) => ReactNode;
};

const gapClass: Record<LayoutGap, string> = {
  none: "gap-0",
  xs: "gap-2",
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const columnSpanClass: Record<LayoutSpan, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

const defaultFallback = (fieldId: FieldId) => (
  <div className="rounded border border-dashed border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
    Missing field renderer for "{fieldId}"
  </div>
);

export function LayoutCanvas({
  layout,
  registry,
  fallbackRenderer = defaultFallback,
}: LayoutCanvasProps) {
  return (
    <div className="flex flex-col gap-4">
      {layout.map((node, index) => (
        <Fragment key={`layout-${index}`}>
          {renderNode(node, registry, fallbackRenderer, `layout-${index}`)}
        </Fragment>
      ))}
    </div>
  );
}

const renderNode = (
  node: LayoutNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => ReactNode,
  key: string,
): ReactNode => {
  switch (node.type) {
    case "field":
      return renderField(node, registry, fallbackRenderer, key);
    case "row":
      return renderRow(node, registry, fallbackRenderer, key);
    case "column":
      return renderColumn(node, registry, fallbackRenderer, key);
    default:
      return null;
  }
};

const renderField = (
  node: LayoutFieldNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => ReactNode,
  key: string,
) => {
  const renderer = registry[node.fieldId];
  const content =
    typeof renderer === "function" ? (renderer as (props?: unknown) => ReactNode)(node.props) : renderer;

  if (!content) {
    return (
      <Fragment key={key}>
        {fallbackRenderer(node.fieldId)}
      </Fragment>
    );
  }

  return <div key={key}>{content}</div>;
};

const renderRow = (
  node: LayoutRowNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => ReactNode,
  key: string,
) => {
  const gap = gapClass[node.gap ?? "md"];
  return (
    <div
      key={key}
      className={cn("grid grid-cols-1 md:grid-cols-12", gap)}
    >
      {node.children.map((column, index) =>
        renderColumn(column, registry, fallbackRenderer, `${key}-col-${index}`),
      )}
    </div>
  );
};

const renderColumn = (
  node: LayoutColumnNode,
  registry: FieldRegistry,
  fallbackRenderer: (fieldId: FieldId) => ReactNode,
  key: string,
) => {
  const gap = gapClass[node.gap ?? "md"];
  const spanClass = columnSpanClass[node.width ?? 12];

  return (
    <div key={key} className={cn("col-span-1 md:col-span-12", spanClass)}>
      <div className={cn("flex flex-col", gap)}>
        {node.children.map((child, index) =>
          renderNode(child, registry, fallbackRenderer, `${key}-child-${index}`),
        )}
      </div>
    </div>
  );
};
