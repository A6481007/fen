import React, { Suspense } from "react";
import Container from "@/components/Container";
import AdminTopNavigation from "@/components/admin/AdminTopNavigation";
import AccessDeniedContent from "@/components/admin/AccessDeniedContent";
import AdminHydrationBoundary from "@/components/admin/AdminHydrationBoundary";
import { getBackofficeContext } from "@/lib/authz";
import ClientHeader from "@/components/ClientHeader";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout = async ({ children }: AdminLayoutProps) => {
  const backoffice = await getBackofficeContext();
  const hasBackofficeAccess =
    backoffice.isAdmin || (backoffice.permissions?.length ?? 0) > 0;

  if (!hasBackofficeAccess) {
    return (
      <AdminHydrationBoundary>
        <Suspense fallback={null}>
          <div className="min-h-screen bg-slate-50">
            <ClientHeader />
            <Container className="py-10">
              <AccessDeniedContent />
            </Container>
          </div>
        </Suspense>
      </AdminHydrationBoundary>
    );
  }

  return (
    <AdminHydrationBoundary>
      <Suspense fallback={null}>
        <div className="min-h-screen bg-slate-50">
          <ClientHeader />
          <Container className="py-6 lg:py-8">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
              <div className="w-full lg:w-72 lg:sticky lg:top-6">
                <AdminTopNavigation
                  isAdmin={backoffice.isAdmin}
                  permissions={backoffice.permissions}
                  staffRoles={backoffice.staffRoles}
                  user={
                    backoffice.clerkUser
                      ? {
                          firstName: backoffice.clerkUser.firstName,
                          lastName: backoffice.clerkUser.lastName,
                          emailAddresses: backoffice.clerkUser.emailAddresses.map(({ emailAddress }) => ({
                            emailAddress,
                          })),
                          primaryEmailAddress: backoffice.clerkUser.primaryEmailAddress
                            ? { emailAddress: backoffice.clerkUser.primaryEmailAddress.emailAddress }
                            : null,
                          imageUrl: backoffice.clerkUser.imageUrl,
                        }
                      : undefined
                  }
                />
              </div>
              <div className="flex-1 w-full">
                <div className="admin-content-push bg-white rounded-2xl shadow-xl border border-shop_light_green/10 overflow-visible">
                  {children}
                </div>
              </div>
            </div>
          </Container>
        </div>
      </Suspense>
    </AdminHydrationBoundary>
  );
};

export default AdminLayout;
