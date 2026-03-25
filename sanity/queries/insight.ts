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

export const INSIGHT_CATEGORIES_BY_LOCALE_QUERY = defineQuery(`
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
      heroImage,
      "cardImage": coalesce(mainImage, heroImage),
      readingTime,
      estimatedTime,
      "productCount": count(linkedProducts) + count(solutionProducts),
      "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
      "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
      publishedAt,
      author->{name, title, image}
    }
  }
`);

// ============================================
// INSIGHT CONTENT QUERIES
// ============================================

export const EMPLOYEE_INSIGHTS_LIST_QUERY = defineQuery(`
  *[_type == "insight"] | order(updatedAt desc, publishedAt desc) {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    status,
    readingTime,
    estimatedTime,
    difficulty,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    publishedAt,
    updatedAt,
    author->{_id, name},
    reviewer->{_id, name},
    primaryCategory->{_id, title, slug},
    categories[]->{_id, title, slug}
  }
`);

export const EMPLOYEE_INSIGHT_DETAIL_QUERY = defineQuery(`
  *[_type == "insight" && _id == $id][0] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    body[]{
      ...,
      _type == "resourcePackEmbed" => {
        ...,
        knowledgePack->{
          _id,
          _type,
          title,
          slug,
          description,
          mainImage,
          price,
          availability
        }
      },
      _type == "productInlineCta" => {
        ...,
        target->{
          _id,
          _type,
          title,
          name,
          slug,
          mainImage,
          price,
          bundlePrice,
          bundleValue,
          availability,
          description
        }
      }
    },
    bodyTh,
    readingTime,
    level,
    estimatedTime,
    timeToCompleteMinutes,
    difficulty,
    whyItMatters,
    learningObjectives,
    prerequisites[]{
      _type == "reference" => @->{
        _id,
        _type,
        title,
        name,
        "slug": slug.current
      },
      _type != "reference" => @
    },
    keyTakeaways,
    faq,
    glossary,
    references,
    body[]{
      ...,
      _type == "resourcePackEmbed" => {
        ...,
        knowledgePack->{
          _id,
          _type,
          title,
          slug,
          description,
          mainImage,
          price,
          availability
        }
      },
      _type == "productInlineCta" => {
        ...,
        target->{
          _id,
          _type,
          title,
          name,
          slug,
          mainImage,
          price,
          bundlePrice,
          bundleValue,
          availability,
          description
        }
      }
    },
    companionPack->{
      _id,
      title,
      "slug": slug.current,
      description,
      price,
      availability,
      requiresAccess,
      accessType
    },
    knowledgePack{
      title,
      description,
      isFree,
      requireEmail,
      assets[]{
        label,
        file{
          asset->{
            _id,
            url,
            originalFilename,
            mimeType,
            size
          }
        }
      },
      links[]{
        label,
        url,
        publisher
      }
    },
    status,
    publishedAt,
    updatedAt,
    lastReviewedAt,
    nextReviewDate,
    reviewCadence,
    editorialStatus,
    accuracyNotes,
    author->{_id, name, title},
    reviewer->{_id, name, title},
    categories[]->{_id, title, slug, categoryType},
    primaryCategory->{_id, title, slug, categoryType},
    tags,
    linkedProducts[]->{_id, name, slug},
    linkedInsights[]->{_id, title, slug, insightType, status},
    pillarPage->{_id, title, slug},
    primaryKeyword,
    primaryKeywordTh,
    primaryKeywordVolume,
    primaryKeywordDifficulty,
    secondaryKeywords,
    seoMetadata->{
      _id,
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl,
      noIndex,
      ogImage
    },
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    clientContext,
    metrics,
    solutionProducts[]{
      product->{_id, name, slug},
      quantity,
      isRequired,
      notes
    }
  }
`);

export const ALL_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published"] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    "productCount": count(linkedProducts) + count(solutionProducts),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    publishedAt,
    author->{name, title, image},
    tags,
    categories[]->{_id, title, slug, categoryType},
    primaryCategory->{_id, title, slug, categoryType}
  }
`);

export const KNOWLEDGE_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    learningObjectives,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    "productCount": count(linkedProducts),
    publishedAt,
    author->{name, title, image},
    tags,
    linkedProducts[]->{_id, name, slug, images, price},
    categories[]->{_id, title, slug}
  }
`);

export const KNOWLEDGE_INSIGHTS_BY_LOCALE_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    learningObjectives,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    "productCount": count(linkedProducts),
    publishedAt,
    author->{name, title, image},
    tags,
    linkedProducts[]->{_id, name, slug, images, price},
    categories[]->{_id, title, slug}
  }
`);

export const SOLUTION_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"]] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    "productCount": count(solutionProducts),
    publishedAt,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    author->{name, title, image},
    categories[]->{_id, title, slug, categoryType},
    tags,
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

export const SOLUTION_INSIGHTS_BY_LOCALE_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"]] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    "productCount": count(solutionProducts),
    publishedAt,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    author->{name, title, image},
    categories[]->{_id, title, slug, categoryType},
    tags,
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
  *[_type == "insight" && slug.current == $slug && (status == "published" || $preview == true)][0] {
    ...,
    heroImage,
    heroLayout,
    heroTheme,
    "localeCode": locale->code,
    seoMetadata->{
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl,
      noIndex,
      ogImage
    },
    level,
    difficulty,
    timeToCompleteMinutes,
    estimatedTime,
    whyItMatters,
    learningObjectives,
    prerequisites[]{
      _type == "reference" => @->{
        _id,
        _type,
        title,
        name,
        "slug": slug.current
      },
      _type != "reference" => @
    },
    keyTakeaways,
    faq,
    glossary,
    references,
    body[]{
      ...,
      _type == "resourcePackEmbed" => {
        ...,
        knowledgePack->{
          _id,
          _type,
          title,
          "slug": slug.current,
          description,
          mainImage,
          price,
          availability,
          isFree,
          requireEmail,
          requiresAccess,
          accessType,
          accessMessage,
          whatsInside,
          assets[]{
            label,
            file{
              asset->{
                _id,
                url,
                originalFilename,
                mimeType,
                size
              }
            }
          },
          links[]{label, url, publisher}
        }
      },
      _type == "productInlineCta" => {
        ...,
        target->{
          _id,
          _type,
          title,
          name,
          slug,
          mainImage,
          images,
          price,
          dealerPrice,
          bundlePrice,
          bundleValue,
          stock,
          discount,
          availability,
          description
        }
      }
    },
    knowledgePack{
      title,
      description,
      isFree,
      requireEmail,
      assets[]{
        label,
        file{
          asset->{
            _id,
            url,
            originalFilename,
            mimeType,
            size
          }
        }
      },
      links[]{
        label,
        url,
        publisher
      }
    },
    companionPack->{
      _id,
      title,
      "slug": slug.current,
      description,
      price,
      availability,
      requiresAccess,
      accessType
    },
    editorialStatus,
    accuracyNotes,
    lastReviewedAt,
    reviewCadence,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
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
      heroImage,
      "cardImage": coalesce(mainImage, heroImage),
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
    "clusterContent": *[_type == "insight" && pillarPage._ref == ^._id && (status == "published" || $preview == true)] | order(publishedAt desc) {
      _id, title, slug, insightType, summary
    }
  }
`);

export const INSIGHT_BY_SLUG_WITH_LOCALE_QUERY = defineQuery(`
  *[_type == "insight" && slug.current == $slug && (status == "published" || $preview == true)][0] {
    ...,
    title,
    titleTh,
    summary,
    summaryTh,
    body,
    bodyTh,
    heroImage,
    heroLayout,
    heroTheme,
    "localeCode": locale->code,
    seoMetadata->{
      metaTitle,
      metaDescription,
      keywords,
      canonicalUrl,
      noIndex,
      ogImage
    },
    level,
    difficulty,
    timeToCompleteMinutes,
    estimatedTime,
    whyItMatters,
    learningObjectives,
    prerequisites[]{
      _type == "reference" => @->{
        _id,
        _type,
        title,
        name,
        "slug": slug.current
      },
      _type != "reference" => @
    },
    keyTakeaways,
    faq,
    glossary,
    references,
    knowledgePack{
      title,
      description,
      isFree,
      requireEmail,
      assets[]{
        label,
        file{
          asset->{
            _id,
            url,
            originalFilename,
            mimeType,
            size
          }
        }
      },
      links[]{
        label,
        url,
        publisher
      }
    },
    companionPack->{
      _id,
      title,
      "slug": slug.current,
      description,
      price,
      availability,
      requiresAccess,
      accessType
    },
    editorialStatus,
    accuracyNotes,
    lastReviewedAt,
    reviewCadence,
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
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
      titleTh,
      slug,
      insightType,
      summary,
      summaryTh,
      mainImage,
      heroImage,
      "cardImage": coalesce(mainImage, heroImage),
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
    "clusterContent": *[_type == "insight" && pillarPage._ref == ^._id && (status == "published" || $preview == true)] | order(publishedAt desc) {
      _id, title, titleTh, slug, insightType, summary, summaryTh
    }
  }
`);

export const INSIGHTS_BY_TYPE_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType == $insightType] | order(publishedAt desc)[0...$limit] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    "productCount": count(linkedProducts) + count(solutionProducts),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
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
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
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
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    "productCount": count(linkedProducts) + count(solutionProducts),
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
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    "productCount": count(linkedProducts) + count(solutionProducts),
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
      titleTh,
      slug,
      insightType,
      summary,
      summaryTh,
      mainImage,
      heroImage,
      "cardImage": coalesce(mainImage, heroImage),
      "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
      "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
      "productCount": count(linkedProducts) + count(solutionProducts),
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
    episodes[]->{
      _id,
      title,
      slug,
      insightType,
      summary,
      mainImage,
      heroImage,
      "cardImage": coalesce(mainImage, heroImage),
      "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
      "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0
    }
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
      heroImage,
      "cardImage": coalesce(mainImage, heroImage),
      "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
      "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
      readingTime,
      publishedAt,
      author->{name, title, image}
    }
  }
`);

// ============================================
// INSIGHT FORM OPTION QUERIES
// ============================================

export const INSIGHT_AUTHORS_FOR_OPTIONS_QUERY = defineQuery(`
  *[_type == "insightAuthor" && isActive == true] | order(name asc) {
    _id,
    name,
    title
  }
`);

export const INSIGHT_CATEGORIES_FOR_OPTIONS_QUERY = defineQuery(`
  *[_type == "insightCategory" && isActive == true] | order(displayOrder asc, title asc) {
    _id,
    title,
    categoryType
  }
`);

export const INSIGHTS_FOR_OPTIONS_QUERY = defineQuery(`
  *[_type == "insight"] | order(title asc) {
    _id,
    title
  }
`);

export const INSIGHT_PRODUCTS_FOR_OPTIONS_QUERY = defineQuery(`
  *[_type == "product"] | order(name asc)[0...200] {
    _id,
    name
  }
`);

// ============================================
// FEATURED & LATEST
// ============================================

export const FEATURED_INSIGHTS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published"] | order(publishedAt desc)[0...6] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    readingTime,
    estimatedTime,
    difficulty,
    "productCount": count(linkedProducts) + count(solutionProducts),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    publishedAt,
    author->{name, image}
  }
`);

export const LATEST_KNOWLEDGE_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]] | order(publishedAt desc)[0...4] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    readingTime,
    estimatedTime,
    difficulty,
    "productCount": count(linkedProducts),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    publishedAt,
    author->{name, image}
  }
`);

export const LATEST_SOLUTIONS_QUERY = defineQuery(`
  *[_type == "insight" && status == "published" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"]] | order(publishedAt desc)[0...4] {
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    heroImage,
    "cardImage": coalesce(mainImage, heroImage),
    "productCount": count(solutionProducts),
    "hasKnowledgePack": defined(knowledgePack.title) || count(knowledgePack.assets) > 0 || count(knowledgePack.links) > 0,
    "hasVideo": count(body[_type in ["videoEmbed", "videoBlock"]]) > 0,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    metrics,
    publishedAt,
    author->{name, image}
  }
`);
