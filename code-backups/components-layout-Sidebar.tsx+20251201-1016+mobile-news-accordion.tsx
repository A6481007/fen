import {
  X,
  Home,
  ShoppingBag,
  BookOpen,
  Flame,
  User,
  ShoppingCart,
  Heart,
  Package,
  Tag,
  Phone,
  HelpCircle,
  Info,
  Grid3X3,
  Logs,
  Megaphone,
  CalendarDays,
  BookOpenCheck,
  Download,
  ChevronDown,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { FC, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useOutsideClick } from "@/hooks";
import { NAV_STRUCTURE, categoriesData, headerData } from "@/constants";
import { ClerkLoaded, SignedIn } from "@clerk/nextjs";
import useStore from "@/store";
import Logo from "../common/Logo";
import SocialMedia from "../common/SocialMedia";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const sidebarRef = useOutsideClick<HTMLDivElement>(onClose);
  const { items, favoriteProduct } = useStore();
  const [isNewsSectionOpen, setIsNewsSectionOpen] = useState(
    pathname.startsWith(NAV_STRUCTURE.newsHub.path)
  );
  const newsNavItem = headerData.find(
    (item) => item.href === NAV_STRUCTURE.newsHub.path
  );

  useEffect(() => {
    setIsNewsSectionOpen(pathname.startsWith(NAV_STRUCTURE.newsHub.path));
  }, [pathname]);

  // Enhanced menu sections with icons
  const userMenuItems = [
    { title: "My Account", href: "/account", icon: User },
    { title: "My Orders", href: "/orders", icon: Package },
    { title: "Wishlist", href: "/wishlist", icon: Heart },
    { title: "Shopping Cart", href: "/cart", icon: ShoppingCart },
  ];

  const mainMenuItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Shop", href: "/shop", icon: ShoppingBag },
    { title: NAV_STRUCTURE.catalog.label, href: NAV_STRUCTURE.catalog.path, icon: BookOpen },
    { title: "Categories", href: "/category", icon: Grid3X3 },
    { title: "Brands", href: "/brands", icon: Tag },
    {
      title: NAV_STRUCTURE.newsHub.label,
      href: NAV_STRUCTURE.newsHub.path,
      icon: Megaphone,
    },
    { title: "Blog", href: "/blog", icon: BookOpen },
    { title: "Hot Deal", href: "/deal", icon: Flame },
  ];

  const supportMenuItems = [
    { title: "Help Center", href: "/help", icon: HelpCircle },
    { title: "Customer Service", href: "/support", icon: Phone },
    { title: "About Us", href: "/about", icon: Info },
  ];

  return (
    <div
      className={`fixed inset-y-0 h-screen left-0 z-50 w-full bg-black/40 shadow-xl transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } transition-transform ease-in-out duration-300`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        ref={sidebarRef}
        className="min-w-72 max-w-96 bg-black z-50 h-screen text-white p-6 border-r border-r-brand-black-strong flex flex-col gap-4 overflow-y-auto scrollbar-thin scrollbar-thumb-brand-black-strong scrollbar-track-transparent"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-black-strong">
          <Logo colorVariant="light" />
          <button
            onClick={onClose}
            className="hover:text-white hoverEffect p-2 rounded-md hover:bg-brand-black-strong/30"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mobile Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Quick Access
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* Shopping Cart */}
            <Link
              onClick={onClose}
              href="/cart"
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-brand-black-strong/30 hover:bg-brand-black-strong/50 transition-colors duration-200 text-center relative"
            >
              <ShoppingCart size={20} className="text-white" />
              <span className="text-xs font-medium text-zinc-300">Cart</span>
              {items?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-red-accent text-white h-4 w-4 rounded-full text-xs font-semibold flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>

            {/* Wishlist */}
            <Link
              onClick={onClose}
              href="/wishlist"
              className="flex flex-col items-center gap-2 p-3 rounded-lg bg-brand-black-strong/30 hover:bg-brand-black-strong/50 transition-colors duration-200 text-center relative"
            >
              <Heart size={20} className="text-pink-400" />
              <span className="text-xs font-medium text-zinc-300">
                Wishlist
              </span>
              {favoriteProduct?.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white h-4 w-4 rounded-full text-xs font-semibold flex items-center justify-center">
                  {favoriteProduct.length}
                </span>
              )}
            </Link>

            {/* Orders */}
            <ClerkLoaded>
              <SignedIn>
                <Link
                  onClick={onClose}
                  href="/user/orders"
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-brand-black-strong/30 hover:bg-brand-black-strong/50 transition-colors duration-200 text-center"
                >
                  <Logs size={20} className="text-blue-400" />
                  <span className="text-xs font-medium text-zinc-300">
                    Orders
                  </span>
                </Link>
              </SignedIn>
            </ClerkLoaded>
          </div>
        </div>

        {/* User Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            My Account
          </h3>
          <div className="flex flex-col gap-2">
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  onClick={onClose}
                  key={item.title}
                  href={item.href}
                  className={`flex items-center gap-3 p-2 rounded-md text-sm font-medium tracking-wide transition-all duration-200 hover:text-white hover:bg-brand-black-strong/30 ${
                    pathname === item.href
                      ? "text-white bg-brand-black-strong/50"
                      : "text-zinc-300"
                  }`}
                >
                  <Icon size={18} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Navigation
          </h3>
          <div className="flex flex-col gap-2">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  onClick={onClose}
                  key={item.title}
                  href={item.href}
                  className={`flex items-center gap-3 p-2 rounded-md text-sm font-medium tracking-wide transition-all duration-200 hover:text-white hover:bg-brand-black-strong/30 ${
                    pathname === item.href
                      ? "text-white bg-brand-black-strong/50"
                      : "text-zinc-300"
                  }`}
                >
                  <Icon size={18} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>

        {/* News & Resources */}
        {newsNavItem && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
              {NAV_STRUCTURE.newsHub.label}
            </h3>
            <button
              type="button"
              onClick={() => setIsNewsSectionOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-md bg-brand-black-strong/40 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-brand-black-strong/60"
              aria-expanded={isNewsSectionOpen}
              aria-controls="mobile-news-accordion"
            >
              <span className="inline-flex items-center gap-2">
                <Megaphone size={18} className="text-brand-red-accent" />
                {newsNavItem.title}
              </span>
              <motion.span
                animate={{ rotate: isNewsSectionOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-full bg-brand-black-strong/60 p-1"
                aria-hidden="true"
              >
                <ChevronDown size={14} />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isNewsSectionOpen && (
                <motion.div
                  key="news-section"
                  id="mobile-news-accordion"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden rounded-lg bg-brand-black-strong/30"
                >
                  <div className="flex flex-col gap-2 p-3">
                    {newsNavItem.children?.map((child) => {
                      const icon =
                        child.kind === "download"
                          ? Download
                          : child.kind === "event"
                            ? CalendarDays
                            : child.kind === "resource"
                              ? BookOpenCheck
                              : Megaphone;
                      const Icon = icon;
                      return (
                        <Link
                          key={child.title}
                          href={child.href}
                          onClick={onClose}
                          className={`flex items-start gap-3 rounded-md p-2 transition-all duration-200 hover:bg-brand-black-strong/40 ${
                            pathname === child.href
                              ? "bg-brand-black-strong/60 text-white"
                              : "text-zinc-300"
                          }`}
                        >
                          <Icon size={18} className="mt-0.5 flex-shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                              {child.title}
                            </span>
                            {child.description && (
                              <span className="text-xs text-zinc-400">
                                {child.description}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Categories Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Popular Categories
          </h3>
          <div className="flex flex-col gap-1">
            {categoriesData.slice(0, 6).map((item) => (
              <Link
                onClick={onClose}
                key={item.title}
                href={`/category/${item.href}`}
                className="text-xs font-medium text-zinc-400 hover:text-white transition-colors duration-200 py-1.5 px-2 rounded hover:bg-brand-black-strong/20 capitalize"
              >
                {item.title}
              </Link>
            ))}
            <Link
              onClick={onClose}
              href="/category"
              className="text-xs font-semibold text-brand-red-accent hover:text-shop_light_orange transition-colors duration-200 py-1.5 px-2 rounded hover:bg-brand-black-strong/20 mt-1"
            >
              View All Categories →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              onClick={onClose}
              href="/deal"
              className="flex flex-col items-center gap-1 p-3 rounded-lg bg-brand-black-strong/30 hover:bg-brand-black-strong/50 transition-colors duration-200 text-center"
            >
              <Flame size={20} className="text-brand-red-accent" />
              <span className="text-xs font-medium text-zinc-300">
                Hot Deals
              </span>
            </Link>
            <Link
              onClick={onClose}
              href="/wishlist"
              className="flex flex-col items-center gap-1 p-3 rounded-lg bg-brand-black-strong/30 hover:bg-brand-black-strong/50 transition-colors duration-200 text-center"
            >
              <Heart size={20} className="text-white" />
              <span className="text-xs font-medium text-zinc-300">
                Wishlist
              </span>
            </Link>
          </div>
        </div>

        {/* Support Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Support
          </h3>
          <div className="flex flex-col gap-2">
            {supportMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  onClick={onClose}
                  key={item.title}
                  href={item.href}
                  className={`flex items-center gap-3 p-2 rounded-md text-sm font-medium tracking-wide transition-all duration-200 hover:text-white hover:bg-brand-black-strong/30 ${
                    pathname === item.href
                      ? "text-white bg-brand-black-strong/50"
                      : "text-zinc-300"
                  }`}
                >
                  <Icon size={18} />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-brand-black-strong my-2"></div>

        {/* Promotional Banner */}
        <div className="bg-gradient-to-r from-brand-black-strong to-brand-red-accent rounded-lg p-4 text-center">
          <h4 className="text-sm font-bold text-white mb-1">
            Special Offer!
          </h4>
          <p className="text-xs text-zinc-300 mb-2">
            Get 20% off on your first order
          </p>
          <Link
            onClick={onClose}
            href="/deal"
            className="inline-block text-xs font-semibold text-white bg-brand-red-accent hover:bg-shop_light_orange px-3 py-1 rounded-full transition-colors duration-200"
          >
            Shop Now
          </Link>
        </div>

        {/* Social Media */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
            Follow Us
          </h3>
          <SocialMedia />
        </div>
      </motion.div>
    </div>
  );
};

export default Sidebar;
