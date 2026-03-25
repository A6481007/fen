import { categoriesData } from "@/constants";
import { getContactConfig } from "@/lib/contactSettings";
import FooterClient from "./FooterClient";
import { getFooterSettings, getRootCategoriesForNav } from "@/sanity/queries";

type FooterCategory = { title: string; href: string };
type ApiCategory = { title?: string; slug?: { current?: string | null } | null; href?: string };

const Footer = async () => {
  const contactConfig = await getContactConfig();
  const footerSettings = await getFooterSettings();
  const categories = await getRootCategoriesForNav();
  const normalizedCategories: FooterCategory[] = (categories?.length ? categories : categoriesData)
    .map((category: ApiCategory) => ({
      title: category?.title || "",
      href: category?.slug?.current || category?.href || "",
    }))
    .filter((category: FooterCategory) => category.title && category.href);

  return (
    <FooterClient
      contactConfig={contactConfig}
      footerSettings={footerSettings}
      categories={normalizedCategories}
    />
  );
};

export default Footer;
