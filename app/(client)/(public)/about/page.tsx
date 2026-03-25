import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import AboutPageClient from "./AboutPageClient";

const AboutPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <AboutPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default AboutPage;
