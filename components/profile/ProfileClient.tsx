"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Edit,
  Plus,
  Home,
  CheckCircle,
} from "lucide-react";
import "@/app/i18n";
import { useTranslation } from "react-i18next";
import ProfileEditSidebar from "./ProfileEditSidebar";
import AddressEditSidebar from "./AddressEditSidebar";
import type { Address } from "@/lib/address";

interface EmailAddress {
  emailAddress: string;
  id: string;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  emailAddresses: EmailAddress[];
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SanityUser {
  _id: string;
  clerkUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  phone?: string;
  dateOfBirth?: string;
  profileImage?: {
    asset: {
      _id: string;
      url: string;
    };
  };
  addresses?: Address[];
  preferences?: Record<string, unknown>;
  loyaltyPoints?: number;
  rewardPoints?: number;
  totalSpent?: number;
  lastLogin?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ProfileClientProps {
  userData: {
    clerk: ClerkUser;
    sanity: SanityUser | null;
  };
}

export default function ProfileClient({ userData }: ProfileClientProps) {
  const { clerk, sanity } = userData;
  const { t } = useTranslation();
  const [profileSidebarOpen, setProfileSidebarOpen] = useState(false);
  const [addressSidebarOpen, setAddressSidebarOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const displayName =
    clerk.firstName && clerk.lastName
      ? `${clerk.firstName} ${clerk.lastName}`
      : sanity?.firstName && sanity?.lastName
      ? `${sanity.firstName} ${sanity.lastName}`
      : clerk.firstName || sanity?.firstName || t("client.profile.fallbackName");

  const displayEmail =
    clerk.emailAddresses?.[0]?.emailAddress || sanity?.email || "";

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

  const refreshAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const response = await fetch("/api/user/addresses");
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || t("client.profile.addressesError"));
      }
      const data = await response.json();
      setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      setAddressesError(null);
    } catch (error) {
      console.error("Failed to load addresses:", error);
      setAddressesError(
        error instanceof Error ? error.message : t("client.profile.addressesError")
      );
    } finally {
      setAddressesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshAddresses();
  }, [refreshAddresses]);

  const handleEditProfile = () => {
    setProfileSidebarOpen(true);
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressSidebarOpen(true);
  };

  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressSidebarOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8">
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={clerk.imageUrl || sanity?.profileImage?.asset?.url}
                    alt={displayName}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {displayName}
                  </h1>
                  <p className="text-gray-600 flex items-center mt-1">
                    <Mail className="h-4 w-4 mr-2" />
                    {displayEmail}
                  </p>
                  {sanity?.phone && (
                    <p className="text-gray-600 flex items-center mt-1">
                      <Phone className="h-4 w-4 mr-2" />
                      {sanity.phone}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={handleEditProfile}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>{t("client.profile.editProfile")}</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t("client.profile.memberSince")}
                  </p>
                  <p className="font-medium">
                    {new Date(clerk.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {sanity?.rewardPoints !== undefined && (
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-success-highlight rounded-lg">
                    <Shield className="h-5 w-5 text-success-base" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      {t("client.profile.rewardPoints")}
                    </p>
                    <p className="font-medium">{sanity.rewardPoints}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    {t("client.profile.accountStatus")}
                  </p>
                  <Badge
                    variant="outline"
                    className="text-success-base border-success-highlight"
                  >
                    {t("client.profile.status.active")}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Personal Information */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>{t("client.profile.personalInformation")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t("client.profile.firstName")}
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-md">
                  {clerk.firstName || t("client.profile.notProvided")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("client.profile.readOnly")}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t("client.profile.lastName")}
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-md">
                  {clerk.lastName || t("client.profile.notProvided")}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("client.profile.readOnly")}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  {t("client.profile.email")}
                </label>
                <p className="text-gray-900 bg-gray-50 p-2 rounded-md">
                  {displayEmail}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t("client.profile.readOnly")}
                </p>
              </div>

              {sanity && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t("client.profile.phoneNumber")}
                    </label>
                    <p className="text-gray-900 bg-white border p-2 rounded-md">
                      {sanity.phone || t("client.profile.notProvided")}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      {t("client.profile.editableInProfile")}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {t("client.profile.dateOfBirth")}
                    </label>
                    <p className="text-gray-900 bg-white border p-2 rounded-md">
                      {sanity.dateOfBirth
                        ? new Date(sanity.dateOfBirth).toLocaleDateString()
                        : t("client.profile.notProvided")}
                    </p>
                    <p className="text-xs text-blue-500 mt-1">
                      {t("client.profile.editableInProfile")}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>{t("client.profile.accountOverview")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-700">
                  {t("client.profile.rewardPoints")}
                </span>
                <span className="font-bold text-blue-600">
                  {sanity?.rewardPoints || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-700">
                  {t("client.profile.totalSpent")}
                </span>
                <span className="font-bold text-success-base">
                  ${sanity?.totalSpent || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="text-gray-700">
                  {t("client.profile.loyaltyPoints")}
                </span>
                <span className="font-bold text-purple-600">
                  {sanity?.loyaltyPoints || 0}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">
                  {t("client.profile.lastLogin")}
                </span>
                <span className="font-medium text-gray-600">
                  {sanity?.lastLogin
                    ? new Date(sanity.lastLogin).toLocaleDateString()
                    : t("client.profile.today")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Addresses */}
      <Card className="shadow-lg border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>{t("client.profile.shippingAddresses")}</span>
            </CardTitle>
            <Button
              onClick={handleAddAddress}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>{t("client.profile.addAddress")}</span>
            </Button>
          </div>
          <CardDescription>{t("client.profile.shippingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {addressesError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {addressesError}
            </div>
          )}
          {addressesLoading ? (
            <div className="text-sm text-gray-500">
              {t("client.profile.addressesLoading")}
            </div>
          ) : addresses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address, index) => (
                <div
                  key={address._id || address.email || index}
                  className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Home className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{address.name}</span>
                    </div>
                    {address.default && (
                      <Badge
                        variant="outline"
                        className="text-success-base border-success-highlight"
                      >
                        {t("client.profile.defaultAddress")}
                      </Badge>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>{buildAddressLine(address) || "-"}</p>
                    <p>{buildRegionLine(address) || "-"}</p>
                    {address.country ? <p>{address.country}</p> : null}
                  </div>

                  <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold uppercase tracking-wide text-gray-500">
                      {t("client.profile.quotationContact")}
                    </p>
                    <p>
                      {address.contactEmail ||
                        address.email ||
                        displayEmail ||
                        "-"}
                    </p>
                    {address.phone ? <p>{address.phone}</p> : null}
                    {address.lineId ? (
                      <p>
                        {t("client.profile.lineId")}: {address.lineId}
                      </p>
                    ) : null}
                    {address.company ? <p>{address.company}</p> : null}
                    {address.taxId ? (
                      <p>
                        {t("client.profile.taxId")}: {address.taxId}
                      </p>
                    ) : null}
                    {address.branch ? (
                      <p>
                        {t("client.profile.branch")}: {address.branch}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditAddress(address)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {t("client.profile.editAddress")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">
                {t("client.profile.noAddresses")}
              </p>
              <Button onClick={handleAddAddress} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                {t("client.profile.addFirstAddress")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Edit Sidebar */}
      {profileSidebarOpen && (
        <ProfileEditSidebar
          isOpen={profileSidebarOpen}
          onClose={() => setProfileSidebarOpen(false)}
          userData={userData}
        />
      )}

      {/* Address Edit Sidebar */}
      {addressSidebarOpen && (
        <AddressEditSidebar
          isOpen={addressSidebarOpen}
          onClose={() => setAddressSidebarOpen(false)}
          address={editingAddress}
          userId={clerk.id}
          onAddressChange={refreshAddresses}
        />
      )}
    </div>
  );
}
