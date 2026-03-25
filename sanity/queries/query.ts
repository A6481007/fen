import { defineQuery } from "next-sanity";

const BANNER_QUERY = defineQuery(
  `*[_type == 'banner'] | order(publishedAt desc)`
);
const FEATURED_CATEGORY_QUERY = defineQuery(
  `*[_type == 'category' && featured == true && isActive != false] | order(coalesce(displayOrder, 0) asc, title asc)`
);
const ACTIVE_DEAL_SUBQUERY = `
  "activeDeal": *[
    _type == "deal"
    && status == "active"
    && references(^._id)
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
  ] | order(coalesce(priority, 0) desc)[0]{
    _id,
    dealId,
    dealType,
    title,
    status,
    priority,
    startDate,
    endDate,
    originalPrice,
    dealPrice,
    badge,
    badgeColor,
    quantityLimit,
    perCustomerLimit,
    soldCount,
    "discountPercent": select(
      coalesce(originalPrice, ^.price) > 0 => round(
        (coalesce(originalPrice, ^.price) - coalesce(dealPrice, originalPrice, ^.price))
        / coalesce(originalPrice, ^.price) * 100
      ),
      0
    ),
    "remainingQty": coalesce(quantityLimit, 999999) - coalesce(soldCount, 0)
  }
`;
const ALL_PRODUCTS_QUERY = defineQuery(
  `*[_type=="product"] | order(name asc){
    ...,
    ${ACTIVE_DEAL_SUBQUERY}
  }`
);
const FEATURE_PRODUCTS = defineQuery(
  `*[_type == 'product' && isFeatured == true] | order(name asc){
    ...,
    "categories": categories[]->title,
    ${ACTIVE_DEAL_SUBQUERY}
  }`
);
const BRANDS_QUERY = defineQuery(`*[_type=='brand'] | order(name asc) `);
const PRODUCT_TYPE_OPTIONS_QUERY = defineQuery(
  `*[_type == "productTypeOption"] | order(title asc){
    _id,
    title,
    slug,
    description
  }`
);

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

const PRICING_SETTINGS_QUERY = defineQuery(
  `*[_type == "pricingSettings"] | order(_updatedAt desc)[0]{
    userMarkupPercent,
    vatPercent,
    dealerDiscountPercent,
    showDealerDiscount,
    dealerFreeShippingEnabled,
    premiumFreeShippingEnabled,
    showDealerBenefits,
    dealerBenefitsTitleApply,
    dealerBenefitsTitlePending,
    dealerBenefitsTitleActive,
    dealerBenefits,
    showPremiumBenefits,
    premiumBenefitsTitleActive,
    premiumBenefits
  }`
);

const FOOTER_SETTINGS_QUERY = defineQuery(
  `*[_type == "footerSettings"] | order(_updatedAt desc)[0]{
    brandName,
    brandDescription,
    contactLabels{
      visitUs,
      callUs,
      workingHours,
      emailUs
    },
    quickLinksTitle,
    quickLinks[]{
      title,
      titleKey,
      href,
      external
    },
    categoriesTitle,
    newsletterTitle,
    newsletterDescription,
    newsletterPlaceholder,
    newsletterButtonLabel,
    newsletterLoadingLabel,
    copyrightText
  }`
);

const STOREFRONT_SETTINGS_QUERY = defineQuery(
  `*[_type == "storefrontSettings"][0]{
    heroBannerSlider{
      slides[]{
        _key,
        categoryTitle,
        categorySlug,
        accentHex,
        textColorHex,
        subtitle,
        showCta,
        ctaLabel,
        backgroundImage{
          ...,
          asset->{
            _id,
            metadata{
              dimensions
            }
          }
        },
        products[]{
          _key,
          modelNumber,
          imageAlt,
          top,
          left,
          imageWidth,
          image{
            ...,
            asset->{
              _id,
              metadata{
                dimensions
              }
            }
          }
        }
      }
    }
  }`
);

const ALLCATEGORIES_QUERY = defineQuery(
  `*[_type == 'category' && isActive != false] | order(coalesce(displayOrder, 0) asc, title asc) [0...$quantity]{
    ...,
    parentCategory->{_id,title,slug,isParentCategory,depth},
    depth,
    "productCount": count(*[_type == "product" && ^._id in categories[]._ref]),
    "subCategoryCount": count(*[_type == "category" && parentCategory._ref == ^._id])
  }`
);

const ADMIN_CATEGORIES_QUERY = defineQuery(
  `*[_type == 'category'] | order(coalesce(displayOrder, 0) asc, title asc) {
    _id,
    title,
    slug,
    description,
    depth,
    featured,
    isParentCategory,
    isActive,
    displayOrder,
    parentCategory->{_id,title,slug,isParentCategory,depth},
    "productCount": count(*[_type == "product" && ^._id in categories[]._ref]),
    "subCategoryCount": count(*[_type == "category" && parentCategory._ref == ^._id])
  }`
);

const PRODUCT_BY_SLUG_QUERY = defineQuery(
  `*[_type == "product" && (slug.current == $slug || _id == $slug)] [0]{
    ...,
    brand->{_id,title,slug},
    categories[]{
      _ref,
      ...@->{
        _id,
        title,
        slug,
        isParentCategory,
        depth,
        parentCategory->{_id,title,slug,isParentCategory,depth}
      }
    },
    "averageRating": math::avg(*[_type == "review" && product._ref == ^._id && status == "approved"].rating),
    "totalReviews": count(*[_type == "review" && product._ref == ^._id && status == "approved"]),
    ${ACTIVE_DEAL_SUBQUERY}
  }`
);

const RELATED_PRODUCTS_QUERY = defineQuery(
  `*[_type == "product" && count((categories[]._ref)[@ in $categoryIds]) > 0 && !(slug.current == $currentSlug || _id == $currentId)] | order(name asc) [0...$limit]{
    _id,
    name,
    slug,
    price,
    dealerPrice,
    discount,
    stock,
    images,
    categories[]->{
      _id,
      title,
      slug,
      isParentCategory,
      depth,
      parentCategory->{_id,title,slug,isParentCategory,depth}
    },
    ${ACTIVE_DEAL_SUBQUERY}
  }`
);

const CATEGORY_BY_SLUG_QUERY = defineQuery(
  `*[_type == "category" && slug.current == $slug && isActive != false][0]{
    ...,
    parentCategory->{_id,title,slug,isParentCategory,depth},
    depth,
    "productCount": count(*[_type == "product" && ^._id in categories[]._ref]),
    "subCategoryCount": count(*[_type == "category" && parentCategory._ref == ^._id])
  }`
);

const BRAND_QUERY = defineQuery(`*[_type == "product" && (slug.current == $slug || _id == $slug)]{
"brandName": brand->title
}`);

// Legacy blog-based news feed retained during transition.
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

// Legacy downloads sourced from blog docs during transition.
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

// Legacy events kept on blog docs to avoid mixing new event schema.
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

// Legacy resources kept on blog docs to avoid mixing new resource/news docs.
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

// Legacy blog-based news detail.
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

// Legacy blog-backed News hub articles.
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

// Legacy events feed gated to blog docs during transition.
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

// Legacy resources feed gated to blog docs during transition.
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

// Legacy standalone download doc feed.
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
  FEATURE_PRODUCTS,
  BRANDS_QUERY,
  LATEST_BLOG_QUERY,
  SINGLE_BLOG_QUERY,
  GET_ALL_BLOG,
  BLOG_CATEGORIES,
  OTHERS_BLOG_QUERY,
  ADDRESS_QUERY,
  PRICING_SETTINGS_QUERY,
  FOOTER_SETTINGS_QUERY,
  ALLCATEGORIES_QUERY,
  ADMIN_CATEGORIES_QUERY,
  PRODUCT_BY_SLUG_QUERY,
  RELATED_PRODUCTS_QUERY,
  CATEGORY_BY_SLUG_QUERY,
  BRAND_QUERY,
  PRODUCT_TYPE_OPTIONS_QUERY,
  GET_ALL_NEWS,
  NEWS_DOWNLOADS_QUERY,
  NEWS_EVENTS_QUERY,
  NEWS_RESOURCES_QUERY,
  SINGLE_NEWS_QUERY,
  NEWS_ARTICLES_QUERY,
  EVENTS_QUERY,
  RESOURCES_QUERY,
  DOWNLOADS_QUERY,
  STOREFRONT_SETTINGS_QUERY,
};
