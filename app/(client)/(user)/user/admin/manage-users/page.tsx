"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Crown } from "lucide-react";
import { useTranslation } from "react-i18next";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function AdminUserManagement() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetPremium = async (setPremium: boolean) => {
    if (!email.trim()) {
      toast.error(t("client.userAdmin.manageUsers.toast.emailRequired"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/manage-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          setPremium,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setEmail(""); // Clear the input
      } else {
        toast.error(
          data.error || t("client.userAdmin.manageUsers.toast.manageFailed")
        );
      }
    } catch (error) {
      console.error("Error managing user:", error);
      toast.error(t("client.userAdmin.manageUsers.toast.manageFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handlePremiumRequestAccess = async (enablePremiumRequest: boolean) => {
    if (!email.trim()) {
      toast.error(t("client.userAdmin.manageUsers.toast.emailRequired"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/manage-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          setPremiumRequestEnabled: enablePremiumRequest,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setEmail("");
      } else {
        toast.error(
          data.error ||
            t("client.userAdmin.manageUsers.toast.requestAccessFailed")
        );
      }
    } catch (error) {
      console.error("Error updating premium request access:", error);
      toast.error(t("client.userAdmin.manageUsers.toast.requestAccessFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t("client.userAdmin.manageUsers.title")}
        </h1>
        <p className="text-gray-600">
          {t("client.userAdmin.manageUsers.subtitle")}
        </p>
      </div>

      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t("client.userAdmin.manageUsers.sections.premiumStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">
                {t("client.userAdmin.manageUsers.fields.email")}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t("client.userAdmin.manageUsers.fields.placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => handleSetPremium(true)}
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading
                  ? t("client.userAdmin.manageUsers.actions.processing")
                  : t("client.userAdmin.manageUsers.actions.setPremium")}
              </Button>

              <Button
                onClick={() => handleSetPremium(false)}
                disabled={loading}
                variant="outline"
              >
                <User className="w-4 h-4 mr-2" />
                {loading
                  ? t("client.userAdmin.manageUsers.actions.processing")
                  : t("client.userAdmin.manageUsers.actions.setStandard")}
              </Button>

              <Button
                onClick={() => handlePremiumRequestAccess(true)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading
                  ? t("client.userAdmin.manageUsers.actions.processing")
                  : t("client.userAdmin.manageUsers.actions.enableRequest")}
              </Button>

              <Button
                onClick={() => handlePremiumRequestAccess(false)}
                disabled={loading}
                variant="outline"
              >
                <User className="w-4 h-4 mr-2" />
                {loading
                  ? t("client.userAdmin.manageUsers.actions.processing")
                  : t("client.userAdmin.manageUsers.actions.disableRequest")}
              </Button>
            </div>

            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>
                  {t("client.userAdmin.manageUsers.help.premiumTitle")}
                </strong>{" "}
                {t("client.userAdmin.manageUsers.help.premiumBody")}
              </p>
              <p>
                <strong>
                  {t("client.userAdmin.manageUsers.help.standardTitle")}
                </strong>{" "}
                {t("client.userAdmin.manageUsers.help.standardBody")}
              </p>
              <p>
                <strong>
                  {t("client.userAdmin.manageUsers.help.requestTitle")}
                </strong>{" "}
                {t("client.userAdmin.manageUsers.help.requestBody")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("client.userAdmin.manageUsers.sections.quickAccess")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ADMIN_EMAIL && (
                <Button
                  onClick={() => setEmail(ADMIN_EMAIL)}
                  variant="outline"
                  size="sm"
                >
                  {t("client.userAdmin.manageUsers.actions.setCurrentUser", {
                    email: ADMIN_EMAIL,
                  })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
