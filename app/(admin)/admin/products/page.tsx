import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isUserAdmin } from "@/lib/adminUtils";
import { getAdminCategories } from "@/sanity/queries";
import AdminProducts from "@/components/admin/AdminProducts";

const AdminProductsPage = async () => {
  // Check authentication and admin access
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get current user details to check admin status
  const clerk = await clerkClient();
  const currentUser = await clerk.users.getUser(userId);
  const userEmail = currentUser.primaryEmailAddress?.emailAddress;

  // Check if current user is admin
  if (!userEmail || !isUserAdmin(userEmail)) {
    redirect("/");
  }

  // Fetch categories server-side using the query function
  const categories = await getAdminCategories();

  return <AdminProducts initialCategories={categories} />;
};

export default AdminProductsPage;
