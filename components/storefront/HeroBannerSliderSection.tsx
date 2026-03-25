import HeroBannerSlider from "./HeroBannerSlider";
import HeroBannerPlaceholder from "@/components/HeroBannerPlaceholder";
import { getHeroBannerSlider } from "@/sanity/queries";

const HeroBannerSliderSection = async () => {
  const sliderData = await getHeroBannerSlider();
  const slides = sliderData?.slides ?? [];

  if (!slides.length) {
    return <HeroBannerPlaceholder />;
  }

  return <HeroBannerSlider slides={slides} />;
};

export default HeroBannerSliderSection;
