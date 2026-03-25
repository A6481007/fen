import { defineQuery } from "next-sanity";

const DEAL_PRODUCT_PROJECTION = `
  _id,
  name,
  "slug": slug.current,
  price,
  stock,
  "imageUrl": coalesce(thumbnailImage.asset->url, images[0].asset->url, images[0].url),
  "images": images[]{
    ...,
    "url": coalesce(asset->url, url)
  },
  "variantId": coalesce(variant->_ref, variant->_id),
  "variant": variant->{
    _id,
    title,
    "slug": slug.current
  },
  "categories": categories[]->{
    _id,
    title,
    "slug": slug.current
  }
`;

export const DEAL_PROJECTION = `
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
  "discountPercent": select(
    coalesce(originalPrice, product->price) > 0 => round(
      (
        coalesce(originalPrice, product->price) - coalesce(dealPrice, originalPrice, product->price)
      )
      / coalesce(originalPrice, product->price) * 100
    ),
    0
  ),
  badge,
  badgeColor,
  showOnHomepage,
  quantityLimit,
  perCustomerLimit,
  soldCount,
  product->{
    ${DEAL_PRODUCT_PROJECTION}
  },
  "isActive": status == "active"
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now())),
  "remainingQty": coalesce(quantityLimit, 999999) - coalesce(soldCount, 0)
`;

export const DEALS_LIST_QUERY = defineQuery(`
  *[
    _type == "deal"
    && status == "active"
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
  ] | order(coalesce(priority, 0) desc){
    ${DEAL_PROJECTION}
  }
`);

export const DEAL_BY_ID_QUERY = defineQuery(`
  *[_type == "deal" && dealId == $dealId][0]{
    ${DEAL_PROJECTION}
  }
`);

export const HOMEPAGE_DEALS_QUERY = defineQuery(`
  *[
    _type == "deal"
    && status == "active"
    && showOnHomepage == true
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
  ] | order(coalesce(priority, 0) desc)[0...6]{
    ${DEAL_PROJECTION}
  }
`);

export const DEALS_BY_TYPE_QUERY = defineQuery(`
  *[
    _type == "deal"
    && dealType == $dealType
    && status == "active"
    && (!defined(startDate) || dateTime(startDate) <= dateTime(now()))
    && (!defined(endDate) || dateTime(endDate) >= dateTime(now()))
  ] | order(coalesce(priority, 0) desc){
    ${DEAL_PROJECTION}
  }
`);
