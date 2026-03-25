"use client";

import { useState } from "react";
import { Bell, Shield, Trash2, Download } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import NewsletterSubscription from "@/components/profile/NewsletterSubscription";
import { useTranslation } from "react-i18next";

export default function UserSettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    orderUpdates: true,
    marketingEmails: false,
    twoFactorAuth: false,
    profileVisibility: true,
  });

  const handleSettingChange = async (key: string, value: boolean) => {
    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (response.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));
        toast.success(t("client.userSettings.toast.updated"));
      } else {
        toast.error(t("client.userSettings.toast.updateFailed"));
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error(t("client.userSettings.toast.updateFailed"));
    }
  };

  const handleExportData = async () => {
    try {
      const response = await fetch("/api/user/export-data");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "user-data.json";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t("client.userSettings.toast.exported"));
      } else {
        toast.error(t("client.userSettings.toast.exportFailed"));
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error(t("client.userSettings.toast.exportFailed"));
    }
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        t("client.userSettings.confirm.deleteAccount")
      )
    ) {
      try {
        const response = await fetch("/api/user/delete-account", {
          method: "DELETE",
        });

        if (response.ok) {
          toast.success(t("client.userSettings.toast.deleteSuccess"));
          // Redirect to sign out or home page
        } else {
          toast.error(t("client.userSettings.toast.deleteFailed"));
        }
      } catch (error) {
        console.error("Error deleting account:", error);
        toast.error(t("client.userSettings.toast.deleteFailed"));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("client.userSettings.title")}
        </h1>
        <p className="text-gray-600">
          {t("client.userSettings.subtitle")}
        </p>
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2 h-5 w-5" />
            {t("client.userSettings.sections.notifications.title")}
          </CardTitle>
          <CardDescription>
            {t("client.userSettings.sections.notifications.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.emailNotifications")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.emailNotificationsHelp")}
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) =>
                handleSettingChange("emailNotifications", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.pushNotifications")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.pushNotificationsHelp")}
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) =>
                handleSettingChange("pushNotifications", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.orderUpdates")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.orderUpdatesHelp")}
              </p>
            </div>
            <Switch
              checked={settings.orderUpdates}
              onCheckedChange={(checked) =>
                handleSettingChange("orderUpdates", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.marketingEmails")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.marketingEmailsHelp")}
              </p>
            </div>
            <Switch
              checked={settings.marketingEmails}
              onCheckedChange={(checked) =>
                handleSettingChange("marketingEmails", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            {t("client.userSettings.sections.security.title")}
          </CardTitle>
          <CardDescription>
            {t("client.userSettings.sections.security.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.twoFactorAuth")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.twoFactorAuthHelp")}
              </p>
            </div>
            <Switch
              checked={settings.twoFactorAuth}
              onCheckedChange={(checked) =>
                handleSettingChange("twoFactorAuth", checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.profileVisibility")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.profileVisibilityHelp")}
              </p>
            </div>
            <Switch
              checked={settings.profileVisibility}
              onCheckedChange={(checked) =>
                handleSettingChange("profileVisibility", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Newsletter Subscription */}
      <NewsletterSubscription />

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            {t("client.userSettings.sections.data.title")}
          </CardTitle>
          <CardDescription>
            {t("client.userSettings.sections.data.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("client.userSettings.fields.exportData")}</Label>
              <p className="text-sm text-gray-500">
                {t("client.userSettings.fields.exportDataHelp")}
              </p>
            </div>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="mr-2 h-4 w-4" />
              {t("client.userSettings.actions.export")}
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start space-x-3">
                <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">
                    {t("client.userSettings.danger.title")}
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {t("client.userSettings.danger.description")}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={handleDeleteAccount}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("client.userSettings.actions.delete")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
