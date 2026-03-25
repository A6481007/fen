"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Shield, TrendingUp } from "lucide-react";
import { defaultFeatureFlags, filterNavSections, resolveNavHref } from "@/config/nav-config";
import { type BackofficePermission, type BackofficeRole } from "@/config/authz";

interface AdminSidebarProps {
  currentPath: string;
  roles?: BackofficeRole[];
  permissions?: BackofficePermission[];
}

const AdminSidebar = ({ currentPath, roles, permissions }: AdminSidebarProps) => {
  const resolvedRoles: BackofficeRole[] = roles ?? ["admin"];
  const resolvedPermissions: BackofficePermission[] = permissions ?? [];
  const sections = filterNavSections(
    resolvedRoles,
    "admin",
    defaultFeatureFlags,
    resolvedPermissions
  );
  const adminRoutes = sections.flatMap((section) => section.items);

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-brand-text-main/10 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-brand-text-main/20">
        <div className="p-2 bg-gradient-to-br from-brand-text-main to-brand-black-strong rounded-xl">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-brand-black-strong">Admin Panel</h2>
          <p className="text-sm text-brand-text-muted">Management Center</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {adminRoutes.map((route) => {
          const href = resolveNavHref(route, "admin");
          const isActive = currentPath.startsWith(href);
          const Icon = route.icon ?? Shield;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-gradient-to-r from-brand-text-main to-brand-black-strong text-white shadow-lg"
                  : "hover:bg-brand-background-subtle hover:shadow-md text-brand-black-strong"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isActive ? "text-white" : "text-brand-text-main"
                )}
              />
              <div className="flex-1">
                <div
                  className={cn(
                    "font-semibold text-sm",
                    isActive ? "text-white" : "text-brand-black-strong"
                  )}
                >
                  {route.label}
                </div>
                <div
                  className={cn(
                    "text-xs",
                    isActive ? "text-white/80" : "text-brand-text-muted"
                  )}
                />
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-brand-text-main/20">
        <div className="flex items-center gap-2 text-xs text-brand-text-muted">
          <TrendingUp className="w-4 h-4" />
          <span>Admin Dashboard v2.0</span>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;
