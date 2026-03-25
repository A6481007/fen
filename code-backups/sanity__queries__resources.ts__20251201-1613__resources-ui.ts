import { unstable_cache } from "next/cache";
import { defineQuery } from "next-sanity";
import { checkResourceAccess, isUserEventAttendee, type ResourceAccessResult } from "../helpers";
import { isEventStatus } from "../helpers/eventStatus";
import { sanityFetch } from "../lib/live";
import { NEWS_LINKED_EVENT_META_BY_ID_QUERY } from "./news";

type ResourceAccessInput = NonNullable<Parameters<typeof checkResourceAccess>[0]>;
type EventAccessInput = NonNullable<Parameters<typeof checkResourceAccess>[1]>;
type ResourceStatus = ResourceAccessInput extends { status?: infer S } ? S : never;
type EventStatusValue = EventAccessInput extends { status?: infer S } ? S : never;

type ResourceSource = "news" | "event";

type ResourceQueryParams = {
  source?: ResourceSource;
  fileType?: string;
  search?: string;
  userId?: string | null;
};

type AggregatedResource = {
  id: string;
  source: ResourceSource;
  parentId: string | null;
  parentSlug: string | null;
  parentTitle: string;
  parentType: ResourceSource;
  parentDate?: string | null;
  title: string;
  description: string;
  fileType: "PDF" | "image" | "document" | "link" | null;
  status: ResourceStatus | null;
  file: { asset?: { _id?: string; url?: string; originalFilename?: string } | null } | null;
  access: ResourceAccessResult;
};

type NewsWithAttachments = {
  _id?: string;
  title?: string;
  slug?: string;
  publishDate?: string;
  attachments?: {
    _key?: string;
    title?: string;
    description?: string;
    fileType?: string;
    status?: ResourceStatus | null;
    file?: { asset?: { _id?: string; url?: string; originalFilename?: string } | null } | null;
  }[];
  linkedEvent?: {
    _id?: string;
    title?: string;
    slug?: string;
    date?: string;
    status?: EventStatusValue | null;
    statusOverride?: EventStatusValue | null;
    attendees?: {
      email?: string;
      clerkUserId?: string;
      userId?: string;
    }[];
  } | null;
};

type EventWithResources = {
  _id?: string;
  title?: string;
  slug?: string;
  date?: string;
  status?: EventStatusValue | null;
  statusOverride?: EventStatusValue | null;
  attendees?: {
    email?: string;
    clerkUserId?: string;
    userId?: string;
  }[];
  resources?: {
    _key?: string;
    title?: string;
    description?: string;
    fileType?: string;
    status?: ResourceStatus | null;
    file?: { asset?: { _id?: string; url?: string; originalFilename?: string } | null } | null;
  }[];
};

const RESOURCES_CACHE_REVALIDATE_SECONDS = 360;

const NEWS_ATTACHMENTS_QUERY = defineQuery(`
  *[_type == "news"]{
    _id,
    title,
    "slug": slug.current,
    publishDate,
    attachments[]{
      _key,
      title,
      description,
      fileType,
      status,
      file{
        asset->{
          _id,
          url,
          originalFilename
        }
      }
    },
    linkedEvent->{
      _id,
      title,
      "slug": slug.current,
      date,
      status,
      statusOverride,
      attendees[]{
        email,
        clerkUserId,
        userId
      }
    }
  }
`);

const EVENT_RESOURCES_QUERY = defineQuery(`
  *[_type == "event"]{
    _id,
    title,
    "slug": slug.current,
    date,
    status,
    statusOverride,
    attendees[]{
      email,
      clerkUserId,
      userId
    },
    resources[]{
      _key,
      title,
      description,
      fileType,
      status,
      file{
        asset->{
          _id,
          url,
          originalFilename
        }
      }
    }
  }
`);

const NEWS_ATTACHMENTS_BY_ID_QUERY = defineQuery(`
  *[_type == "news" && _id == $articleId][0]{
    _id,
    title,
    "slug": slug.current,
    publishDate,
    attachments[]{
      _key,
      title,
      description,
      fileType,
      status,
      file{
        asset->{
          _id,
          url,
          originalFilename
        }
      }
    },
    linkedEvent->{
      _id,
      title,
      "slug": slug.current,
      date,
      status,
      statusOverride,
      attendees[]{
        email,
        clerkUserId,
        userId
      }
    }
  }
`);

const EVENT_RESOURCES_BY_ID_QUERY = defineQuery(`
  *[_type == "event" && _id == $eventId][0]{
    _id,
    title,
    "slug": slug.current,
    date,
    status,
    statusOverride,
    attendees[]{
      email,
      clerkUserId,
      userId
    },
    resources[]{
      _key,
      title,
      description,
      fileType,
      status,
      file{
        asset->{
          _id,
          url,
          originalFilename
        }
      }
    }
  }
`);

const resolveResourceTagsForNews = async (newsId: string) => {
  const normalizedId = typeof newsId === "string" ? newsId.trim() : "";
  const tags = ["resources", "news"];

  if (!normalizedId) {
    return tags;
  }

  tags.push(`news:${normalizedId}`);

  try {
    const { data } = await sanityFetch({
      query: NEWS_LINKED_EVENT_META_BY_ID_QUERY,
      params: { articleId: normalizedId },
    });

    const newsSlug =
      typeof (data as { slug?: string | null } | null)?.slug === "string"
        ? (data as { slug: string }).slug
        : null;

    const linkedEventSlug =
      (data as { linkedEvent?: { slug?: string | null } } | null)?.linkedEvent?.slug || null;

    if (newsSlug) {
      tags.push(`news:${newsSlug}`);
    }

    if (linkedEventSlug) {
      tags.push("events", `event:${linkedEventSlug}`);
    }
  } catch (error) {
    console.error("Error resolving news resource cache tags:", {
      newsId: normalizedId,
      error,
    });
  }

  return Array.from(new Set(tags));
};

const VALID_FILE_TYPES = new Set(["PDF", "image", "document", "link"]);

const normalizeFileType = (value?: string | null): AggregatedResource["fileType"] => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    return null;
  }

  return VALID_FILE_TYPES.has(normalized) ? (normalized as AggregatedResource["fileType"]) : null;
};

const normalizeResourceStatus = (value?: string | null): ResourceStatus | undefined => {
  if (value === "public" || value === "event_locked") {
    return value as ResourceStatus;
  }
  return undefined;
};

const normalizeEventStatusValue = (value?: string | null): EventStatusValue | undefined =>
  isEventStatus(value) ? value : undefined;

const normalizeString = (value?: string | null) => (typeof value === "string" ? value : null);
const normalizeText = (value?: string | null) => (typeof value === "string" ? value : "");

const buildResourceId = (parentId: string | null, key: string | null, fallbackPrefix: string) => {
  const safeParent = parentId?.trim() || fallbackPrefix;
  const safeKey = key?.trim() || "resource";
  return `${safeParent}:${safeKey}`;
};

const applyFilters = (
  resources: AggregatedResource[],
  filters: Pick<ResourceQueryParams, "source" | "fileType" | "search">
) => {
  const sourceFilter = filters.source;
  const fileTypeFilter =
    typeof filters.fileType === "string" && filters.fileType.trim()
      ? filters.fileType.trim().toLowerCase()
      : null;
  const searchTerm =
    typeof filters.search === "string" && filters.search.trim()
      ? filters.search.trim().toLowerCase()
      : null;

  if (!sourceFilter && !fileTypeFilter && !searchTerm) {
    return resources;
  }

  return resources.filter((resource) => {
    if (sourceFilter && resource.source !== sourceFilter) {
      return false;
    }

    if (fileTypeFilter) {
      const resourceType = resource.fileType ? resource.fileType.toLowerCase() : "";
      if (resourceType !== fileTypeFilter) {
        return false;
      }
    }

    if (searchTerm) {
      const haystack = [
        resource.title,
        resource.description,
        resource.parentTitle,
        resource.parentSlug ?? "",
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      const matches = haystack.some((value) => value.includes(searchTerm));
      if (!matches) {
        return false;
      }
    }

    return true;
  });
};

const mapNewsAttachments = async (
  newsItems: NewsWithAttachments[],
  userId?: string | null
): Promise<AggregatedResource[]> => {
  const resources: AggregatedResource[] = [];

  for (const [articleIndex, newsItem] of newsItems.entries()) {
    const parentId = normalizeString(newsItem?._id);
    const parentSlug = normalizeString(newsItem?.slug);
    const parentTitle = newsItem?.title || "Untitled news";
    const parentDate = normalizeString(newsItem?.publishDate);
    const linkedEvent = newsItem?.linkedEvent;
    const normalizedEvent: EventAccessInput | null = linkedEvent
      ? {
          ...linkedEvent,
          status: normalizeEventStatusValue(linkedEvent.status) ?? undefined,
          statusOverride: normalizeEventStatusValue(linkedEvent.statusOverride) ?? undefined,
        }
      : null;
    const attendeesOverride = Array.isArray(normalizedEvent?.attendees) ? normalizedEvent.attendees : undefined;

    const attendanceOverride = normalizedEvent
      ? await isUserEventAttendee(userId, normalizedEvent, { attendeesOverride })
      : undefined;

    const attachments = Array.isArray(newsItem?.attachments) ? newsItem.attachments : [];

    const mapped: AggregatedResource[] = await Promise.all(
      attachments.map(async (attachment, attachmentIndex): Promise<AggregatedResource> => {
        const resourceStatus = normalizeResourceStatus(attachment?.status);
        const access = await checkResourceAccess(
          { status: resourceStatus } as ResourceAccessInput,
          normalizedEvent,
          userId,
          {
            attendanceOverride,
            attendeesOverride,
          }
        );

        const title = attachment?.title || "Untitled resource";
        const description = normalizeText(attachment?.description);
        const fileType = normalizeFileType(attachment?.fileType);
        const file = attachment?.file && typeof attachment.file === "object" ? attachment.file : null;

        return {
          id: buildResourceId(
            parentId,
            normalizeString(attachment?._key),
            `news-${articleIndex}-${attachmentIndex}`
          ),
          source: "news",
          parentId,
          parentSlug,
          parentTitle,
          parentType: "news",
          parentDate,
          title,
          description,
          fileType,
          status: resourceStatus ?? null,
          file,
          access,
        };
      })
    );

    resources.push(...mapped);
  }

  return resources;
};

const mapEventResources = async (
  events: EventWithResources[],
  userId?: string | null
): Promise<AggregatedResource[]> => {
  const resources: AggregatedResource[] = [];

  for (const [eventIndex, eventItem] of events.entries()) {
    const parentId = normalizeString(eventItem?._id);
    const parentSlug = normalizeString(eventItem?.slug);
    const parentTitle = eventItem?.title || "Untitled event";
    const parentDate = normalizeString(eventItem?.date);
    const normalizedEvent: EventAccessInput | null = eventItem
      ? {
          ...eventItem,
          status: normalizeEventStatusValue(eventItem.status) ?? undefined,
          statusOverride: normalizeEventStatusValue(eventItem.statusOverride) ?? undefined,
        }
      : null;
    const attendeesOverride = Array.isArray(normalizedEvent?.attendees) ? normalizedEvent.attendees : undefined;

    const attendanceOverride =
      normalizedEvent && normalizedEvent._id
        ? await isUserEventAttendee(userId, normalizedEvent, { attendeesOverride })
        : undefined;

    const eventResources = Array.isArray(eventItem?.resources) ? eventItem.resources : [];

    const mapped: AggregatedResource[] = await Promise.all(
      eventResources.map(async (resource, resourceIndex): Promise<AggregatedResource> => {
        const resourceStatus = normalizeResourceStatus(resource?.status);
        const access = await checkResourceAccess(
          { status: resourceStatus } as ResourceAccessInput,
          normalizedEvent,
          userId,
          {
            attendanceOverride,
            attendeesOverride,
          }
        );

        const title = resource?.title || "Untitled resource";
        const description = normalizeText(resource?.description);
        const fileType = normalizeFileType(resource?.fileType);
        const file = resource?.file && typeof resource.file === "object" ? resource.file : null;

        return {
          id: buildResourceId(
            parentId,
            normalizeString(resource?._key),
            `event-${eventIndex}-${resourceIndex}`
          ),
          source: "event",
          parentId,
          parentSlug,
          parentTitle,
          parentType: "event",
          parentDate,
          title,
          description,
          fileType,
          status: resourceStatus ?? null,
          file,
          access,
        };
      })
    );

    resources.push(...mapped);
  }

  return resources;
};

export const getAllResources = async (params?: ResourceQueryParams) => {
  const sourceFilter: ResourceSource | undefined =
    params?.source === "news" || params?.source === "event" ? params.source : undefined;
  const rawFileType = typeof params?.fileType === "string" ? params.fileType.trim() : "";
  const rawSearch = typeof params?.search === "string" ? params.search.trim() : "";
  const normalizedUserId = typeof params?.userId === "string" ? params.userId.trim() : null;

  const filters: ResourceQueryParams = {
    source: sourceFilter,
    fileType: rawFileType || undefined,
    search: rawSearch || undefined,
    userId: normalizedUserId,
  };

  const cacheKey = [
    "all-resources",
    filters.source ?? "all",
    filters.fileType ?? "all",
    filters.search ?? "all",
    filters.userId ?? "anon",
  ];

  const tags = ["resources", "news", "events"];

  const fetchResources = unstable_cache(
    async () => {
      try {
        const [newsResult, eventResult] = await Promise.all([
          sanityFetch({ query: NEWS_ATTACHMENTS_QUERY }),
          sanityFetch({ query: EVENT_RESOURCES_QUERY }),
        ]);

        const newsWithAttachments: NewsWithAttachments[] = Array.isArray(newsResult?.data)
          ? (newsResult.data as NewsWithAttachments[])
          : [];
        const eventsWithResources: EventWithResources[] = Array.isArray(eventResult?.data)
          ? (eventResult.data as EventWithResources[])
          : [];

        const [newsResources, eventResources] = await Promise.all([
          mapNewsAttachments(newsWithAttachments, filters.userId),
          mapEventResources(eventsWithResources, filters.userId),
        ]);

        const aggregated = [...newsResources, ...eventResources];

        return applyFilters(aggregated, filters);
      } catch (error) {
        console.error("Error fetching all resources:", {
          source: filters.source ?? "all",
          fileType: filters.fileType ?? "all",
          search: filters.search ?? "all",
          userId: filters.userId ?? "anon",
          error,
        });
        return [];
      }
    },
    cacheKey,
    { revalidate: RESOURCES_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchResources();
};

export const getResourcesBySource = async (
  source: ResourceSource,
  sourceId: string,
  userId?: string | null
) => {
  const normalizedSource: ResourceSource = source === "event" ? "event" : "news";
  const normalizedId = typeof sourceId === "string" ? sourceId.trim() : "";

  if (!normalizedId) {
    return [];
  }

  const cacheKey = ["resources-by-source", normalizedSource, normalizedId, userId ?? "anon"];
  const tags =
    normalizedSource === "news"
      ? await resolveResourceTagsForNews(normalizedId)
      : ["resources", "events", `event:${normalizedId}`];

  const fetchResources = unstable_cache(
    async () => {
      try {
        if (normalizedSource === "news") {
          const { data } = await sanityFetch({
            query: NEWS_ATTACHMENTS_BY_ID_QUERY,
            params: { articleId: normalizedId },
          });

          const newsDoc = data ? [data as NewsWithAttachments] : [];
          return mapNewsAttachments(newsDoc, userId);
        }

        const { data } = await sanityFetch({
          query: EVENT_RESOURCES_BY_ID_QUERY,
          params: { eventId: normalizedId },
        });

        const eventDoc = data ? [data as EventWithResources] : [];
        return mapEventResources(eventDoc, userId);
      } catch (error) {
        console.error("Error fetching resources by source:", {
          source: normalizedSource,
          id: normalizedId,
          userId,
          error,
        });
        return [];
      }
    },
    cacheKey,
    { revalidate: RESOURCES_CACHE_REVALIDATE_SECONDS, tags }
  );

  return fetchResources();
};

export type { AggregatedResource };
