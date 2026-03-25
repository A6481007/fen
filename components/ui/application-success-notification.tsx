"use client";

import { useEffect, useState } from "react";
import { CheckCircle, X, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePricingSettings } from "@/lib/hooks/usePricingSettings";
import { useTranslation } from "react-i18next";

interface ApplicationSuccessNotificationProps {
  isVisible: boolean;
  onClose: () => void;
  type: "premium" | "business";
  userName?: string;
}

export default function ApplicationSuccessNotification({
  isVisible,
  onClose,
  type,
  userName = "",
}: ApplicationSuccessNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const { dealerBenefits, premiumBenefits } = usePricingSettings();
  const { t } = useTranslation();
  const resolvedUserName =
    userName || t("client.userDashboard.welcome.fallbackName");
  const dealerBenefitsItems = dealerBenefits.items.filter(
    (item) => item.enabled !== false && item.text.trim().length > 0
  );
  const premiumBenefitsItems = premiumBenefits.items.filter(
    (item) => item.enabled !== false && item.text.trim().length > 0
  );
  const benefitTextKeys: Record<string, string> = {
    "2% additional discount automatically applied at checkout":
      "client.userDashboard.benefits.dealer.items.discount",
    "Priority customer support":
      "client.userDashboard.benefits.dealer.items.prioritySupport",
    "Advanced bulk order management":
      "client.userDashboard.benefits.dealer.items.bulkManagement",
    "Professional invoicing":
      "client.userDashboard.benefits.dealer.items.invoicing",
    "Exclusive access to premium features":
      "client.userDashboard.benefits.premium.items.exclusiveAccess",
    "Enhanced rewards and loyalty points":
      "client.userDashboard.benefits.premium.items.rewards",
  };
  const translateBenefitText = (text: string) => {
    const key = benefitTextKeys[text];
    return key ? t(key) : text;
  };
  const benefitsItems =
    type === "premium" ? premiumBenefitsItems : dealerBenefitsItems;
  const showBenefits =
    type === "premium"
      ? premiumBenefits.enabled && premiumBenefitsItems.length > 0
      : dealerBenefits.enabled && dealerBenefitsItems.length > 0;

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // Auto-hide after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const config = {
    premium: {
      title: t("client.userDashboard.premium.pending.title"),
      subtitle: t("client.userDashboard.applicationSuccess.premium.subtitle", {
        name: resolvedUserName,
      }),
      description: t("client.userDashboard.premium.pending.body"),
      bgColor: "from-amber-500 to-yellow-500",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    business: {
      title: t("client.userDashboard.dealer.pending.title"),
      subtitle: t("client.userDashboard.applicationSuccess.dealer.subtitle", {
        name: resolvedUserName,
      }),
      description: t("client.userDashboard.dealer.pending.body"),
      bgColor: "from-blue-500 to-indigo-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
  };

  const currentConfig = config[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`max-w-lg w-full bg-white rounded-2xl shadow-2xl border border-gray-200 transform transition-all duration-500 ${
          isAnimating ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Header with gradient */}
        <div
          className={`p-6 bg-gradient-to-r ${currentConfig.bgColor} text-white rounded-t-2xl relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 opacity-20">
            <Sparkles className="w-24 h-24" />
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-4">
            <div className={`${currentConfig.iconBg} p-3 rounded-full`}>
              <CheckCircle className={`w-8 h-8 ${currentConfig.iconColor}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold">{currentConfig.title}</h3>
              <p className="text-white/90">{currentConfig.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-4">{currentConfig.description}</p>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span className="text-amber-800 font-medium text-sm">
              {t("client.userDashboard.applicationSuccess.statusPending")}
            </span>
          </div>

          {/* What's next */}
          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">
              {t("client.userDashboard.applicationSuccess.nextTitle")}
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                {t("client.userDashboard.applicationSuccess.nextItems.review")}
              </li>
              <li>
                {t("client.userDashboard.applicationSuccess.nextItems.email")}
              </li>
              <li>
                {t("client.userDashboard.applicationSuccess.nextItems.activate")}
              </li>
            </ul>
          </div>

          {/* Benefits preview */}
          {showBenefits && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">
                {type === "premium"
                  ? t("client.userDashboard.applicationSuccess.benefitsTitle.premium")
                  : t("client.userDashboard.applicationSuccess.benefitsTitle.dealer")}
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {benefitsItems.map((benefit, index) => (
                  <li key={`${benefit.text}-${index}`}>
                    {translateBenefitText(benefit.text)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 bg-gray-900 hover:bg-gray-800"
            >
              {t("client.userDashboard.applicationSuccess.actions.continue")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
