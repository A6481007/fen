import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import RegistrationsPageClient from "./RegistrationsPageClient";
import { getUserRegistrationsWithEvents } from "@/sanity/queries";

export const metadata = {
  title: "My Event Registrations",
};

const normalizeIdentifier = (user: Awaited<ReturnType<typeof currentUser>>) => {
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  return primaryEmail?.toLowerCase() || user?.id || "";
};

export default async function RegistrationsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const identifier = normalizeIdentifier(user);
  if (!identifier) {
    redirect("/sign-in");
  }

  const registrations = await getUserRegistrationsWithEvents(identifier);

  return <RegistrationsPageClient registrations={registrations} />;
}
