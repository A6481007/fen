import AdminSubscriptions from "@/components/admin/AdminSubscriptions";
import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Newsletter Subscriptions",
    description: "Manage and monitor all newsletter subscriptions",
  },
  th: {
    title: "การสมัครรับข่าวสาร",
    description: "จัดการและติดตามการสมัครรับข่าวสารทั้งหมด",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default function SubscriptionsPage() {
  return <AdminSubscriptions />;
}
