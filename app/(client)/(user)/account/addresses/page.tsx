import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AddressBookPageClient from "./AddressBookPageClient";

export default async function AddressBookPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress || "";

  return <AddressBookPageClient userEmail={userEmail} />;
}
