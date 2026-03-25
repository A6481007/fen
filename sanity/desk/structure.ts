import { BasketIcon, SparklesIcon, TagIcon } from "@sanity/icons";
import type { StructureBuilder, StructureResolver } from "sanity/structure";
import DealPreview from "../components/DealPreview";
import PromotionPreview from "../components/PromotionPreview";

const PROMOTION_DOC_TYPE = "promotion";
const DEAL_DOC_TYPE = "deal";

const normalizeId = (id?: string | null) => (typeof id === "string" ? id.replace(/^drafts\./, "") : undefined);

const categoryOrdering = [
  { field: "displayOrder", direction: "asc" as const },
  { field: "title", direction: "asc" as const },
];

const categoryTree = (S: StructureBuilder, parentId?: string) => {
  const publishedParentId = normalizeId(parentId);
  const isRoot = !parentId;
  const filter = isRoot
    ? '_type == "category" && (isParentCategory == true || !defined(parentCategory))'
    : '_type == "category" && (parentCategory._ref == $parentId || parentCategory._ref == $publishedParentId)';

  return S.documentList()
    .title(isRoot ? "Parent Categories" : "Subcategories")
    .filter(filter)
    .params(
      isRoot
        ? {}
        : {
            parentId,
            publishedParentId,
          }
    )
    .defaultOrdering(categoryOrdering)
    .child((documentId) =>
      S.list()
        .title("Category")
        .items([
          S.listItem()
            .title("Edit details")
            .child(S.document().schemaType("category").documentId(documentId)),
          S.listItem().title("Subcategories").child(categoryTree(S, documentId)),
        ])
    );
};

const promotionDocumentWithPreview = (S: StructureBuilder, documentId: string) =>
  S.document()
    .schemaType(PROMOTION_DOC_TYPE)
    .documentId(documentId)
    .views([S.view.form(), S.view.component(PromotionPreview).title("Preview")]);

const dealDocumentWithPreview = (S: StructureBuilder, documentId: string) =>
  S.document()
    .schemaType(DEAL_DOC_TYPE)
    .documentId(documentId)
    .views([S.view.form(), S.view.component(DealPreview).title("Preview")]);

const filteredDocumentListItem = (
  S: StructureBuilder,
  title: string,
  filter: string,
  withPreview?: (documentId: string) => any
) => {
  const list = S.documentList().title(title).filter(filter);
  return S.listItem().title(title).child(withPreview ? list.child(withPreview) : list);
};

const buildPromotionItems = (S: StructureBuilder) => [
  filteredDocumentListItem(
    S,
    "Flash Sales",
    '_type == "promotion" && type == "flashSale"',
    (documentId) => promotionDocumentWithPreview(S, documentId)
  ),
  filteredDocumentListItem(
    S,
    "Seasonal Campaigns",
    '_type == "promotion" && type == "seasonal"',
    (documentId) => promotionDocumentWithPreview(S, documentId)
  ),
  filteredDocumentListItem(
    S,
    "Bundle Offers",
    '_type == "promotion" && type == "bundle"',
    (documentId) => promotionDocumentWithPreview(S, documentId)
  ),
  filteredDocumentListItem(
    S,
    "Loyalty Rewards",
    '_type == "promotion" && type == "loyalty"',
    (documentId) => promotionDocumentWithPreview(S, documentId)
  ),
  S.divider(),
  S.listItem()
    .title("All Promotions")
    .child(S.documentTypeList(PROMOTION_DOC_TYPE).title("All Promotions").child((documentId) => promotionDocumentWithPreview(S, documentId))),
];

const buildDealItems = (S: StructureBuilder) => [
  filteredDocumentListItem(
    S,
    "Featured Deals",
    '_type == "deal" && dealType == "featured"',
    (documentId) => dealDocumentWithPreview(S, documentId)
  ),
  filteredDocumentListItem(
    S,
    "Price Drops",
    '_type == "deal" && dealType == "priceDrop"',
    (documentId) => dealDocumentWithPreview(S, documentId)
  ),
  filteredDocumentListItem(
    S,
    "Daily Deals",
    '_type == "deal" && dealType == "daily"',
    (documentId) => dealDocumentWithPreview(S, documentId)
  ),
  filteredDocumentListItem(
    S,
    "Clearance",
    '_type == "deal" && dealType == "clearance"',
    (documentId) => dealDocumentWithPreview(S, documentId)
  ),
  S.divider(),
  S.listItem()
    .title("All Deals")
    .child(S.documentTypeList(DEAL_DOC_TYPE).title("All Deals").child((documentId) => dealDocumentWithPreview(S, documentId))),
];

const otherDocumentItems = (S: StructureBuilder) =>
  S.documentTypeListItems().filter((item) => {
    const id = item.getId();
    return id && ![PROMOTION_DOC_TYPE, DEAL_DOC_TYPE, "category"].includes(id);
  });

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Ecommerce Admin")
    .items([
      S.listItem().title("Promotions").icon(SparklesIcon).child(S.list().title("Promotions").items(buildPromotionItems(S))),
      S.listItem().title("Deals").icon(BasketIcon).child(S.list().title("Deals").items(buildDealItems(S))),
      S.divider(),
      S.listItem().title("Category Tree").icon(TagIcon).child(categoryTree(S)),
      S.documentTypeListItem("category").title("Categories (flat)"),
      S.divider(),
      ...otherDocumentItems(S),
    ]);
