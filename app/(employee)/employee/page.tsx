import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/actions/employeeActions";

export default async function EmployeePage() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    redirect("/");
  }

  // Redirect to role-specific dashboard
  switch (employee.role) {
    case "callcenter":
      redirect("/employee/orders");
    case "packer":
      redirect("/employee/packing");
    case "warehouse":
      redirect("/employee/warehouse");
    case "deliveryman":
      redirect("/employee/deliveries");
    case "accounts":
      redirect("/employee/accounts");
    case "incharge":
      redirect("/employee/dashboard");
    default:
      redirect("/");
  }
}
