import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import HelpPageClient from "./HelpPageClient";

const HelpPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <HelpPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default HelpPage;
