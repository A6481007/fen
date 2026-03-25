import { defineQuery } from "next-sanity";

const NEWS_ARTICLE_ORDER = {
  newest: "coalesce(publishDate, _createdAt) desc, _createdAt desc",
  oldest: "coalesce(publishDate, _createdAt) asc, _createdAt asc",
  most_viewed:
    "coalesce(viewCount, 0) desc, coalesce(publishDate, _createdAt) desc, _createdAt desc",
} as const;

const buildNewsArticlesQuery = (orderClause: string = NEWS_ARTICLE_ORDER.newest) =>
  defineQuery(`
    {
      "items": *[
        _type == "news"
        && (!defined($category) || $category == "" || category == $category)
        && (!defined($searchTerm) || $searchTerm == "" || title match $searchTerm || pt::text(content) match $searchTerm)
      ]
      | order(${orderClause})
      [$offset...$rangeEnd]{
        _id,
        title,
        "slug": { "current": slug.current },
        publishDate,
        "publishedAt": publishDate,
        author->{
          name,
          image
        },
        featuredImage,
        "mainImage": featuredImage,
        category,
        "viewCount": coalesce(viewCount, 0),
        "plainText": string::trim(pt::text(coalesce(content, []))),
        "excerpt": string::slice(string::trim(pt::text(coalesce(content, []))), 0, 220),
        "summary": string::slice(string::trim(pt::text(coalesce(content, []))), 0, 260),
        linkedEvent->{
          title,
          "slug": slug.current,
          date,
          status
        }
      },
      "totalCount": count(*[
        _type == "news"
        && (!defined($category) || $category == "" || category == $category)
        && (!defined($searchTerm) || $searchTerm == "" || title match $searchTerm || pt::text(content) match $searchTerm)
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
  *[_type == "news" && slug.current == $slug][0]{
    _id,
    title,
    "slug": { "current": slug.current },
    publishDate,
    "publishedAt": publishDate,
    author->{
      name,
      image
    },
    content,
    "body": content,
    featuredImage,
    "mainImage": featuredImage,
    category,
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
          originalFilename,
          size,
          mimeType,
          extension
        }
      }
    },
    linkedEvent->{
      _id,
      title,
      "slug": slug.current,
      date,
      location,
      status,
      statusOverride,
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
  *[_type == "news" && _id == $articleId][0]{
    _id,
    title,
    "slug": { "current": slug.current },
    publishDate,
    "publishedAt": publishDate,
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
          originalFilename,
          size,
          mimeType,
          extension
        }
      }
    },
    linkedEvent->{
      _id,
      title,
      "slug": slug.current,
      date,
      location,
      status,
      statusOverride,
      registrationOpen,
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
