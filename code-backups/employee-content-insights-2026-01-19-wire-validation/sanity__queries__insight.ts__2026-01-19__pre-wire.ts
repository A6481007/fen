import { defineQuery } from "next-sanity";

// ============================================
// INSIGHT CATEGORY QUERIES
// ============================================

export const INSIGHT_CATEGORIES_QUERY = defineQuery(`
  *[_type == "insightCategory" && isActive == true] | order(displayOrder asc, title asc) {
    _id,
    title,
    slug,
    description,
    categoryType,
    icon,
    displayOrder,
    parentCategory->{_id, title, slug},
    "insightCount": count(*[_type == "insight" && references(^._id) && status == "published"])
  }
`);

export const INSIGHT_CATEGORY_BY_SLUG_QUERY = defineQuery(`
  *[_type == "insightCategory" && slug.current == $slug && isActive == true][0] {
    ...,
    parentCategory->{_id, title, slug},
    "insights": *[_type == "insight" && references(^._id) && status == "published"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      insightType,
      summary,
      mainImage,
      readingTime,
      publishedAt,
      author->{name, title, image}
    }
  }
`);

// ============================================
// INSIGHT CONTENT QUERIES
// ============================================

export const ALL_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published"] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    author->{name, title, image},
    categories[]->{_id, title, slug, categoryType},
    primaryCategory->{_id, title, slug, categoryType}
  }
`);

export const KNOWLEDGE_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    author->{name, title, image},
    linkedProducts[]->{_id, name, slug, images, price},
    categories[]->{_id, title, slug}
  }
`);

export const SOLUTION_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"]] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    author->{name, title, image},
    categories[]->{_id, title, slug, categoryType},
    metrics,
    clientContext,
    solutionProducts[]{
      product->{_id, name, slug, images, price, dealerPrice, stock, discount},
      quantity,
      isRequired,
      notes
    }
  }
`);

export const INSIGHT_BY_SLUG_QUERY = defineQuery(`
  *[_type == "insight" && slug.current == $slug && status == "published"][0] {
    ...,
    seoMetadata->{
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl,
      noIndex,
      ogImage
    },
    author->{
      _id,
      name,
      slug,
      title,
      image,
      bio,
      credentials,
      credentialVerified,
      expertise,
      socialLinks
    },
    reviewer->{name, title, credentialVerified},
    categories[]->{_id, title, slug, categoryType},
    primaryCategory->{_id, title, slug, categoryType, parentCategory->{_id, title, slug}},
    linkedProducts[]->{
      _id,
      name,
      slug,
      images,
      price,
      dealerPrice,
      stock,
      discount,
      description,
      brand->{title, slug}
    },
    linkedInsights[]->{
      _id,
      title,
      slug,
      insightType,
      summary,
      mainImage,
      publishedAt,
      solutionMaturity,
      solutionComplexity,
      implementationTimeline,
      metrics,
      author->{name, image}
    },
    pillarPage->{_id, title, slug},
    solutionProducts[]{
      product->{
        _id,
        name,
        slug,
        sku,
        images,
        price,
        dealerPrice,
        stock,
        discount,
        description,
        brand->{title, slug}
      },
      quantity,
      isRequired,
      notes
    },
    "clusterContent": *[_type == "insight" && pillarPage._ref == ^._id && status == "published"] | order(publishedAt desc) {
      _id, title, slug, insightType, summary
    }
  }
`);

export const INSIGHTS_BY_TYPE_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType == $insightType] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    author->{name, title, image},
    linkedProducts[]->{_id, name, slug, images, price}
  }
`);

export const RELATED_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && _id != $currentId && (
    primaryCategory._ref == $categoryId ||
    count((linkedProducts[]._ref)[@ in $productIds]) > 0
  )] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    metrics,
    author->{name, image}
  }
`);

// ============================================
// PRODUCT-LINKED INSIGHTS
// ============================================

export const INSIGHTS_BY_PRODUCT_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && (
    $productId in linkedProducts[]._ref ||
    $productId in solutionProducts[].product._ref
  )] | order(publishedAt desc) {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    author->{name, image},
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    metrics
  }
`);

export const INSIGHTS_BY_CATEGORY_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && $categoryId in categories[]._ref] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    author->{name, title, image}
  }
`);

// ============================================
// AUTHOR QUERIES
// ============================================

export const INSIGHT_AUTHOR_BY_SLUG_QUERY = defineQuery(`
  *[_type == "insightAuthor" && slug.current == $slug && isActive == true][0] {
    ...,
    "insights": *[_type == "insight" && author._ref == ^._id && status == "published"] | order(publishedAt desc) {
      _id,
      title,
      slug,
      insightType,
      summary,
      mainImage,
      readingTime,
      publishedAt
    }
  }
`);

export const ALL_INSIGHT_AUTHORS_QUERY = defineQuery(`
  *[_type == "insightAuthor" && isActive == true] | order(name asc) {
    _id,
    name,
    slug,
    title,
    image,
    bio,
    credentials,
    expertise,
    "insightCount": count(*[_type == "insight" && author._ref == ^._id && status == "published"])
  }
`);

// ============================================
// SERIES QUERIES
// ============================================

export const INSIGHT_SERIES_QUERY = defineQuery(`
  *[_type == "insightSeries" && isActive == true] | order(publishedAt desc) {
    _id,
    title,
    slug,
    description,
    coverImage,
    "episodeCount": count(episodes),
    episodes[]->{_id, title, slug, insightType, summary, mainImage}
  }
`);

export const INSIGHT_SERIES_BY_SLUG_QUERY = defineQuery(`
  *[_type == "insightSeries" && slug.current == $slug && isActive == true][0] {
    ...,
    episodes[]->{
      _id,
      title,
      slug,
      insightType,
      summary,
      mainImage,
      readingTime,
      publishedAt,
      author->{name, title, image}
    }
  }
`);

// ============================================
// FEATURED & LATEST
// ============================================

export const FEATURED_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published"] | order(publishedAt desc)[0...6] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    publishedAt,
    author->{name, image}
  }
`);

export const LATEST_KNOWLEDGE_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]] | order(publishedAt desc)[0...4] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    readingTime,
    author->{name, image}
  }
`);

export const LATEST_SOLUTIONS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"]] | order(publishedAt desc)[0...4] {
    _id,
    title,
    slug,
    insightType,
    summary,
    mainImage,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    metrics,
    author->{name, image}
  }
`);
