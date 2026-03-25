import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import { DealForm } from "@/components/admin/backoffice/deals/DealForm";
import { saveDeal, searchDealProducts } from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New deal",
    description: "Create a Sanity-backed deal with pricing, schedule, and limits.",
  },
  th: {
    title: "สร้างดีลใหม่",
    description: "สร้างดีลที่เชื่อมกับ Sanity พร้อมราคา ตารางเวลา และข้อจำกัด",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewDealPage = () => {
  return (
    <div className="p-6">
      <DealForm onSubmit={saveDeal} onSearchProduct={searchDealProducts} />
    </div>
  );
};

export default NewDealPage;
