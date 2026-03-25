"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Send,
  Users,
  Eye,
  MessageSquare,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { safeApiCall, handleApiError } from "./apiHelpers";
import { showToast } from "@/lib/toast";
import { useTranslation } from "react-i18next";

interface User {
  _id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  inSanity: boolean;
  activatedAt?: string;
  activatedBy?: string;
}

interface SentNotification {
  id: string; // Sanity _id for deletion
  notificationId?: string; // Original notification ID
  title: string;
  message: string;
  type: string;
  priority: string;
  sentAt: string;
  sentBy: string;
  recipientCount: number;
  recipients: Array<{
    email: string;
    name: string;
    delivered: boolean;
    read: boolean;
    readAt?: string;
  }>;
}

interface CombinedUser {
  sanityId?: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  inSanity: boolean;
  activatedAt?: string;
  activatedBy?: string;
}

interface AdminNotificationsProps {
  adminEmail: string;
}

const AdminNotifications: React.FC<AdminNotificationsProps> = ({
  adminEmail,
}) => {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [sentNotifications, setSentNotifications] = useState<
    SentNotification[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<SentNotification | null>(null);
  const [isViewSidebarOpen, setIsViewSidebarOpen] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<
    string | null
  >(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null);

  // Form state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [notificationForm, setNotificationForm] = useState<{
    title: string;
    message: string;
    type: string;
    priority: string;
    actionUrl: string;
  }>({
    title: "",
    message: "",
    type: "general",
    priority: "medium",
    actionUrl: "",
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState({
    title: "",
    message: "",
    recipients: "",
  });

  // Filter state
  const [userSearch, setUserSearch] = useState("");
  const [syncingUsers, setSyncingUsers] = useState(false);

  // Pagination and filter state for sent notifications
  const [sentNotificationsPage, setSentNotificationsPage] = useState(1);
  const [sentNotificationsLimit] = useState(20);
  const [sentNotificationsTotal, setSentNotificationsTotal] = useState(0);
  const [refreshingNotifications, setRefreshingNotifications] = useState(false);
  const [notificationTypeFilter, setNotificationTypeFilter] = useState("all");
  const [notificationPriorityFilter, setNotificationPriorityFilter] =
    useState("all");
  const [notificationDateFilter, setNotificationDateFilter] = useState("all");
  const [isResending, setIsResending] = useState<"same" | "new" | null>(null);

  // Fetch users using combined API
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await safeApiCall("/api/admin/users/combined?limit=1000");
      // Transform the data to match our User interface
      const transformedUsers =
        data.users?.map((user: CombinedUser) => ({
          _id: user.sanityId || user.clerkUserId,
          clerkUserId: user.clerkUserId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          inSanity: user.inSanity,
          activatedAt: user.activatedAt,
          activatedBy: user.activatedBy,
        })) || [];
      setUsers(transformedUsers);
    } catch (error) {
      handleApiError(error, "Users fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync selected users to Sanity before sending notification
  const syncUsersToSanity = async (userIds: string[]) => {
    try {
      setSyncingUsers(true);

      // Filter only users that aren't already active in Sanity
      const usersToSync = userIds.filter((userId) => {
        const user = users.find((u) => u.clerkUserId === userId);
        return !user?.isActive || !user?.inSanity;
      });

      if (usersToSync.length === 0) {
        return; // All users are already synced
      }

      const syncResult = await safeApiCall("/api/admin/users/sync-to-sanity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkUserIds: usersToSync }),
      });

      // Refresh users list after syncing
      await fetchUsers();

      return syncResult;
    } catch (error) {
      handleApiError(error, "User sync to Sanity");
      throw error;
    } finally {
      setSyncingUsers(false);
    }
  };

  // Fetch sent notifications with pagination and filters
  const fetchSentNotifications = useCallback(
    async (page = sentNotificationsPage, showRefreshLoader = false) => {
      try {
        if (showRefreshLoader) {
          setRefreshingNotifications(true);
        } else {
          setLoading(true);
        }

        // Build query parameters
        const params = new URLSearchParams({
          limit: sentNotificationsLimit.toString(),
          offset: ((page - 1) * sentNotificationsLimit).toString(),
        });

        // Add filters
        if (notificationTypeFilter !== "all") {
          params.append("type", notificationTypeFilter);
        }
        if (notificationPriorityFilter !== "all") {
          params.append("priority", notificationPriorityFilter);
        }
        if (notificationDateFilter !== "all") {
          params.append("dateFilter", notificationDateFilter);
        }

        const data = await safeApiCall(
          `/api/admin/notifications/sent?${params.toString()}`
        );

        setSentNotifications(data.notifications || []);
        setSentNotificationsTotal(
          data.pagination?.total || data.totalCount || 0
        );
        setSentNotificationsPage(page);
      } catch (error) {
        console.error("Error fetching sent notifications:", error);
        handleApiError(error, "Sent notifications fetch");
      } finally {
        setLoading(false);
        setRefreshingNotifications(false);
      }
    },
    [
      sentNotificationsLimit,
      sentNotificationsPage,
      notificationTypeFilter,
      notificationPriorityFilter,
      notificationDateFilter,
    ]
  );

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Effect for notifications - Reset page and fetch when filters change
  useEffect(() => {
    setSentNotificationsPage(1); // Reset to first page when filters change
    fetchSentNotifications(1, false);
  }, [
    notificationTypeFilter,
    notificationPriorityFilter,
    notificationDateFilter,
    fetchSentNotifications,
  ]);

  // Refresh sent notifications
  const handleRefreshNotifications = () => {
    fetchSentNotifications(sentNotificationsPage, true);
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    fetchSentNotifications(newPage, false);
  };

  // Handle filter changes - reset to page 1 and fetch
  const handleFilterChange = () => {
    setSentNotificationsPage(1);
    // The useEffect will handle the actual fetch when filters change
  };

  // Explicit handlers for each filter
  const handleTypeFilterChange = useCallback((value: string) => {
    setNotificationTypeFilter(value);
    handleFilterChange();
  }, []);

  const handlePriorityFilterChange = useCallback((value: string) => {
    setNotificationPriorityFilter(value);
    handleFilterChange();
  }, []);

  const handleDateFilterChange = useCallback((value: string) => {
    setNotificationDateFilter(value);
    handleFilterChange();
  }, []);

  // Effect to refetch when filters change
  useEffect(() => {
    if (
      notificationTypeFilter !== "all" ||
      notificationPriorityFilter !== "all" ||
      notificationDateFilter !== "all"
    ) {
      handleFilterChange();
    }
  }, [
    notificationTypeFilter,
    notificationPriorityFilter,
    notificationDateFilter,
  ]);

  // Handle send notification
  const handleSendNotification = async () => {
    // Clear previous errors
    setValidationErrors({
      title: "",
      message: "",
      recipients: "",
    });

    // Validate fields
    const errors = {
      title: "",
      message: "",
      recipients: "",
    };

    if (!notificationForm.title.trim()) {
      errors.title = t("admin.notifications.validation.titleRequired");
    }

    if (!notificationForm.message.trim()) {
      errors.message = t("admin.notifications.validation.messageRequired");
    }

    if (selectedUsers.length === 0) {
      errors.recipients = t("admin.notifications.validation.recipientsRequired");
    }

    // Check if there are any errors
    if (errors.title || errors.message || errors.recipients) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSendingNotification(true);

      await syncUsersToSanity(selectedUsers);

      const payload = {
        ...notificationForm,
        recipients: selectedUsers,
        sentBy: adminEmail,
      };

      await safeApiCall("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Reset form
      setNotificationForm({
        title: "",
        message: "",
        type: "general",
        priority: "medium",
        actionUrl: "",
      });
      setSelectedUsers([]);
      setValidationErrors({
        title: "",
        message: "",
        recipients: "",
      });
      setIsSidebarOpen(false);

      // Refresh sent notifications to show the newly sent notification
      // Go to page 1 to see the newest notification at the top
      setSentNotificationsPage(1);
      fetchSentNotifications(1, true);

      showToast.success(
        t("admin.notifications.toast.sentTitle"),
        t("admin.notifications.toast.sentDescription", {
          count: selectedUsers.length,
        })
      );
    } catch (error) {
      handleApiError(error, "Send notification");
    } finally {
      setSendingNotification(false);
    }
  };

  // Handle resend notification
  const handleResendNotification = async (
    notification: SentNotification,
    type: "same" | "new"
  ) => {
    setIsResending(type);

    try {
      if (type === "same") {
        // Resend to same recipients
        const recipientEmails = notification.recipients.map((r) => r.email);

        // Find user IDs for these emails
        const selectedUserIds = users
          .filter((user) => recipientEmails.includes(user.email))
          .map((user) => user._id);

        if (selectedUserIds.length === 0) {
          showToast.error(
            t("admin.notifications.toast.noMatchingUsersTitle"),
            t("admin.notifications.toast.noMatchingUsersDescription")
          );
          return;
        }

        // Sync users to Sanity if needed
        await syncUsersToSanity(selectedUserIds);

        const payload = {
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          actionUrl: "", // Original notification may not have actionUrl
          recipients: selectedUserIds,
          sentBy: adminEmail,
        };

        await safeApiCall("/api/admin/notifications/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // Refresh sent notifications
        fetchSentNotifications(sentNotificationsPage, true);

        showToast.success(
          t("admin.notifications.toast.resentTitle"),
          t("admin.notifications.toast.resentDescription", {
            count: selectedUserIds.length,
          })
        );
      } else {
        // Type === 'new' - Open sidebar with pre-filled form for new recipients
        setNotificationForm({
          title: notification.title,
          message: notification.message,
          type: notification.type as "general",
          priority: notification.priority as "medium",
          actionUrl: "",
        });
        setSelectedUsers([]);
        setIsViewSidebarOpen(false);
        setIsSidebarOpen(true);

        showToast.info(
          t("admin.notifications.toast.prefillTitle"),
          t("admin.notifications.toast.prefillDescription")
        );
      }
    } catch (error) {
      handleApiError(error, "Resend notification");
    } finally {
      setIsResending(null);
    }
  };

  // Handle viewing notification details
  const handleViewNotification = (notification: SentNotification) => {
    setSelectedNotification(notification);
    setIsViewSidebarOpen(true);
  };

  // Handle deleting notification
  const handleDeleteNotification = async (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setIsDeleteConfirmOpen(true);
  };

  // Confirm delete notification
  const confirmDeleteNotification = async () => {
    if (!notificationToDelete) return;

    try {
      setDeletingNotificationId(notificationToDelete);
      setIsDeleteConfirmOpen(false);

      await safeApiCall(`/api/admin/notifications/${notificationToDelete}`, {
        method: "DELETE",
      });

      // Remove from local state
      setSentNotifications((prev) =>
        prev.filter((notif) => notif.id !== notificationToDelete)
      );

      showToast.success(t("admin.notifications.toast.deleted"));
    } catch (error) {
      handleApiError(error, "Delete notification");
    } finally {
      setDeletingNotificationId(null);
      setNotificationToDelete(null);
    }
  };

  // Cancel delete notification
  const cancelDeleteNotification = () => {
    setIsDeleteConfirmOpen(false);
    setNotificationToDelete(null);
  };

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(userSearch.toLowerCase())
  );

  // Filter notifications
  // Note: Filtering is now done server-side, this is kept for compatibility
  const filteredNotifications = sentNotifications;

  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale);
  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(locale);

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case "promo":
        return "default";
      case "order":
        return "secondary";
      case "system":
        return "outline";
      case "marketing":
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t("admin.notifications.title")}
          </h1>
          <p className="text-muted-foreground">
            {t("admin.notifications.subtitle")}
          </p>
        </div>
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t("admin.notifications.send")}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[600px] sm:w-[600px] p-6" side="right">
            <SheetHeader className="px-0">
              <SheetTitle>{t("admin.notifications.sendTitle")}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6 overflow-y-auto max-h-[calc(100vh-120px)] px-1">
              {/* Notification Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.notifications.form.titleLabel")}
                  </label>
                  <Input
                    value={notificationForm.title}
                    onChange={(e) => {
                      setNotificationForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }));
                      // Clear error when user starts typing
                      if (validationErrors.title) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          title: "",
                        }));
                      }
                    }}
                    placeholder={t("admin.notifications.form.titlePlaceholder")}
                    className={validationErrors.title ? "border-red-500" : ""}
                  />
                  {validationErrors.title && (
                    <p className="text-red-500 text-sm mt-1">
                      {validationErrors.title}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.notifications.form.typeLabel")}
                  </label>
                  <Select
                    value={notificationForm.type}
                    onValueChange={(value: string) =>
                      setNotificationForm((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">
                        {t("admin.notifications.type.general")}
                      </SelectItem>
                      <SelectItem value="promo">
                        {t("admin.notifications.type.promo")}
                      </SelectItem>
                      <SelectItem value="order">
                        {t("admin.notifications.type.order")}
                      </SelectItem>
                      <SelectItem value="system">
                        {t("admin.notifications.type.system")}
                      </SelectItem>
                      <SelectItem value="marketing">
                        {t("admin.notifications.type.marketing")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    {t("admin.notifications.form.priorityLabel")}
                  </label>
                  <Select
                    value={notificationForm.priority}
                    onValueChange={(value: string) =>
                      setNotificationForm((prev) => ({
                        ...prev,
                        priority: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        {t("admin.notifications.priority.low")}
                      </SelectItem>
                      <SelectItem value="medium">
                        {t("admin.notifications.priority.medium")}
                      </SelectItem>
                      <SelectItem value="high">
                        {t("admin.notifications.priority.high")}
                      </SelectItem>
                      <SelectItem value="urgent">
                        {t("admin.notifications.priority.urgent")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {t("admin.notifications.form.actionUrlLabel")}
                  </label>
                  <Input
                    value={notificationForm.actionUrl}
                    onChange={(e) =>
                      setNotificationForm((prev) => ({
                        ...prev,
                        actionUrl: e.target.value,
                      }))
                    }
                    placeholder={t("admin.notifications.form.actionUrlPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">
                  {t("admin.notifications.form.messageLabel")}
                </label>
                <Textarea
                  value={notificationForm.message}
                  onChange={(e) => {
                    setNotificationForm((prev) => ({
                      ...prev,
                      message: e.target.value,
                    }));
                    // Clear error when user starts typing
                    if (validationErrors.message) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        message: "",
                      }));
                    }
                  }}
                  placeholder={t("admin.notifications.form.messagePlaceholder")}
                  rows={3}
                  className={validationErrors.message ? "border-red-500" : ""}
                />
                {validationErrors.message && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors.message}
                  </p>
                )}
              </div>

              {/* User Selection */}
              <div>
                <label className="text-sm font-medium">
                  {t("admin.notifications.form.recipientsLabel")}
                </label>
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-4 h-4 text-gray-400" />
                    <Input
                      placeholder={t("admin.notifications.form.userSearchPlaceholder")}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedUsers.length === filteredUsers.length) {
                          setSelectedUsers([]);
                        } else {
                          setSelectedUsers(
                            filteredUsers.map((u) => u.clerkUserId)
                          );
                        }
                        // Clear recipients error when bulk selecting/deselecting
                        if (validationErrors.recipients) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            recipients: "",
                          }));
                        }
                      }}
                    >
                      {selectedUsers.length === filteredUsers.length
                        ? t("admin.notifications.form.deselectAll")
                        : t("admin.notifications.form.selectAll")}
                    </Button>
                  </div>

                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {filteredUsers.map((user, index) => (
                      <div
                        key={index.toString()}
                        className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <input
                          key={`checkbox-${user._id}`}
                          type="checkbox"
                          checked={selectedUsers.includes(user.clerkUserId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers((prev) => [
                                ...prev,
                                user.clerkUserId,
                              ]);
                            } else {
                              setSelectedUsers((prev) =>
                                prev.filter((id) => id !== user.clerkUserId)
                              );
                            }
                            // Clear recipients error when user selects/deselects
                            if (validationErrors.recipients) {
                              setValidationErrors((prev) => ({
                                ...prev,
                                recipients: "",
                              }));
                            }
                          }}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                          {user.inSanity && user.activatedAt && (
                            <div className="text-xs text-success-base mt-1">
                              {t("admin.notifications.form.activated", {
                                date: formatDate(user.activatedAt),
                                by: user.activatedBy
                                  ? ` ${t("admin.notifications.form.by", {
                                      name: user.activatedBy,
                                    })}`
                                  : "",
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={user.isActive ? "default" : "secondary"}
                          >
                            {user.isActive
                              ? t("admin.notifications.form.active")
                              : t("admin.notifications.form.inactive")}
                          </Badge>
                          <Badge
                            variant={user.inSanity ? "default" : "outline"}
                            className="text-xs"
                          >
                            {user.inSanity
                              ? t("admin.notifications.form.inSanity")
                              : t("admin.notifications.form.clerkOnly")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedUsers.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                      <div className="text-gray-600">
                        {t("admin.notifications.form.selectedCount", {
                          count: selectedUsers.length,
                        })}
                      </div>
                      {syncingUsers && (
                        <div className="text-blue-600 mt-1 flex items-center gap-2">
                          <Clock className="w-3 h-3 animate-spin" />
                          {t("admin.notifications.form.syncingUsers")}
                        </div>
                      )}
                      {(() => {
                        const usersToSync = selectedUsers.filter((userId) => {
                          const user = users.find(
                            (u) => u.clerkUserId === userId
                          );
                          return !user?.isActive || !user?.inSanity;
                        });

                        if (usersToSync.length > 0) {
                          return (
                            <div className="text-brand-red-accent mt-1 text-xs">
                              {t("admin.notifications.form.autoActivate", {
                                count: usersToSync.length,
                              })}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {validationErrors.recipients && (
                    <p className="text-red-500 text-sm mt-1">
                      {validationErrors.recipients}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  {t("admin.notifications.cancel")}
                </Button>
                <Button
                  onClick={handleSendNotification}
                  disabled={sendingNotification || syncingUsers}
                >
                  {syncingUsers ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      {t("admin.notifications.form.syncingUsersButton")}
                    </>
                  ) : sendingNotification ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      {t("admin.notifications.form.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {t("admin.notifications.send")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-muted-foreground">
                  {t("admin.notifications.stats.totalUsers")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-success-base" />
              <div>
                <div className="text-2xl font-bold">
                  {sentNotifications.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("admin.notifications.stats.sentNotifications")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-red-accent" />
              <div>
                <div className="text-2xl font-bold">
                  {sentNotifications.reduce(
                    (total, notif) => total + notif.recipientCount,
                    0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("admin.notifications.stats.totalRecipients")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {sentNotifications.reduce(
                    (total, notif) =>
                      total + notif.recipients.filter((r) => r.read).length,
                    0
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("admin.notifications.stats.readNotifications")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sent Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("admin.notifications.sentTitle")}</CardTitle>
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshNotifications}
                disabled={refreshingNotifications}
                className="p-2"
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4",
                    refreshingNotifications && "animate-spin"
                  )}
                />
              </Button>

              {/* Type Filter */}
              <Select
                value={notificationTypeFilter}
                onValueChange={handleTypeFilterChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("admin.notifications.filters.type")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.notifications.filters.allTypes")}
                  </SelectItem>
                  <SelectItem value="general">
                    {t("admin.notifications.type.general")}
                  </SelectItem>
                  <SelectItem value="promo">
                    {t("admin.notifications.type.promo")}
                  </SelectItem>
                  <SelectItem value="order">
                    {t("admin.notifications.type.orderShort")}
                  </SelectItem>
                  <SelectItem value="system">
                    {t("admin.notifications.type.system")}
                  </SelectItem>
                  <SelectItem value="marketing">
                    {t("admin.notifications.type.marketing")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select
                value={notificationPriorityFilter}
                onValueChange={handlePriorityFilterChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("admin.notifications.filters.priority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.notifications.filters.allPriority")}
                  </SelectItem>
                  <SelectItem value="low">
                    {t("admin.notifications.priority.low")}
                  </SelectItem>
                  <SelectItem value="medium">
                    {t("admin.notifications.priority.medium")}
                  </SelectItem>
                  <SelectItem value="high">
                    {t("admin.notifications.priority.high")}
                  </SelectItem>
                  <SelectItem value="urgent">
                    {t("admin.notifications.priority.urgent")}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select
                value={notificationDateFilter}
                onValueChange={handleDateFilterChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={t("admin.notifications.filters.date")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("admin.notifications.filters.allTime")}
                  </SelectItem>
                  <SelectItem value="today">
                    {t("admin.notifications.filters.today")}
                  </SelectItem>
                  <SelectItem value="week">
                    {t("admin.notifications.filters.thisWeek")}
                  </SelectItem>
                  <SelectItem value="month">
                    {t("admin.notifications.filters.thisMonth")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              {t("admin.notifications.loading")}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.notifications.empty")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("admin.notifications.table.title")}</TableHead>
                    <TableHead>{t("admin.notifications.table.type")}</TableHead>
                    <TableHead>{t("admin.notifications.table.priority")}</TableHead>
                    <TableHead>{t("admin.notifications.table.recipients")}</TableHead>
                    <TableHead>{t("admin.notifications.table.readRate")}</TableHead>
                    <TableHead>{t("admin.notifications.table.sentAt")}</TableHead>
                    <TableHead>{t("admin.notifications.table.sentBy")}</TableHead>
                    <TableHead>{t("admin.notifications.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notification) => {
                    const readCount = notification.recipients.filter(
                      (r) => r.read
                    ).length;
                    const readRate = Math.round(
                      (readCount / notification.recipientCount) * 100
                    );

                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="font-medium">
                            {notification.title}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeColor(notification.type)}>
                            {t(
                              `admin.notifications.type.${notification.type}`,
                              notification.type
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getPriorityColor(notification.priority)}
                          >
                            {t(
                              `admin.notifications.priority.${notification.priority}`,
                              notification.priority
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>{notification.recipientCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-sm">
                              {readCount}/{notification.recipientCount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({readRate}%)
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(notification.sentAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {notification.sentBy}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleViewNotification(notification)
                              }
                              className="p-1 h-8 w-8"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteNotification(notification.id)
                              }
                              disabled={
                                deletingNotificationId === notification.id
                              }
                              className="p-1 h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingNotificationId === notification.id ? (
                                <Clock className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {sentNotifications.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {t("admin.notifications.pagination.summary", {
                  start:
                    (sentNotificationsPage - 1) * sentNotificationsLimit + 1,
                  end: Math.min(
                    sentNotificationsPage * sentNotificationsLimit,
                    sentNotificationsTotal
                  ),
                  total: sentNotificationsTotal,
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(sentNotificationsPage - 1)}
                  disabled={sentNotificationsPage <= 1 || loading}
                  className="p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3">
                  {t("admin.notifications.pagination.page", {
                    page: sentNotificationsPage,
                    pages: Math.ceil(
                      sentNotificationsTotal / sentNotificationsLimit
                    ),
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(sentNotificationsPage + 1)}
                  disabled={
                    sentNotificationsPage >=
                      Math.ceil(
                        sentNotificationsTotal / sentNotificationsLimit
                      ) || loading
                  }
                  className="p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Details Sidebar */}
      <Sheet open={isViewSidebarOpen} onOpenChange={setIsViewSidebarOpen}>
        <SheetContent
          className="w-[700px] sm:w-[700px] p-6 overflow-y-auto"
          side="right"
        >
          <SheetHeader className="px-0">
            <SheetTitle>{t("admin.notifications.details.title")}</SheetTitle>
          </SheetHeader>

          {selectedNotification && (
            <div className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t("admin.notifications.details.fields.title")}
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedNotification.title}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t("admin.notifications.details.fields.type")}
                  </label>
                  <div className="mt-1">
                    <Badge variant={getTypeColor(selectedNotification.type)}>
                      {t(
                        `admin.notifications.type.${selectedNotification.type}`,
                        selectedNotification.type
                      )}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t("admin.notifications.details.fields.priority")}
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={getPriorityColor(selectedNotification.priority)}
                    >
                      {t(
                        `admin.notifications.priority.${selectedNotification.priority}`,
                        selectedNotification.priority
                      )}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t("admin.notifications.details.fields.sentAt")}
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {formatDateTime(selectedNotification.sentAt)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t("admin.notifications.details.fields.sentBy")}
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedNotification.sentBy}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    {t("admin.notifications.details.fields.recipients")}
                  </label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    {t("admin.notifications.details.recipientsCount", {
                      count: selectedNotification.recipientCount,
                    })}
                  </div>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t("admin.notifications.details.fields.message")}
                </label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">
                  {selectedNotification.message}
                </div>
              </div>

              {/* Recipients Details */}
              <div>
                <label className="text-sm font-medium text-gray-500 mb-3 block">
                  {t("admin.notifications.details.recipientsTitle")}
                </label>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("admin.notifications.details.table.name")}</TableHead>
                        <TableHead>{t("admin.notifications.details.table.email")}</TableHead>
                        <TableHead>{t("admin.notifications.details.table.status")}</TableHead>
                        <TableHead>{t("admin.notifications.details.table.readAt")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedNotification.recipients.map(
                        (recipient, index) => (
                          <TableRow key={index}>
                            <TableCell>{recipient.name}</TableCell>
                            <TableCell>{recipient.email}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {recipient.delivered ? (
                                  <CheckCircle className="w-4 h-4 text-success-base" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                                {recipient.delivered
                                  ? t("admin.notifications.details.delivered")
                                  : t("admin.notifications.details.failed")}
                                {recipient.read && (
                                  <Badge variant="secondary" className="ml-2">
                                    {t("admin.notifications.details.read")}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {recipient.readAt
                                ? formatDateTime(recipient.readAt)
                                : t("admin.notifications.details.none")}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      selectedNotification.recipients.filter((r) => r.delivered)
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    {t("admin.notifications.details.stats.delivered")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-base">
                    {
                      selectedNotification.recipients.filter((r) => r.read)
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    {t("admin.notifications.details.stats.read")}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      (selectedNotification.recipients.filter((r) => r.read)
                        .length /
                        selectedNotification.recipientCount) *
                        100
                    )}
                    % 
                  </div>
                  <div className="text-sm text-gray-500">
                    {t("admin.notifications.details.stats.readRate")}
                  </div>
                </div>
              </div>

              {/* Resend Actions */}
              <div className="pt-6 border-t">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {t("admin.notifications.resend.title")}
                  </h4>
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() =>
                        handleResendNotification(selectedNotification, "same")
                      }
                      disabled={!!isResending}
                      className="flex items-center justify-center gap-2 flex-1"
                      variant="outline"
                    >
                      {isResending === "same" ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          {t("admin.notifications.resend.sending")}
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          {t("admin.notifications.resend.same")}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() =>
                        handleResendNotification(selectedNotification, "new")
                      }
                      disabled={!!isResending}
                      className="flex items-center justify-center gap-2 flex-1"
                    >
                      {isResending === "new" ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          {t("admin.notifications.resend.settingUp")}
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {t("admin.notifications.resend.new")}
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t("admin.notifications.resend.help")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className={cn(
              "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
            )}
          >
            <VisuallyHidden.Root>
              <DialogTitle>
                {t("admin.notifications.delete.confirmTitle")}
              </DialogTitle>
            </VisuallyHidden.Root>
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 border-4 border-red-100">
                <AlertCircle className="h-8 w-8 text-red-600 animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  {t("admin.notifications.delete.title")}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {t("admin.notifications.delete.description")}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                onClick={cancelDeleteNotification}
                disabled={deletingNotificationId === notificationToDelete}
                className="flex-1 border-gray-300 hover:bg-gray-50 font-medium"
              >
                {t("admin.notifications.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteNotification}
                disabled={deletingNotificationId === notificationToDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500 font-semibold shadow-lg hover:shadow-red-200"
              >
                {deletingNotificationId === notificationToDelete ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    {t("admin.notifications.delete.deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("admin.notifications.delete.action")}
                  </>
                )}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default AdminNotifications;
