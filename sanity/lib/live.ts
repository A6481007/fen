// Querying with "sanityFetch" will keep content automatically updated
// Before using it, import and render "<SanityLive />" in your layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
import { defineLive } from "next-sanity/live";
import { client } from "./client";

const isServer = typeof window === "undefined";
const token = isServer
  ? process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN
  : undefined;
const allowCdn = process.env.NEXT_PUBLIC_SANITY_USE_CDN === "true";
const liveClient = token
  ? client
  : client.withConfig({ useCdn: allowCdn, token: undefined });

export const { sanityFetch, SanityLive } = defineLive({
  client: liveClient,
  serverToken: isServer ? token || false : false,
  browserToken: false, // never ship tokens to the browser
  fetchOptions: {
    revalidate: 0,
  },
});
