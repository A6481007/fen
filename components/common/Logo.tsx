import { cn } from "@/lib/utils";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

interface Props {
  className?: string;
  variant?: "default" | "sm";
  colorVariant?: "default" | "light";
}

const Logo = ({
  className,
  variant = "default",
  colorVariant = "default",
}: Props) => {
  const primaryTextClass =
    colorVariant === "light"
      ? "text-white group-hover:text-brand-red-accent"
      : "text-brand-black-strong group-hover:text-brand-text-main";
  const gradientTextClass = cn(
    "bg-clip-text text-transparent hoverEffect",
    colorVariant === "light"
      ? "bg-gradient-to-r from-white to-brand-red-accent group-hover:from-white/80 group-hover:to-brand-red-accent"
      : "bg-gradient-to-r from-brand-text-main to-brand-red-accent group-hover:from-brand-black-strong group-hover:to-brand-text-main"
  );
  const iconColorClass =
    colorVariant === "light"
      ? "text-white group-hover:text-brand-red-accent"
      : "text-brand-black-strong group-hover:text-brand-text-main";

  // Small variant for footer
  if (variant === "sm") {
    return (
      <Link href={"/"}>
        <div
          className={cn(
            "flex items-center gap-1.5 group hoverEffect",
            className
          )}
          >
            {/* Cart Icon with Creative Styling (smaller) */}
            <div className="relative">
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-red-accent rounded-full animate-pulse group-hover:bg-brand-text-main hoverEffect"></div>
              <ShoppingCart
                className={cn(
                  "w-5 h-5 hoverEffect transform group-hover:scale-110",
                  iconColorClass
                )}
                strokeWidth={2.5}
              />
            </div>

            {/* Text Logo (smaller) */}
            <div className="flex items-center">
              <h1 className="text-sm font-black tracking-wider uppercase font-sans">
                <span className={cn("hoverEffect", primaryTextClass)}>NCS</span>
                <span className={gradientTextClass}>
                  Shop
                </span>
              </h1>

            {/* Decorative Elements (smaller) */}
            <div className="ml-0.5 flex flex-col gap-0.5">
              <div className="w-0.5 h-0.5 bg-brand-red-accent rounded-full group-hover:bg-brand-text-main hoverEffect"></div>
              <div className="w-0.5 h-0.5 bg-brand-text-main rounded-full group-hover:bg-brand-red-accent hoverEffect"></div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Default full logo
  return (
    <Link href={"/"}>
      <div
        className={cn("flex items-center gap-2 group hoverEffect", className)}
      >
        {/* Cart Icon with Creative Styling */}
        <div className="relative">
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-red-accent rounded-full animate-pulse group-hover:bg-brand-text-main hoverEffect"></div>
          <ShoppingCart
            className={cn(
              "w-8 h-8 hoverEffect transform group-hover:scale-110",
              iconColorClass
            )}
            strokeWidth={2.5}
          />
        </div>

        {/* Text Logo */}
        <div className="flex items-center">
          <h1 className="text-2xl font-black tracking-wider uppercase font-sans">
            <span className={cn("hoverEffect", primaryTextClass)}>NCS</span>
            <span className={gradientTextClass}>
              Shop
            </span>
          </h1>

          {/* Decorative Elements */}
          <div className="ml-1 flex flex-col gap-0.5">
            <div className="w-1 h-1 bg-brand-red-accent rounded-full group-hover:bg-brand-text-main hoverEffect"></div>
            <div className="w-1 h-1 bg-brand-text-main rounded-full group-hover:bg-brand-red-accent hoverEffect"></div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Logo;
