import { redirect } from "next/navigation";
import { CATEGORY_BASE_PATH } from "@/lib/paths";

const ProductCategoryIndexPage = async () => {
  redirect(CATEGORY_BASE_PATH);
};

export default ProductCategoryIndexPage;
