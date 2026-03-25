import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import PrivacyPageClient from "./PrivacyPageClient";

const PrivacyPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <PrivacyPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default PrivacyPage;
