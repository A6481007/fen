"use client";

import { useState, useEffect } from "react";
import {
  assignEmployeeRole,
  removeEmployeeRole,
  setStaffRoles,
  updateEmployeeStatus,
  getAllUsers,
  getAllEmployees,
} from "@/actions/employeeActions";
import {
  Employee,
  EmployeeRole,
  type BackofficeRole,
  getRoleDisplayName,
  getRoleBadgeColor,
} from "@/types/employee";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  UserPlus,
  UserMinus,
  Ban,
  CheckCircle,
  Search,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmployee: boolean;
  employeeRole?: string;
  employeeStatus?: string;
  staffRoles?: BackofficeRole[];
  createdAt: string;
}

type EmployeeManagementProps = {
  canManageAccess?: boolean;
};

type StaffRoleOption = {
  value: BackofficeRole;
  labelKey: string;
  descriptionKey: string;
  defaultLabel: string;
  defaultDescription: string;
};

const STAFF_ROLE_OPTIONS: StaffRoleOption[] = [
  {
    value: "content_admin",
    labelKey: "admin.staffRoles.contentAdmin",
    descriptionKey: "admin.staffRoles.contentAdminDesc",
    defaultLabel: "Content Admin",
    defaultDescription:
      "Full content access (insights, news, events, catalogs, downloads).",
  },
  {
    value: "insight_editor",
    labelKey: "admin.staffRoles.insightEditor",
    descriptionKey: "admin.staffRoles.insightEditorDesc",
    defaultLabel: "Insight Editor",
    defaultDescription: "Create and edit insights.",
  },
  {
    value: "news_editor",
    labelKey: "admin.staffRoles.newsEditor",
    descriptionKey: "admin.staffRoles.newsEditorDesc",
    defaultLabel: "News Editor",
    defaultDescription: "Create and edit news posts.",
  },
  {
    value: "event_manager",
    labelKey: "admin.staffRoles.eventManager",
    descriptionKey: "admin.staffRoles.eventManagerDesc",
    defaultLabel: "Event Manager",
    defaultDescription: "Manage events and RSVPs.",
  },
  {
    value: "marketing_admin",
    labelKey: "admin.staffRoles.marketingAdmin",
    descriptionKey: "admin.staffRoles.marketingAdminDesc",
    defaultLabel: "Marketing Admin",
    defaultDescription: "Full promotions/deals access with analytics.",
  },
  {
    value: "promotions_manager",
    labelKey: "admin.staffRoles.promotionsManager",
    descriptionKey: "admin.staffRoles.promotionsManagerDesc",
    defaultLabel: "Promotions Manager",
    defaultDescription: "Create and publish promotions.",
  },
  {
    value: "deals_manager",
    labelKey: "admin.staffRoles.dealsManager",
    descriptionKey: "admin.staffRoles.dealsManagerDesc",
    defaultLabel: "Deals Manager",
    defaultDescription: "Create and publish deals.",
  },
  {
    value: "comms_manager",
    labelKey: "admin.staffRoles.commsManager",
    descriptionKey: "admin.staffRoles.commsManagerDesc",
    defaultLabel: "Comms Manager",
    defaultDescription: "Manage contacts, subscriptions, and notifications.",
  },
  {
    value: "analyst_readonly",
    labelKey: "admin.staffRoles.analystReadonly",
    descriptionKey: "admin.staffRoles.analystReadonlyDesc",
    defaultLabel: "Analytics (Read-Only)",
    defaultDescription: "View analytics dashboards only.",
  },
];

export default function EmployeeManagement({ canManageAccess = false }: EmployeeManagementProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<EmployeeRole>("callcenter");
  const [staffRoleSelection, setStaffRoleSelection] = useState<BackofficeRole[]>([]);
  const [showStaffRoleDialog, setShowStaffRoleDialog] = useState(false);
  const [staffRoleTarget, setStaffRoleTarget] = useState<Employee | null>(null);
  const [assigningRole, setAssigningRole] = useState(false);
  const [savingStaffRoles, setSavingStaffRoles] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const staffRoleLabel = (role: BackofficeRole): string => {
    const option = STAFF_ROLE_OPTIONS.find((item) => item.value === role);
    if (!option) return role;
    return t(option.labelKey, option.defaultLabel);
  };

  const staffRoleDescription = (option: StaffRoleOption): string =>
    t(option.descriptionKey, option.defaultDescription);

  const roleLabel = (role: EmployeeRole) =>
    t(`admin.employees.roles.${role}`, getRoleDisplayName(role));

  const statusLabel = (status?: string) =>
    status ? t(`admin.employees.status.${status}`, status) : "";

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, employeesData] = await Promise.all([
        getAllUsers(),
        getAllEmployees(),
      ]);
      setUsers(usersData);
      setEmployees(employeesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error(t("admin.employees.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const ensureCanManage = () => {
    if (!canManageAccess) {
      toast.error(t("admin.employees.errors.noPermission"));
      return false;
    }
    return true;
  };

  const normalizeStaffRolesSelection = (roles?: BackofficeRole[] | null) => {
    if (!Array.isArray(roles)) return [];
    const allowed = new Set(STAFF_ROLE_OPTIONS.map((option) => option.value));
    return Array.from(new Set(roles.filter((role) => allowed.has(role))));
  };

  const handleStaffRoleToggle = (role: BackofficeRole, checked: boolean) => {
    setStaffRoleSelection((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, role]));
      }
      return prev.filter((value) => value !== role);
    });
  };

  const areStaffRolesChanged = (
    previous: BackofficeRole[] | undefined,
    next: BackofficeRole[]
  ) => {
    const prevSet = new Set(previous ?? []);
    if (prevSet.size !== next.length) return true;
    return next.some((role) => !prevSet.has(role));
  };

  const handleAssignRole = async () => {
    if (!selectedUser) return;
    if (!ensureCanManage()) return;

    setAssigningRole(true);

    try {
      const result = await assignEmployeeRole(selectedUser._id, selectedRole);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      const shouldSyncStaffRoles = areStaffRolesChanged(
        selectedUser.staffRoles,
        staffRoleSelection
      );

      if (shouldSyncStaffRoles) {
        const staffResult = await setStaffRoles(
          selectedUser._id,
          staffRoleSelection
        );

        if (!staffResult.success) {
          toast.error(staffResult.message);
          return;
        }
      }

      toast.success(result.message);
      setShowAssignDialog(false);
      setStaffRoleSelection([]);
      loadData();
    } catch (error) {
      console.error("Error assigning employee/staff roles:", error);
      toast.error(t("admin.employees.errors.assignFailed"));
    } finally {
      setAssigningRole(false);
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!ensureCanManage()) return;
    if (!confirm(t("admin.employees.confirmRemoveRole"))) return;

    const result = await removeEmployeeRole(userId);

    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser) return;
    if (!ensureCanManage()) return;

    const result = await updateEmployeeStatus(
      selectedUser._id,
      "suspended",
      suspensionReason
    );

    if (result.success) {
      toast.success(result.message);
      setShowSuspendDialog(false);
      setSuspensionReason("");
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleActivate = async (userId: string) => {
    if (!ensureCanManage()) return;

    const result = await updateEmployeeStatus(userId, "active");

    if (result.success) {
      toast.success(result.message);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const openStaffRoleManager = (employee: Employee) => {
    setStaffRoleTarget(employee);
    setStaffRoleSelection(normalizeStaffRolesSelection(employee.staffRoles));
    setShowStaffRoleDialog(true);
  };

  const handleSaveStaffRoles = async () => {
    if (!staffRoleTarget) return;
    if (!ensureCanManage()) return;

    setSavingStaffRoles(true);
    const result = await setStaffRoles(staffRoleTarget._id, staffRoleSelection);

    if (result.success) {
      toast.success(t("admin.employees.staffRolesUpdated"));
      setShowStaffRoleDialog(false);
      setStaffRoleTarget(null);
      setStaffRoleSelection([]);
      loadData();
    } else {
      toast.error(result.message);
    }

    setSavingStaffRoles(false);
  };

  const StaffRolesPicker = ({ disabled }: { disabled?: boolean }) => {
    const summary =
      staffRoleSelection.length === 0
        ? t("admin.employees.staffRolesNoneSelected")
        : staffRoleSelection.map((role) => staffRoleLabel(role)).join(", ");

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            disabled={disabled}
          >
            <span className={cn("truncate", staffRoleSelection.length === 0 && "text-gray-500")}>
              {summary}
            </span>
            <Badge variant="secondary" className="ml-2 shrink-0">
              {t("admin.employees.staffRolesSelectedCount", {
                count: staffRoleSelection.length,
              })}
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px]" align="start">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-900">
              {t("admin.employees.staffRolesTitle")}
            </p>
            <ScrollArea className="max-h-64 pr-2">
              <div className="space-y-2">
                {STAFF_ROLE_OPTIONS.map((option) => {
                  const checked = staffRoleSelection.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className="flex items-start gap-3 rounded-lg border border-gray-200/80 p-3 transition hover:border-gray-300 hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          handleStaffRoleToggle(option.value, value === true)
                        }
                        disabled={disabled}
                      />
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {t(option.labelKey, option.defaultLabel)}
                        </div>
                        <p className="text-xs text-gray-600 leading-snug">
                          {staffRoleDescription(option)}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === "all" || emp.role === filterRole;
    const matchesStatus = filterStatus === "all" || emp.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const nonEmployeeUsers = users.filter((u) => !u.isEmployee);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {t("admin.employees.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {t("admin.employees.title")}
        </h1>
        <p className="text-gray-600">
          {t("admin.employees.subtitle")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("admin.employees.stats.totalEmployees")}
              </p>
              <p className="text-2xl font-bold">{employees.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("admin.employees.roles.callcenter")}
              </p>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "callcenter").length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("admin.employees.roles.packer")}
              </p>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "packer").length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-100"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("admin.employees.roles.deliveryman")}
              </p>
              <p className="text-2xl font-bold">
                {employees.filter((e) => e.role === "deliveryman").length}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-success-highlight"></div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {t("admin.employees.status.active")}
              </p>
              <p className="text-2xl font-bold text-success-base">
                {employees.filter((e) => e.status === "active").length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-base" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="search">
              {t("admin.employees.searchLabel")}
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder={t("admin.employees.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="filterRole">
              {t("admin.employees.filterRole")}
            </Label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger id="filterRole">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.employees.allRoles")}</SelectItem>
                <SelectItem value="callcenter">
                  {t("admin.employees.roles.callcenter")}
                </SelectItem>
                <SelectItem value="packer">
                  {t("admin.employees.roles.packer")}
                </SelectItem>
                <SelectItem value="deliveryman">
                  {t("admin.employees.roles.deliveryman")}
                </SelectItem>
                <SelectItem value="incharge">
                  {t("admin.employees.roles.incharge")}
                </SelectItem>
                <SelectItem value="accounts">
                  {t("admin.employees.roles.accounts")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filterStatus">
              {t("admin.employees.filterStatus")}
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="filterStatus">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.employees.allStatuses")}</SelectItem>
                <SelectItem value="active">
                  {t("admin.employees.status.active")}
                </SelectItem>
                <SelectItem value="inactive">
                  {t("admin.employees.status.inactive")}
                </SelectItem>
                <SelectItem value="suspended">
                  {t("admin.employees.status.suspended")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {t("admin.employees.currentEmployees")}
          </h2>
          <Button
            onClick={() => {
              setSelectedUser(null);
              setSelectedRole("callcenter");
              setStaffRoleSelection([]);
              setShowAssignDialog(true);
            }}
            className="flex items-center gap-2"
            disabled={!canManageAccess}
          >
            <UserPlus className="h-4 w-4" />
            {t("admin.employees.addEmployee")}
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.employee")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.role")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.staffRoles")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.status")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.performance")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.assigned")}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("admin.employees.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {t("admin.employees.empty")}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {employee.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleBadgeColor(employee.role)}>
                        {roleLabel(employee.role)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {employee.staffRoles && employee.staffRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-w-xs">
                          {employee.staffRoles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="border border-gray-200 bg-gray-50 text-gray-800"
                            >
                              {staffRoleLabel(role)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          {t("admin.employees.none")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          employee.status === "active"
                            ? "default"
                            : employee.status === "suspended"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {statusLabel(employee.status)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {employee.performance ? (
                        <div>
                          <div>
                            {t("admin.employees.performance.processed", {
                              count: employee.performance.ordersProcessed || 0,
                            })}
                          </div>
                          {employee.role === "callcenter" && (
                            <div>
                              {t("admin.employees.performance.confirmed", {
                                count:
                                  employee.performance.ordersConfirmed || 0,
                              })}
                            </div>
                          )}
                          {employee.role === "packer" && (
                            <div>
                              {t("admin.employees.performance.packed", {
                                count: employee.performance.ordersPacked || 0,
                              })}
                            </div>
                          )}
                          {employee.role === "deliveryman" && (
                            <div>
                              {t("admin.employees.performance.delivered", {
                                count:
                                  employee.performance.ordersDelivered || 0,
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">
                          {t("admin.employees.performance.noData")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div>
                          {new Date(employee.assignedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {t("admin.employees.assignedBy", {
                            name: employee.assignedBy,
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openStaffRoleManager(employee)}
                          className="flex items-center gap-1"
                          disabled={!canManageAccess}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {t("admin.employees.staffRolesButton")}
                        </Button>
                        {employee.status === "active" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser({
                                _id: employee._id,
                                email: employee.email,
                                firstName: employee.firstName,
                                lastName: employee.lastName,
                                isEmployee: true,
                                employeeRole: employee.role,
                                employeeStatus: employee.status,
                                createdAt: employee.createdAt,
                                staffRoles: employee.staffRoles,
                              });
                              setShowSuspendDialog(true);
                            }}
                            className="flex items-center gap-1"
                            disabled={!canManageAccess}
                          >
                            <Ban className="h-3 w-3" />
                            {t("admin.employees.suspend")}
                          </Button>
                        ) : employee.status === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivate(employee._id)}
                            className="flex items-center gap-1 text-success-base"
                            disabled={!canManageAccess}
                          >
                            <CheckCircle className="h-3 w-3" />
                            {t("admin.employees.activate")}
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveRole(employee._id)}
                          className="flex items-center gap-1"
                          disabled={!canManageAccess}
                        >
                          <UserMinus className="h-3 w-3" />
                          {t("admin.employees.remove")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Employee Dialog */}
      <Dialog
        open={showAssignDialog}
        onOpenChange={(open) => {
          setShowAssignDialog(open);
          if (!open) {
            setSelectedUser(null);
            setStaffRoleSelection([]);
            setAssigningRole(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.employees.assign.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.employees.assign.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user">{t("admin.employees.assign.selectUser")}</Label>
              <Select
                value={selectedUser?._id}
                onValueChange={(value) => {
                  const user = nonEmployeeUsers.find((u) => u._id === value);
                  setStaffRoleSelection(normalizeStaffRolesSelection(user?.staffRoles));
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder={t("admin.employees.assign.chooseUser")} />
                </SelectTrigger>
                <SelectContent>
                  {nonEmployeeUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">{t("admin.employees.assign.employeeRole")}</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) =>
                  setSelectedRole(value as EmployeeRole)
                }
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="callcenter">
                    {t("admin.employees.roles.callcenter")}
                  </SelectItem>
                  <SelectItem value="packer">
                    {t("admin.employees.roles.packer")}
                  </SelectItem>
                  <SelectItem value="deliveryman">
                    {t("admin.employees.roles.deliveryman")}
                  </SelectItem>
                  <SelectItem value="incharge">
                    {t("admin.employees.roles.incharge")}
                  </SelectItem>
                  <SelectItem value="accounts">
                    {t("admin.employees.roles.accounts")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staffRoles">
                {t("admin.employees.assign.staffRolesOptional")}
              </Label>
              <StaffRolesPicker disabled={!canManageAccess} />
              <p className="text-xs text-gray-500">
                {t("admin.employees.assign.staffRolesHelp")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              {t("admin.employees.cancel")}
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!selectedUser || assigningRole || !canManageAccess}
            >
              {assigningRole
                ? t("admin.employees.assign.assigning")
                : t("admin.employees.assign.assign")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Staff Roles Dialog */}
      <Dialog
        open={showStaffRoleDialog}
        onOpenChange={(open) => {
          setShowStaffRoleDialog(open);
          if (!open) {
            setStaffRoleTarget(null);
            setStaffRoleSelection([]);
            setSavingStaffRoles(false);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("admin.employees.staffRoles.manageTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.employees.staffRoles.manageDescription", {
                name: `${staffRoleTarget?.firstName ?? ""} ${staffRoleTarget?.lastName ?? ""}`.trim(),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div className="font-semibold text-gray-900">
                {staffRoleTarget?.firstName} {staffRoleTarget?.lastName}
              </div>
              <div className="text-xs text-gray-500">{staffRoleTarget?.email}</div>
            </div>
            <StaffRolesPicker disabled={!canManageAccess} />
            <p className="text-xs text-gray-500">
              {t("admin.employees.staffRoles.manageHelp")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStaffRoleDialog(false)}
            >
              {t("admin.employees.cancel")}
            </Button>
            <Button
              onClick={handleSaveStaffRoles}
              disabled={savingStaffRoles || !canManageAccess}
            >
              {savingStaffRoles
                ? t("admin.employees.staffRoles.saving")
                : t("admin.employees.staffRoles.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Employee Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.employees.suspend.title")}</DialogTitle>
            <DialogDescription>
              {t("admin.employees.suspend.description", {
                name: `${selectedUser?.firstName ?? ""} ${selectedUser?.lastName ?? ""}`.trim(),
              })}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="reason">{t("admin.employees.suspend.reasonLabel")}</Label>
            <Textarea
              id="reason"
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              placeholder={t("admin.employees.suspend.reasonPlaceholder")}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuspendDialog(false);
                setSuspensionReason("");
              }}
            >
              {t("admin.employees.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspensionReason.trim()}
            >
              {t("admin.employees.suspend.action")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
