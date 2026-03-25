import AccountRequestsClient from "@/components/admin/AccountRequestsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Requests - Admin Panel",
  description: "Manage premium and dealer account applications",
};

export default function AccountRequestsPage() {
  return <AccountRequestsClient />;
}
