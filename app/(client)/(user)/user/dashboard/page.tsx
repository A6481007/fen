"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Heart,
  Bell,
  Star,
  TrendingUp,
  Clock,
  CalendarClock,
  ArrowRight,
  User,
  CheckCircle,
  Wallet,
  MapPin,
  FileText,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PremiumBanner from "@/components/ui/premium-banner";
import PremiumBadge from "@/components/ui/premium-badge";
import ApplicationSuccessNotification from "@/components/ui/application-success-notification";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AddressForm,
  type AddressFormValues,
} from "@/components/addresses/AddressForm";
import type { Address } from "@/lib/address";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import { usePricingSettings } from "@/lib/hooks/usePricingSettings";
import { useTranslation } from "react-i18next";

interface UserStats {
  ordersCount: number;
  wishlistCount: number;
  notificationsCount: number;
  unreadNotifications: number;
  registrationsCount: number;
  rewardPoints: number;
  walletBalance: number;
}

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: "order" | "notification" | "wishlist" | "registration";
}

interface DashboardOrder {
  _id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  address?: Address;
  quotationDetails?: Address;
}

interface UserProfile {
  _id: string;
  isActive: boolean; // Premium account status
  isBusiness: boolean; // Dealer account status
  premiumStatus: "none" | "pending" | "active" | "rejected" | "cancelled";
  businessStatus: "none" | "pending" | "active" | "rejected" | "cancelled";
  membershipType: string;
  premiumRequestEnabled?: boolean;
  firstName?: string;
  lastName?: string;
  businessApprovedBy?: string;
  businessApprovedAt?: string;
  premiumAppliedAt?: string;
  premiumApprovedBy?: string;
  premiumApprovedAt?: string;
  businessAppliedAt?: string;
  rejectionReason?: string;
}

export default function UserDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [stats, setStats] = useState<UserStats>({
    ordersCount: 0,
    wishlistCount: 0,
    notificationsCount: 0,
    unreadNotifications: 0,
    registrationsCount: 0,
    rewardPoints: 0,
    walletBalance: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [latestOrder, setLatestOrder] = useState<DashboardOrder | null>(null);
  const [orderLookupQuery, setOrderLookupQuery] = useState("");
  const [orderLookupStatus, setOrderLookupStatus] = useState("all");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [selectedShippingAddressId, setSelectedShippingAddressId] =
    useState<string>("");
  const [selectedQuotationAddressId, setSelectedQuotationAddressId] =
    useState<string>("shipping");
  const [addressFormMode, setAddressFormMode] = useState<
    "add" | "edit" | null
  >(null);
  const [addressFormContext, setAddressFormContext] = useState<
    "shipping" | "quotation"
  >("shipping");
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSettingDefaultShipping, setIsSettingDefaultShipping] =
    useState(false);
  const [isApplyingBusiness, setIsApplyingBusiness] = useState<boolean>(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState<
    "premium" | "business"
  >("premium");
  const { dealerDiscountPercent, dealerBenefits, premiumBenefits } =
    usePricingSettings();
  const dealerDiscountLabel = Number.isInteger(dealerDiscountPercent)
    ? dealerDiscountPercent.toFixed(0)
    : dealerDiscountPercent.toFixed(2);
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
  const resolveBenefitTitle = (
    title: string | undefined,
    fallbackKey: string,
    defaultTitle: string
  ) => {
    if (!title) return t(fallbackKey);
    const normalized = title.trim().toLowerCase();
    return normalized === defaultTitle.toLowerCase()
      ? t(fallbackKey)
      : title;
  };
  const defaultDealerTitleApply = "Dealer Account Benefits";
  const defaultDealerTitlePending = "Dealer Account Benefits (Upon Approval)";
  const defaultDealerTitleActive = "Active Dealer Benefits";
  const defaultPremiumTitleActive = "Premium Benefits";
  const showDealerBenefits =
    dealerBenefits.enabled && dealerBenefitsItems.length > 0;
  const showPremiumBenefits =
    premiumBenefits.enabled && premiumBenefitsItems.length > 0;
  const dealerDiscountCopy =
    dealerDiscountPercent > 0
      ? t("client.userDashboard.dealerDiscount.withPercent", {
          percent: dealerDiscountLabel,
        })
      : t("client.userDashboard.dealerDiscount.noPercent");
  const orderLookupParams = new URLSearchParams();
  if (orderLookupQuery.trim()) {
    orderLookupParams.set("q", orderLookupQuery.trim());
  }
  if (orderLookupStatus !== "all") {
    orderLookupParams.set("status", orderLookupStatus);
  }
  const orderLookupHref = `/user/orders${
    orderLookupParams.toString()
      ? `?${orderLookupParams.toString()}`
      : ""
  }`;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statusResponse, statsResponse, addressesResponse] =
          await Promise.all([
            fetch("/api/user/status"),
            fetch("/api/user/dashboard/stats"),
            fetch("/api/user/addresses"),
          ]);

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setUserProfile(statusData.userProfile);
        }

        if (statsResponse.ok) {
          const data = await statsResponse.json();
          if (data.success) {
            setStats(data.stats);
            setRecentActivity(data.recentActivity);
            setLatestOrder(data.latestOrder ?? null);
          }
        }

        if (addressesResponse.ok) {
          const data = await addressesResponse.json();
          setAddresses(data.addresses || []);
          setAddressesError(null);
        } else {
          const errorData = await addressesResponse.json().catch(() => null);
          setAddressesError(
            errorData?.error || t("client.userDashboard.addresses.errors.load")
          );
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setAddressesError(t("client.userDashboard.addresses.errors.load"));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const handlePremiumRegister = () => {
    // Show success notification instead of immediate reload
    setNotificationType("premium");
    setShowSuccessNotification(true);
  };

  const handleBusinessAccountApply = async () => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      toast.error(t("client.userDashboard.toast.userEmailMissing"));
      return;
    }

    setIsApplyingBusiness(true);
    try {
      const response = await fetch("/api/user/business-apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.emailAddresses[0].emailAddress,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success notification instead of toast and reload
        setNotificationType("business");
        setShowSuccessNotification(true);
        // Also update the user profile to reflect pending status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(
          data.error || t("client.userDashboard.toast.dealerApplyFailed")
        );
      }
    } catch (error) {
      console.error("Error applying for dealer account:", error);
      toast.error(t("client.userDashboard.toast.applicationSubmitFailed"));
    } finally {
      setIsApplyingBusiness(false);
    }
  };

  const handleCancelApplication = async (
    applicationType: "premium" | "business"
  ) => {
    if (!user?.emailAddresses?.[0]?.emailAddress) {
      toast.error(t("client.userDashboard.toast.userEmailMissing"));
      return;
    }

    setIsApplyingBusiness(true);
    try {
      const response = await fetch("/api/user/cancel-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.emailAddresses[0].emailAddress,
          applicationType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Refresh user profile
        window.location.reload();
      } else {
        toast.error(
          data.error || t("client.userDashboard.toast.cancelFailed")
        );
      }
    } catch (error) {
      console.error("Error cancelling application:", error);
      toast.error(t("client.userDashboard.toast.cancelFailed"));
    } finally {
      setIsApplyingBusiness(false);
    }
  };

  const buildAddressLine = (address?: Address | null) => {
    if (!address) return "";
    return [address.address, address.subArea].filter(Boolean).join(", ");
  };

  const buildRegionLine = (address?: Address | null) => {
    if (!address) return "";
    return [address.city, address.state, address.zip]
      .filter(Boolean)
      .join(", ");
  };

  const formatAddressLabel = (address: Address) => {
    const parts = [address.name, address.address, address.city]
      .filter(Boolean)
      .join(" - ");
    return address.default
      ? t("client.userDashboard.addresses.defaultLabel", { label: parts })
      : parts;
  };

  const userEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const selectedShippingAddress =
    addresses.find((address) => address._id === selectedShippingAddressId) ??
    addresses.find((address) => address.default) ??
    addresses[0] ??
    null;
  const selectedQuotationAddress =
    selectedQuotationAddressId === "shipping"
      ? null
      : addresses.find(
          (address) => address._id === selectedQuotationAddressId
        ) ?? null;
  const effectiveQuotationDetails =
    selectedQuotationAddress ?? selectedShippingAddress ?? null;
  const shippingContactEmail =
    selectedShippingAddress?.contactEmail ||
    selectedShippingAddress?.email ||
    userEmail ||
    "";
  const quotationContactEmail =
    effectiveQuotationDetails?.contactEmail ||
    effectiveQuotationDetails?.email ||
    userEmail ||
    "";
  const isDealerActive =
    userProfile?.isBusiness === true ||
    userProfile?.businessStatus === "active" ||
    userProfile?.membershipType === "business";
  const canRequestPremium =
    Boolean(userProfile && isDealerActive && userProfile.premiumRequestEnabled) &&
    !userProfile?.isActive &&
    userProfile?.premiumStatus !== "pending" &&
    userProfile?.premiumStatus !== "rejected";
  const canApplyForDealer =
    !userProfile ||
    (!isDealerActive &&
      userProfile.businessStatus !== "pending" &&
      userProfile.businessStatus !== "rejected");

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedShippingAddressId("");
      setSelectedQuotationAddressId("shipping");
      return;
    }

    const defaultShippingId =
      addresses.find((address) => address.default)?._id ??
      addresses[0]?._id ??
      "";

    setSelectedShippingAddressId((prev) =>
      prev && addresses.some((address) => address._id === prev)
        ? prev
        : defaultShippingId
    );

    setSelectedQuotationAddressId((prev) => {
      if (prev === "shipping") return "shipping";
      return addresses.some((address) => address._id === prev)
        ? prev
        : "shipping";
    });
  }, [addresses]);

  const refreshAddresses = async () => {
    try {
      const response = await fetch("/api/user/addresses");
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || t("client.userDashboard.addresses.errors.load")
        );
      }
      const data = await response.json();
      setAddresses(data.addresses || []);
      setAddressesError(null);
    } catch (error) {
      console.error("Error refreshing addresses:", error);
      setAddressesError(
        error instanceof Error
          ? error.message
          : t("client.userDashboard.addresses.errors.load")
      );
    }
  };

  const buildAddressPayload = (values: AddressFormValues | Address) => ({
    _id: values._id,
    name: values.name,
    email: values.email,
    address: values.address,
    city: values.city,
    state: values.state,
    zip: values.zip,
    country: values.country,
    countryCode: values.countryCode ?? "",
    stateCode: values.stateCode ?? "",
    subArea: values.subArea ?? "",
    phone: values.phone ?? "",
    fax: values.fax ?? "",
    contactEmail: values.contactEmail ?? values.email ?? userEmail,
    lineId: values.lineId ?? "",
    company: values.company ?? "",
    taxId: values.taxId ?? "",
    branch: values.branch ?? "",
    type: values.type ?? "home",
    default: Boolean(values.default),
  });

  const handleAddressFormSubmit = async (values: AddressFormValues) => {
    setIsSavingAddress(true);
    try {
      const isEdit = addressFormMode === "edit" && Boolean(values._id);
      const payload = buildAddressPayload(values);
      if (!isEdit) {
        delete (payload as { _id?: string })._id;
      }

      const response = await fetch("/api/user/addresses", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || t("client.userDashboard.addresses.errors.save")
        );
      }

      const savedAddress = data?.address ?? values;
      if (addressFormContext === "shipping" && savedAddress?._id) {
        setSelectedShippingAddressId(savedAddress._id);
      }
      if (addressFormContext === "quotation" && savedAddress?._id) {
        setSelectedQuotationAddressId(savedAddress._id);
      }

      toast.success(
        isEdit
          ? t("client.userDashboard.addresses.toast.updated")
          : t("client.userDashboard.addresses.toast.saved")
      );
      setAddressFormMode(null);
      setEditingAddress(null);
      await refreshAddresses();
    } catch (error) {
      console.error("Failed to save address:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.userDashboard.addresses.errors.save")
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultShipping = async () => {
    if (!selectedShippingAddress) {
      toast.error(t("client.userDashboard.addresses.errors.selectShipping"));
      return;
    }

    setIsSettingDefaultShipping(true);
    try {
      const payload = buildAddressPayload({
        ...selectedShippingAddress,
        contactEmail:
          selectedShippingAddress.contactEmail ||
          selectedShippingAddress.email ||
          userEmail,
        email: selectedShippingAddress.email || userEmail,
        default: true,
      });

      const response = await fetch("/api/user/addresses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || t("client.userDashboard.addresses.errors.default")
        );
      }

      toast.success(t("client.userDashboard.addresses.toast.defaultUpdated"));
      await refreshAddresses();
    } catch (error) {
      console.error("Failed to set default address:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.userDashboard.addresses.errors.default")
      );
    } finally {
      setIsSettingDefaultShipping(false);
    }
  };

  const handleAddShippingAddress = () => {
    setAddressFormContext("shipping");
    setAddressFormMode("add");
    setEditingAddress(null);
  };

  const handleEditShippingAddress = () => {
    if (!selectedShippingAddress) {
      toast.error(t("client.userDashboard.addresses.errors.selectShipping"));
      return;
    }
    setAddressFormContext("shipping");
    setAddressFormMode("edit");
    setEditingAddress(selectedShippingAddress);
  };

  const handleAddQuotationDetails = () => {
    setAddressFormContext("quotation");
    setAddressFormMode("add");
    setEditingAddress(null);
  };

  const handleEditQuotationDetails = () => {
    if (!effectiveQuotationDetails) {
      toast.error(t("client.userDashboard.addresses.errors.addShippingFirst"));
      return;
    }

    setAddressFormContext("quotation");
    if (selectedQuotationAddress) {
      setAddressFormMode("edit");
      setEditingAddress(selectedQuotationAddress);
    } else {
      setAddressFormMode("add");
      setEditingAddress({ ...effectiveQuotationDetails, default: false });
    }
  };

  const addressFormInitialValues =
    addressFormMode === null
      ? undefined
      : editingAddress
        ? {
            ...editingAddress,
            _id: addressFormMode === "edit" ? editingAddress._id : undefined,
            default:
              addressFormContext === "shipping"
                ? Boolean(editingAddress.default)
                : false,
          }
        : {
            email: userEmail,
            contactEmail: userEmail,
            default: addresses.length === 0,
            country: t("client.userDashboard.addresses.defaults.country"),
            countryCode: "",
            stateCode: "",
            subArea: "",
          };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "notification":
        return <Bell className="h-4 w-4 text-purple-500" />;
      case "wishlist":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "registration":
        return <CalendarClock className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 60) {
      return t("client.userDashboard.activity.minutesAgo", {
        count: diffInMinutes,
      });
    } else if (diffInMinutes < 1440) {
      return t("client.userDashboard.activity.hoursAgo", {
        count: Math.floor(diffInMinutes / 60),
      });
    } else {
      return t("client.userDashboard.activity.daysAgo", {
        count: Math.floor(diffInMinutes / 1440),
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="animate-pulse">
          <div className="space-y-4 mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-80 bg-gray-200 rounded-lg"></div>
            <div className="h-80 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {t("client.userDashboard.welcome.title")}{" "}
                  {user?.firstName ||
                    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
                    t("client.userDashboard.welcome.fallbackName")}
                  !
                </h1>
                {userProfile?.isActive && (
                  <PremiumBadge
                    membershipType={userProfile.membershipType}
                    size="md"
                  />
                )}
                {userProfile?.isBusiness && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {t("client.userDashboard.welcome.dealerBadge")}
                  </div>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {t("client.userDashboard.welcome.subtitle")}
              </p>
            </div>
          </div>
        </div>
        <Separator className="my-6" />

        {/* Premium Banner for dealer users unlocked by admin */}
        {canRequestPremium && (
          <PremiumBanner
            onRegister={handlePremiumRegister}
            onDismiss={() => {}}
          />
        )}

        {/* Premium Application Status */}
        {userProfile && userProfile.premiumStatus === "pending" && (
          <div className="mb-6 p-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-400 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-amber-900 text-lg">
                    {t("client.userDashboard.premium.pending.title")}
                  </h3>
                  <div className="px-3 py-1 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                    {t("client.userDashboard.premium.pending.badge")}
                  </div>
                </div>
                <p className="text-amber-800 text-sm mb-3">
                  {t("client.userDashboard.premium.pending.body")}
                </p>
                <div className="bg-white/60 p-3 rounded-md border border-amber-200">
                  <h4 className="font-semibold text-amber-900 text-sm mb-2">
                    {t("client.userDashboard.premium.pending.nextTitle")}
                  </h4>
                  <ul className="text-amber-700 text-xs space-y-1">
                    <li>
                      {t("client.userDashboard.premium.pending.nextItems.review")}
                    </li>
                    <li>
                      {t("client.userDashboard.premium.pending.nextItems.email")}
                    </li>
                    <li>
                      {t("client.userDashboard.premium.pending.nextItems.unlock")}
                    </li>
                  </ul>
                </div>
                {userProfile.premiumAppliedAt && (
                  <p className="text-amber-600 text-xs mt-3">
                    {t("client.userDashboard.premium.pending.appliedOn")}{" "}
                    {new Date(userProfile.premiumAppliedAt).toLocaleDateString(
                      i18n.language,
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {userProfile && userProfile.premiumStatus === "rejected" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-900">
                  {t("client.userDashboard.premium.rejected.title")}
                </h3>
                <p className="text-red-700 text-sm">
                  {t("client.userDashboard.premium.rejected.body")}
                </p>
                {userProfile.rejectionReason && (
                  <p className="text-red-600 text-xs mt-1">
                    {t("client.userDashboard.premium.rejected.reason")}{" "}
                    {userProfile.rejectionReason}
                  </p>
                )}
              </div>
              <Button
                onClick={() => handleCancelApplication("premium")}
                disabled={isApplyingBusiness}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {t("client.userDashboard.premium.rejected.action")}
              </Button>
            </div>
          </div>
        )}

        {/* Premium Account Active Status */}
        {userProfile &&
          userProfile.isActive &&
          userProfile.premiumStatus === "active" && (
            <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-bold text-green-900 text-lg">
                      {t("client.userDashboard.premium.active.title")}
                    </h3>
                    <div className="px-3 py-1 bg-green-200 text-green-800 text-xs font-medium rounded-full">
                      {t("client.userDashboard.premium.active.badge")}
                    </div>
                  </div>
                  <p className="text-green-800 text-sm mb-3">
                    {t("client.userDashboard.premium.active.body")}
                  </p>
                  {showPremiumBenefits && (
                    <div className="bg-white/60 p-3 rounded-md border border-green-200">
                      <h4 className="font-semibold text-green-900 text-sm mb-2">
                        {resolveBenefitTitle(
                          premiumBenefits.titleActive,
                          "client.userDashboard.premium.active.benefitsTitle",
                          defaultPremiumTitleActive
                        )}
                        :
                      </h4>
                      <ul className="text-green-700 text-xs space-y-1">
                        {premiumBenefitsItems.map((item, index) => (
                          <li key={`${item.text}-${index}`}>
                            {translateBenefitText(item.text)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {userProfile.premiumApprovedAt &&
                    userProfile.premiumApprovedBy && (
                      <p className="text-green-600 text-xs mt-3">
                        {t("client.userDashboard.premium.active.approvedBy", {
                          name: userProfile.premiumApprovedBy,
                        })}{" "}
                        {new Date(
                          userProfile.premiumApprovedAt
                        ).toLocaleDateString(i18n.language, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

        {/* Dealer Account Application */}
        {canApplyForDealer && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {t("client.userDashboard.dealer.apply.title")}
                  </h3>
                  <p className="text-blue-700 text-sm mb-3">
                    {dealerDiscountCopy}
                  </p>
                  {showDealerBenefits && (
                    <div className="mb-4">
                      <p className="text-blue-700 text-sm font-medium mb-2">
                        {resolveBenefitTitle(
                          dealerBenefits.titleApply,
                          "client.userDashboard.dealer.apply.benefitsTitle",
                          defaultDealerTitleApply
                        )}
                        :
                      </p>
                      <ul className="text-blue-600 text-sm space-y-1">
                        {dealerBenefitsItems.map((item, index) => (
                          <li key={`${item.text}-${index}`}>
                            {translateBenefitText(item.text)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleBusinessAccountApply}
                  disabled={isApplyingBusiness}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isApplyingBusiness ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t("client.userDashboard.dealer.apply.applying")}
                    </div>
                  ) : (
                    t("client.userDashboard.dealer.apply.action")
                  )}
                </Button>
              </div>
            </div>
          )}

        {/* Dealer Application Status */}
        {userProfile && userProfile.businessStatus === "pending" && (
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-blue-900 text-lg">
                    {t("client.userDashboard.dealer.pending.title")}
                  </h3>
                  <div className="px-3 py-1 bg-blue-200 text-blue-800 text-xs font-medium rounded-full">
                    {t("client.userDashboard.dealer.pending.badge")}
                  </div>
                </div>
                <p className="text-blue-800 text-sm mb-3">
                  {t("client.userDashboard.dealer.pending.body")}
                </p>
                {showDealerBenefits && (
                  <div className="bg-white/60 p-3 rounded-md border border-blue-200">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">
                      {resolveBenefitTitle(
                        dealerBenefits.titlePending,
                        "client.userDashboard.dealer.pending.benefitsTitle",
                        defaultDealerTitlePending
                      )}
                      :
                    </h4>
                    <ul className="text-blue-700 text-xs space-y-1">
                      {dealerBenefitsItems.map((item, index) => (
                        <li key={`${item.text}-${index}`}>
                          {translateBenefitText(item.text)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {userProfile.businessAppliedAt && (
                  <p className="text-blue-600 text-xs mt-3">
                    {t("client.userDashboard.dealer.pending.appliedOn")}{" "}
                    {new Date(userProfile.businessAppliedAt).toLocaleDateString(
                      i18n.language,
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dealer Account Active Status */}
        {userProfile && userProfile.businessStatus === "active" && (
            <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-400 rounded-lg shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-emerald-900 text-lg">
                    {t("client.userDashboard.dealer.active.title")}
                  </h3>
                  <div className="px-3 py-1 bg-emerald-200 text-emerald-800 text-xs font-medium rounded-full">
                    {t("client.userDashboard.dealer.active.badge")}
                  </div>
                </div>
                <p className="text-emerald-800 text-sm mb-3">
                  {t("client.userDashboard.dealer.active.body")}
                </p>
                {showDealerBenefits && (
                  <div className="bg-white/60 p-3 rounded-md border border-emerald-200">
                    <h4 className="font-semibold text-emerald-900 text-sm mb-2">
                      {resolveBenefitTitle(
                        dealerBenefits.titleActive,
                        "client.userDashboard.dealer.active.benefitsTitle",
                        defaultDealerTitleActive
                      )}
                      :
                    </h4>
                    <ul className="text-emerald-700 text-xs space-y-1">
                      {dealerBenefitsItems.map((item, index) => (
                        <li key={`${item.text}-${index}`}>
                          {translateBenefitText(item.text)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {userProfile.businessApprovedAt &&
                  userProfile.businessApprovedBy && (
                    <p className="text-emerald-600 text-xs mt-3">
                      {t("client.userDashboard.dealer.active.approvedBy", {
                        name: userProfile.businessApprovedBy,
                      })}{" "}
                      {new Date(
                        userProfile.businessApprovedAt
                      ).toLocaleDateString(i18n.language, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        })}
                      </p>
                    )}
                </div>
              </div>
            </div>
          )}

        {userProfile && userProfile.businessStatus === "rejected" && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-900">
                  {t("client.userDashboard.dealer.rejected.title")}
                </h3>
                <p className="text-red-700 text-sm">
                  {t("client.userDashboard.dealer.rejected.body")}
                </p>
                {userProfile.rejectionReason && (
                  <p className="text-red-600 text-xs mt-1">
                    {t("client.userDashboard.dealer.rejected.reason")}{" "}
                    {userProfile.rejectionReason}
                  </p>
                )}
              </div>
              <Button
                onClick={() => handleCancelApplication("business")}
                disabled={isApplyingBusiness}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {t("client.userDashboard.dealer.rejected.action")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">
              {t("client.userDashboard.stats.orders.title")}
            </CardTitle>
            <Package className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.ordersCount}</div>
            <p className="text-xs text-blue-100">
              {t("client.userDashboard.stats.orders.subtitle")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">
              {t("client.userDashboard.stats.notifications.title")}
            </CardTitle>
            <Bell className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">
              {stats.notificationsCount}
            </div>
            <p className="text-xs text-purple-100">
              {t("client.userDashboard.stats.notifications.unread", {
                count: stats.unreadNotifications,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">
              {t("client.userDashboard.stats.wishlist.title")}
            </CardTitle>
            <Heart className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.wishlistCount}</div>
            <p className="text-xs text-red-100">
              {t("client.userDashboard.stats.wishlist.subtitle")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">
              {t("client.userDashboard.stats.registrations.title")}
            </CardTitle>
            <CalendarClock className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">
              {stats.registrationsCount}
            </div>
            <p className="text-xs text-amber-100">
              {t("client.userDashboard.stats.registrations.subtitle")}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium">
              {t("client.userDashboard.stats.points.title")}
            </CardTitle>
            <Star className="h-5 w-5" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stats.rewardPoints}</div>
            <p className="text-xs text-green-100">
              {t("client.userDashboard.stats.points.subtitle")}
            </p>
          </CardContent>
        </Card>

        {stats.walletBalance > 0 && (
          <Card className="bg-linear-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">
                {t("client.userDashboard.stats.wallet.title")}
              </CardTitle>
              <Wallet className="h-5 w-5" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                ${stats.walletBalance.toFixed(2)}
              </div>
              <p className="text-xs text-emerald-100">
                {t("client.userDashboard.stats.wallet.subtitle")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Content Section with Proper Spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-lg">
                  {t("client.userDashboard.activity.title")}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/user/notifications">
                  {t("client.userDashboard.activity.viewAll")}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CardDescription>
              {t("client.userDashboard.activity.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  {t("client.userDashboard.activity.empty")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={activity.id}>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-tight">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                    {index < recentActivity.slice(0, 5).length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-lg border-0 h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg">
                {t("client.userDashboard.quickActions.title")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("client.userDashboard.quickActions.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-4 rounded-lg border bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {t("client.userDashboard.orderFinder.title")}
                </p>
                {latestOrder && (
                  <Link
                    href={`/user/orders/${latestOrder._id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {t("client.userDashboard.orderFinder.latest")}
                  </Link>
                )}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t(
                      "client.userDashboard.orderFinder.searchPlaceholder"
                    )}
                    value={orderLookupQuery}
                    onChange={(event) => setOrderLookupQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={orderLookupStatus}
                  onValueChange={setOrderLookupStatus}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("client.userDashboard.orderFinder.status")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("client.userDashboard.orderFinder.statusAll")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.PENDING}>
                      {t("client.userDashboard.orderStatus.pending")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.PROCESSING}>
                      {t("client.userDashboard.orderStatus.processing")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.PAID}>
                      {t("client.userDashboard.orderStatus.paid")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.SHIPPED}>
                      {t("client.userDashboard.orderStatus.shipped")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.OUT_FOR_DELIVERY}>
                      {t("client.userDashboard.orderStatus.outForDelivery")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.DELIVERED}>
                      {t("client.userDashboard.orderStatus.delivered")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.CANCELLED}>
                      {t("client.userDashboard.orderStatus.cancelled")}
                    </SelectItem>
                    <SelectItem value={ORDER_STATUSES.QUOTATION_REQUESTED}>
                      {t("client.userDashboard.orderStatus.quotationRequested")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link href={orderLookupHref}>
                    {t("client.userDashboard.orderFinder.find")}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/user/orders">
                    {t("client.userDashboard.orderFinder.viewAll")}
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Link href="/user/orders">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  <Package className="mr-3 h-4 w-4 text-blue-500" />
                  <span className="font-medium">
                    {t("client.userDashboard.quickActions.orders")}
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>

              <Link href="/user/notifications">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                >
                  <Bell className="mr-3 h-4 w-4 text-purple-500" />
                  <span className="font-medium">
                    {t("client.userDashboard.quickActions.notifications")}
                  </span>
                  {stats.unreadNotifications > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {stats.unreadNotifications}
                    </Badge>
                  )}
                  {stats.unreadNotifications === 0 && (
                    <ArrowRight className="ml-auto h-4 w-4" />
                  )}
                </Button>
              </Link>

              <Link href="/wishlist">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                  <Heart className="mr-3 h-4 w-4 text-red-500" />
                  <span className="font-medium">
                    {t("client.userDashboard.quickActions.wishlist")}
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>

              <Link href="/user/profile">
                <Button
                  variant="outline"
                  className="w-full justify-start h-12 hover:bg-green-50 hover:border-green-200 transition-colors"
                >
                  <User className="mr-3 h-4 w-4 text-green-500" />
                  <span className="font-medium">
                    {t("client.userDashboard.quickActions.profile")}
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10">
        <Card className="shadow-lg border-0 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4 min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className="rounded-lg bg-blue-100 p-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg break-words">
                    {t("client.userDashboard.addresses.title")}
                  </CardTitle>
                  <CardDescription className="break-words">
                    {t("client.userDashboard.addresses.subtitle")}
                  </CardDescription>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-auto whitespace-normal text-left leading-tight sm:whitespace-nowrap"
              >
                <Link href="/account/addresses">
                  {t("client.userDashboard.addresses.manageAll")}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 min-w-0">
            {addressesError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {addressesError}
              </div>
            )}
            <div className="grid gap-6 lg:grid-cols-2 min-w-0">
              <div className="rounded-xl border bg-slate-50 p-4 min-w-0 overflow-hidden">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-600" />
                      <p className="text-sm font-semibold">
                        {t("client.userDashboard.addresses.shipping.title")}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("client.userDashboard.addresses.shipping.subtitle")}
                    </p>
                  </div>
                  {selectedShippingAddress?.default && (
                    <Badge variant="outline" className="text-xs">
                      {t("client.userDashboard.addresses.defaultBadge")}
                    </Badge>
                  )}
                </div>

                {addresses.length === 0 ? (
                  <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                    <p>{t("client.userDashboard.addresses.empty")}</p>
                    <Button size="sm" onClick={handleAddShippingAddress}>
                      {t("client.userDashboard.addresses.shipping.add")}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {t("client.userDashboard.addresses.savedLabel")}
                      </p>
                      <Select
                        value={selectedShippingAddress?._id || ""}
                        onValueChange={setSelectedShippingAddressId}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue
                            placeholder={t(
                              "client.userDashboard.addresses.selectPlaceholder"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                          {addresses.map((address) =>
                            address._id ? (
                              <SelectItem key={address._id} value={address._id}>
                                <span className="block whitespace-normal break-words">
                                  {formatAddressLabel(address)}
                                </span>
                              </SelectItem>
                            ) : null
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg border bg-white p-3 text-sm shadow-sm min-w-0">
                      {selectedShippingAddress ? (
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium break-words">
                              {selectedShippingAddress.name || "-"}
                            </p>
                            {selectedShippingAddress.company && (
                              <p className="text-xs text-muted-foreground break-words">
                                {selectedShippingAddress.company}
                              </p>
                            )}
                          </div>
                          <div className="text-muted-foreground break-words">
                            <p className="break-words">
                              {buildAddressLine(selectedShippingAddress) || "-"}
                            </p>
                            <p className="break-words">
                              {buildRegionLine(selectedShippingAddress) || "-"}
                            </p>
                            {selectedShippingAddress.country && (
                              <p className="break-words">
                                {selectedShippingAddress.country}
                              </p>
                            )}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.userDashboard.addresses.fields.phone")}
                              </p>
                              <p className="font-medium break-words">
                                {selectedShippingAddress.phone || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "client.userDashboard.addresses.fields.contactEmail"
                                )}
                              </p>
                              <p className="font-medium break-words">
                                {shippingContactEmail || "-"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {t(
                            "client.userDashboard.addresses.shipping.previewHint"
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditShippingAddress}
                        disabled={!selectedShippingAddress}
                      >
                        {t("client.userDashboard.addresses.actions.edit")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddShippingAddress}
                      >
                        {t("client.userDashboard.addresses.actions.addNew")}
                      </Button>
                      {!selectedShippingAddress?.default && (
                        <Button
                          size="sm"
                          onClick={handleSetDefaultShipping}
                          disabled={
                            isSettingDefaultShipping || !selectedShippingAddress
                          }
                        >
                          {isSettingDefaultShipping
                            ? t(
                                "client.userDashboard.addresses.actions.setting"
                              )
                            : t(
                                "client.userDashboard.addresses.actions.makeDefault"
                              )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border bg-slate-50 p-4 min-w-0 overflow-hidden">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <p className="text-sm font-semibold">
                        {t("client.userDashboard.addresses.quotation.title")}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("client.userDashboard.addresses.quotation.subtitle")}
                    </p>
                  </div>
                  {selectedQuotationAddressId !== "shipping" && (
                    <Badge variant="outline" className="text-xs">
                      {t("client.userDashboard.addresses.quotation.custom")}
                    </Badge>
                  )}
                </div>

                {addresses.length === 0 ? (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t("client.userDashboard.addresses.quotation.empty")}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {t("client.userDashboard.addresses.quotation.useFor")}
                      </p>
                      <Select
                        value={selectedQuotationAddressId}
                        onValueChange={setSelectedQuotationAddressId}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue
                            placeholder={t(
                              "client.userDashboard.addresses.quotation.choose"
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                          <SelectItem value="shipping">
                            {t(
                              "client.userDashboard.addresses.quotation.sameAsShipping"
                            )}
                          </SelectItem>
                          {addresses.map((address) =>
                            address._id ? (
                              <SelectItem key={address._id} value={address._id}>
                                <span className="block whitespace-normal break-words">
                                  {formatAddressLabel(address)}
                                </span>
                              </SelectItem>
                            ) : null
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="rounded-lg border bg-white p-3 text-sm shadow-sm min-w-0">
                      {effectiveQuotationDetails ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "client.userDashboard.addresses.fields.contactName"
                                )}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.name || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.userDashboard.addresses.fields.branch")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.branch || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.userDashboard.addresses.fields.phone")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.phone || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.userDashboard.addresses.fields.fax")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.fax || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.userDashboard.addresses.fields.line")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.lineId || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "client.userDashboard.addresses.fields.company"
                                )}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.company || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "client.userDashboard.addresses.fields.customerCode"
                                )}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.customerCode || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.userDashboard.addresses.fields.taxId")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.taxId || "-"}
                              </p>
                            </div>
                            <div className="sm:col-span-2">
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "client.userDashboard.addresses.fields.contactEmail"
                                )}
                              </p>
                              <p className="font-medium break-words">
                                {quotationContactEmail || "-"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("client.userDashboard.addresses.fields.address")}
                            </p>
                            <p className="font-medium break-words">
                              {buildAddressLine(effectiveQuotationDetails) ||
                                "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("client.userDashboard.addresses.fields.region")}
                            </p>
                            <p className="font-medium break-words">
                              {buildRegionLine(effectiveQuotationDetails) ||
                                "-"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {t(
                            "client.userDashboard.addresses.quotation.previewHint"
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddQuotationDetails}
                      >
                        {t("client.userDashboard.addresses.quotation.add")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditQuotationDetails}
                        disabled={!effectiveQuotationDetails}
                      >
                        {t("client.userDashboard.addresses.quotation.edit")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={addressFormMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddressFormMode(null);
            setEditingAddress(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {addressFormMode === "edit"
                ? addressFormContext === "quotation"
                  ? t(
                      "client.userDashboard.addresses.dialog.editQuotationTitle"
                    )
                  : t(
                      "client.userDashboard.addresses.dialog.editShippingTitle"
                    )
                : addressFormContext === "quotation"
                  ? t(
                      "client.userDashboard.addresses.dialog.addQuotationTitle"
                    )
                  : t(
                      "client.userDashboard.addresses.dialog.addShippingTitle"
                    )}
            </DialogTitle>
            <DialogDescription>
              {addressFormContext === "quotation"
                ? t(
                    "client.userDashboard.addresses.dialog.quotationDescription"
                  )
                : t(
                    "client.userDashboard.addresses.dialog.shippingDescription"
                  )}
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            initialValues={addressFormInitialValues}
            defaultContactEmail={
              addressFormContext === "quotation"
                ? quotationContactEmail
                : shippingContactEmail
            }
            onSubmit={handleAddressFormSubmit}
            onCancel={() => {
              setAddressFormMode(null);
              setEditingAddress(null);
            }}
            submitLabel={
              addressFormMode === "edit"
                ? addressFormContext === "quotation"
                  ? t("client.userDashboard.addresses.dialog.saveDetails")
                  : t("client.userDashboard.addresses.dialog.saveAddress")
                : addressFormContext === "quotation"
                  ? t("client.userDashboard.addresses.dialog.addDetails")
                  : t("client.userDashboard.addresses.dialog.addAddress")
            }
            isSubmitting={isSavingAddress}
            showDefaultToggle={addressFormContext === "shipping"}
            showLineIdField={addressFormContext === "quotation"}
          />
        </DialogContent>
      </Dialog>

      {/* Application Success Notification */}
      <ApplicationSuccessNotification
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        type={notificationType}
      />
    </div>
  );
}
