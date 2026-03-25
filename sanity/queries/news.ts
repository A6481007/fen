import { defineQuery } from "next-sanity";

const NEWS_ARTICLE_ORDER = {
  newest: "coalesce(publishDate, _createdAt) desc, _createdAt desc",
  oldest: "coalesce(publishDate, _createdAt) asc, _createdAt asc",
  most_viewed:
    "coalesce(viewCount, 0) desc, coalesce(publishDate, _createdAt) desc, _createdAt desc",
} as const;

const normalizedAttachmentFileType = `
  select(
    lower(fileType) in ["pdf","image","document","link","offline"] => lower(fileType),
    fileType == "PDF" => "pdf",
    fileType == "doc" => "document",
    "document"
  )
`;

const ATTACHMENT_FIELDS = `
  _key,
  title,
  description,
  fileType,
  "kind": ${normalizedAttachmentFileType},
  status,
  "access": status,
  linkUrl,
  url,
  offlineInstructions,
  requiresRegistration,
  availableFrom,
  availableTo,
  file{
    asset->{
      _id,
      url,
      originalFilename,
      size,
      mimeType,
      extension,
      metadata{
        lqip,
        dimensions{
          aspectRatio
        }
      }
    }
  },
  "downloadUrl": coalesce(file.asset->url, linkUrl, url),
  "isOffline": ${normalizedAttachmentFileType} == "offline",
  "isLink": ${normalizedAttachmentFileType} == "link",
  "accessInfo": {
    "isLocked": status == "event_locked",
    "requiresRegistration": coalesce(requiresRegistration, status == "event_locked"),
    "availableFrom": availableFrom,
    "availableTo": availableTo
  }
`;

const computedLinkedEventStatus = `
  select(
    statusOverride in ["upcoming","ongoing","ended"] => statusOverride,
    status in ["upcoming","ongoing","ended"] => status,
    !defined(date) || !dateTime(date) => "upcoming",
    defined(endDate) && dateTime(endDate) < now() => "ended",
    defined(endDate) && dateTime(date) <= now() && dateTime(endDate) >= now() => "ongoing",
    dateTime(date) > now() => "upcoming",
    "ended"
  )
`;

const buildNewsArticlesQuery = (orderClause: string = NEWS_ARTICLE_ORDER.newest) =>
  defineQuery(`
    {
      "items": *[
        _type == "news"
        && !(_id in path("drafts.**"))
        && (!defined($category) || $category == "" || category == $category)
        && (!defined($linkedEvent) || $linkedEvent == "" || linkedEvent._ref == $linkedEvent)
        && (
          !defined($searchTerm)
          || $searchTerm == ""
          || lower(title) match $searchTerm
          || lower(coalesce(titleTh, "")) match $searchTerm
          || lower(pt::text(content)) match $searchTerm
          || lower(pt::text(coalesce(contentTh, []))) match $searchTerm
          || lower(coalesce(dek, "")) match $searchTerm
          || lower(coalesce(dekTh, "")) match $searchTerm
          || lower(coalesce(excerptTh, "")) match $searchTerm
          || lower(array::join(tags, " ")) match $searchTerm
        )
      ]
      | order(${orderClause})
      [$offset...$rangeEnd]{
        _id,
        title,
        titleTh,
        "slug": slug.current,
        publishDate,
        "publishedAt": publishDate,
        "updatedAt": coalesce(updatedAt, _updatedAt),
        contentType,
        isEvent,
        isFeatured,
        isPinned,
        author->{
          name,
          image
        },
        featuredImage{
          ...,
          "alt": coalesce(alt, asset->altText),
          "caption": caption,
          "credit": credit,
          asset->{
            _id,
            metadata{
              lqip,
              dimensions{
                aspectRatio
              }
            }
          }
        },
        heroImage{
          ...,
          "alt": coalesce(alt, asset->altText),
          "caption": caption,
          "credit": credit,
          asset->{
            _id,
            metadata{
              lqip,
              dimensions{
                aspectRatio
              }
            }
          }
        },
        "cardImage": coalesce(featuredImage, heroImage),
        "mainImage": coalesce(featuredImage, heroImage),
        category,
        tags,
        "viewCount": coalesce(viewCount, 0),
        "plainText": pt::text(coalesce(content, [])),
        "plainTextTh": pt::text(coalesce(contentTh, [])),
        "excerpt": coalesce(
          excerpt,
          dek,
          seoMetadata.metaDescription
        ),
        "excerptTh": coalesce(
          excerptTh,
          dekTh
        ),
        "summary": coalesce(
          dek,
          excerpt
        ),
        "summaryTh": coalesce(
          dekTh,
          excerptTh
        ),
        linkedEvent->{
          _id,
          title,
          "slug": slug.current,
          date,
          endDate,
          mode,
          location,
          status,
          statusOverride,
          "computedStatus": ${computedLinkedEventStatus}
        },
        keyTakeaways
      },
      "totalCount": count(*[
        _type == "news"
        && !(_id in path("drafts.**"))
        && (!defined($category) || $category == "" || category == $category)
        && (!defined($linkedEvent) || $linkedEvent == "" || linkedEvent._ref == $linkedEvent)
        && (
          !defined($searchTerm)
          || $searchTerm == ""
          || lower(title) match $searchTerm
          || lower(coalesce(titleTh, "")) match $searchTerm
          || lower(pt::text(content)) match $searchTerm
          || lower(pt::text(coalesce(contentTh, []))) match $searchTerm
          || lower(coalesce(dek, "")) match $searchTerm
          || lower(coalesce(dekTh, "")) match $searchTerm
          || lower(coalesce(excerptTh, "")) match $searchTerm
          || lower(array::join(tags, " ")) match $searchTerm
        )
      ])
    }
  `);

export const NEWS_ARTICLES_QUERY = buildNewsArticlesQuery();
export const NEWS_ARTICLES_QUERY_OLDEST = buildNewsArticlesQuery(NEWS_ARTICLE_ORDER.oldest);
export const NEWS_ARTICLES_QUERY_MOST_VIEWED = buildNewsArticlesQuery(
  NEWS_ARTICLE_ORDER.most_viewed
);

export const NEWS_ARTICLES_QUERY_BY_SORT = {
  newest: NEWS_ARTICLES_QUERY,
  oldest: NEWS_ARTICLES_QUERY_OLDEST,
  most_viewed: NEWS_ARTICLES_QUERY_MOST_VIEWED,
} as const;
export type NewsArticlesSort = keyof typeof NEWS_ARTICLES_QUERY_BY_SORT;

export const NEWS_ARTICLE_BY_SLUG_QUERY = defineQuery(`
  *[_type == "news" && slug.current == $slug && !(_id in path("drafts.**"))][0]{
    _id,
    title,
    titleTh,
    "slug": slug.current,
    publishDate,
    "publishedAt": publishDate,
    "updatedAt": coalesce(updatedAt, _updatedAt),
    contentType,
    isEvent,
    isFeatured,
    isPinned,
    seoMetadata,
    tags,
    keyTakeaways,
    keyTakeawaysTh,
    dek,
    dekTh,
    "viewCount": coalesce(viewCount, 0),
    author->{
      name,
      image
    },
    content,
    contentTh,
    "body": content,
    "bodyTh": contentTh,
    "plainText": pt::text(coalesce(content, [])),
    "plainTextTh": pt::text(coalesce(contentTh, [])),
    "excerpt": coalesce(
      excerpt,
      dek,
      seoMetadata.metaDescription
    ),
    "excerptTh": coalesce(
      excerptTh,
      dekTh
    ),
    "summary": coalesce(
      dek,
      excerpt
    ),
    "summaryTh": coalesce(
      dekTh,
      excerptTh
    ),
    featuredImage{
      ...,
      "alt": coalesce(alt, asset->altText),
      "caption": caption,
      "credit": credit,
      asset->{
        _id,
        metadata{
          lqip,
          dimensions{
            aspectRatio
          }
        }
      }
    },
    heroImage{
      ...,
      "alt": coalesce(alt, asset->altText),
      "caption": caption,
      "credit": credit,
      asset->{
        _id,
        metadata{
          lqip,
          dimensions{
            aspectRatio
          }
        }
      }
    },
    heroLayout,
    heroTheme,
    "mainImage": coalesce(heroImage, featuredImage),
    category,
    attachments[]{
      ${ATTACHMENT_FIELDS}
    },
    linkedEvent->{
      _id,
      title,
      "slug": slug.current,
      date,
      endDate,
      location,
      status,
      statusOverride,
      mode,
      onlineUrl,
      registrationOpen,
      attendees[]{
        email,
        clerkUserId,
        userId
      }
    }
  }
`);

export const NEWS_RESOURCES_BY_ARTICLE_QUERY = defineQuery(`
  *[_type == "news" && _id == $articleId && !(_id in path("drafts.**"))][0]{
    _id,
    title,
    titleTh,
    "slug": slug.current,
    publishDate,
    "publishedAt": publishDate,
    attachments[]{
      ${ATTACHMENT_FIELDS}
    },
    linkedEvent->{
      _id,
      title,
      "slug": slug.current,
      date,
      endDate,
      location,
      status,
      statusOverride,
      registrationOpen,
      mode,
      attendees[]{
        email,
        clerkUserId,
        userId
      }
    }
  }
`);

export const NEWS_LINKED_EVENT_META_BY_SLUG_QUERY = defineQuery(`
  *[_type == "news" && slug.current == $slug][0]{
    "slug": slug.current,
    linkedEvent->{
      "slug": slug.current
    }
  }
`);

export const NEWS_LINKED_EVENT_META_BY_ID_QUERY = defineQuery(`
  *[_type == "news" && _id == $articleId][0]{
    "slug": slug.current,
    linkedEvent->{
      "slug": slug.current
    }
  }
`);
