import { redirect } from "next/navigation";

export default function RegistrationsRedirectPage() {
  redirect("/user/dashboard/registrations");
}
