"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  Database,
  Briefcase,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UsersSkeleton } from "./SkeletonLoaders";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { UserActionModal } from "./UserActionModal";
import { UserDetailsSidebar } from "./UserDetailsSidebar";
import { EmployeeAssignmentSidebar } from "./EmployeeAssignmentSidebar";
import { safeApiCall, handleApiError } from "./apiHelpers";
import {
  assignEmployeeRole,
  removeEmployeeRole,
} from "@/actions/employeeActions";
import {
  EmployeeRole,
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/types/employee";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const AdminUsers: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<CombinedUser[]>([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [sanityUsersCount, setSanityUsersCount] = useState(0);
  const [activeUsersCount, setActiveUsersCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activatingUsers, setActivatingUsers] = useState<Set<string>>(
    new Set()
  );
  const [tableLoading, setTableLoading] = useState(false);

  // Modal state
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    user: CombinedUser | null;
    action: "activate" | "deactivate" | "delete" | null;
  }>({
    isOpen: false,
    user: null,
    action: null,
  });

  // Sidebar state
  const [sidebarState, setSidebarState] = useState<{
    isOpen: boolean;
    user: CombinedUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Employee assignment sidebar state
  const [employeeSidebarState, setEmployeeSidebarState] = useState<{
    isOpen: boolean;
    user: CombinedUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  const perPageOptions = [20, 30, 40, 50, 100];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when search changes or per page changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) {
      setCurrentPage(0);
    }
  }, [debouncedSearchTerm, searchTerm]);

  useEffect(() => {
    setCurrentPage(0);
  }, [perPage]);

  // Utility functions
  const formatDate = (timestamp: number): string => {
    const locale = i18n.language === "th" ? "th-TH" : "en-US";
    return new Date(timestamp).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Modal handlers
  const openActionModal = (
    user: CombinedUser,
    action: "activate" | "deactivate" | "delete"
  ) => {
    setActionModal({
      isOpen: true,
      user,
      action,
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      user: null,
      action: null,
    });
  };

  // Sidebar handlers
  const openSidebar = (user: CombinedUser) => {
    setSidebarState({
      isOpen: true,
      user,
    });
  };

  const closeSidebar = () => {
    setSidebarState({
      isOpen: false,
      user: null,
    });
  };

  // User activation functions
  const handleUserActivation = async (userId: string, activate: boolean) => {
    setActivatingUsers((prev) => new Set(prev).add(userId));

    try {
      const action = activate ? "activate" : "deactivate";
      await safeApiCall(`/api/admin/users/${userId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      // Immediately fetch fresh data
      await fetchUsers(currentPage, true);
    } catch (error) {
      handleApiError(error, `User ${activate ? "activation" : "deactivation"}`);
    } finally {
      setActivatingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Handle user update for instant feedback
  const handleUserUpdate = (updatedUser: CombinedUser) => {
    // Update the user in the users list
    setUsers((prevUsers) =>
      prevUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user))
    );

    // Update the sidebar state with the new user data
    setSidebarState((prev) => ({
      ...prev,
      user: updatedUser,
    }));

    // Update counts
    setSanityUsersCount((prev) => prev + 1);
    setActiveUsersCount((prev) => prev + 1);
  };

  // User deletion from Sanity
  const handleUserDeletion = async (userId: string) => {
    setActivatingUsers((prev) => new Set(prev).add(userId));

    try {
      await safeApiCall(`/api/admin/users/${userId}/delete-sanity`, {
        method: "DELETE",
      });

      // Immediately fetch fresh data
      await fetchUsers(currentPage, true);
    } catch (error) {
      handleApiError(error, "User deletion from Sanity");
    } finally {
      setActivatingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Confirm action handler
  const handleConfirmAction = async () => {
    if (!actionModal.user || !actionModal.action) return;

    const { user, action } = actionModal;
    closeActionModal();

    switch (action) {
      case "activate":
        await handleUserActivation(user.id, true);
        break;
      case "deactivate":
        await handleUserActivation(user.id, false);
        break;
      case "delete":
        await handleUserDeletion(user.id);
        break;
    }
  };

  // Open employee assignment dialog
  const openEmployeeDialog = (user: CombinedUser) => {
    setEmployeeSidebarState({
      isOpen: true,
      user,
    });
  };

  // Close employee assignment dialog
  const closeEmployeeDialog = () => {
    setEmployeeSidebarState({
      isOpen: false,
      user: null,
    });
  };

  // Handle employee role assignment
  const handleAssignEmployee = async (sanityId: string, role: EmployeeRole) => {
    try {
      const result = await assignEmployeeRole(sanityId, role);

      if (result.success) {
        toast.success(result.message);
        // Immediately fetch fresh data
        await fetchUsers(currentPage, true);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error assigning employee role:", error);
      toast.error(t("admin.users.errors.assignEmployeeFailed"));
    }
  };

  // Handle employee role removal
  const handleRemoveEmployee = async (sanityId: string, userName: string) => {
    try {
      const result = await removeEmployeeRole(sanityId);

      if (result.success) {
        toast.success(result.message);
        // Immediately fetch fresh data and close sidebar
        await fetchUsers(currentPage, true);
        closeEmployeeDialog();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Error removing employee role:", error);
      toast.error(t("admin.users.errors.removeEmployeeFailed"));
    }
  };

  // Fetch users
  const fetchUsers = useCallback(
    async (page = 0, forceFresh = false) => {
      setTableLoading(true);
      try {
        // Add cache-busting parameter for fresh data
        const cacheBuster = forceFresh ? `&_t=${Date.now()}` : "";
        const data = await safeApiCall(
          `/api/admin/users/combined?limit=${perPage}&offset=${
            page * perPage
          }&query=${debouncedSearchTerm}${cacheBuster}`
        );
        setUsers(data.users);
        setTotalUsersCount(data.totalCount);
        setSanityUsersCount(data.sanityUsersCount || 0);
        setActiveUsersCount(data.activeUsersCount || 0);
      } catch (error) {
        handleApiError(error, "Users fetch");
      } finally {
        setTableLoading(false);
      }
    },
    [debouncedSearchTerm, perPage]
  );

  // Selection functions
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((user) => user.id));
    }
  };

  // Delete functions
  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUsers = async () => {
    setIsDeleting(true);
    try {
      await safeApiCall("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUsers }),
      });

      fetchUsers(currentPage);
      setSelectedUsers([]);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      handleApiError(error, "Users delete");
    } finally {
      setIsDeleting(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchUsers(currentPage);
  }, [fetchUsers, currentPage]);

  return (
    <>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <h3 className="text-lg font-semibold">
              {t("admin.users.title")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap">
                {t("admin.users.total", { count: totalUsersCount })}
              </div>
              <div className="px-2 py-1 bg-success-highlight text-success-base text-xs sm:text-sm rounded-full font-medium whitespace-nowrap">
                <Database className="h-3 w-3 inline mr-1" />
                {t("admin.users.sanityCount", { count: sanityUsersCount })}
              </div>
              <div className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs sm:text-sm rounded-full font-medium whitespace-nowrap">
                <UserCheck className="h-3 w-3 inline mr-1" />
                {t("admin.users.activeCount", { count: activeUsersCount })}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t("admin.users.show")}
              </span>
              <Select
                value={perPage.toString()}
                onValueChange={(value) => setPerPage(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {perPageOptions.map((option) => (
                    <SelectItem key={option} value={option.toString()}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("admin.users.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
              <Button
                onClick={() => fetchUsers(currentPage)}
                size="sm"
                className="shrink-0"
                disabled={tableLoading}
              >
                <RefreshCw
                  className={cn("h-4 w-4", tableLoading && "animate-spin")}
                />
              </Button>
            </div>
          </div>
        </div>

        {(loading && users.length === 0) || tableLoading ? (
          <UsersSkeleton />
        ) : (
          <>
            {selectedUsers.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 bg-blue-50 p-3 rounded-lg border">
                <span className="text-sm font-medium text-center sm:text-left">
                  {t("admin.users.selectedCount", {
                    count: selectedUsers.length,
                  })}
                </span>
                <Button
                  onClick={openDeleteDialog}
                  variant="destructive"
                  size="sm"
                  className="gap-2 w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("admin.users.deleteSelected")}
                </Button>
              </div>
            )}

            <Card className="relative">
              {tableLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              )}
              <div className="hidden md:block responsive-table-container">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedUsers.length === users.length &&
                            users.length > 0
                          }
                          onCheckedChange={selectAllUsers}
                        />
                      </TableHead>
                      <TableHead className="min-w-[200px]">
                        {t("admin.users.table.user")}
                      </TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[200px]">
                        {t("admin.users.table.email")}
                    </TableHead>
                    <TableHead className="hidden xl:table-cell min-w-[120px]">
                        {t("admin.users.table.joined")}
                    </TableHead>
                    <TableHead className="hidden xl:table-cell min-w-[120px]">
                        {t("admin.users.table.lastSignIn")}
                    </TableHead>
                    <TableHead className="hidden lg:table-cell min-w-[120px]">
                        {t("admin.users.table.status")}
                    </TableHead>
                    <TableHead className="min-w-[140px]">
                        {t("admin.users.table.sanityStatus")}
                    </TableHead>
                      <TableHead className="min-w-[120px]">
                        {t("admin.users.table.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {t("admin.users.empty", { count: totalUsersCount })}
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() =>
                                toggleUserSelection(user.id)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={user.imageUrl}
                                alt={user.fullName}
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <div className="font-medium">
                                  {user.fullName}
                                </div>
                            <div className="text-sm text-gray-500 lg:hidden">
                              {user.email}
                            </div>
                            {user.inSanity && (
                              <div className="text-xs text-muted-foreground">
                                {t("admin.users.loyaltySummary", {
                                  points: user.loyaltyPoints,
                                  spent: user.totalSpent,
                                })}
                              </div>
                            )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {user.email}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {user.lastSignInAt
                              ? formatDate(user.lastSignInAt)
                              : t("admin.users.never")}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex gap-1">
                              <Badge
                                variant={
                                  user.emailVerified ? "default" : "secondary"
                                }
                              >
                                {user.emailVerified
                                  ? t("admin.users.verified")
                                  : t("admin.users.unverified")}
                              </Badge>
                              {user.banned && (
                                <Badge variant="destructive">
                                  {t("admin.users.banned")}
                                </Badge>
                              )}
                              {user.locked && (
                                <Badge variant="outline">
                                  {t("admin.users.locked")}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.inSanity ? (
                                <Badge
                                  variant={
                                    user.isActive ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  <Database className="h-3 w-3 mr-1" />
                                  {user.isActive
                                    ? t("admin.users.active")
                                    : t("admin.users.inactive")}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  {t("admin.users.notInSanity")}
                                </Badge>
                              )}
                              {user.isEmployee && user.employeeRole && (
                                <Badge variant="secondary" className="text-xs">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {t(
                                    `admin.employees.roles.${user.employeeRole}`,
                                    user.employeeRole
                                  )}
                                </Badge>
                              )}
                              {!user.isEmployee &&
                                user.notificationCount > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs hidden lg:inline-flex"
                                  >
                                    {t("admin.users.notificationsCount", {
                                      count: user.notificationCount,
                                    })}
                                  </Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!user.inSanity ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => openSidebar(user)}
                                  disabled={activatingUsers.has(user.id)}
                                  className="h-8 px-3"
                                >
                                  {activatingUsers.has(user.id) ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-3 w-3" />
                                  )}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    variant={
                                      user.isEmployee ? "outline" : "secondary"
                                    }
                                  size="sm"
                                  onClick={() => openEmployeeDialog(user)}
                                  className="h-8 px-3"
                                  title={
                                    user.isEmployee
                                        ? t("admin.users.manageEmployeeRole")
                                        : t("admin.users.assignEmployeeRole")
                                  }
                                >
                                  <Briefcase className="h-3 w-3" />
                                </Button>
                                  <Button
                                    variant={
                                      user.isActive ? "destructive" : "default"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      openActionModal(
                                        user,
                                        user.isActive
                                          ? "deactivate"
                                          : "activate"
                                      )
                                    }
                                    disabled={activatingUsers.has(user.id)}
                                    className="h-8 px-3"
                                  >
                                    {activatingUsers.has(user.id) ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : user.isActive ? (
                                      <UserX className="h-3 w-3" />
                                    ) : (
                                      <UserCheck className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      openActionModal(user, "delete")
                                    }
                                    disabled={activatingUsers.has(user.id)}
                                    className="h-8 px-3"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-3">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("admin.users.empty", { count: totalUsersCount })}
                  </div>
                ) : (
                  users.map((user, index) => (
                    <Card
                      key={user.id}
                      className="mobile-user-card p-3"
                      style={{ "--card-index": index } as React.CSSProperties}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                          <img
                            src={user.imageUrl}
                            alt={user.fullName}
                            className="w-10 h-10 rounded-full shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {user.fullName}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.email}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {t("admin.users.joinedLabel", {
                                date: formatDate(user.createdAt),
                              })}
                            </div>
                            {user.inSanity && (
                              <div className="text-xs text-muted-foreground">
                                {t("admin.users.loyaltySummary", {
                                  points: user.loyaltyPoints,
                                  spent: user.totalSpent,
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-3">
                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant={
                              user.emailVerified ? "default" : "secondary"
                            }
                            className="text-xs"
                          >
                            {user.emailVerified
                              ? t("admin.users.verified")
                              : t("admin.users.unverified")}
                          </Badge>
                          {user.banned && (
                            <Badge variant="destructive" className="text-xs">
                              {t("admin.users.banned")}
                            </Badge>
                          )}
                          {user.locked && (
                            <Badge variant="outline" className="text-xs">
                              {t("admin.users.locked")}
                            </Badge>
                          )}
                          {user.inSanity ? (
                            <Badge
                              variant={user.isActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              <Database className="h-3 w-3 mr-1" />
                              {user.isActive
                                ? t("admin.users.active")
                                : t("admin.users.inactive")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              {t("admin.users.notInSanity")}
                            </Badge>
                          )}
                          {user.isEmployee && user.employeeRole && (
                            <Badge variant="secondary" className="text-xs">
                              <Briefcase className="h-3 w-3 mr-1" />
                              {t(
                                `admin.employees.roles.${user.employeeRole}`,
                                user.employeeRole
                              )}
                            </Badge>
                          )}
                          {user.notificationCount > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {t("admin.users.notificationsCount", {
                                count: user.notificationCount,
                              })}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <div className="text-xs text-muted-foreground">
                            {t("admin.users.lastSignInLabel", {
                              date: user.lastSignInAt
                                ? formatDate(user.lastSignInAt)
                                : t("admin.users.never"),
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            {!user.inSanity ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openSidebar(user)}
                                disabled={activatingUsers.has(user.id)}
                                className="h-7 px-2 text-xs"
                              >
                                {activatingUsers.has(user.id) ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    {t("admin.users.add")}
                                  </>
                                )}
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant={
                                    user.isEmployee ? "outline" : "secondary"
                                  }
                                  size="sm"
                                  onClick={() => openEmployeeDialog(user)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  {user.isEmployee
                                    ? t("admin.users.manage")
                                    : t("admin.users.assign")}
                                </Button>
                                <Button
                                  variant={
                                    user.isActive ? "destructive" : "default"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    openActionModal(
                                      user,
                                      user.isActive ? "deactivate" : "activate"
                                    )
                                  }
                                  disabled={activatingUsers.has(user.id)}
                                  className="h-7 px-2 text-xs"
                                >
                                  {activatingUsers.has(user.id) ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : user.isActive ? (
                                    <>
                                      <UserX className="h-3 w-3 mr-1" />
                                      {t("admin.users.deactivate")}
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      {t("admin.users.activate")}
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    openActionModal(user, "delete")
                                  }
                                  disabled={activatingUsers.has(user.id)}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                {t("admin.users.pagination.summary", {
                  start: Math.min(currentPage * perPage + 1, totalUsersCount),
                  end: Math.min((currentPage + 1) * perPage, totalUsersCount),
                  total: totalUsersCount,
                })}
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <Button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0 || tableLoading}
                  variant="outline"
                  size="sm"
                >
                  {t("admin.users.pagination.previous")}
                </Button>
                <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
                  {t("admin.users.pagination.page", {
                    page: currentPage + 1,
                    pages: Math.max(1, Math.ceil(totalUsersCount / perPage)),
                  })}
                </span>
                <Button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={
                    (currentPage + 1) * perPage >= totalUsersCount ||
                    tableLoading ||
                    totalUsersCount <= perPage
                  }
                  variant="outline"
                  size="sm"
                >
                  {t("admin.users.pagination.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteUsers}
        title={t("admin.users.deleteTitle")}
        description={t("admin.users.deleteDescription", {
          count: selectedUsers.length,
        })}
        itemCount={selectedUsers.length}
        isLoading={isDeleting}
      />

      {/* User Action Confirmation Modal */}
      <UserActionModal
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        onConfirm={handleConfirmAction}
        user={
          actionModal.user
            ? {
                firstName: actionModal.user.firstName,
                lastName: actionModal.user.lastName,
                email: actionModal.user.email,
                isActive: actionModal.user.isActive,
                inSanity: actionModal.user.inSanity,
                notificationCount: actionModal.user.notificationCount,
              }
            : null
        }
        action={actionModal.action}
        isLoading={activatingUsers.has(actionModal.user?.id || "")}
      />

      {/* User Details Sidebar */}
      <UserDetailsSidebar
        isOpen={sidebarState.isOpen}
        onClose={closeSidebar}
        user={sidebarState.user}
        onActivate={handleUserActivation}
        onDelete={handleUserDeletion}
        onUserUpdate={handleUserUpdate}
        isLoading={activatingUsers.has(sidebarState.user?.id || "")}
      />

      {/* Employee Assignment Sidebar */}
      <EmployeeAssignmentSidebar
        isOpen={employeeSidebarState.isOpen}
        onClose={closeEmployeeDialog}
        user={employeeSidebarState.user}
        onAssignRole={handleAssignEmployee}
        onRemoveRole={handleRemoveEmployee}
        isLoading={activatingUsers.has(employeeSidebarState.user?.id || "")}
      />
    </>
  );
};

export default AdminUsers;
