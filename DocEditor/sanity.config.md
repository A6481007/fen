"use client";

import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { visionTool } from "@sanity/vision";
import { thTHLocale } from "@sanity/locale-th-th";
import { media } from "sanity-plugin-media";
import { colorInput } from "@sanity/color-input";
import { createElement } from "react";
import { dataset, projectId } from "./sanity/env";

import { schema } from "./sanity/schemaTypes";
import { deskStructure } from "./sanity/deskStructure";
import {
  ApproveOrderAction,
  MarkAsPackedAction,
  CancelOrderAction,
} from "./sanity/actions/orderActions";
import {
  ApproveReviewAction,
  RejectReviewAction,
} from "./sanity/actions/reviewActions";

const solutionInsightTypes = new Set([
  "caseStudy",
  "validatedSolution",
  "theoreticalSolution",
]);

const buildPreviewUrl = (path: string | null, document: { _id?: string | null } | null) => {
  if (!path) return null;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL;
  if (!baseUrl) return null;

  const isDraft = typeof document?._id === "string" && document._id.startsWith("drafts.");
  const previewParam = isDraft ? "preview=true" : "";
  if (!previewParam) return `${baseUrl}${path}`;

  const separator = path.includes("?") ? "&" : "?";
  return `${baseUrl}${path}${separator}${previewParam}`;
};

const resolveInsightPath = (document: { slug?: { current?: string }; insightType?: string | null } | null) => {
  const slug = document?.slug?.current;
  if (!slug) return null;
  const isSolution = solutionInsightTypes.has(document?.insightType ?? "");
  return isSolution ? `/insight/solutions/${slug}` : `/insight/knowledge/${slug}`;
};

const resolveInsightCategoryPath = (document: { slug?: { current?: string } } | null) => {
  const slug = document?.slug?.current;
  return slug ? `/insight/category/${slug}` : null;
};

const resolvePersonPath = (document: { slug?: { current?: string } } | null) => {
  const slug = document?.slug?.current;
  return slug ? `/insight/author/${slug}` : null;
};

const resolveDocumentActions = (prev: any, context: any) => {
  const { schemaType } = context;

  if (schemaType === "order") {
    return [ApproveOrderAction, MarkAsPackedAction, CancelOrderAction, ...prev];
  }

  if (schemaType === "review") {
    return [ApproveReviewAction, RejectReviewAction, ...prev];
  }

  return prev;
};

export default defineConfig({
  name: "default",
  title: "E-Commerce Admin",
  basePath: "/studio",

  projectId,
  dataset,

  plugins: [
    deskTool({
      structure: deskStructure,
    }),
    visionTool(),
    media(),
    colorInput(),
    thTHLocale(),
  ],

  schema,

  document: {
    actions: resolveDocumentActions,

    newDocumentOptions: (prev, { creationContext }) => {
      const filteredPrev = prev.filter(
        (templateItem) => !["pricingSettings"].includes(templateItem.templateId)
      );

      return filteredPrev;
    },

    productionUrl: async (prev, context) => {
      const { document } = context;

      if (document._type === "product") {
        const slug = (document as any)?.slug?.current;
        if (slug) {
          return `${process.env.NEXT_PUBLIC_SITE_URL}/products/${slug}`;
        }
      }

      if (document._type === "blog") {
        const slug = (document as any)?.slug?.current;
        if (slug) {
          return `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`;
        }
      }

      if (document._type === "insight") {
        const path = resolveInsightPath(document as any);
        const previewUrl = buildPreviewUrl(path, document as any);
        if (previewUrl) return previewUrl;
      }

      if (document._type === "insightCategory") {
        const path = resolveInsightCategoryPath(document as any);
        const previewUrl = buildPreviewUrl(path, document as any);
        if (previewUrl) return previewUrl;
      }

      if (document._type === "person") {
        const path = resolvePersonPath(document as any);
        const previewUrl = buildPreviewUrl(path, document as any);
        if (previewUrl) return previewUrl;
      }

      return prev;
    },
  },

  studio: {
    components: {
      logo: () =>
        createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "8px" } },
          createElement("span", { style: { fontSize: "24px" } }, "🏪"),
          createElement("span", { style: { fontWeight: "bold" } }, "Admin Studio")
        ),
    },
  },

  form: {
    file: {
      assetSources: (prev) => prev,
    },
    image: {
      assetSources: (prev) => prev,
    },
  },
});
