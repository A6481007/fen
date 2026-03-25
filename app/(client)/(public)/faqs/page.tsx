import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import FAQsPageClient from "./FAQsPageClient";

const FAQsPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <FAQsPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default FAQsPage;
