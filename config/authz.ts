import { type EmployeeRole } from "@/types/employee";

export type BackofficeStaffRole =
  | "content_admin"
  | "insight_editor"
  | "news_editor"
  | "event_manager"
  | "marketing_admin"
  | "promotions_manager"
  | "deals_manager"
  | "comms_manager"
  | "analyst_readonly";

export type BackofficeAdminRole = "admin";
export type BackofficeRole = BackofficeAdminRole | BackofficeStaffRole | EmployeeRole;

export type BackofficePermission =
  | "content.insights.read"
  | "content.insights.write"
  | "content.insights.publish"
  | "content.news.read"
  | "content.news.write"
  | "content.news.publish"
  | "content.events.read"
  | "content.events.write"
  | "content.events.publish"
  | "content.events.rsvps.manage"
  | "content.catalogs.read"
  | "content.catalogs.write"
  | "content.catalogs.publish"
  | "content.downloads.read"
  | "content.downloads.write"
  | "content.downloads.publish"
  | "marketing.promotions.read"
  | "marketing.promotions.write"
  | "marketing.promotions.publish"
  | "marketing.deals.read"
  | "marketing.deals.write"
  | "marketing.deals.publish"
  | "comms.contacts.read"
  | "comms.contacts.write"
  | "comms.subscriptions.read"
  | "comms.subscriptions.manage"
  | "comms.notifications.read"
  | "comms.notifications.send"
  | "analytics.promotions.read"
  | "analytics.deals.read"
  | "access.staff.manage";

const staffRoleList: BackofficeStaffRole[] = [
  "content_admin",
  "insight_editor",
  "news_editor",
  "event_manager",
  "marketing_admin",
  "promotions_manager",
  "deals_manager",
  "comms_manager",
  "analyst_readonly",
];

export const STAFF_ROLE_PERMISSIONS: Record<BackofficeStaffRole, BackofficePermission[]> = {
  content_admin: [
    "content.insights.read",
    "content.insights.write",
    "content.insights.publish",
    "content.news.read",
    "content.news.write",
    "content.news.publish",
    "content.events.read",
    "content.events.write",
    "content.events.publish",
    "content.events.rsvps.manage",
    "content.catalogs.read",
    "content.catalogs.write",
    "content.catalogs.publish",
    "content.downloads.read",
    "content.downloads.write",
    "content.downloads.publish",
  ],
  insight_editor: ["content.insights.read", "content.insights.write"],
  news_editor: ["content.news.read", "content.news.write"],
  event_manager: [
    "content.events.read",
    "content.events.write",
    "content.events.publish",
    "content.events.rsvps.manage",
  ],
  marketing_admin: [
    "marketing.promotions.read",
    "marketing.promotions.write",
    "marketing.promotions.publish",
    "marketing.deals.read",
    "marketing.deals.write",
    "marketing.deals.publish",
    "analytics.promotions.read",
    "analytics.deals.read",
  ],
  promotions_manager: [
    "marketing.promotions.read",
    "marketing.promotions.write",
    "marketing.promotions.publish",
    "analytics.promotions.read",
  ],
  deals_manager: [
    "marketing.deals.read",
    "marketing.deals.write",
    "marketing.deals.publish",
    "analytics.deals.read",
  ],
  comms_manager: [
    "comms.contacts.read",
    "comms.contacts.write",
    "comms.subscriptions.read",
    "comms.subscriptions.manage",
    "comms.notifications.read",
    "comms.notifications.send",
    "analytics.promotions.read",
    "analytics.deals.read",
  ],
  analyst_readonly: ["analytics.promotions.read", "analytics.deals.read"],
};

export const ALL_BACKOFFICE_PERMISSIONS: BackofficePermission[] = Array.from(
  new Set(Object.values(STAFF_ROLE_PERMISSIONS).flat()),
);

export const isBackofficeStaffRole = (value: unknown): value is BackofficeStaffRole => {
  return typeof value === "string" && staffRoleList.includes(value as BackofficeStaffRole);
};

export const permissionsFromStaffRoles = (
  roles: BackofficeStaffRole[],
): BackofficePermission[] => {
  const set = new Set<BackofficePermission>();
  roles.forEach((role) => {
    (STAFF_ROLE_PERMISSIONS[role] || []).forEach((permission) => set.add(permission));
  });
  return Array.from(set);
};
