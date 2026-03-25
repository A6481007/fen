import type { ReactNode } from "react";

/**
 * Layout AST types.
 * - Serializable to JSON (plain data only).
 * - Uses stable string ids on every node for diffing/drag/drop.
 * - Field nodes point to a FieldId union you can extend as you add inputs.
 */

// Extend this union with any additional fields your forms expose.
export type FieldId =
  | "title"
  | "titleTh"
  | "slug"
  | "locale"
  | "category"
  | "status"
  | "statusBadge"
  | "insightType"
  | "author"
  | "summaryTh"
  | "primaryCategory"
  | "linkedEvent"
  | "attachments"
  | "eventsHelper"
  | "heroHelper"
  | "heroImage"
  | "heroAlt"
  | "heroCaption"
  | "heroLayout"
  | "heroTheme"
  | "publishDate"
  | "summary"
  | "body"
  | "bodyHeader"
  | "bodyEditor"
  | "bodyEditorTh"
  | "bodyTips"
  | "relationshipsHelper"
  | "primaryKeyword"
  | "primaryKeywordTh"
  | "primaryKeywordVolume"
  | "primaryKeywordDifficulty"
  | "seoHelper"
  | "seoMetaTitle"
  | "seoCanonicalUrl"
  | "seoMetaDescription"
  | "seoKeywords"
  | "seoNoIndex"
  | "seoOgImage";

export type LayoutGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type LayoutSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type LayoutFieldNode = {
  id: string;
  type: "field";
  fieldId: FieldId;
  props?: Record<string, unknown>;
};

export type LayoutColumnNode = {
  id: string;
  type: "column";
  width?: LayoutSpan; // 12-column grid; defaults to full width.
  gap?: LayoutGap;
  children: LayoutNode[];
};

export type LayoutRowNode = {
  id: string;
  type: "row";
  gap?: LayoutGap;
  children: LayoutColumnNode[];
};

export type LayoutNode = LayoutRowNode | LayoutColumnNode | LayoutFieldNode;

/**
 * Example: two-column layout with title + heroImage on the left, body on the right.
 * Useful as a shape reference and quick smoke-test for editors.
 */
export const sampleTwoColumnLayout: LayoutNode = {
  id: "row-hero-body",
  type: "row",
  children: [
    {
      id: "col-left",
      type: "column",
      width: 6,
      children: [
        { id: "field-title", type: "field", fieldId: "title" },
        { id: "field-hero-image", type: "field", fieldId: "heroImage" },
      ],
    },
    {
      id: "col-right",
      type: "column",
      width: 6,
      children: [{ id: "field-body", type: "field", fieldId: "body" }],
    },
  ],
};

/**
 * Optional: runtime registry for mapping FieldId -> renderer (kept here so
 * consumers share the same identifier type while staying JSON-serializable for AST).
 */
export type FieldRenderer = (props?: Record<string, unknown>) => ReactNode;
export type FieldRegistry = Partial<Record<FieldId, ReactNode | FieldRenderer>>;
