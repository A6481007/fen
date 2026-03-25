# Client Content Pages

- Route: /blog/[slug]
  File: app/(client)/blog/[slug]/page.tsx
  Components: @/components/news/ArticleLayout
- Route: /blog
  File: app/(client)/blog/page.tsx
  Components: @/components/Container, @/components/DynamicBreadcrumb, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/ui/separator
- Route: /catalog/[slug]
  File: app/(client)/catalog/[slug]/page.tsx
  Components: @/components/catalog/CatalogDetail, @/components/Container
- Route: /catalog
  File: app/(client)/catalog/page.tsx
  Components: @/components/Container, @/components/catalog/CatalogPageClient, @/components/ui/badge, @/components/ui/card, @/components/ui/separator
- Route: /category/[slug]
  File: app/(client)/category/[slug]/page.tsx
- Route: /category
  File: app/(client)/category/page.tsx
- Route: /deal
  File: app/(client)/deal/page.tsx
  Components: @/components/deals/FeaturedDealsClient, @/components/deals/DealGrid, @/components/Container, @/components/DynamicBreadcrumb, @/components/promotions/PromotionHero, @/components/promotions/PromotionGrid, @/components/ui/badge, @/components/ui/button, @/components/ui/card
- Route: /insight/author/[slug]
  File: app/(client)/insight/author/[slug]/page.tsx
  Components: @/components/Container, @/components/insight/InsightCard, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/ui/breadcrumb, @/components/ui/separator
- Route: /insight/knowledge/[slug]
  File: app/(client)/insight/knowledge/[slug]/page.tsx
  Components: @/components/Container, @/components/insight/InsightCard, @/components/insight/InsightAuthorCard, @/components/insight/LinkedProducts, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/ui/breadcrumb, @/components/ui/separator
- Route: /insight/knowledge
  File: app/(client)/insight/knowledge/page.tsx
  Components: @/components/Container, @/components/insight/InsightCard, @/components/insight/InsightTypeFilterClient, @/components/ui/badge, @/components/ui/button, @/components/ui/breadcrumb, @/components/ui/card
- Route: /insight
  File: app/(client)/insight/page.tsx
  Components: @/components/Container, @/components/DynamicBreadcrumb, @/components/insight/InsightCard, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/ui/separator
- Route: /insight/solutions/[slug]
  File: app/(client)/insight/solutions/[slug]/page.tsx
  Components: @/components/Container, @/components/insight/InsightCard, @/components/insight/InsightAuthorCard, @/components/insight/SolutionProductBundle, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/ui/breadcrumb, @/components/ui/separator
- Route: /insight/solutions
  File: app/(client)/insight/solutions/page.tsx
  Components: @/components/Container, @/components/insight/InsightCard, @/components/insight/InsightTypeFilterClient, @/components/ui/badge, @/components/ui/button, @/components/ui/breadcrumb, @/components/ui/card, @/components/ui/separator
- Route: /news/[slug]
  File: app/(client)/news/[slug]/page.tsx
  Components: @/components/news/ArticleGrid, @/components/news/ArticleCard, @/components/news/ArticleContent, @/components/news/AttachmentsPanel, @/components/news/EventCTACard, @/components/Container, @/components/ui/button
- Route: /news/downloads
  File: app/(client)/news/downloads/page.tsx
  Components: @/components/Container, @/components/DynamicBreadcrumb, @/components/ui/badge, @/components/ui/button, @/components/ui/card
- Route: /news/events/[slug]
  File: app/(client)/news/events/[slug]/page.tsx
  Components: @/components/events/CountdownTimer, @/components/events/GatedResources, @/components/events/RegistrationPanel, @/components/events/RelatedArticles, @/components/Container, @/components/DynamicBreadcrumb, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/news/ArticleCard
- Route: /news/events
  File: app/(client)/news/events/page.tsx
  Components: @/components/Container, @/components/DynamicBreadcrumb, @/components/events/EventGrid, @/components/NewsletterForm, @/components/ui/button, @/components/ui/card, @/components/ui/input
- Route: /news
  File: app/(client)/news/page.tsx
  Components: @/components/Container, @/components/DynamicBreadcrumb, @/components/news/ArticleGrid, @/components/news/NewsFilters, @/components/news/ArticleCard, @/components/ui/button, @/components/ui/card, @/components/ui/pagination, @/components/ui/separator
- Route: /news/resources
  File: app/(client)/news/resources/page.tsx
  Components: @/components/resources/ResourcesClient, @/components/Container, @/components/DynamicBreadcrumb, @/components/ui/badge
- Route: /product/[slug]
  File: app/(client)/product/[slug]/page.tsx
- Route: /product
  File: app/(client)/product/page.tsx
  Components: @/components/Container, @/components/Title, @/components/ProductCatalog, @/components/ui/breadcrumb
- Route: /products/[slug]
  File: app/(client)/products/[slug]/page.tsx
  Components: @/components/Container, @/components/Title, @/components/ProductContent, @/components/ProductPageSkeleton, @/components/product/CategoryProducts, @/components/ui/breadcrumb
- Route: /products
  File: app/(client)/products/page.tsx
  Components: @/components/Container, @/components/Title, @/components/ui/breadcrumb
- Route: /promotions/[campaignId]
  File: app/(client)/promotions/[campaignId]/page.tsx
  Components: @/components/Container, @/components/promotions/PromotionHero, @/components/promotions/PromotionAnalyticsBar, @/components/promotions/PromotionGrid, @/components/promotions/PromotionTerms, @/components/promotions/RelatedPromotions, @/components/promotions/PersonalizedOffers, @/components/promotions/PromotionViewTracker, @/components/promotions/PromotionAddToCartButton, @/components/ui/card, @/components/ui/badge
- Route: /promotions
  File: app/(client)/promotions/page.tsx
  Components: @/components/Container, @/components/promotions/PromotionHero, @/components/ui/badge, @/components/ui/button, @/components/ui/card, @/components/ui/pagination