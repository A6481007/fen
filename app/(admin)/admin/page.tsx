import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import { getBackofficeContext } from "@/lib/authz";
import { defaultFeatureFlags } from "@/config/nav-config";

const AdminPage = async () => {
  const backoffice = await getBackofficeContext();

  return (
    <AdminDashboardOverview
      isAdmin={backoffice.isAdmin}
      staffRoles={backoffice.staffRoles ?? []}
      permissions={backoffice.permissions ?? []}
      featureFlags={defaultFeatureFlags}
    />
  );
};

export default AdminPage;
