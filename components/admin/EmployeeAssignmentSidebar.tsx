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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  RefreshCw,
  UserCheck,
  Phone,
  Package,
  Truck,
  ShieldCheck,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import {
  EmployeeRole,
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/types/employee";
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
  // Employee fields
  isEmployee?: boolean;
  employeeRole?: string;
  employeeStatus?: string;
}

interface EmployeeAssignmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: CombinedUser | null;
  onAssignRole: (sanityId: string, role: EmployeeRole) => Promise<void>;
  onRemoveRole: (sanityId: string, userName: string) => Promise<void>;
  isLoading: boolean;
}

const ROLE_ICONS = {
  callcenter: Phone,
  packer: Package,
  warehouse: Truck,
  deliveryman: Truck,
  incharge: ShieldCheck,
  accounts: Calculator,
};

export const EmployeeAssignmentSidebar: React.FC<
  EmployeeAssignmentSidebarProps
> = ({ isOpen, onClose, user, onAssignRole, onRemoveRole, isLoading }) => {
  const { t } = useTranslation();
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>("callcenter");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmRemove, setShowConfirmRemove] = useState(false);
  const rolePermissions: Record<EmployeeRole, string[]> = {
    callcenter: [
      t("admin.employeeAssignment.permissions.callcenter.reviewQuotations"),
      t("admin.employeeAssignment.permissions.callcenter.confirmAddress"),
      t("admin.employeeAssignment.permissions.callcenter.confirmOrders"),
      t("admin.employeeAssignment.permissions.callcenter.viewOrders"),
    ],
    packer: [
      t("admin.employeeAssignment.permissions.packer.viewConfirmed"),
      t("admin.employeeAssignment.permissions.packer.markPacked"),
    ],
    warehouse: [
      t("admin.employeeAssignment.permissions.warehouse.viewPacked"),
      t("admin.employeeAssignment.permissions.warehouse.assignDeliverymen"),
      t("admin.employeeAssignment.permissions.warehouse.manage"),
    ],
    deliveryman: [
      t("admin.employeeAssignment.permissions.deliveryman.viewAssigned"),
      t("admin.employeeAssignment.permissions.deliveryman.markDelivered"),
      t("admin.employeeAssignment.permissions.deliveryman.collectCash"),
    ],
    incharge: [
      t("admin.employeeAssignment.permissions.incharge.monitorOrders"),
      t("admin.employeeAssignment.permissions.incharge.assignDeliverymen"),
      t("admin.employeeAssignment.permissions.incharge.viewAnalytics"),
    ],
    accounts: [
      t("admin.employeeAssignment.permissions.accounts.receivePayments"),
      t("admin.employeeAssignment.permissions.accounts.viewAnalytics"),
      t("admin.employeeAssignment.permissions.accounts.monitorOrders"),
    ],
  };

  // Initialize selected role when user changes or sidebar opens
  React.useEffect(() => {
    if (user?.isEmployee && user.employeeRole) {
      setSelectedRole(user.employeeRole as EmployeeRole);
    } else {
      setSelectedRole("callcenter");
    }
    // Reset confirmation dialog when user changes
    setShowConfirmRemove(false);
  }, [user]);

  if (!user) return null;

  const handleAssignRole = async () => {
    if (!user.sanityId) {
      return;
    }

    setActionLoading("assign");
    try {
      await onAssignRole(user.sanityId, selectedRole);
    } catch (error) {
      console.error("Error assigning role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async () => {
    if (!user.sanityId) {
      return;
    }

    setActionLoading("update");
    try {
      await onAssignRole(user.sanityId, selectedRole);
    } catch (error) {
      console.error("Error updating role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveRole = async () => {
    if (!user.sanityId) {
      return;
    }

    setActionLoading("remove");
    setShowConfirmRemove(false);
    try {
      await onRemoveRole(user.sanityId, user.fullName);
      // onClose is now called from parent after data refresh
    } catch (error) {
      console.error("Error removing role:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRemove = () => {
    setShowConfirmRemove(false);
  };

  const RoleIcon = ROLE_ICONS[selectedRole];
  const hasRoleChanged = user.isEmployee && user.employeeRole !== selectedRole;
  const isAnyActionLoading = actionLoading !== null || isLoading;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isAnyActionLoading) {
          onClose();
        }
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            {t("admin.employeeAssignment.title")}
          </SheetTitle>
          <SheetDescription>
            {t("admin.employeeAssignment.subtitle", { name: user.fullName })}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 p-4">
          {/* User Info Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <img
                src={user.imageUrl}
                alt={user.fullName}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{user.fullName}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t("admin.employeeAssignment.statusLabel")}
                </span>
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive
                    ? t("admin.employeeAssignment.status.active")
                    : t("admin.employeeAssignment.status.inactive")}
                </Badge>
              </div>

              {user.isEmployee && user.employeeRole && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {t("admin.employeeAssignment.currentRoleLabel")}
                  </span>
                  <Badge variant="secondary">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {getRoleDisplayName(user.employeeRole as EmployeeRole)}
                  </Badge>
                </div>
              )}
            </div>
          </Card>

          {/* Role Selection - Show for both new and existing employees */}
          <div className="space-y-3">
            <Label htmlFor="role-select" className="text-base font-semibold">
              {user.isEmployee
                ? t("admin.employeeAssignment.updateRoleTitle")
                : t("admin.employeeAssignment.selectRoleTitle")}
            </Label>

            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as EmployeeRole)}
            >
              <SelectTrigger id="role-select" className="w-full">
                <SelectValue
                  placeholder={t("admin.employeeAssignment.selectRolePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "callcenter",
                    "packer",
                    "warehouse",
                    "deliveryman",
                    "incharge",
                    "accounts",
                  ] as EmployeeRole[]
                ).map((role) => {
                  const Icon = ROLE_ICONS[role];
                  return (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{getRoleDisplayName(role)}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Role Permissions */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-3">
              <RoleIcon className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">
                {t("admin.employeeAssignment.permissionsTitle", {
                  role: getRoleDisplayName(selectedRole),
                })}
              </h4>
            </div>
            <ul className="space-y-2">
              {rolePermissions[selectedRole].map((permission, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{permission}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            {!user.sanityId ? (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {t("admin.employeeAssignment.sanityRequired")}
                </p>
              </div>
            ) : (
              <>
                {user.isEmployee ? (
                  <>
                    {showConfirmRemove ? (
                      <>
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                          <p className="text-sm font-medium text-destructive mb-2">
                            {t("admin.employeeAssignment.confirmRemovalTitle")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("admin.employeeAssignment.confirmRemovalBody", {
                              name: user.fullName,
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleCancelRemove}
                            disabled={isAnyActionLoading}
                            className="flex-1"
                          >
                            {t("admin.employeeAssignment.cancel")}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleRemoveRole}
                            disabled={isAnyActionLoading}
                            className="flex-1"
                          >
                            {actionLoading === "remove" ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Briefcase className="h-4 w-4 mr-2" />
                            )}
                            {t("admin.employeeAssignment.remove")}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {hasRoleChanged && (
                          <Button
                            onClick={handleUpdateRole}
                            disabled={isAnyActionLoading}
                            className="w-full"
                          >
                            {actionLoading === "update" || isLoading ? (
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <UserCheck className="h-4 w-4 mr-2" />
                            )}
                            {actionLoading === "update" || isLoading
                              ? t("admin.employeeAssignment.updating")
                              : t("admin.employeeAssignment.updateRoleAction", {
                                  role: getRoleDisplayName(selectedRole),
                                })}
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => setShowConfirmRemove(true)}
                          disabled={isAnyActionLoading}
                          className="w-full"
                        >
                          <Briefcase className="h-4 w-4 mr-2" />
                          {t("admin.employeeAssignment.removeRoleAction")}
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={handleAssignRole}
                    disabled={isAnyActionLoading}
                    className="w-full"
                  >
                    {actionLoading === "assign" || isLoading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    {actionLoading === "assign" || isLoading
                      ? t("admin.employeeAssignment.assigning")
                      : t("admin.employeeAssignment.assignRoleAction", {
                          role: getRoleDisplayName(selectedRole),
                        })}
                  </Button>
                )}
              </>
            )}

            {!showConfirmRemove && (
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isAnyActionLoading}
                className="w-full"
              >
                {t("admin.employeeAssignment.cancel")}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
