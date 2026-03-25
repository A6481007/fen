"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { showToast } from "@/lib/toast";
import {
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Clock,
  Database,
  Gift,
  DollarSign,
  Bell,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface CombinedUser {
  id: string;
  clerkUserId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  imageUrl: string;
  createdAt: number;
  lastSignInAt?: number;
  emailVerified: boolean;
  banned: boolean;
  locked: boolean;
  // Sanity-specific fields
  isActive: boolean;
  activatedAt?: string;
  activatedBy?: string;
  sanityId?: string;
  inSanity: boolean;
  loyaltyPoints: number;
  totalSpent: number;
  notificationCount: number;
}

interface UserDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: CombinedUser | null;
  onActivate: (userId: string, activate: boolean) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  onUserUpdate?: (updatedUser: CombinedUser) => void;
  isLoading: boolean;
}

export const UserDetailsSidebar: React.FC<UserDetailsSidebarProps> = ({
  isOpen,
  onClose,
  user,
  onActivate,
  onDelete,
  onUserUpdate,
  isLoading,
}) => {
  const { t, i18n } = useTranslation();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (!user) return null;

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(i18n.language || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAction = async (action: "activate" | "deactivate" | "delete") => {
    setActionLoading(action);
    try {
      if (action === "delete") {
        await onDelete(user.id);
        onClose();
      } else {
        await onActivate(user.id, action === "activate");

        // For activate action (Add to Sanity), update user instantly and keep sidebar open
        if (action === "activate" && !user.inSanity && onUserUpdate) {
          const updatedUser: CombinedUser = {
            ...user,
            inSanity: true,
            isActive: true,
            activatedAt: new Date().toISOString(),
            loyaltyPoints: 0,
            totalSpent: 0,
            notificationCount: 0,
          };
          onUserUpdate(updatedUser);
          showToast.success(
            t("admin.userDetails.toast.addedTitle"),
            t("admin.userDetails.toast.addedBody", { name: user.fullName })
          );
        } else {
          // For other actions, close the sidebar
          onClose();
        }
      }
    } catch (error) {
      console.error(`Error during ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const getActionButton = () => {
    if (!user.inSanity) {
      return (
        <Button
          onClick={() => handleAction("activate")}
          disabled={actionLoading === "activate" || isLoading}
          className="w-full"
        >
          {actionLoading === "activate" ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UserCheck className="h-4 w-4 mr-2" />
          )}
          {t("admin.userDetails.actions.addToSanity")}
        </Button>
      );
    }

    return (
      <div className="flex gap-2 w-full">
        <Button
          variant={user.isActive ? "destructive" : "default"}
          onClick={() =>
            handleAction(user.isActive ? "deactivate" : "activate")
          }
          disabled={
            actionLoading === (user.isActive ? "deactivate" : "activate") ||
            isLoading
          }
          className="flex-1"
        >
          {actionLoading === (user.isActive ? "deactivate" : "activate") ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : user.isActive ? (
            <UserX className="h-4 w-4 mr-2" />
          ) : (
            <UserCheck className="h-4 w-4 mr-2" />
          )}
          {user.isActive
            ? t("admin.userDetails.actions.deactivate")
            : t("admin.userDetails.actions.activate")}
        </Button>
        <Button
          variant="outline"
          onClick={() => handleAction("delete")}
          disabled={actionLoading === "delete" || isLoading}
        >
          {actionLoading === "delete" ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            t("admin.userDetails.actions.remove")
          )}
        </Button>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[540px] overflow-y-auto p-0"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>{t("admin.userDetails.title")}</SheetTitle>
            <SheetDescription>
              {t("admin.userDetails.subtitle")}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6 pb-6">
              {/* User Profile */}
              <Card
                className={`p-6 transition-opacity duration-200 ${
                  actionLoading === "activate"
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={user.imageUrl}
                      alt={user.fullName}
                      className="w-16 h-16 rounded-full"
                    />
                    {actionLoading === "activate" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{user.fullName}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge
                        variant={user.emailVerified ? "default" : "secondary"}
                      >
                        {user.emailVerified
                          ? t("admin.userDetails.badges.verified")
                          : t("admin.userDetails.badges.unverified")}
                      </Badge>
                      {user.banned && (
                        <Badge variant="destructive">
                          {t("admin.userDetails.badges.banned")}
                        </Badge>
                      )}
                      {user.locked && (
                        <Badge variant="outline">
                          {t("admin.userDetails.badges.locked")}
                        </Badge>
                      )}
                      {actionLoading === "activate" && (
                        <Badge variant="outline" className="animate-pulse">
                          {t("admin.userDetails.badges.adding")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Account Information */}
              <Card className="p-6">
                <h4 className="font-medium mb-4">
                  {t("admin.userDetails.account.title")}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {t("admin.userDetails.account.joined")}
                    </span>
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {t("admin.userDetails.account.lastSignIn")}
                    </span>
                    <span>
                      {user.lastSignInAt
                        ? formatDate(user.lastSignInAt)
                        : t("admin.userDetails.account.never")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Database className="h-4 w-4" />
                      {t("admin.userDetails.account.clerkId")}
                    </span>
                    <span className="font-mono text-xs">
                      {user.clerkUserId.slice(0, 12)}...
                    </span>
                  </div>
                </div>
              </Card>

              {/* Sanity Status */}
              <Card className="p-6">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {t("admin.userDetails.sanity.title")}
                </h4>

                {user.inSanity ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("admin.userDetails.sanity.status")}
                      </span>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive
                          ? t("admin.userDetails.sanity.active")
                          : t("admin.userDetails.sanity.inactive")}
                      </Badge>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                          <Gift className="h-3 w-3" />
                          {t("admin.userDetails.sanity.loyaltyPoints")}
                        </div>
                        <div className="text-lg font-semibold">
                          {user.loyaltyPoints.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          {t("admin.userDetails.sanity.totalSpent")}
                        </div>
                        <div className="text-lg font-semibold">
                          {t("admin.userDetails.sanity.totalSpentValue", {
                            amount: user.totalSpent.toFixed(2),
                          })}
                        </div>
                      </div>
                    </div>

                    {user.notificationCount > 0 && (
                      <>
                        <Separator />
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Bell className="h-4 w-4" />
                            {t("admin.userDetails.sanity.notifications")}
                          </span>
                          <Badge variant="outline">
                            {user.notificationCount}
                          </Badge>
                        </div>
                      </>
                    )}

                    {user.activatedAt && (
                      <>
                        <Separator />
                        <div className="text-xs text-muted-foreground">
                          <div>
                            {t("admin.userDetails.sanity.activated")}{" "}
                            {new Date(user.activatedAt).toLocaleDateString(
                              i18n.language || "en-US"
                            )}
                          </div>
                          {user.activatedBy && (
                            <div>
                              {t("admin.userDetails.sanity.activatedBy", {
                                name: user.activatedBy,
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      {t("admin.userDetails.sanity.emptyMessage")}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {t("admin.userDetails.sanity.enableTitle")}
                    </div>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      <li>{t("admin.userDetails.sanity.enableItem1")}</li>
                      <li>{t("admin.userDetails.sanity.enableItem2")}</li>
                      <li>{t("admin.userDetails.sanity.enableItem3")}</li>
                      <li>{t("admin.userDetails.sanity.enableItem4")}</li>
                    </ul>
                  </div>
                )}
              </Card>
            </div>

            <div className="border-t bg-background/50 px-6 py-6 mt-auto">
              {getActionButton()}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
