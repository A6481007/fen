import { createClient } from "next-sanity";

import { apiVersion, dataset, projectId } from "../env";

// Backend client with proper authentication for admin operations
export const backendClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false, // Never use CDN for admin operations
  token: process.env.SANITY_API_TOKEN, // Server-side token with admin permissions
  perspective: "published", // Use published perspective for admin operations
  ignoreBrowserTokenWarning: true, // Ignore token warning in server context
});
