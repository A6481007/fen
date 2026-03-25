"use client";

import React, { useEffect, useState } from "react";
import { Bell, Search, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Order } from "@/sanity.types";
import { useTranslation } from "react-i18next";

interface AdminUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddresses?: Array<{ emailAddress: string }>;
  imageUrl?: string;
}

interface AdminHeaderProps {
  user: AdminUser;
}

interface OrderType {
  orderDate?: string;
  _createdAt?: string;
  totalPrice?: number;
}

interface NotificationType {
  _id: string;
  id?: string;
  title: string;
  message: string;
  description?: string;
  type: string;
  priority: string;
  sentAt: string;
  time?: string;
}

interface LocalNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: string;
}

const AdminHeader = ({ user }: AdminHeaderProps) => {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState({
    newOrdersToday: 0,
    todaysRevenue: 0,
    activeUsers: 0,
  });
  const [notifications, setNotifications] = useState<
    (NotificationType | LocalNotification)[]
  >([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language?.startsWith("th") ? "th-TH" : "en-US";
  const currentDate = new Date().toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentTime = new Date().toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    t("admin.header.adminNameFallback");

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // Fetch orders for today's stats
        const ordersRes = await fetch(
          "/api/admin/orders?limit=1000&sortBy=orderDate&sortOrder=desc"
        );
        const ordersData = await ordersRes.json();

        // Calculate today's orders and revenue
        const today = new Date();
        const todayOrders = (ordersData.orders || []).filter((order: Order) => {
          const orderDate = new Date(order.orderDate || order._createdAt);
          return (
            orderDate.getDate() === today.getDate() &&
            orderDate.getMonth() === today.getMonth() &&
            orderDate.getFullYear() === today.getFullYear()
          );
        });

        const newOrdersToday = todayOrders.length;
        const todaysRevenue = todayOrders.reduce(
          (sum: number, order: OrderType) => sum + (order.totalPrice || 0),
          0
        );

        // Fetch users count
        const usersRes = await fetch("/api/admin/users?limit=1");
        const usersData = await usersRes.json();
        const activeUsers = usersData.totalCount || 0;

        // Fetch notifications from API
        const notificationsRes = await fetch("/api/admin/notifications");
        const notificationsData = await notificationsRes.json();

        setStats({
          newOrdersToday,
          todaysRevenue,
          activeUsers,
        });
        setNotifications(notificationsData.notifications || []);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        // Set fallback data
        setStats({
          newOrdersToday: 0,
          todaysRevenue: 0,
          activeUsers: 0,
        });
        setNotifications([
          {
            id: "1",
            title: t("admin.header.fallbackNotificationTitle"),
            description: t("admin.header.fallbackNotificationDescription"),
            time: t("admin.header.fallbackNotificationTime"),
            type: "info",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [t]);

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return t("admin.header.time.justNow");
    }

    if (diffInMinutes < 60) {
      return t("admin.header.time.minutesAgo", { count: diffInMinutes });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return t("admin.header.time.hoursAgo", {
        count: diffInHours,
        suffix: diffInHours > 1 ? "s" : "",
      });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    return t("admin.header.time.daysAgo", {
      count: diffInDays,
      suffix: diffInDays > 1 ? "s" : "",
    });
  };

  return (
    <div className="bg-gradient-to-r from-white via-brand-background-subtle to-brand-border rounded-2xl shadow-lg border border-brand-text-main/10 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left Side - Welcome & Date */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-brand-black-strong">
            {t("admin.header.welcomeBack", { name: displayName })}
            <span aria-hidden="true"> 👋</span>
          </h1>
          <div className="flex items-center gap-4 text-sm text-brand-text-muted">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{currentDate}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{currentTime}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
            <Input
              placeholder={t("admin.header.quickSearch")}
              className="pl-10 w-64 border-brand-text-main/20 focus:border-brand-text-main"
            />
          </div>

          {/* Notifications */}
          <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="relative border-brand-text-main/20 hover:border-brand-text-main hover:bg-brand-text-main/10"
              >
                <Bell className="w-4 h-4" />
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
                >
                  {notifications.length}
                </Badge>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0">
              <SheetHeader className="p-6 border-b">
                <SheetTitle className="text-xl font-bold text-brand-black-strong">
                  {t("admin.header.notifications")}
                </SheetTitle>
              </SheetHeader>
              <div className="p-4 space-y-4 max-h-[calc(100vh-100px)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center text-brand-text-muted py-8">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{t("admin.header.noNotifications")}</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex gap-3 p-4 bg-brand-background-subtle rounded-lg border border-brand-text-main/10 hover:bg-brand-text-main/5 transition-colors"
                    >
                      <div className="flex-shrink-0 w-2 h-2 bg-brand-red-accent rounded-full mt-2"></div>
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-brand-black-strong">
                          {notification.title}
                        </div>
                        {notification.description && (
                          <div className="text-sm text-brand-text-muted">
                            {notification.description}
                          </div>
                        )}
                        <div className="text-xs text-brand-text-muted">
                          {notification.time}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>

          {/* User Avatar */}
          <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-brand-text-main/20">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-text-main to-brand-black-strong rounded-lg flex items-center justify-center text-white font-semibold text-sm">
              {user?.firstName?.charAt(0) || "A"}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-brand-black-strong">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-brand-text-muted">
                {t("admin.header.administrator")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-6 pt-4 border-t border-brand-text-main/20">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-brand-black-strong">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-8 mx-auto rounded"></div>
              ) : (
                stats.newOrdersToday
              )}
            </div>
            <div className="text-xs text-brand-text-muted">
              {t("admin.header.newOrdersToday")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-red-accent">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-16 mx-auto rounded"></div>
              ) : (
                `$${stats.todaysRevenue.toLocaleString()}`
              )}
            </div>
            <div className="text-xs text-brand-text-muted">
              {t("admin.header.todaysRevenue")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-shop_light_blue">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-6 w-12 mx-auto rounded"></div>
              ) : (
                stats.activeUsers.toLocaleString()
              )}
            </div>
            <div className="text-xs text-brand-text-muted">
              {t("admin.header.activeUsers")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-text-main">98.5%</div>
            <div className="text-xs text-brand-text-muted">
              {t("admin.header.systemHealth")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
