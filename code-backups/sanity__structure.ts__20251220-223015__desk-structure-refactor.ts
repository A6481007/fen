import { TagIcon } from "@sanity/icons";
import type { StructureBuilder, StructureResolver } from "sanity/structure";

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

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Ecommerce Admin")
    .items([
      S.listItem().title("Category Tree").icon(TagIcon).child(categoryTree(S)),
      S.documentTypeListItem("category").title("Categories (flat)"),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (item) => item.getId() && !["category"].includes(item.getId()!)
      ),
    ]);
