import Container from "./Container";
import { getAllBrands } from "@/sanity/queries";
import Title from "./Title";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";
import { GitCompareArrows, Headset, ShieldCheck, Truck } from "lucide-react";

const extraData = [
  {
    title: "Free Delivery",
    description: "Free shipping over $100",
    icon: <Truck size={45} />,
  },
  {
    title: "Free Return",
    description: "Free shipping over $100",
    icon: <GitCompareArrows size={45} />,
  },
  {
    title: "Customer Support",
    description: "Friendly 27/7 customer support",
    icon: <Headset size={45} />,
  },
  {
    title: "Money Back guarantee",
    description: "Quality checked by our team",
    icon: <ShieldCheck size={45} />,
  },
];

const ShopByBrands = async () => {
  const brands = await getAllBrands();

  return (
    <Container className="mt-16 lg:mt-24">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="h-1 w-12 bg-gradient-to-r from-brand-red-accent to-shop_light_orange rounded-full"></div>
          <Title className="text-3xl lg:text-4xl font-bold text-brand-black-strong">
            Shop By Brands
          </Title>
          <div className="h-1 w-12 bg-gradient-to-l from-brand-red-accent to-shop_light_orange rounded-full"></div>
        </div>
        <p className="text-brand-text-muted text-lg max-w-2xl mx-auto">
          Discover products from your favorite trusted brands
        </p>
        <Link
          href={"/shop"}
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-brand-border text-brand-black-strong font-semibold rounded-full hover:bg-brand-red-accent hover:text-white border-2 border-brand-red-accent hoverEffect"
        >
          Explore All Brands
          <svg
            className="w-4 h-4 hoverEffect group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>
      </div>

      {/* Brands Grid */}
      <div className="bg-gradient-to-br from-brand-background-subtle via-white to-brand-border p-8 lg:p-12 rounded-3xl shadow-xl border border-brand-text-main/20 mb-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
          {brands?.map((brand, index) => (
            <Link
              key={brand?._id}
              href={{
                pathname: "/shop",
                query: { brand: brand?.slug?.current },
              }}
              className="group bg-white rounded-2xl p-6 flex items-center justify-center aspect-square hover:shadow-2xl shadow-lg border border-gray-100 hover:border-brand-red-accent hoverEffect transform hover:-translate-y-2"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {brand?.image && (
                <div className="relative w-full h-full flex items-center justify-center">
                  <Image
                    src={urlFor(brand?.image).url()}
                    alt={`${brand?.title || "Brand"} logo`}
                    width={120}
                    height={80}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 hoverEffect filter group-hover:brightness-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-red-accent/5 to-transparent opacity-0 group-hover:opacity-100 hoverEffect rounded-xl"></div>
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Brand Grid Footer */}
        <div className="text-center mt-8 pt-6 border-t border-brand-text-main/20">
          <p className="text-brand-black-strong text-sm">
            <span className="font-semibold text-brand-red-accent">
              {brands?.length}+
            </span>{" "}
            trusted brands and counting
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-3xl shadow-xl border border-brand-text-main/10 p-8 lg:p-12">
        <div className="text-center mb-10">
          <h3 className="text-2xl lg:text-3xl font-bold text-brand-black-strong mb-3">
            Why Choose Us?
          </h3>
          <p className="text-brand-text-muted text-lg">
            We provide the best shopping experience with premium services
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {extraData?.map((item, index) => (
            <div
              key={index}
              className="group text-center p-6 rounded-2xl bg-gradient-to-br from-brand-background-subtle to-white border border-brand-text-main/10 hover:border-brand-red-accent/30 hover:shadow-lg hoverEffect"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon Container */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-brand-border to-shop_light_orange/20 text-brand-red-accent group-hover:from-brand-red-accent group-hover:to-shop_light_orange group-hover:text-white group-hover:scale-110 hoverEffect mb-4">
                <span className="transform group-hover:scale-110 hoverEffect">
                  {item?.icon}
                </span>
              </div>

              {/* Content */}
              <div>
                <h4 className="text-lg font-bold text-brand-black-strong group-hover:text-brand-black-strong hoverEffect mb-2">
                  {item?.title}
                </h4>
                <p className="text-brand-text-muted text-sm leading-relaxed">
                  {item?.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Features Footer */}
        <div className="text-center mt-10 pt-8 border-t border-brand-text-main/20">
          <div className="inline-flex items-center gap-4 px-8 py-4 bg-gradient-to-r from-brand-border to-brand-background-subtle rounded-2xl border border-brand-red-accent/20">
            <div className="w-2 h-2 bg-brand-red-accent rounded-full animate-pulse"></div>
            <span className="text-brand-black-strong font-medium">
              Trusted by thousands of customers worldwide
            </span>
            <div className="w-2 h-2 bg-brand-red-accent rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ShopByBrands;
