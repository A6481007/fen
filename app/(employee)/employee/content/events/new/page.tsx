import { Metadata } from "next";
import { redirect } from "next/navigation";
import { hasPermission, requirePermission } from "@/lib/authz";
import EventNewClient from "./client";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Create Event | Content Management",
    description: "Create a new event",
  },
  th: {
    title: "สร้างกิจกรรม | จัดการเนื้อหา",
    description: "สร้างกิจกรรมใหม่",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

export default async function EventNewPage() {
  let canPublish = false;
  try {
    const ctx = await requirePermission("content.events.write");
    canPublish = hasPermission(ctx, "content.events.publish");
  } catch {
    redirect("/employee");
  }

  return <EventNewClient canPublish={canPublish} />;
}
