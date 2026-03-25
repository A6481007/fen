import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import { visionTool } from "@sanity/vision";
import { media } from "sanity-plugin-media";
import { scheduledPublishing } from "@sanity/scheduled-publishing";
import { colorInput } from "@sanity/color-input";
import { createElement } from "react";

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

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,

  plugins: [
    deskTool({
      structure: deskStructure,
    }),
    visionTool(),
    media(),
    scheduledPublishing(),
    colorInput(),
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
