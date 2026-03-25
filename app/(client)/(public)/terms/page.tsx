import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import TermsPageClient from "./TermsPageClient";

const TermsPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <TermsPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default TermsPage;
