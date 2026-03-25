export function generatePromotionSchema(promotion: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: promotion.name,
    description: promotion.shortDescription || promotion.heroMessage,
    validFrom: promotion.startDate,
    validThrough: promotion.endDate,
    eligibleRegion: {
      "@type": "Place",
      name: "Worldwide",
    },
    ...(promotion.discountType === "percentage" && {
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceType: "https://schema.org/SalePrice",
        valueAddedTaxIncluded: true,
      },
    }),
  };
}

export function generateDealProductSchema(deal: any) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.product?.name || deal.title,
    description: `${deal.title} - Save ${deal.discountPercent}%`,
    offers: {
      "@type": "Offer",
      price: deal.dealPrice,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      validFrom: deal.startDate,
      validThrough: deal.endDate,
      priceValidUntil: deal.endDate,
    },
  };
}

export function generateBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
