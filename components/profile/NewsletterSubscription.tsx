"use client";

import "@/app/i18n";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Mail, Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { checkSubscriptionStatus } from "@/actions/subscriptionActions";
import { useTranslation } from "react-i18next";

export default function NewsletterSubscription() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  useEffect(() => {
    const checkStatus = async () => {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      try {
        const status = await checkSubscriptionStatus(userEmail);
        setIsSubscribed(status.subscribed);
      } catch (error) {
        console.error("Error checking subscription status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [userEmail]);

  const handleSubscribe = async () => {
    if (!userEmail) {
      toast.error(t("client.userSettings.newsletter.toast.emailMissing"));
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(true);
        toast.success(
          data.message ||
            t("client.userSettings.newsletter.toast.subscribed")
        );
      } else {
        if (data.alreadySubscribed) {
          setIsSubscribed(true);
          toast.info(
            data.error ||
              t("client.userSettings.newsletter.toast.alreadySubscribed")
          );
        } else {
          toast.error(
            data.error ||
              t("client.userSettings.newsletter.toast.subscribeFailed")
          );
        }
      }
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error(t("client.userSettings.newsletter.toast.genericError"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!userEmail) {
      toast.error(t("client.userSettings.newsletter.toast.emailMissing"));
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubscribed(false);
        toast.success(
          data.message ||
            t("client.userSettings.newsletter.toast.unsubscribed")
        );
      } else {
        toast.error(
          data.error ||
            t("client.userSettings.newsletter.toast.unsubscribeFailed")
        );
      }
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error(t("client.userSettings.newsletter.toast.genericError"));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="mr-2 h-5 w-5" />
            {t("client.userSettings.newsletter.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          {t("client.userSettings.newsletter.title")}
        </CardTitle>
        <CardDescription>
          {t("client.userSettings.newsletter.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50">
          <div className="flex items-center space-x-3">
            {isSubscribed ? (
              <>
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-success-highlight rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-success-base" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t("client.userSettings.newsletter.status.subscribed")}
                  </p>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                </div>
              </>
            ) : (
              <>
                <div className="shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {t("client.userSettings.newsletter.status.notSubscribed")}
                  </p>
                  <p className="text-sm text-gray-600">{userEmail}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Benefits Section */}
        {!isSubscribed && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 text-sm mb-3">
              {t("client.userSettings.newsletter.benefits.title")}
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span>
                  {t("client.userSettings.newsletter.benefits.items.deals")}
                </span>
              </li>
              <li className="flex items-start">
                <span>
                  {t("client.userSettings.newsletter.benefits.items.earlyAccess")}
                </span>
              </li>
              <li className="flex items-start">
                <span>
                  {t("client.userSettings.newsletter.benefits.items.freeShipping")}
                </span>
              </li>
              <li className="flex items-start">
                <span>
                  {t("client.userSettings.newsletter.benefits.items.tips")}
                </span>
              </li>
              <li className="flex items-start">
                <span>
                  {t("client.userSettings.newsletter.benefits.items.birthday")}
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          {isSubscribed ? (
            <Button
              variant="outline"
              onClick={handleUnsubscribe}
              disabled={isProcessing}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("client.userSettings.newsletter.actions.unsubscribing")}
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t("client.userSettings.newsletter.actions.unsubscribe")}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("client.userSettings.newsletter.actions.subscribing")}
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {t("client.userSettings.newsletter.actions.subscribe")}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center">
          {isSubscribed
            ? t("client.userSettings.newsletter.info.subscribed")
            : t("client.userSettings.newsletter.info.unsubscribed")}
        </p>
      </CardContent>
    </Card>
  );
}

