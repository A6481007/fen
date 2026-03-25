export type BannerSetting = {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
};

export const bannerSettings: BannerSetting[] = [
  {
    id: "home-networking",
    imageUrl: "/preview.png",
    alt: "Networking hardware and accessories",
    title: "Build the backbone of your network",
    subtitle: "Switches, routers, and fiber-ready kits for growing teams.",
    ctaLabel: "Shop networking",
    ctaHref: "/category/networking",
  },
  {
    id: "home-security",
    imageUrl: "/images/catalog-placeholder.png",
    alt: "Security cameras and monitoring gear",
    title: "Stay protected with smart security",
    subtitle: "Cameras, access control, and monitoring tools in one place.",
    ctaLabel: "Explore security",
    ctaHref: "/category/security",
  },
  {
    id: "home-wireless",
    imageUrl: "/preview.png",
    alt: "Wireless access points in a modern workspace",
    title: "Wireless coverage without the dead zones",
    subtitle: "Access points and mesh kits tuned for reliable speed.",
    ctaLabel: "Browse wireless",
    ctaHref: "/category/wireless",
  },
];

export default bannerSettings;
