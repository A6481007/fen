import "server-only";

import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "@/sanity/env";

const token = process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN;
const allowCdn = process.env.NEXT_PUBLIC_SANITY_USE_CDN === "true";

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: !token && allowCdn,
});
