import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import FAQPageClient from "./FAQPageClient";

const FAQPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <FAQPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default FAQPage;
