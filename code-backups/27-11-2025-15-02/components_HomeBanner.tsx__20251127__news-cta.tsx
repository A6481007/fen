import Image from "next/image";
import { banner_1 } from "@/images";
import Link from "next/link";
import { ShoppingBag, Star, TrendingUp, Zap } from "lucide-react";
import Container from "./Container";
import Title from "./Title";

const HomeBanner = async () => {
  return (
    <div className="overflow-hidden">
      <div className="relative py-8 md:py-12 bg-gradient-to-br from-brand-border via-pink-50 to-orange-50 rounded-2xl shadow-2xl">
        <Container>
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-gradient-to-br from-brand-text-main/20 to-transparent rounded-full animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-gradient-to-tr from-brand-black-strong/10 to-transparent rounded-full animate-bounce delay-1000"></div>
            <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-brand-text-main/30 rounded-full animate-ping delay-500"></div>
            <div className="absolute top-1/4 right-1/3 w-3 h-3 bg-brand-red-accent/30/40 rounded-full animate-pulse delay-700"></div>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
            {/* Left Content */}
            <div className="flex-1 text-center lg:text-left space-y-8">
              {/* Badge */}
              <div className="flex justify-center lg:justify-start">
                <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/20 animate-fadeInUp">
                  <Zap className="w-4 h-4 text-brand-red-accent animate-pulse" />
                  <span className="text-sm font-semibold text-brand-black-strong">
                    Limited Time Offer
                  </span>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                </div>
              </div>

              {/* Main Title */}
              <div className="space-y-4">
                <Title className="text-brand-black-strong font-bold text-4xl sm:text-5xl leading-tight animate-fadeInUp delay-200">
                  <span className="block">Grab Up to</span>
                  <span className="block bg-gradient-to-r from-brand-text-main to-brand-black-strong bg-clip-text text-transparent animate-shimmer">
                    50% Off
                  </span>
                  <span className="block text-2xl font-medium text-gray-700">
                    on Selected Headphones
                  </span>
                </Title>
              </div>

              {/* Features */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 animate-fadeInUp delay-400">
                {[
                  {
                    icon: Star,
                    text: "Premium Quality",
                    color: "text-yellow-500",
                  },
                  {
                    icon: TrendingUp,
                    text: "Best Deals",
                    color: "text-success-base",
                  },
                  {
                    icon: ShoppingBag,
                    text: "Free Shipping",
                    color: "text-blue-500",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white/70 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-white/20 hover:bg-white/90 transition-all duration-300 hover:scale-105"
                  >
                    <feature.icon className={`w-4 h-4 ${feature.color}`} />
                    <span className="text-sm font-medium text-gray-700">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fadeInUp delay-600">
                <Link
                  href="/shop"
                  className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-brand-black-strong to-brand-text-main text-white px-8 py-4 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-brand-text-main to-brand-black-strong opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  <span className="relative z-10 flex items-center gap-3">
                    <ShoppingBag className="w-5 h-5 group-hover:animate-bounce" />
                    Shop Now
                  </span>
                  <div className="absolute inset-0 -top-40 -left-10 bg-white/20 w-6 h-40 rotate-12 group-hover:left-full transition-all duration-700"></div>
                </Link>

                <Link
                  href="/deal"
                  className="group inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm text-brand-black-strong px-8 py-4 rounded-xl text-base font-semibold shadow-md hover:shadow-lg border-2 border-brand-black-strong/20 hover:border-brand-black-strong/40 transform hover:-translate-y-1 transition-all duration-300"
                >
                  <Zap className="w-5 h-5 group-hover:animate-pulse text-brand-red-accent" />
                  View Deals
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 animate-fadeInUp delay-800">
                {[
                  { value: "50K+", label: "Happy Customers" },
                  { value: "4.9★", label: "Customer Rating" },
                  { value: "24/7", label: "Support" },
                ].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-brand-black-strong">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Image */}
            <div className="flex-shrink-0 relative">
              <div className="relative animate-float">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-brand-text-main/20 to-orange-300/20 rounded-full blur-3xl scale-110 animate-pulse"></div>

                {/* Main Image */}
                <Image
                  src={banner_1}
                  alt="Premium Headphones"
                  className="relative z-10 w-80 sm:w-96 lg:w-[400px] xl:w-[480px] drop-shadow-2xl transform hover:scale-105 transition-transform duration-500"
                  priority
                />

                {/* Floating Elements */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce delay-300">
                  <Star className="w-6 h-6 text-white" />
                </div>

                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-brand-text-main to-brand-black-strong rounded-full flex items-center justify-center shadow-lg animate-bounce delay-1000">
                  <span className="text-white font-bold text-sm">50%</span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

export default HomeBanner;
