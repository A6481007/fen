import { defineQuery } from "next-sanity";

const BANNER_QUERY = defineQuery(
  `*[_type == 'banner'] | order(publishedAt desc)`
);
const FEATURED_CATEGORY_QUERY = defineQuery(
  `*[_type == 'category' && featured == true] | order(name desc)`
);
const ALL_PRODUCTS_QUERY = defineQuery(`*[_type=="product"] | order(name asc)`);
const DEAL_PRODUCTS = defineQuery(
  `*[_type == 'product' && status == 'hot'] | order(name asc){
  ...,"categories": categories[]->title
}`
);
const FEATURE_PRODUCTS = defineQuery(
  `*[_type == 'product' && isFeatured == true] | order(name asc){
  ...,"categories": categories[]->title
}`
);
const BRANDS_QUERY = defineQuery(`*[_type=='brand'] | order(name asc) `);

const LATEST_BLOG_QUERY = defineQuery(
  ` *[_type == 'blog' && isLatest == true && (!defined(contentType) || contentType in ["blog","article"])]|order(name asc){
    ...,
    blogcategories[]->{
    title
  }
  }`
);

const GET_ALL_BLOG = defineQuery(
  `*[_type == 'blog' && (!defined(contentType) || contentType in ["blog","article"])] | order(publishedAt desc)[0...$quantity]{
  ...,  
     blogcategories[]->{
    title
}
    }
  `
);

const SINGLE_BLOG_QUERY =
  defineQuery(`*[_type == "blog" && slug.current == $slug && (!defined(contentType) || contentType in ["blog","article"])][0]{
  ..., 
    author->{
    name,
    image,
  },
  blogcategories[]->{
    title,
    "slug": slug.current,
  },
}`);

const BLOG_CATEGORIES = defineQuery(
  `*[_type == "blog" && (!defined(contentType) || contentType in ["blog","article"])]{
     blogcategories[]->{
    ...
    }
  }`
);

const OTHERS_BLOG_QUERY = defineQuery(`*[
  _type == "blog"
  && defined(slug.current)
  && slug.current != $slug
  && (!defined(contentType) || contentType in ["blog","article"])
]|order(publishedAt desc)[0...$quantity]{
...
  publishedAt,
  title,
  mainImage,
  slug,
  author->{
    name,
    image,
  },
  categories[]->{
    title,
    "slug": slug.current,
  }
}`);

// Address Query
const ADDRESS_QUERY = defineQuery(
  `*[_type=="address"] | order(publishedAt desc)`
);

const ALLCATEGORIES_QUERY = defineQuery(
  `*[_type == 'category'] | order(name asc) [0...$quantity]`
);

const ADMIN_CATEGORIES_QUERY = defineQuery(
  `*[_type == 'category'] | order(title asc) {
    _id,
    title,
    slug,
    description,
    featured
  }`
);

const PRODUCT_BY_SLUG_QUERY = defineQuery(
  `*[_type == "product" && slug.current == $slug] | order(name asc) [0]{
    ...,
    "averageRating": math::avg(*[_type == "review" && product._ref == ^._id && status == "approved"].rating),
    "totalReviews": count(*[_type == "review" && product._ref == ^._id && status == "approved"])
  }`
);

const RELATED_PRODUCTS_QUERY = defineQuery(
  `*[_type == "product" && count((categories[]._ref)[@ in $categoryIds]) > 0 && slug.current != $currentSlug] | order(name asc) [0...$limit]{
    _id,
    name,
    slug,
    price,
    discount,
    stock,
    images,
    categories[]->{
      _id,
      title,
      slug
    }
  }`
);

const BRAND_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug]{
"brandName": brand->title
}`);

const GET_ALL_NEWS = defineQuery(
  `*[_type == 'blog' && (
    contentType == "news" ||
    contentType == "article" ||
    (!defined(contentType) && (isEvent != true && isResource != true))
  )] | order(publishedAt desc)[0...$quantity]{
    _id,
    title,
    slug,
    mainImage,
    _updatedAt,
    publishedAt,
    summary,
    body,
    contentType,
    isEvent,
    author->{
      name
    },
    eventStartDate,
    eventEndDate,
    eventLocation,
    eventRsvpUrl,
    eventStatus,
    eventAttendanceMode,
    eventDetails,
    blogcategories[]->{
      title
    }
  }`
);

const NEWS_DOWNLOADS_QUERY = defineQuery(
  `*[_type == 'blog' && contentType == "download"] | order(publishedAt desc){
    _id,
    title,
    slug,
    publishedAt,
    summary,
    downloadLabel,
    downloadUrl,
    "assetUrl": downloadAsset.asset->url,
    blogcategories[]->{
      title
    }
  }`
);

const NEWS_EVENTS_QUERY = defineQuery(
  `*[_type == 'blog' && (contentType == "event" || isEvent == true)] | order(coalesce(eventDetails.date, eventStartDate, publishedAt) asc, publishedAt desc){
    _id,
    title,
    slug,
    summary,
    contentType,
    eventStartDate,
    eventEndDate,
    eventLocation,
    eventRsvpUrl,
    eventDetails,
    mainImage
  }`
);

const NEWS_RESOURCES_QUERY = defineQuery(
  `*[_type == 'blog' && (contentType == "resource" || isResource == true)] | order(publishedAt desc){
    _id,
    title,
    slug,
    summary,
    resourceCategory,
    resourceLink,
    resourceTopics,
    publishedAt
  }`
);

const SINGLE_NEWS_QUERY = defineQuery(
  `*[_type == "blog" && slug.current == $slug && contentType in ["news","article","event","download","resource"]][0]{
    ...,
    author->{
      name,
      image
    },
    blogcategories[]->{
      title,
      "slug": slug.current,
    },
    "downloadAssetUrl": downloadAsset.asset->url
  }`
);

const NEWS_ARTICLES_QUERY = defineQuery(
  `*[
    _type == 'blog'
    && coalesce(publishedAt, _createdAt) <= now()
    && (
      contentType == "article" ||
      contentType == "news" ||
      (!defined(contentType) && (isEvent != true && isResource != true))
    )
  ] | order(publishedAt desc){
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    summary,
    body,
    contentType,
    isEvent,
    isResource,
    resourceTopics,
    blogcategories[]->{
      title,
      "slug": slug.current,
    },
    author->{
      name,
      image,
    }
  }`
);

const EVENTS_QUERY = defineQuery(
  `*[
    _type == 'blog'
    && (contentType == "event" || isEvent == true)
  ] | order(coalesce(eventDetails.date, eventStartDate, publishedAt) asc, publishedAt desc){
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    summary,
    body,
    contentType,
    isEvent,
    eventDetails{
      date,
      location,
      rsvpLimit
    },
    eventStartDate,
    eventEndDate,
    eventLocation,
    eventRsvpUrl,
    blogcategories[]->{
      title,
      "slug": slug.current,
    },
    author->{
      name,
      image,
    }
  }`
);

const RESOURCES_QUERY = defineQuery(
  `*[
    _type == 'blog'
    && (contentType == "resource" || isResource == true)
  ] | order(publishedAt desc){
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    summary,
    body,
    contentType,
    isResource,
    resourceTopics,
    resourceCategory,
    resourceLink,
    blogcategories[]->{
      title,
      "slug": slug.current,
    },
    author->{
      name,
      image,
    }
  }`
);

const DOWNLOADS_QUERY = defineQuery(
  `*[_type == "download"] | order(_createdAt desc){
    _id,
    title,
    slug,
    summary,
    file{
      asset->{
        _id,
        url,
        originalFilename
      }
    },
    relatedProducts[]->{
      _id,
      name,
      slug,
      mainImage
    }
  }`
);

export {
  BANNER_QUERY,
  FEATURED_CATEGORY_QUERY,
  ALL_PRODUCTS_QUERY,
  DEAL_PRODUCTS,
  FEATURE_PRODUCTS,
  BRANDS_QUERY,
  LATEST_BLOG_QUERY,
  SINGLE_BLOG_QUERY,
  GET_ALL_BLOG,
  BLOG_CATEGORIES,
  OTHERS_BLOG_QUERY,
  ADDRESS_QUERY,
  ALLCATEGORIES_QUERY,
  ADMIN_CATEGORIES_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  RELATED_PRODUCTS_QUERY,
  BRAND_QUERY,
  GET_ALL_NEWS,
  NEWS_DOWNLOADS_QUERY,
  NEWS_EVENTS_QUERY,
  NEWS_RESOURCES_QUERY,
  SINGLE_NEWS_QUERY,
  NEWS_ARTICLES_QUERY,
  EVENTS_QUERY,
  RESOURCES_QUERY,
  DOWNLOADS_QUERY,
};
