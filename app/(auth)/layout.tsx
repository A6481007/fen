import { Metadata } from "next";
import { contactConfig } from "@/config/contact";

export const metadata: Metadata = {
  title: `Authentication - ${contactConfig.company.name}`,
  description: `Sign in or create an account with ${contactConfig.company.name} to access exclusive deals, track orders, and enjoy personalized shopping experiences.`,
  keywords: [
    "sign in",
    "sign up",
    "login",
    "register",
    "account",
    "authentication",
  ],
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="auth-layout">{children}</div>;
}
