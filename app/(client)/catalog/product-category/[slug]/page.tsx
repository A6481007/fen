import { redirect } from "next/navigation";
import { buildCategoryUrl } from "@/lib/paths";

const CatalogProductCategorySlugRedirect = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  redirect(buildCategoryUrl(slug));
};

export default CatalogProductCategorySlugRedirect;
