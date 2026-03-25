import { redirect } from "next/navigation";
import { buildCategoryUrl } from "@/lib/paths";

const CategoryRedirectPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  redirect(buildCategoryUrl(slug));
};

export default CategoryRedirectPage;
