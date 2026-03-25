import "server-only";
import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "@/sanity/env";

const token =
  process.env.SANITY_API_READ_TOKEN ||
  process.env.SANITY_API_TOKEN ||
  process.env.SANITY_READ_TOKEN;

export const sanityPreviewClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
  perspective: "previewDrafts",
});
