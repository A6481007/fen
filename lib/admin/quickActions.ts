import { BarChart3, BookOpen, CalendarDays, FileDown, FileText, Mail, Megaphone, MessageSquare, Package, Shield, ShoppingCart, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BackofficePermission, BackofficeRole } from "@/config/authz";
import { defaultFeatureFlags, type FeatureFlagKey, type FeatureFlagsState } from "@/config/nav-config";

export type QuickAction = {
  title: string;
  href: string;
  icon: LucideIcon;
};

type QuickActionDefinition = QuickAction & {
  roles?: BackofficeRole[];
  permissions?: BackofficePermission[];
  featureFlag?: FeatureFlagKey;
};

type QuickActionsOptions = {
  isAdmin?: boolean;
  staffRoles?: BackofficeRole[];
  permissions?: BackofficePermission[];
  featureFlags?: FeatureFlagsState;
  limit?: number;
};

const QUICK_ACTIONS: QuickActionDefinition[] = [
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    roles: ["admin", "analyst_readonly", "promotions_manager", "marketing_admin"],
    permissions: ["analytics.promotions.read", "analytics.deals.read"],
  },
  {
    title: "Account Requests",
    href: "/admin/account-requests",
    icon: Shield,
    roles: ["admin"],
    permissions: ["access.staff.manage"],
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    roles: ["admin"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["admin"],
    permissions: ["access.staff.manage"],
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
    roles: ["admin"],
  },
  {
    title: "Promotions",
    href: "/admin/marketing/promotions",
    icon: Megaphone,
    roles: ["admin", "promotions_manager", "marketing_admin"],
    permissions: ["marketing.promotions.read"],
  },
  {
    title: "Deals",
    href: "/admin/marketing/deals",
    icon: Package,
    roles: ["admin", "promotions_manager", "marketing_admin"],
    permissions: ["marketing.deals.read"],
  },
  {
    title: "Insights",
    href: "/admin/content/insights",
    icon: BookOpen,
    roles: ["admin", "content_admin", "insight_editor"],
    permissions: ["content.insights.read"],
  },
  {
    title: "News",
    href: "/admin/content/news",
    icon: FileText,
    roles: ["admin", "content_admin", "news_editor"],
    permissions: ["content.news.read"],
  },
  {
    title: "Events",
    href: "/admin/content/events",
    icon: CalendarDays,
    roles: ["admin", "content_admin", "news_editor", "event_manager"],
    permissions: ["content.events.read"],
  },
  {
    title: "Catalogs",
    href: "/admin/content/catalogs",
    icon: FileText,
    roles: ["admin", "content_admin"],
    permissions: ["content.catalogs.read"],
  },
  {
    title: "Downloads",
    href: "/admin/content/downloads",
    icon: FileDown,
    roles: ["admin", "content_admin"],
    permissions: ["content.downloads.read"],
  },
  {
    title: "Reviews",
    href: "/admin/reviews",
    icon: Star,
    roles: ["admin"],
  },
  {
    title: "Contact Inbox",
    href: "/admin/comms/contacts",
    icon: MessageSquare,
    roles: ["admin", "comms_manager"],
    permissions: ["comms.contacts.read", "comms.contacts.write"],
  },
  {
    title: "Subscriptions",
    href: "/admin/subscriptions",
    icon: Mail,
    roles: ["admin", "comms_manager"],
    permissions: ["comms.subscriptions.read", "comms.subscriptions.manage"],
  },
];

const hasRequiredPermissions = (
  required: BackofficePermission[] | undefined,
  permissions: BackofficePermission[]
): boolean => {
  if (!required || required.length === 0) return true;
  return permissions.some((permission) => required.includes(permission));
};

const hasRequiredRoles = (
  required: BackofficeRole[] | undefined,
  roles: BackofficeRole[]
): boolean => {
  if (!required || required.length === 0) return true;
  return required.some((role) => roles.includes(role));
};

export const getAdminQuickActions = ({
  isAdmin = false,
  staffRoles = [],
  permissions = [],
  featureFlags = defaultFeatureFlags,
  limit = 12,
}: QuickActionsOptions): QuickAction[] => {
  const roles: BackofficeRole[] = [
    ...(isAdmin ? (["admin"] as BackofficeRole[]) : []),
    ...staffRoles,
  ];

  const allowed = QUICK_ACTIONS.filter((action) => {
    if (action.featureFlag && !featureFlags[action.featureFlag]) {
      return false;
    }

    if (isAdmin) return true;

    if (action.permissions && action.permissions.length > 0) {
      return hasRequiredPermissions(action.permissions, permissions);
    }

    return hasRequiredRoles(action.roles, roles);
  });

  return allowed.slice(0, Math.max(0, limit));
};
