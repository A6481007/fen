import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import ContactsPageClient from "./client";
import { fetchContactsTable } from "./actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "Contact Inbox",
    description: "Review inbound messages and hand off follow-ups to the right owners.",
  },
  th: {
    title: "กล่องข้อความติดต่อ",
    description: "ตรวจสอบข้อความที่เข้ามาและส่งต่อให้ผู้รับผิดชอบที่เหมาะสม",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export const dynamic = "force-dynamic";

type ContactsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

type ContactStatus = "" | "new" | "read" | "replied" | "closed" | "all";

const isContactStatus = (value: string): value is ContactStatus =>
  value === "" ||
  value === "new" ||
  value === "read" ||
  value === "replied" ||
  value === "closed" ||
  value === "all";

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const rawStatus = typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : "";
  const statusParam = isContactStatus(rawStatus) ? rawStatus : "";
  const searchParam = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";

  const initialData = await fetchContactsTable({
    page: 1,
    pageSize: 10,
    status: statusParam || undefined,
    search: searchParam || undefined,
  });

  return (
    <ContactsPageClient
      initialData={initialData}
      initialStatus={statusParam}
      initialSearch={searchParam}
    />
  );
}
