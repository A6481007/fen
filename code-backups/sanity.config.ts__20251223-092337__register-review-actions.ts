"use client";

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `\app\studio\[[...tool]]\page.tsx` route
 */

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import {
  ApproveOrderAction,
  CancelOrderAction,
  MarkAsPackedAction,
} from "./sanity/actions/orderActions";

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import { apiVersion, dataset, projectId } from "./sanity/env";
import { schema } from "./sanity/schemaTypes";
import deskStructure from "./sanity/deskStructure";
import { presentationTool } from "sanity/presentation";
import { dataCleanupTool } from "./sanity/plugins/dataCleanupTool";
import { importTool } from "./sanity/plugins/importTool";

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  // Add and edit the content schema in the './sanity/schemaTypes' folder
  schema,
  document: {
    actions: (prev, context) => {
      if (context.schemaType === "order") {
        return [ApproveOrderAction, MarkAsPackedAction, CancelOrderAction, ...prev];
      }

      return prev;
    },
  },
  plugins: [
    structureTool({ structure: deskStructure }),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({ defaultApiVersion: apiVersion }),
    importTool(),
    dataCleanupTool(),
    presentationTool({
      previewUrl: {
        preview: "/",
        // previewMode: {
        //   enable: "/draft-mode/enable",
        // },
      },
    }),
  ],
});
