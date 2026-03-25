import { redirect } from "next/navigation";

const ProductPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  redirect(`/products/${slug}`);
};

export default ProductPage;
