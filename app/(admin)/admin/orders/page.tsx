import AdminOrders from "@/components/admin/AdminOrders";
import SignInRequired from "@/components/admin/SignInRequired";
import { auth } from "@clerk/nextjs/server";

const AdminOrdersPage = async () => {
  const { userId } = await auth();

  if (!userId) {
    return <SignInRequired />;
  }

  // Admin view - no employee check needed as this is admin-only route
  return <AdminOrders />;
};

export default AdminOrdersPage;
