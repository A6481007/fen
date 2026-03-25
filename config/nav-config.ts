import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  FileText,
  FileDown,
  PenSquare,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Megaphone,
  Package,
  Shield,
  ShoppingCart,
  Star,
  Tags,
  TrendingUp,
  Users,
  Warehouse as WarehouseIcon,
  Waypoints,
  Newspaper,
  Truck,
  DollarSign,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { BackofficePermission, BackofficeRole } from "@/config/authz";
import {
  ADMIN_STUDIO_ENABLED,
  BANNERS_ENABLED,
  LEGACY_BLOG_ENABLED,
} from "@/lib/featureFlags";

export type NavContext = "admin" | "employee";

export type FeatureFlagKey = "legacyBlog" | "banners" | "adminStudio";
export type FeatureFlagsState = Record<FeatureFlagKey, boolean>;

export const defaultFeatureFlags: FeatureFlagsState = {
  legacyBlog: LEGACY_BLOG_ENABLED,
  banners: BANNERS_ENABLED,
  adminStudio: ADMIN_STUDIO_ENABLED,
};

export type NavRoutes = {
  list: string;
  new?: string;
  detail?: string;
  edit?: string;
};

type ContextualHref = string | Partial<Record<NavContext, string>>;

export type NavItem = {
  label: string;
  icon?: LucideIcon;
  href?: ContextualHref;
  routes?: NavRoutes;
  roles?: BackofficeRole[];
  featureFlag?: FeatureFlagKey;
  contexts?: NavContext[];
  permissions?: BackofficePermission[];
};

export type NavSection = {
  id: string;
  label: string;
  contexts: NavContext[];
  roles?: BackofficeRole[];
  items: NavItem[];
};

export const BACKOFFICE_SITEMAP = {
  dashboard: {
    admin: "/admin",
    employee: "/employee/dashboard",
  },
  content: {
    insights: {
      list: "/employee/content/insights",
      new: "/employee/content/insights/new",
      detail: "/employee/content/insights/[id]",
      edit: "/employee/content/insights/[id]/edit",
    },
    news: {
      list: "/employee/content/news",
      new: "/employee/content/news/new",
      detail: "/employee/content/news/[id]",
      edit: "/employee/content/news/[id]/edit",
    },
    events: {
      list: "/employee/content/events",
      new: "/employee/content/events/new",
      detail: "/employee/content/events/[id]",
      edit: "/employee/content/events/[id]/edit",
    },
    catalogs: {
      list: "/employee/content/catalogs",
      new: "/employee/content/catalogs/new",
      detail: "/employee/content/catalogs/[id]",
      edit: "/employee/content/catalogs/[id]/edit",
    },
    downloads: {
      list: "/employee/content/downloads",
      new: "/employee/content/downloads/new",
      detail: "/employee/content/downloads/[id]",
      edit: "/employee/content/downloads/[id]/edit",
    },
    blogs: {
      list: "/employee/content/blogs",
      new: "/employee/content/blogs/new",
      detail: "/employee/content/blogs/[id]",
      edit: "/employee/content/blogs/[id]/edit",
    },
    posts: {
      list: "/employee/content/posts",
      new: "/employee/content/posts/new",
      detail: "/employee/content/posts/[id]",
      edit: "/employee/content/posts/[id]/edit",
    },
    authors: {
      list: "/employee/content/authors",
      new: "/employee/content/authors/new",
      detail: "/employee/content/authors/[id]",
      edit: "/employee/content/authors/[id]/edit",
    },
  },
  marketing: {
    promotions: {
      list: "/employee/marketing/promotions",
      new: "/employee/marketing/promotions/new",
      detail: "/employee/marketing/promotions/[id]",
      edit: "/employee/marketing/promotions/[id]/edit",
    },
    deals: {
      list: "/employee/marketing/deals",
      new: "/employee/marketing/deals/new",
      detail: "/employee/marketing/deals/[id]",
      edit: "/employee/marketing/deals/[id]/edit",
    },
    banners: {
      list: "/employee/marketing/banners",
      new: "/employee/marketing/banners/new",
      detail: "/employee/marketing/banners/[id]",
      edit: "/employee/marketing/banners/[id]/edit",
    },
  },
  operations: {
    orders: {
      list: "/employee/operations/orders",
      detail: "/employee/operations/orders/[id]",
    },
    quotations: {
      list: "/employee/operations/quotations",
      detail: "/employee/operations/quotations/[id]",
    },
    packing: {
      list: "/employee/operations/packing",
    },
    deliveries: {
      list: "/employee/operations/deliveries",
    },
    warehouse: {
      list: "/employee/operations/warehouse",
    },
    payments: {
      list: "/employee/operations/payments",
    },
    reviews: {
      list: "/employee/operations/reviews",
      detail: "/employee/operations/reviews/[id]",
    },
  },
  communications: {
    contacts: {
      list: "/employee/communications/contacts",
      detail: "/employee/communications/contacts/[id]",
    },
    subscriptions: {
      list: "/employee/communications/subscriptions",
    },
    notifications: {
      list: "/employee/communications/notifications",
      new: "/employee/communications/notifications/new",
    },
  },
  access: {
    users: {
      list: "/employee/access/users",
      detail: "/employee/access/users/[id]",
    },
    accountRequests: {
      list: "/employee/access/account-requests",
      detail: "/employee/access/account-requests/[id]",
    },
    employees: {
      list: "/employee/access/employees",
      new: "/employee/access/employees/new",
      detail: "/employee/access/employees/[id]",
      edit: "/employee/access/employees/[id]",
    },
  },
  analytics: {
    overview: "/admin/analytics",
    promotion: "/admin/promotions",
    operations: "/admin/analytics/operations",
  },
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "admin-dashboard",
    label: "Dashboard",
    contexts: ["admin"],
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: { admin: BACKOFFICE_SITEMAP.dashboard.admin },
        roles: ["admin"],
        permissions: [],
      },
    ],
  },
  {
    id: "admin-analytics",
    label: "Analytics",
    contexts: ["admin"],
    items: [
      {
        label: "Analytics",
        icon: BarChart3,
        href: { admin: BACKOFFICE_SITEMAP.analytics.overview },
        roles: ["admin", "analyst_readonly"],
        permissions: ["analytics.promotions.read", "analytics.deals.read"],
      },
      {
        label: "Promotion Analytics",
        icon: TrendingUp,
        href: { admin: BACKOFFICE_SITEMAP.analytics.promotion },
        roles: ["admin", "analyst_readonly", "promotions_manager"],
        permissions: ["analytics.promotions.read"],
      },
    ],
  },
  {
    id: "admin-content",
    label: "Content",
    contexts: ["admin"],
    items: [
      {
        label: "Insights",
        icon: BookOpen,
        href: { admin: "/admin/content/insights" },
        routes: {
          list: "/admin/content/insights",
          new: "/admin/content/insights/new",
        },
        roles: ["admin", "content_admin", "insight_editor"],
        permissions: ["content.insights.read"],
      },
      {
        label: "News",
        icon: Newspaper,
        href: { admin: "/admin/content/news" },
        routes: {
          list: "/admin/content/news",
          new: "/admin/content/news/new",
        },
        roles: ["admin", "content_admin", "news_editor"],
        permissions: ["content.news.read"],
      },
      {
        label: "Events",
        icon: CalendarDays,
        href: { admin: "/admin/content/events" },
        routes: {
          list: "/admin/content/events",
          new: "/admin/content/events/new",
        },
        roles: ["admin", "content_admin", "news_editor", "event_manager"],
        permissions: ["content.events.read"],
      },
      {
        label: "Catalogs",
        icon: FileText,
        href: { admin: "/admin/content/catalogs" },
        routes: {
          list: "/admin/content/catalogs",
          new: "/admin/content/catalogs/new",
        },
        roles: ["admin", "content_admin"],
        permissions: ["content.catalogs.read"],
      },
      {
        label: "Downloads",
        icon: FileDown,
        href: { admin: "/admin/content/downloads" },
        routes: {
          list: "/admin/content/downloads",
          new: "/admin/content/downloads/new",
        },
        roles: ["admin", "content_admin"],
        permissions: ["content.downloads.read"],
      },
      {
        label: "Studio",
        icon: PenSquare,
        href: { admin: "/admin/content/studio" },
        roles: ["admin"],
        featureFlag: "adminStudio",
      },
    ],
  },
  {
    id: "admin-marketing",
    label: "Marketing",
    contexts: ["admin"],
    items: [
      {
        label: "Promotions",
        icon: Megaphone,
        href: { admin: "/admin/marketing/promotions" },
        routes: {
          list: "/admin/marketing/promotions",
          new: "/admin/marketing/promotions/new",
        },
        roles: ["admin", "promotions_manager", "marketing_admin"],
        permissions: ["marketing.promotions.read"],
      },
      {
        label: "Deals",
        icon: Package,
        href: { admin: "/admin/marketing/deals" },
        routes: {
          list: "/admin/marketing/deals",
          new: "/admin/marketing/deals/new",
        },
        roles: ["admin", "promotions_manager", "marketing_admin"],
        permissions: ["marketing.deals.read"],
      },
      {
        label: "Banners",
        icon: LayoutDashboard,
        href: { admin: "/admin/marketing/banners" },
        routes: {
          list: "/admin/marketing/banners",
          new: "/admin/marketing/banners/new",
        },
        roles: ["admin", "promotions_manager", "marketing_admin"],
        permissions: ["marketing.promotions.read"],
        featureFlag: "banners",
      },
    ],
  },
  {
    id: "admin-operations",
    label: "Operations",
    contexts: ["admin"],
    items: [
      {
        label: "Products",
        icon: Package,
        href: { admin: "/admin/products" },
        roles: ["admin"],
      },
      {
        label: "Orders",
        icon: ShoppingCart,
        href: { admin: "/admin/orders" },
        roles: ["admin"],
      },
      {
        label: "Reviews",
        icon: Star,
        href: { admin: "/admin/reviews" },
        roles: ["admin"],
      },
    ],
  },
  {
    id: "admin-access",
    label: "Access / Accounts",
    contexts: ["admin"],
    items: [
      {
        label: "Users",
        icon: Users,
        href: { admin: "/admin/users" },
        roles: ["admin"],
        permissions: ["access.staff.manage"],
      },
      {
        label: "Account Requests",
        icon: Shield,
        href: { admin: "/admin/account-requests" },
        roles: ["admin"],
        permissions: ["access.staff.manage"],
      },
      {
        label: "Employees",
        icon: Waypoints,
        href: { admin: "/admin/employees" },
        roles: ["admin"],
        permissions: ["access.staff.manage"],
      },
    ],
  },
  {
    id: "admin-communications",
    label: "Communications",
    contexts: ["admin"],
    items: [
      {
        label: "Contact Inbox",
        icon: MessageSquare,
        href: { admin: "/admin/comms/contacts" },
        roles: ["admin"],
        permissions: ["comms.contacts.read", "comms.contacts.write"],
      },
      {
        label: "Subscriptions",
        icon: Mail,
        href: { admin: "/admin/subscriptions" },
        roles: ["admin"],
        permissions: ["comms.subscriptions.read", "comms.subscriptions.manage"],
      },
      {
        label: "Notifications",
        icon: Bell,
        href: { admin: "/admin/notifications" },
        roles: ["admin"],
        permissions: ["comms.notifications.read", "comms.notifications.send"],
      },
    ],
  },
  {
    id: "employee-dashboard",
    label: "Dashboard",
    contexts: ["employee"],
    items: [
      {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: { employee: BACKOFFICE_SITEMAP.dashboard.employee },
        roles: [
          "callcenter",
          "packer",
          "deliveryman",
          "warehouse",
          "accounts",
          "incharge",
          "content_admin",
          "news_editor",
          "promotions_manager",
          "analyst_readonly",
        ],
      },
    ],
  },
  {
    id: "employee-content",
    label: "Content",
    contexts: ["employee"],
    roles: ["admin", "content_admin", "news_editor"],
    items: [
      {
        label: "Insights",
        icon: BookOpen,
        routes: BACKOFFICE_SITEMAP.content.insights,
        roles: ["admin", "content_admin"],
      },
      {
        label: "News",
        icon: Newspaper,
        routes: BACKOFFICE_SITEMAP.content.news,
        roles: ["admin", "content_admin", "news_editor"],
      },
      {
        label: "Events",
        icon: CalendarDays,
        routes: BACKOFFICE_SITEMAP.content.events,
        roles: ["admin", "content_admin", "news_editor", "event_manager"],
      },
      {
        label: "Catalogs",
        icon: FileText,
        routes: BACKOFFICE_SITEMAP.content.catalogs,
        roles: ["admin", "content_admin"],
      },
      {
        label: "Downloads",
        icon: FileDown,
        routes: BACKOFFICE_SITEMAP.content.downloads,
        roles: ["admin", "content_admin"],
      },
      {
        label: "Blog",
        icon: Tags,
        routes: BACKOFFICE_SITEMAP.content.blogs,
        roles: ["admin", "content_admin"],
        featureFlag: "legacyBlog",
      },
      {
        label: "Posts",
        icon: FileText,
        routes: BACKOFFICE_SITEMAP.content.posts,
        roles: ["admin", "content_admin"],
        featureFlag: "legacyBlog",
      },
      {
        label: "Authors",
        icon: Users,
        routes: BACKOFFICE_SITEMAP.content.authors,
        roles: ["admin", "content_admin"],
        featureFlag: "legacyBlog",
      },
    ],
  },
  {
    id: "employee-marketing",
    label: "Marketing",
    contexts: ["employee"],
    roles: ["admin", "promotions_manager", "analyst_readonly"],
    items: [
      {
        label: "Promotions",
        icon: Megaphone,
        routes: BACKOFFICE_SITEMAP.marketing.promotions,
        roles: ["admin", "promotions_manager"],
      },
      {
        label: "Deals",
        icon: Package,
        routes: BACKOFFICE_SITEMAP.marketing.deals,
        roles: ["admin", "promotions_manager"],
      },
      {
        label: "Banners",
        icon: LayoutDashboard,
        routes: BACKOFFICE_SITEMAP.marketing.banners,
        roles: ["admin", "promotions_manager"],
        featureFlag: "banners",
      },
    ],
  },
  {
    id: "employee-operations",
    label: "Operations",
    contexts: ["employee"],
    roles: ["admin", "callcenter", "packer", "deliveryman", "warehouse", "accounts", "incharge"],
    items: [
      {
        label: "Orders",
        icon: ShoppingCart,
        routes: BACKOFFICE_SITEMAP.operations.orders,
        roles: ["admin", "callcenter", "incharge"],
      },
      {
        label: "Quotations",
        icon: FileText,
        routes: BACKOFFICE_SITEMAP.operations.quotations,
        roles: ["admin", "callcenter", "incharge"],
      },
      {
        label: "Packing",
        icon: Package,
        routes: BACKOFFICE_SITEMAP.operations.packing,
        roles: ["admin", "packer", "incharge"],
      },
      {
        label: "Deliveries",
        icon: Truck,
        routes: BACKOFFICE_SITEMAP.operations.deliveries,
        roles: ["admin", "deliveryman", "warehouse", "incharge"],
      },
      {
        label: "Warehouse",
        icon: WarehouseIcon,
        routes: BACKOFFICE_SITEMAP.operations.warehouse,
        roles: ["admin", "warehouse", "incharge"],
      },
      {
        label: "Payments",
        icon: DollarSign,
        routes: BACKOFFICE_SITEMAP.operations.payments,
        roles: ["admin", "accounts", "incharge"],
      },
      {
        label: "Reviews",
        icon: Star,
        routes: BACKOFFICE_SITEMAP.operations.reviews,
        roles: ["admin", "callcenter", "incharge"],
      },
    ],
  },
  {
    id: "employee-communications",
    label: "Communications",
    contexts: ["employee"],
    roles: ["admin", "content_admin", "news_editor", "promotions_manager", "callcenter", "incharge"],
    items: [
      {
        label: "Contact Messages",
        icon: Mail,
        routes: BACKOFFICE_SITEMAP.communications.contacts,
        roles: ["admin", "callcenter", "incharge", "content_admin"],
      },
      {
        label: "Subscriptions",
        icon: Users,
        routes: BACKOFFICE_SITEMAP.communications.subscriptions,
        roles: ["admin", "content_admin", "promotions_manager"],
      },
      {
        label: "Notifications",
        icon: Bell,
        routes: BACKOFFICE_SITEMAP.communications.notifications,
        roles: ["admin", "promotions_manager", "content_admin"],
      },
    ],
  },
  {
    id: "employee-analytics",
    label: "Analytics",
    contexts: ["employee"],
    roles: ["admin", "analyst_readonly", "promotions_manager", "content_admin", "news_editor", "incharge"],
    items: [
      {
        label: "Analytics Dashboard",
        icon: BarChart3,
        href: { employee: BACKOFFICE_SITEMAP.analytics.overview },
      },
      {
        label: "Promotion Analytics",
        icon: TrendingUp,
        href: { employee: BACKOFFICE_SITEMAP.analytics.promotion },
        roles: ["admin", "analyst_readonly", "promotions_manager"],
      },
      {
        label: "Operations Analytics",
        icon: BarChart3,
        href: { employee: BACKOFFICE_SITEMAP.analytics.operations },
        roles: ["admin", "analyst_readonly", "incharge"],
      },
    ],
  },
];

const isRoleAllowed = (
  itemRoles: BackofficeRole[] | undefined,
  roles: BackofficeRole[]
): boolean => {
  if (!itemRoles || itemRoles.length === 0) return true;
  return itemRoles.some((role) => roles.includes(role));
};

const isFeatureEnabled = (
  featureFlag: FeatureFlagKey | undefined,
  flags: FeatureFlagsState
): boolean => {
  if (!featureFlag) return true;
  return flags[featureFlag];
};

const getContextsForItem = (item: NavItem, section: NavSection): NavContext[] => {
  return item.contexts ?? section.contexts;
};

const hasRequiredPermissions = (
  required: BackofficePermission[] | undefined,
  permissions: BackofficePermission[]
): boolean => {
  if (!required || required.length === 0) return true;
  return permissions.some((permission) => required.includes(permission));
};

export const filterNavSections = (
  roles: BackofficeRole[],
  context: NavContext,
  flags: FeatureFlagsState = defaultFeatureFlags,
  permissions: BackofficePermission[] = []
): NavSection[] => {
  const normalizedRoles = roles ?? [];
  const normalizedPermissions = permissions ?? [];

  return NAV_SECTIONS
    .filter((section) => section.contexts.includes(context))
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!getContextsForItem(item, section).includes(context)) return false;
        if (!isFeatureEnabled(item.featureFlag, flags)) return false;

        const hasAdminOverride = normalizedRoles.includes("admin");
        const requiresPermissions = Array.isArray(item.permissions) && item.permissions.length > 0;

        if (requiresPermissions) {
          const hasPermissionAccess =
            hasAdminOverride ||
            hasRequiredPermissions(item.permissions, normalizedPermissions);

          if (!hasPermissionAccess) return false;

          return true;
        }

        if (!isRoleAllowed(item.roles ?? section.roles, normalizedRoles) && !hasAdminOverride)
          return false;

        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
};

export const resolveNavHref = (
  item: NavItem,
  context: NavContext
): string => {
  const resolvedHref =
    typeof item.href === "string"
      ? item.href
      : item.href?.[context]
        ? (item.href[context] as string)
        : item.routes?.list
          ? item.routes.list
          : item.routes?.detail
            ? item.routes.detail
            : item.routes?.edit
              ? item.routes.edit
              : "#";

  if (resolvedHref.includes("[") && resolvedHref.includes("]")) {
    return "#";
  }

  return resolvedHref;
};
