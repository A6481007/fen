"use client";

import {
  X,
  ShoppingBag,
  BookOpen,
  Lightbulb,
  User,
  ShoppingCart,
  Heart,
  Package,
  Phone,
  HelpCircle,
  Info,
  Grid3X3,
  FileText,
  ChevronDown,
  Percent,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FC, useEffect, useState } from "react";
import { ClerkLoaded, SignedIn } from "@clerk/nextjs";
import { useTranslation } from "react-i18next";
import { isCatalogPath, isShopPath, normalizePath } from "@/lib/nav-active";
import { buildCategoryUrl, CATEGORY_BASE_PATH } from "@/lib/paths";

import { headerData, type HeaderNavItem } from "@/constants";
import useStore from "@/store";
import Logo from "../common/Logo";
import SocialMedia from "../common/SocialMedia";
import { useNavCategories } from "@/hooks/useNavCategories";

type SidebarProps = {
  onClose: () => void;
};

const navButtonClasses =
  "flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left text-sm font-semibold text-ink transition hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]";

const linkClasses = (active: boolean) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] ${
    active ? "border border-accent-red bg-surface-1 text-ink-strong" : "border border-transparent text-ink hover:bg-surface-1"
  }`;

const Sidebar: FC<SidebarProps> = ({ onClose }) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { items, favoriteProduct } = useStore();
  const navCategories = useNavCategories();
  const [isClient, setIsClient] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const normalizeHref = (href: string) => normalizePath(href);

  const navLabelKey = (href: string) => {
    const path = normalizeHref(href);
    if (path === "/news") return "nav.news";
    return null;
  };

  const navChildLabelKey = (href: string) => {
    const path = normalizeHref(href);
    if (path === "/news") return "nav.news.news";
    if (path === "/news/resources") return "nav.news.resources";
    if (path === "/news/events") return "nav.news.events";
    return null;
  };

  const navChildDescKey = (href: string) => {
    const path = normalizeHref(href);
    if (path === "/news") return "nav.news.newsDesc";
    if (path === "/news/resources") return "nav.news.resourcesDesc";
    if (path === "/news/events") return "nav.news.eventsDesc";
    return null;
  };

  const navIconMap: Record<string, any> = {
    Shop: ShoppingBag,
    Catalog: BookOpen,
    "Deals & Promotions": Percent,
    "News & Events": FileText,
    Insight: Lightbulb,
    Support: HelpCircle,
  };

  useEffect(() => {
    setIsClient(true);
    setOpenSections((prev) => {
      const next: Record<string, boolean> = { ...prev };
      headerData.forEach((item) => {
        const itemPath = normalizeHref(item.href);
        const children = item.children ?? [];
        const isSectionActive =
          children.length > 0 &&
          (() => {
            if (itemPath === "/catalog") {
              return isCatalogPath(pathname);
            }
            if (itemPath === "/shop") {
              return isShopPath(pathname);
            }
            const isSelf =
              pathname === itemPath || pathname.startsWith(`${itemPath}/`);
            const isChild = children.some((child) => {
              const childPath = normalizeHref(child.href);
              return pathname === childPath || pathname.startsWith(`${childPath}/`);
            });
            return isSelf || isChild;
          })();
        if (isSectionActive) {
          next[item.title] = true;
        }
      });
      return next;
    });
  }, [pathname]);

  const userMenuItems = [
    { title: "My Account", href: "/account", icon: User },
    { title: "My Orders", href: "/orders", icon: Package },
    { title: "Wishlist", href: "/wishlist", icon: Heart },
    { title: "Shopping Cart", href: "/cart", icon: ShoppingCart },
  ];

  const toggleSection = (title: string) =>
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const mainMenuItems = headerData.map((item) => ({
    ...item,
    icon: navIconMap[item.title] ?? Grid3X3,
  }));

  const supportMenuItems = [
    { title: "Help Center", href: "/help", icon: HelpCircle },
    { title: "Customer Service", href: "/support", icon: Phone },
    { title: "About Us", href: "/about", icon: Info },
  ];

  const renderSimpleLink = (item: { title: string; href: string; icon: any }) => {
    const Icon = item.icon;
    const normalizedHref = normalizeHref(item.href);
    const active = (() => {
      if (normalizedHref === "/shop") return isShopPath(pathname);
      if (normalizedHref === "/catalog") return isCatalogPath(pathname);
      return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
    })();
    const labelKey = navLabelKey(item.href);
    const resolvedLabel = labelKey && t(labelKey) !== labelKey ? t(labelKey) : item.title;
    return (
      <Link
        key={item.title}
        href={item.href}
        onClick={onClose}
        className={linkClasses(active)}
        aria-current={active ? "page" : undefined}
      >
        <Icon className={`h-4 w-4 ${active ? "text-accent-red" : "text-ink-muted"}`} aria-hidden />
        <span className="flex-1">{resolvedLabel}</span>
      </Link>
    );
  };

  const renderChildren = (
    children: { title: string; href: string; description?: string | null }[],
    iconForChild: (child: { href: string; kind?: string }) => any
  ) => (
    <div className="mt-2 space-y-1 rounded-md border border-border bg-surface-1 p-2">
      {children.map((child) => {
        const Icon = iconForChild(child);
        const childPath = normalizeHref(child.href);
        const active = pathname === childPath || pathname.startsWith(`${childPath}/`);
        const childLabelKey = navChildLabelKey(child.href);
        const childDescKey = navChildDescKey(child.href);
        const resolvedChildLabel =
          childLabelKey && t(childLabelKey) !== childLabelKey ? t(childLabelKey) : child.title;
        const resolvedChildDescription =
          childDescKey && t(childDescKey) !== childDescKey
            ? t(childDescKey)
            : child.description;
        return (
          <Link
            key={child.title}
            href={child.href}
            onClick={onClose}
            className={`flex items-start gap-3 rounded-md px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)] ${
              active ? "bg-surface-0 text-ink-strong border border-accent-red" : "text-ink hover:bg-surface-0 border border-transparent"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4 text-ink-muted" aria-hidden />
            <div className="space-y-0.5">
              <span className="font-semibold">{resolvedChildLabel}</span>
              {resolvedChildDescription ? (
                <span className="text-xs text-ink-muted">{resolvedChildDescription}</span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-6 bg-surface-0 p-5 text-ink">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-full p-2 text-ink hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto" role="navigation" aria-label="Primary">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Quick access</h3>
          <div className="grid grid-cols-3 gap-3">
            <Link
              onClick={onClose}
              href="/cart"
              className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-center text-xs font-semibold text-ink hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
            >
              <ShoppingCart className="h-5 w-5" aria-hidden />
              Cart
              {isClient && items?.length ? (
                <span className="rounded-full bg-ink text-white px-2 py-0.5 text-[11px]">{items.length}</span>
              ) : null}
            </Link>

            <Link
              onClick={onClose}
              href="/wishlist"
              className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-center text-xs font-semibold text-ink hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
            >
              <Heart className="h-5 w-5" aria-hidden />
              Wishlist
              {isClient && favoriteProduct?.length ? (
                <span className="rounded-full bg-ink text-white px-2 py-0.5 text-[11px]">{favoriteProduct.length}</span>
              ) : null}
            </Link>

            <ClerkLoaded>
              <SignedIn>
                <Link
                  onClick={onClose}
                  href="/user/orders"
                  className="flex flex-col items-center gap-1 rounded-md border border-border bg-surface-1 px-3 py-2 text-center text-xs font-semibold text-ink hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
                >
                  <FileText className="h-5 w-5" aria-hidden />
                  Orders
                </Link>
              </SignedIn>
            </ClerkLoaded>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Main</h3>
          <div className="space-y-2">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const active = (() => {
                const normalizedHref = normalizeHref(item.href);
                if (normalizedHref === "/shop") return isShopPath(pathname);
                if (normalizedHref === "/catalog") return isCatalogPath(pathname);
                return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
              })();
              const labelKey = navLabelKey(item.href);
              const resolvedLabel = labelKey && t(labelKey) !== labelKey ? t(labelKey) : item.title;

              if (item.children && item.children.length > 0) {
                const isOpen = openSections[item.title] ?? false;
                return (
                  <div key={item.title} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => toggleSection(item.title)}
                      className={navButtonClasses}
                      aria-expanded={isOpen}
                      aria-controls={`mobile-${item.title.toLowerCase().replace(/\s+/g, "-")}-accordion`}
                      aria-label={`${item.title} navigation`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-ink-muted" aria-hidden />
                        {resolvedLabel}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {isOpen
                      ? renderChildren(
                          item.children,
                          () => Icon
                        )
                      : null}
                  </div>
                );
              }

              return renderSimpleLink(item);
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Popular categories
          </h3>
          <div className="space-y-1">
            {navCategories.slice(0, 6).map((item) => (
              <Link
                onClick={onClose}
                key={item.title}
                href={buildCategoryUrl(item.href)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm capitalize text-ink hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
              >
                {item.title}
              </Link>
            ))}
            <Link
              onClick={onClose}
              href={CATEGORY_BASE_PATH}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold text-ink hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-ink-strong)]"
            >
              View all categories →
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">My account</h3>
          <div className="space-y-2">
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.title}
                  onClick={onClose}
                  href={item.href}
                  className={linkClasses(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-accent-red" : "text-ink-muted"}`} aria-hidden />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Support</h3>
          <div className="space-y-2">
            {supportMenuItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.title}
                  onClick={onClose}
                  href={item.href}
                  className={linkClasses(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-accent-red" : "text-ink-muted"}`} aria-hidden />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted mb-2">
            Follow us
          </h3>
          <SocialMedia />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
