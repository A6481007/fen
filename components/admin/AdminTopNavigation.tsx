"use client";

import "@/app/i18n";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, User, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  defaultFeatureFlags,
  filterNavSections,
  resolveNavHref,
} from "@/config/nav-config";
import {
  type BackofficePermission,
  type BackofficeRole,
} from "@/config/authz";
import {
  getActiveHref,
  normalizePath,
} from "@/lib/nav-active";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface AdminTopNavigationProps {
  currentPath?: string;
  isAdmin?: boolean;
  staffRoles?: BackofficeRole[];
  permissions?: BackofficePermission[];
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    emailAddresses?: Array<{ emailAddress: string }>;
    primaryEmailAddress?: { emailAddress: string } | null;
    imageUrl?: string;
  } | null;
}

const AdminTopNavigation = ({
  currentPath,
  user,
  isAdmin,
  staffRoles,
  permissions,
}: AdminTopNavigationProps) => {
  const { t } = useTranslation();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const pathname = usePathname();
   const router = useRouter();
   const { confirmNavigation } = useUnsavedChanges();
  const resolvedPath = normalizePath(currentPath ?? pathname ?? "");
  const resolvedUser = user ?? clerkUser ?? null;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentHrefs, setRecentHrefs] = useState<string[]>([]);
  const [sectionOpenState, setSectionOpenState] = useState<Record<string, boolean>>({});
  const sidebarCollapsed = false;

  const resolvedPermissions: BackofficePermission[] = useMemo(
    () => permissions ?? [],
    [permissions]
  );
  const resolvedRoles: BackofficeRole[] = useMemo(
    () => [
      ...(isAdmin ? (["admin"] as BackofficeRole[]) : []),
      ...(staffRoles ?? []),
    ],
    [isAdmin, staffRoles]
  );
  const navSections = useMemo(
    () =>
      filterNavSections(
        resolvedRoles,
        "admin",
        defaultFeatureFlags,
        resolvedPermissions
      ),
    [resolvedPermissions, resolvedRoles]
  );
  const navLinks = useMemo(
    () =>
      navSections
        .flatMap((section) =>
          section.items.map((item) => ({
            item,
            section,
            href: normalizePath(resolveNavHref(item, "admin")),
          }))
        )
        .filter(({ href }) => href && href !== "#"),
    [navSections]
  );
  const activeHref = useMemo(
    () => getActiveHref(resolvedPath, navLinks.map((link) => link.href)),
    [navLinks, resolvedPath]
  );
  const handleNavClick = (event: MouseEvent, href: string, after?: () => void) => {
    if (!href) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    confirmNavigation(() => {
      after?.();
      router.push(href);
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem("adminRecentRoutes");
      if (!stored) {
        setRecentHrefs([]);
        return;
      }

      const parsed = JSON.parse(stored) as string[];
      const sanitized = parsed
        .map(normalizePath)
        .filter((href) => navLinks.some((link) => link.href === href))
        .slice(0, 8);

      setRecentHrefs(sanitized);
    } catch {
      setRecentHrefs([]);
    }
  }, [navLinks]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!activeHref) return;

    setRecentHrefs((previous) => {
      const next = [activeHref, ...previous.filter((href) => href !== activeHref)].slice(0, 8);
      window.localStorage.setItem("adminRecentRoutes", JSON.stringify(next));
      return next;
    });
  }, [activeHref]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem("adminNavOpenState");
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      setSectionOpenState(parsed);
    } catch {
      setSectionOpenState({});
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("adminNavOpenState", JSON.stringify(sectionOpenState));
  }, [sectionOpenState]);

  const isSectionOpen = (sectionId: string) =>
    sidebarCollapsed ? false : sectionOpenState[sectionId] ?? true;

  const handleSectionToggle = (sectionId: string, isOpen: boolean) => {
    setSectionOpenState((prev) => ({ ...prev, [sectionId]: isOpen }));
  };

  const recentLinks = recentHrefs
    .map((href) => navLinks.find((link) => link.href === href))
    .filter((link): link is (typeof navLinks)[number] => Boolean(link));
  const navLabelKeyMap: Record<string, string> = {
    Dashboard: "admin.nav.sections.dashboard",
    Analytics: "admin.nav.sections.analytics",
    Content: "admin.nav.sections.content",
    Marketing: "admin.nav.sections.marketing",
    Operations: "admin.nav.sections.operations",
    "Access / Accounts": "admin.nav.sections.access",
    Communications: "admin.nav.sections.communications",
    "Promotion Analytics": "admin.nav.items.promotionAnalytics",
    Insights: "admin.nav.items.insights",
    News: "admin.nav.items.news",
    Events: "admin.nav.items.events",
    Catalogs: "admin.nav.items.catalogs",
    Downloads: "admin.nav.items.downloads",
    Promotions: "admin.nav.items.promotions",
    Deals: "admin.nav.items.deals",
    Banners: "admin.nav.items.banners",
    Products: "admin.nav.items.products",
    Orders: "admin.nav.items.orders",
    Reviews: "admin.nav.items.reviews",
    Users: "admin.nav.items.users",
    "Account Requests": "admin.nav.items.accountRequests",
    Employees: "admin.nav.items.employees",
    "Contact Inbox": "admin.nav.items.contactInbox",
    Subscriptions: "admin.nav.items.subscriptions",
    Notifications: "admin.nav.items.notifications",
    "Contact Messages": "admin.nav.items.contactMessages",
    "Analytics Dashboard": "admin.nav.items.analyticsDashboard",
    "Operations Analytics": "admin.nav.items.operationsAnalytics",
    Quotations: "admin.nav.items.quotations",
    Packing: "admin.nav.items.packing",
    Deliveries: "admin.nav.items.deliveries",
    Warehouse: "admin.nav.items.warehouse",
    Payments: "admin.nav.items.payments",
    Blog: "admin.nav.items.blog",
    Posts: "admin.nav.items.posts",
    Authors: "admin.nav.items.authors",
    Studio: "admin.nav.items.studio",
  };
  const translateNavLabel = (label: string) =>
    t(navLabelKeyMap[label] || label);

  return (
    <>
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        {/* Mobile Header */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-brand-black-strong to-brand-text-main text-white rounded-xl shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  {t("admin.topnav.title")}
                </h2>
                <p className="text-xs text-white/80">
                  {t("admin.topnav.navigation")}
                </p>
              </div>
            </div>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={mobileMenuOpen}
                className="p-2 text-white hover:bg-white/10"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <SheetContent side="left" className="w-full sm:max-w-md p-0">
          <SheetTitle className="sr-only">
            {t("admin.topnav.navigationLabel")}
          </SheetTitle>
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 bg-gradient-to-r from-brand-black-strong to-brand-text-main p-5 text-white">
              <div className="p-2 rounded-lg bg-white/20">
                <Shield className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80">
                  {t("admin.topnav.signedIn")}
                </p>
                <p className="text-base font-semibold truncate">
                  {resolvedUser?.firstName} {resolvedUser?.lastName}
                </p>
                <p className="text-xs text-white/70 truncate">
                  {resolvedUser?.primaryEmailAddress?.emailAddress}
                </p>
              </div>
              {resolvedUser?.imageUrl && (
                <img
                  src={resolvedUser.imageUrl}
                  alt={t("admin.topnav.avatarAlt")}
                  className="w-12 h-12 rounded-full border border-white/30 object-cover"
                />
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain max-h-[calc(100vh-160px)] p-5 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">
                    {t("admin.topnav.recent")}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {t("admin.topnav.lastVisits", { count: 8 })}
                  </span>
                </div>
                {recentLinks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {recentLinks.map(({ item, section, href }) => {
                      const isActive = activeHref === href;
                      const Icon = item.icon ?? Shield;

                      return (
                        <Link
                          key={`${href}-${item.label}`}
                          href={href}
                          onClick={(e) => handleNavClick(e, href, () => setMobileMenuOpen(false))}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex flex-col gap-2 rounded-xl border px-3 py-3 shadow-sm transition-all duration-150 min-w-0",
                            isActive
                              ? "border-brand-text-main bg-brand-text-main/10 text-brand-black-strong"
                              : "border-slate-200 bg-slate-50/60 text-slate-900 hover:border-brand-text-main/40"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center",
                                isActive
                                  ? "bg-brand-text-main text-white"
                                  : "bg-slate-900 text-white"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[11px] uppercase tracking-[0.1em] text-slate-500 truncate">
                                {translateNavLabel(section.label)}
                              </span>
                              <span className="text-sm font-semibold truncate">
                                {translateNavLabel(item.label)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
                    {t("admin.topnav.recentEmpty")}
                  </div>
                )}
              </div>

              <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">
                {t("admin.topnav.allSections")}
              </p>
                <div className="space-y-3">
                  {navSections.map((section) => {
                    const sectionLinks = navLinks.filter(
                      (link) => link.section.id === section.id
                    );
                    if (sectionLinks.length === 0) return null;

                    return (
                      <div key={section.id} className="rounded-xl border border-slate-200 bg-white">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-brand-text-main" />
                            <span className="text-sm font-semibold text-slate-900">
                              {translateNavLabel(section.label)}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {t("admin.topnav.linksCount", {
                              count: sectionLinks.length,
                            })}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                          {sectionLinks.map(({ item, href }) => {
                            const isActive = activeHref === href;
                            const Icon = item.icon ?? Shield;

                            return (
                              <Link
                                key={`${href}-${item.label}`}
                                href={href}
                                onClick={(e) => handleNavClick(e, href, () => setMobileMenuOpen(false))}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors min-w-0",
                                  isActive
                                    ? "border-brand-text-main bg-brand-text-main/10 text-brand-black-strong"
                                    : "border-slate-200 text-slate-800 hover:border-brand-text-main/30"
                                )}
                              >
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-md flex items-center justify-center",
                                    isActive
                                      ? "bg-brand-text-main text-white"
                                      : "bg-slate-100 text-slate-600"
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                </div>
                                <span className="truncate">
                                  {translateNavLabel(item.label)}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200">
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                variant="ghost"
                size="sm"
                className="w-full justify-center text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5 mr-2" />
                {t("admin.topnav.signOut")}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-[calc(100vh-96px)] min-h-[560px] w-[280px]">
        <div className="flex h-full max-h-screen w-full flex-col border-r border-slate-200 bg-white shadow-sm transition-all duration-200">
          <div className="flex items-center gap-3 px-3 py-2 border-b border-slate-200">
            {resolvedUser?.imageUrl ? (
              <img
                src={resolvedUser.imageUrl}
                alt={t("admin.topnav.avatarAlt")}
                className="h-10 w-10 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
                <User className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {resolvedUser?.firstName} {resolvedUser?.lastName}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {resolvedUser?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-slate-700"
                title={t("admin.topnav.signOut")}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">{t("admin.topnav.signOut")}</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    {t("admin.topnav.pinnedRecent")}
                  </p>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("admin.topnav.quickAccess")}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {t("admin.topnav.lastVisits", { count: 8 })}
                </span>
              </div>

              <div className="space-y-1">
                {recentLinks.length > 0 ? (
                  recentLinks.map(({ item, section, href }) => {
                    const isActive = activeHref === href;
                    const Icon = item.icon ?? Shield;
                    return (
                      <Link
                        key={`${href}-${item.label}`}
                        href={href}
                        onClick={(e) => handleNavClick(e, href)}
                        title={`${translateNavLabel(section.label)} / ${translateNavLabel(item.label)}`}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-brand-text-main/10 text-brand-black-strong"
                            : "hover:bg-slate-100 text-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-md",
                            isActive ? "bg-brand-text-main text-white" : "bg-slate-100 text-slate-700"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[11px] uppercase tracking-[0.08em] text-slate-500 truncate">
                            {translateNavLabel(section.label)}
                          </div>
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {translateNavLabel(item.label)}
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                    {t("admin.topnav.recentEmpty")}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pb-2">
              {navSections.map((section) => {
                const sectionLinks = navLinks.filter(
                  (link) => link.section.id === section.id
                );
                if (sectionLinks.length === 0) return null;

                return (
                  <details
                    key={section.id}
                    open={isSectionOpen(section.id)}
                    onToggle={(event) => handleSectionToggle(section.id, event.currentTarget.open)}
                    className="group rounded-lg border border-slate-200 bg-white"
                  >
                    <summary
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-900",
                        sidebarCollapsed ? "justify-center" : ""
                      )}
                      title={translateNavLabel(section.label)}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                        <Shield className="h-4 w-4" />
                      </span>
                      {!sidebarCollapsed && (
                        <span className="truncate">
                          {translateNavLabel(section.label)}
                        </span>
                      )}
                    </summary>
                    {!sidebarCollapsed && (
                        <div className="flex flex-col gap-1 px-2 pb-2">
                          {sectionLinks.map(({ item, href }) => {
                          const isActive = activeHref === href;
                          const Icon = item.icon ?? Shield;
                          return (
                            <Link
                              key={`${href}-${item.label}`}
                              href={href}
                              onClick={(e) => handleNavClick(e, href)}
                              aria-current={isActive ? "page" : undefined}
                              title={translateNavLabel(item.label)}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                                isActive
                                  ? "bg-brand-text-main/10 text-brand-black-strong"
                                  : "hover:bg-slate-100 text-slate-800"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md",
                                  isActive ? "bg-brand-text-main text-white" : "bg-slate-100 text-slate-700"
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="truncate">
                                {translateNavLabel(item.label)}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                    {sidebarCollapsed && (
                      <div className="flex flex-col gap-1 px-2 pb-2">
                        {sectionLinks.map(({ item, href }) => {
                          const isActive = activeHref === href;
                          const Icon = item.icon ?? Shield;
                          return (
                            <Link
                              key={`${href}-${item.label}`}
                              href={href}
                              onClick={(e) => handleNavClick(e, href)}
                              aria-current={isActive ? "page" : undefined}
                              title={translateNavLabel(item.label)}
                              className={cn(
                                "flex items-center justify-center rounded-md px-2 py-2",
                                isActive
                                  ? "bg-brand-text-main/10 text-brand-black-strong"
                                  : "hover:bg-slate-100 text-slate-800"
                              )}
                            >
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md",
                                  isActive ? "bg-brand-text-main text-white" : "bg-slate-100 text-slate-700"
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminTopNavigation;
