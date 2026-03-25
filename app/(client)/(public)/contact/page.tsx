import HeroBanner from "@/components/HeroBanner";
import { getHeroBannerByPlacement } from "@/sanity/queries";
import ContactPageClient from "./ContactPageClient";

const ContactPage = async () => {
  const heroBanner = await getHeroBannerByPlacement("supportpagehero", "sitewidepagehero");

  return (
    <>
      {heroBanner ? <HeroBanner placement="supportpagehero" banner={heroBanner} /> : null}
      <ContactPageClient showHeroSection={!heroBanner} />
    </>
  );
};

export default ContactPage;
