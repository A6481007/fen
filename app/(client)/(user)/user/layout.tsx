"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  User,
  Bell,
  Heart,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Users,
  Building2,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import Container from "@/components/Container";
import "@/app/i18n";
import { useTranslation } from "react-i18next";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() ?? "";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const sidebarItems = [
    {
      title: t("client.userLayout.nav.dashboard.title"),
      href: "/user/dashboard",
      icon: LayoutDashboard,
      description: t("client.userLayout.nav.dashboard.description"),
    },
    {
      title: t("client.userLayout.nav.orders.title"),
      href: "/user/orders",
      icon: Package,
      description: t("client.userLayout.nav.orders.description"),
    },
    {
      title: t("client.userLayout.nav.registrations.title"),
      href: "/user/dashboard/registrations",
      icon: CalendarClock,
      description: t("client.userLayout.nav.registrations.description"),
    },
    {
      title: t("client.userLayout.nav.profile.title"),
      href: "/user/profile",
      icon: User,
      description: t("client.userLayout.nav.profile.description"),
    },
    {
      title: t("client.userLayout.nav.notifications.title"),
      href: "/user/notifications",
      icon: Bell,
      description: t("client.userLayout.nav.notifications.description"),
    },
    {
      title: t("client.userLayout.nav.wishlist.title"),
      href: "/wishlist",
      icon: Heart,
      description: t("client.userLayout.nav.wishlist.description"),
    },
    {
      title: t("client.userLayout.nav.settings.title"),
      href: "/user/settings",
      icon: Settings,
      description: t("client.userLayout.nav.settings.description"),
    },
  ];
  const adminItems = [
    {
      title: t("client.userLayout.admin.manageUsers.title"),
      href: "/user/admin/manage-users",
      icon: Users,
      description: t("client.userLayout.admin.manageUsers.description"),
    },
    {
      title: t("client.userLayout.admin.premiumAccounts.title"),
      href: "/user/admin/premium-accounts",
      icon: Shield,
      description: t("client.userLayout.admin.premiumAccounts.description"),
    },
    {
      title: t("client.userLayout.admin.dealerAccounts.title"),
      href: "/user/admin/business-accounts",
      icon: Building2,
      description: t("client.userLayout.admin.dealerAccounts.description"),
    },
  ];
  const isAdminUser =
    ADMIN_EMAIL.length > 0 &&
    user?.emailAddresses?.some(
      (address) =>
        address.emailAddress?.toLowerCase() === ADMIN_EMAIL
    );

  return (
    <div className="min-h-screen py-5 bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink/20">
      <Container className="py-6">
        <div className="flex flex-col gap-6">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-shop_light_green/10">
              <div className="flex items-center space-x-3">
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt={t("client.userLayout.avatarAlt")}
                    className="w-10 h-10 rounded-full object-cover border-2 border-shop_light_green/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-shop_light_green/20 flex items-center justify-center">
                    <User className="h-6 w-6 text-shop_dark_green" />
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("client.userLayout.header.userDashboard")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2"
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop Top Navigation */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl shadow-xl border border-shop_light_green/10 overflow-hidden">
              {/* User Profile Header */}
              <div className="p-6 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {user?.imageUrl ? (
                      <img
                        src={user.imageUrl}
                        alt={t("client.userLayout.avatarAlt")}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-lg text-white">
                        {user?.firstName} {user?.lastName}
                      </h2>
                      <p className="text-white/80 text-sm">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-white/90 text-sm">
                        {t("client.userLayout.status.active")}
                      </span>
                    </div>
                    <Button
                      onClick={() => signOut()}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 border border-white/30"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      {t("client.userLayout.actions.signOut")}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Horizontal Navigation */}
              <nav className="p-6">
                <div className="flex flex-wrap gap-3">
                  {sidebarItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className={cn(
                          "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group border",
                          isActive
                            ? "bg-shop_light_green/10 border-shop_light_green/30 shadow-sm"
                            : "hover:bg-gray-50 border-gray-200 hover:border-shop_light_green/30"
                        )}
                      >
                        <div
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            isActive
                              ? "bg-shop_light_green text-white"
                              : "bg-gray-100 text-gray-600 group-hover:bg-shop_light_green/20 group-hover:text-shop_dark_green"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div
                            className={cn(
                              "font-medium text-sm",
                              isActive
                                ? "text-shop_dark_green"
                                : "text-gray-900"
                            )}
                          >
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}

                  {/* Admin Section - Show for configured admin email */}
                  {isAdminUser && (
                    <>
                      <div className="w-full border-t border-gray-200 my-3"></div>
                      <div className="w-full text-xs text-gray-500 mb-2 px-2">
                        {t("client.userLayout.admin.sectionTitle")}
                      </div>
                      {adminItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.title}
                            href={item.href}
                            className={cn(
                              "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group border",
                              isActive
                                ? "bg-red-50 border-red-200 shadow-sm"
                                : "hover:bg-red-50 border-gray-200 hover:border-red-200"
                            )}
                          >
                            <div
                              className={cn(
                                "p-2 rounded-lg transition-colors",
                                isActive
                                  ? "bg-red-500 text-white"
                                  : "bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600"
                              )}
                            >
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div>
                              <div
                                className={cn(
                                  "font-medium text-sm",
                                  isActive ? "text-red-700" : "text-gray-900"
                                )}
                              >
                                {item.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </>
                  )}
                </div>
              </nav>
            </div>
          </div>

          {/* Mobile Sidebar */}
          <div className={cn("lg:hidden", sidebarOpen ? "block" : "hidden")}>
            <div className="bg-white rounded-2xl shadow-xl border border-shop_light_green/10 overflow-hidden">
              {/* User Profile Section */}
              <div className="p-6 bg-gradient-to-r from-shop_dark_green to-shop_light_green text-white">
                <div className="flex items-center space-x-4">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={t("client.userLayout.avatarAlt")}
                      className="w-16 h-16 rounded-full object-cover border-3 border-white/30"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="font-bold text-lg text-white">
                      {user?.firstName} {user?.lastName}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                    <div className="flex items-center mt-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span className="text-white/90 text-xs">
                        {t("client.userLayout.status.active")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Navigation */}
              <nav className="p-4 space-y-2">
                {sidebarItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-xl transition-all duration-200 group",
                        isActive
                          ? "bg-shop_light_green/10 border border-shop_light_green/30 shadow-sm"
                          : "hover:bg-gray-50 border border-transparent"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            isActive
                              ? "bg-shop_light_green text-white"
                              : "bg-gray-100 text-gray-600 group-hover:bg-shop_light_green/20 group-hover:text-shop_dark_green"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div
                            className={cn(
                              "font-medium",
                              isActive
                                ? "text-shop_dark_green"
                                : "text-gray-900"
                            )}
                          >
                            {item.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-shop_dark_green" : "text-gray-400"
                        )}
                      />
                    </Link>
                  );
                })}

                {/* Admin Section - Mobile */}
                {isAdminUser && (
                  <>
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="text-xs text-gray-500 mb-3 px-4">
                        {t("client.userLayout.admin.sectionTitle")}
                      </div>
                      {adminItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.title}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl transition-all duration-200 group",
                              isActive
                                ? "bg-red-50 border border-red-200 shadow-sm"
                                : "hover:bg-red-50 border border-transparent"
                            )}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  isActive
                                    ? "bg-red-500 text-white"
                                    : "bg-gray-100 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600"
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div
                                  className={cn(
                                    "font-medium text-sm",
                                    isActive ? "text-red-700" : "text-gray-900"
                                  )}
                                >
                                  {item.title}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item.description}
                                </div>
                              </div>
                            </div>
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 transition-colors",
                                isActive ? "text-red-600" : "text-gray-400"
                              )}
                            />
                          </Link>
                        );
                      })}
                    </div>
                  </>
                )}
              </nav>

              {/* Mobile Sign Out Button */}
              <div className="p-4 border-t border-gray-100">
                <Button
                  onClick={() => signOut()}
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  {t("client.userLayout.actions.signOut")}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full">
            <div className="bg-white rounded-2xl shadow-xl border border-shop_light_green/10 overflow-hidden">
              <div className="p-6 lg:p-8">{children}</div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
