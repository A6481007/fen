import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { getCurrentEmployee } from "@/actions/employeeActions";
import EmployeeNav from "@/components/employee/EmployeeNav";

// Force dynamic rendering for all employee routes (authentication required)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const employee = await getCurrentEmployee();

  if (!employee || employee.status !== "active") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EmployeeNav employee={employee} />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
