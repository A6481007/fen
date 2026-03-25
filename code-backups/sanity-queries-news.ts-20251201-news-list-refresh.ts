import { defineQuery } from "next-sanity";

export const NEWS_ARTICLES_QUERY = defineQuery(`
  {
    "items": *[
      _type == "news"
      && (!defined($category) || $category == "" || category == $category)
      && (!defined($searchTerm) || $searchTerm == "" || title match $searchTerm || pt::text(content) match $searchTerm)
    ]
    | order(coalesce(publishDate, _createdAt) desc, _createdAt desc)
    [$offset...$rangeEnd]{
      _id,
      title,
      "slug": slug.current,
      publishDate,
      "publishedAt": publishDate,
      author->{
        name,
        image
      },
      featuredImage,
      "mainImage": featuredImage,
      category,
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

export const NEWS_ARTICLE_BY_SLUG_QUERY = defineQuery(`
  *[_type == "news" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
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
    "slug": slug.current,
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
