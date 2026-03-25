import { auth } from "@clerk/nextjs/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { redirect } from "next/navigation";
import EmployeeDebugPageClient from "./EmployeeDebugPageClient";
import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";

const METADATA_BY_LOCALE = {
  en: {
    title: "Employee Debug - Employee Dashboard",
    description: "View employee debug information and Sanity user data",
  },
  th: {
    title: "ดีบักพนักงาน - แดชบอร์ดพนักงาน",
    description: "ดูข้อมูลดีบักพนักงานและข้อมูลผู้ใช้จาก Sanity",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}


export default async function EmployeeDebugPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/");
  }

  // Fetch user data
  const user = await backendClient.fetch(
    `*[_type == "user" && clerkUserId == $clerkUserId][0]`,
    { clerkUserId }
  );

  return <EmployeeDebugPageClient clerkUserId={clerkUserId} user={user} />;
}

