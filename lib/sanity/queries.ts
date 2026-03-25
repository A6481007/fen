export const insightsListGroq = `
  *[
    _type == "insight" &&
    status == "published" &&
    (
      !defined($kind) || $kind == "" ||
      ($kind == "knowledge" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]) ||
      ($kind == "solutions" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"])
    ) &&
    (
      !defined($category) || $category == "" ||
      $category in categories[]->slug.current ||
      primaryCategory->slug.current == $category
    ) &&
    (
      !defined($tag) || $tag == "" || $tag in tags
    )
  ]
  | order(
      select(
        $sort == "featured" => coalesce(publishAsBanner, false),
        $sort == "views" => coalesce(viewCount, 0),
        publishedAt
      ) desc,
      publishedAt desc
    )[0...$limit]{
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    publishedAt,
    readingTime,
    "viewCount": coalesce(viewCount, 0),
    tags,
    primaryCategory->{title, slug, categoryType},
    categories[]->{title, slug, categoryType},
    author->{name, image}
  }
`;

export const relatedInsightsGroq = `
  *[
    _type == "insight" &&
    status == "published" &&
    _id != $currentId &&
    (
      !defined($kind) || $kind == "" ||
      ($kind == "knowledge" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]) ||
      ($kind == "solutions" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"])
    ) &&
    (
      (defined($tags) && count(tags[@ in $tags]) > 0) ||
      (defined($category) && (
        $category in categories[]->slug.current ||
        primaryCategory->slug.current == $category
      ))
    )
  ]
  | order(publishedAt desc)[0...$limit]{
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    publishedAt,
    readingTime,
    solutionMaturity,
    solutionComplexity,
    implementationTimeline,
    metrics,
    tags,
    primaryCategory->{title, slug, categoryType},
    categories[]->{title, slug, categoryType},
    author->{name, image}
  }
`;

export const insightCategoriesGroq = `
  *[
    _type == "insightCategory" &&
    isActive == true &&
    (!defined($categoryType) || categoryType == $categoryType)
  ]
  | order(displayOrder asc, title asc) {
    _id,
    title,
    slug,
    description,
    categoryType
  }
`;

export const insightTagsGroq = `
  array::unique(
    *[
      _type == "insight" &&
      status == "published" &&
      (
        !defined($kind) || $kind == "" ||
        ($kind == "knowledge" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]) ||
        ($kind == "solutions" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"])
      )
    ].tags[]
  )
`;

export const searchInsightsGroq = `
  *[
    _type == "insight" &&
    status == "published" &&
    (
      !defined($kind) || $kind == "" ||
      ($kind == "knowledge" && insightType in ["productKnowledge", "generalKnowledge", "problemKnowledge", "comparison"]) ||
      ($kind == "solutions" && insightType in ["caseStudy", "validatedSolution", "theoreticalSolution"])
    ) &&
    (
      title match $q ||
      summary match $q ||
      body[].children[].text match $q ||
      tags[] match $q ||
      categories[]->title match $q
    )
  ]
  | score(
      title match $q,
      summary match $q,
      tags[] match $q,
      categories[]->title match $q,
      body[].children[].text match $q
    )
  | order(_score desc, publishedAt desc)[0...20]{
    _id,
    title,
    titleTh,
    slug,
    insightType,
    summary,
    summaryTh,
    mainImage,
    publishedAt,
    readingTime,
    tags,
    primaryCategory->{title, slug, categoryType},
    author->{name, image}
  }
`;
