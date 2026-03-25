import { notFound } from "next/navigation";
import AdminStudioClient from "./StudioClient";
import { ADMIN_STUDIO_ENABLED } from "@/lib/featureFlags";

export { metadata, viewport } from "next-sanity/studio";

const AdminStudioPage = () => {
  if (!ADMIN_STUDIO_ENABLED) {
    notFound();
  }

  return <AdminStudioClient />;
};

export default AdminStudioPage;
