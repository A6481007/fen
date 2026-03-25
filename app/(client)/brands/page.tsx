import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import BrandsPageClient from "./BrandsPageClient";

const BrandsPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("sitewidepagehero", null);

  return (
    <>
      {heroBanner ? <HeroBanner placement="sitewidepagehero" banner={heroBanner} /> : null}
      <BrandsPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default BrandsPage;
