import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { PromotionForm } from "@/components/admin/backoffice/promotions/PromotionForm";
import {
  fetchPromotionTargetProductTree,
  savePromotion,
  searchPromotionCategories,
  searchPromotionProducts,
} from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New promotion",
    description: "Create a Sanity-backed promotion with schedule and status.",
  },
  th: {
    title: "สร้างโปรโมชันใหม่",
    description: "สร้างโปรโมชันที่เชื่อมกับ Sanity พร้อมกำหนดเวลาและสถานะ",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewPromotionPage = () => {
  return (
    <div className="p-6">
      <PromotionForm
        onSubmit={savePromotion}
        onSearchProducts={searchPromotionProducts}
        onSearchCategories={searchPromotionCategories}
        onLoadTargetProductTree={fetchPromotionTargetProductTree}
      />
    </div>
  );
};

export default NewPromotionPage;
