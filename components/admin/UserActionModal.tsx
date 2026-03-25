import { FC } from "react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  UserCheck,
  UserX,
  Database,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    inSanity: boolean;
    notificationCount?: number;
  } | null;
  action: "activate" | "deactivate" | "delete" | null;
  isLoading: boolean;
}

export const UserActionModal: FC<UserActionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  action,
  isLoading,
}) => {
  const { t } = useTranslation();
  if (!user || !action) return null;

  const getActionConfig = () => {
    switch (action) {
      case "activate":
        return {
          title: user.inSanity
            ? t("admin.userActionModal.activate.title")
            : t("admin.userActionModal.add.title"),
          icon: <UserCheck className="h-5 w-5 text-success-base" />,
          description: user.inSanity
            ? t("admin.userActionModal.activate.description")
            : t("admin.userActionModal.add.description"),
          confirmText: user.inSanity
            ? t("admin.userActionModal.activate.confirm")
            : t("admin.userActionModal.add.confirm"),
          confirmVariant: "default" as const,
          consequences: [
            user.inSanity
              ? t("admin.userActionModal.activate.consequence1")
              : t("admin.userActionModal.add.consequence1"),
            t("admin.userActionModal.shared.consequence2"),
            t("admin.userActionModal.shared.consequence3"),
            t("admin.userActionModal.shared.consequence4"),
          ],
        };

      case "deactivate":
        return {
          title: t("admin.userActionModal.deactivate.title"),
          icon: <UserX className="h-5 w-5 text-brand-red-accent" />,
          description: t("admin.userActionModal.deactivate.description"),
          confirmText: t("admin.userActionModal.deactivate.confirm"),
          confirmVariant: "destructive" as const,
          consequences: [
            t("admin.userActionModal.deactivate.consequence1"),
            t("admin.userActionModal.deactivate.consequence2"),
            t("admin.userActionModal.deactivate.consequence3"),
            t("admin.userActionModal.deactivate.consequence4"),
          ],
        };

      case "delete":
        return {
          title: t("admin.userActionModal.delete.title"),
          icon: <Trash2 className="h-5 w-5 text-red-600" />,
          description: t("admin.userActionModal.delete.description"),
          confirmText: t("admin.userActionModal.delete.confirm"),
          confirmVariant: "destructive" as const,
          consequences: [
            t("admin.userActionModal.delete.consequence1"),
            t("admin.userActionModal.delete.consequence2"),
            t("admin.userActionModal.delete.consequence3"),
            t("admin.userActionModal.delete.consequence4"),
            t("admin.userActionModal.delete.consequence5"),
          ],
        };

      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-6 border bg-background p-6 shadow-lg duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg"
          )}
        >
          <VisuallyHidden.Root>
            <DialogTitle>{config.title}</DialogTitle>
          </VisuallyHidden.Root>

          {/* Header */}
          <div className="text-center space-y-3">
            <div
              className={cn(
                "mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300",
                action === "activate"
                  ? "bg-green-50 border-success-highlight"
                  : action === "deactivate"
                  ? "bg-orange-50 border-brand-red-accent/10"
                  : "bg-red-50 border-red-100"
              )}
            >
              <div
                className={cn(
                  "transition-transform duration-300",
                  action === "activate" ? "animate-pulse" : ""
                )}
              >
                {config.icon}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900">
                {config.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {config.description}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* User Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="font-medium text-center">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-sm text-gray-600 text-center">
                {user.email}
              </div>
              <div className="flex gap-2 mt-3 justify-center">
                <Badge variant={user.isActive ? "default" : "secondary"}>
                  {user.isActive ? t("admin.userActionModal.status.active") : t("admin.userActionModal.status.inactive")}
                </Badge>
                <Badge variant={user.inSanity ? "default" : "outline"}>
                  <Database className="h-3 w-3 mr-1" />
                  {user.inSanity ? t("admin.userActionModal.status.inSanity") : t("admin.userActionModal.status.clerkOnly")}
                </Badge>
                {user.notificationCount && user.notificationCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {t("admin.userActionModal.status.notificationsCount", { count: user.notificationCount })}
                  </Badge>
                )}
              </div>
            </div>

            {/* Consequences */}
            <div
              className={cn(
                "p-4 rounded-lg border",
                action === "activate"
                  ? "bg-green-50 border-success-highlight"
                  : action === "deactivate"
                  ? "bg-orange-50 border-brand-red-accent/20"
                  : "bg-blue-50 border-blue-200"
              )}
            >
              <h4
                className={cn(
                  "font-medium text-sm mb-3",
                  action === "activate"
                    ? "text-success-base"
                    : action === "deactivate"
                    ? "text-brand-red-accent"
                    : "text-blue-900"
                )}
              >
                {t("admin.userActionModal.consequencesTitle")}
              </h4>
              <ul
                className={cn(
                  "text-sm space-y-2",
                  action === "activate"
                    ? "text-success-base"
                    : action === "deactivate"
                    ? "text-brand-red-accent"
                    : "text-blue-800"
                )}
              >
                {config.consequences.map((consequence, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 font-bold",
                        action === "activate"
                          ? "text-success-base"
                          : action === "deactivate"
                          ? "text-brand-red-accent"
                          : "text-blue-400"
                      )}
                    >
                      •
                    </span>
                    <span>{consequence}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Warning for destructive actions */}
            {(action === "delete" ||
              (action === "deactivate" &&
                user.notificationCount &&
                user.notificationCount > 0)) && (
              <div className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 animate-pulse" />
                <div className="text-sm text-red-800">
                  {action === "delete"
                    ? t("admin.userActionModal.warning.delete")
                    : t("admin.userActionModal.warning.deactivate", { count: user.notificationCount ?? 0 })}
                </div>
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 border-gray-300 hover:bg-gray-50 font-medium"
            >
              {t("admin.userActionModal.cancel")}
            </Button>
            <Button
              variant={config.confirmVariant}
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                "flex-1 font-semibold shadow-lg",
                config.confirmVariant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 hover:shadow-red-200"
                  : "bg-brand-black-strong hover:bg-brand-red-accent hover:shadow-green-200"
              )}
            >
              {isLoading ? t("admin.userActionModal.processing") : config.confirmText}
            </Button>
          </div>

          {/* Close Button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("admin.userActionModal.close")}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
