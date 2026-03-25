"use client";

import "@/app/i18n";
import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, List, FileText } from "lucide-react";
import { AddAddressSidebar } from "./AddAddressSidebar";
import { AddressSelectorSkeleton } from "./CartSkeleton";
import { AllAddressesSidebar } from "./AllAddressesSidebar";
import { AddressForm, type AddressFormValues } from "@/components/addresses/AddressForm";
import { toast } from "sonner";
import type { Address } from "@/lib/address";
import { useTranslation } from "react-i18next";

interface AddressSelectorProps {
  userEmail: string;
  addresses: Address[];
  selectedAddress: Address | null;
  onAddressSelect: (address: Address) => void;
  onAddressesRefresh?: () => Promise<void>;
  selectedQuotationDetails: Address | null;
  onQuotationDetailsSelect: (address: Address | null) => void;
  selectedSalesContactId: string | null;
  onSalesContactSelect: (salesContactId: string | null) => void;
}

type QuotationDetailsForm = {
  name: string;
  contactEmail: string;
  phone: string;
  fax: string;
  company: string;
  lineId: string;
  taxId: string;
  branch: string;
  type: "home" | "office" | "other";
  address: string;
  subArea: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type SalesContactOption = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
};

export function AddressSelector({
  userEmail,
  addresses,
  selectedAddress,
  onAddressSelect,
  onAddressesRefresh,
  selectedQuotationDetails,
  onQuotationDetailsSelect,
  selectedSalesContactId,
  onSalesContactSelect,
}: AddressSelectorProps) {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAllAddressesSidebarOpen, setIsAllAddressesSidebarOpen] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false);
  const [quotationDialogMode, setQuotationDialogMode] = useState<
    "add" | "edit"
  >("add");
  const [showQuotationDetails, setShowQuotationDetails] = useState(true);
  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] =
    useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isSettingDefaultShipping, setIsSettingDefaultShipping] =
    useState(false);
  const [isSavingQuotationDetails, setIsSavingQuotationDetails] =
    useState(false);
  const [quotationDetails, setQuotationDetails] =
    useState<QuotationDetailsForm>({
      name: "",
      contactEmail: userEmail,
      phone: "",
      fax: "",
      company: "",
      lineId: "",
      taxId: "",
      branch: "",
      type: "home",
      address: "",
      subArea: "",
      city: "",
      state: "",
      zip: "",
      country: "Thailand",
    });
  const [salesContacts, setSalesContacts] = useState<SalesContactOption[]>([]);
  const [isLoadingSalesContacts, setIsLoadingSalesContacts] = useState(false);
  const [salesContactsError, setSalesContactsError] = useState<string | null>(
    null
  );

  const hasMoreAddresses = addresses.length > 3;
  const hasSelectedAddress = Boolean(selectedAddress?._id);
  const effectiveQuotationDetails = selectedQuotationDetails ?? selectedAddress;
  const quotationContactEmail =
    effectiveQuotationDetails?.contactEmail ||
    effectiveQuotationDetails?.email ||
    userEmail ||
    "";
  const quotationDetailsSelectValue = selectedQuotationDetails?._id ?? "shipping";
  const selectedSalesContact = salesContacts.find(
    (contact) => contact._id === selectedSalesContactId
  );
  const hasCustomQuotationDetails = Boolean(selectedQuotationDetails?._id);
  const cardTitle = showQuotationDetails
    ? t("client.cart.address.cardTitleWithQuote")
    : t("client.cart.address.cardTitle");
  const cardDescription = showQuotationDetails
    ? t("client.cart.address.cardDescriptionWithQuote")
    : t("client.cart.address.cardDescription");

  const formatAddressLabel = (address: Address) => {
    const parts = [address.name, address.address, address.city].filter(Boolean);
    const label =
      parts.length > 0 ? parts.join(" - ") : t("client.cart.address.saved");
    return address.default
      ? t("client.cart.address.savedDefault", { label })
      : label;
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

  const buildQuotationDetailsDraft = (
    address?: Address | null
  ): QuotationDetailsForm => ({
    name: address?.name ?? "",
    contactEmail:
      address?.contactEmail || address?.email || userEmail || "",
    phone: address?.phone ?? "",
    fax: address?.fax ?? "",
    company: address?.company ?? "",
    lineId: address?.lineId ?? "",
    taxId: address?.taxId ?? "",
    branch: address?.branch ?? "",
    type: address?.type ?? "home",
    address: address?.address ?? "",
    subArea: address?.subArea ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    zip: address?.zip ?? "",
    country: address?.country ?? "Thailand",
  });

  useEffect(() => {
    let isActive = true;

    const fetchSalesContacts = async () => {
      setIsLoadingSalesContacts(true);
      setSalesContactsError(null);
      try {
        const response = await fetch("/api/sales-contacts");
        if (!response.ok) {
          throw new Error(t("client.cart.address.salesContacts.fetchError"));
        }
        const data = await response.json();
        if (!isActive) return;
        const contacts = Array.isArray(data?.salesContacts)
          ? data.salesContacts
          : [];
        setSalesContacts(contacts);
      } catch (error) {
        console.error("Failed to load sales contacts:", error);
        if (!isActive) return;
        setSalesContacts([]);
        setSalesContactsError(
          t("client.cart.address.salesContacts.loadError")
        );
      } finally {
        if (isActive) setIsLoadingSalesContacts(false);
      }
    };

    void fetchSalesContacts();

    return () => {
      isActive = false;
    };
  }, [t]);

  const handleAddQuotationDetails = () => {
    setQuotationDialogMode("add");
    setQuotationDetails(buildQuotationDetailsDraft(null));
    setIsQuotationDialogOpen(true);
  };

  const handleEditQuotationDetails = () => {
    if (!effectiveQuotationDetails) {
      toast.error(t("client.cart.address.quotation.selectToEdit"));
      return;
    }
    const hasCustomDetails = Boolean(selectedQuotationDetails?._id);
    setQuotationDialogMode(hasCustomDetails ? "edit" : "add");
    setQuotationDetails(buildQuotationDetailsDraft(effectiveQuotationDetails));
    setIsQuotationDialogOpen(true);
  };

  const handleAddressAdded = async () => {
    if (onAddressesRefresh) {
      setIsLoading(true);
      await onAddressesRefresh();
      setIsLoading(false);
    }
    setIsSidebarOpen(false);
  };

  const handleQuotationPreferenceChange = (checked: boolean) => {
    setShowQuotationDetails(checked);
    if (!checked) {
      onQuotationDetailsSelect(null);
      onSalesContactSelect(null);
      setIsQuotationDialogOpen(false);
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

  const handleEditShippingAddress = () => {
    if (!selectedAddress) {
      toast.error(t("client.cart.address.selectShippingFirst"));
      return;
    }
    setIsEditAddressDialogOpen(true);
  };

  const handleAddressFormSubmit = async (values: AddressFormValues) => {
    setIsSavingAddress(true);
    try {
      const payload = buildAddressPayload(values);
      const updatePayload: Partial<Address> = { ...payload };
      delete updatePayload.customerCode;
      const response = await fetch("/api/user/addresses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || t("client.cart.address.updateError")
        );
      }

      const savedAddress = data?.address ?? values;
      if (savedAddress?._id) {
        onAddressSelect(savedAddress as Address);
      }
      if (onAddressesRefresh) {
        await onAddressesRefresh();
      } else {
        window.location.reload();
      }

      toast.success(t("client.cart.address.updateSuccess"));
      setIsEditAddressDialogOpen(false);
    } catch (error) {
      console.error("Failed to update address:", error);
      toast.error(
        error instanceof Error ? error.message : t("client.cart.address.updateError")
      );
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultShipping = async () => {
    if (!selectedAddress) {
      toast.error(t("client.cart.address.selectShippingFirst"));
      return;
    }

    setIsSettingDefaultShipping(true);
    try {
      const payload = buildAddressPayload({
        ...selectedAddress,
        contactEmail:
          selectedAddress.contactEmail ||
          selectedAddress.email ||
          userEmail,
        email: selectedAddress.email || userEmail,
        default: true,
      });
      const updatePayload: Partial<Address> = { ...payload };
      delete updatePayload.customerCode;

      const response = await fetch("/api/user/addresses", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || t("client.cart.address.setDefaultError")
        );
      }

      toast.success(t("client.cart.address.setDefaultSuccess"));
      if (onAddressesRefresh) {
        await onAddressesRefresh();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to set default address:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.cart.address.setDefaultError")
      );
    } finally {
      setIsSettingDefaultShipping(false);
    }
  };

  const handleQuotationFieldChange = (
    field: keyof QuotationDetailsForm,
    value: string
  ) => {
    setQuotationDetails((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuotationDetailsSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setIsSavingQuotationDetails(true);
    try {
      const isEditingExisting =
        quotationDialogMode === "edit" && Boolean(selectedQuotationDetails?._id);
      const payload = {
        _id: isEditingExisting ? selectedQuotationDetails?._id : undefined,
        name: quotationDetails.name.trim(),
        contactEmail: quotationDetails.contactEmail.trim(),
        phone: quotationDetails.phone.trim(),
        fax: quotationDetails.fax.trim(),
        company: quotationDetails.company.trim(),
        lineId: quotationDetails.lineId.trim(),
        taxId: quotationDetails.taxId.trim(),
        branch: quotationDetails.branch.trim(),
        address: quotationDetails.address.trim(),
        subArea: quotationDetails.subArea.trim(),
        city: quotationDetails.city.trim(),
        state: quotationDetails.state.trim(),
        zip: quotationDetails.zip.trim(),
        country: quotationDetails.country.trim() || "Thailand",
        type: quotationDetails.type,
      };

      const response = await fetch("/api/user/addresses", {
        method: isEditingExisting ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || t("client.cart.address.quotation.updateError")
        );
      }

      const updatedAddress = data?.address ?? payload;
      onQuotationDetailsSelect(updatedAddress);
      if (onAddressesRefresh) {
        await onAddressesRefresh();
      }

      toast.success(t("client.cart.address.quotation.updateSuccess"));
      setIsQuotationDialogOpen(false);
    } catch (error) {
      console.error("Failed to update quotation details:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.cart.address.quotation.updateError")
      );
    } finally {
      setIsSavingQuotationDetails(false);
    }
  };

  if (isLoading) {
    return <AddressSelectorSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Card className="border-muted/60 shadow-sm overflow-hidden">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                {cardTitle}
              </CardTitle>
              <CardDescription>{cardDescription}</CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-muted/60 bg-white px-3 py-1 text-xs text-muted-foreground">
              <Checkbox
                id="cart-want-quotation"
                checked={showQuotationDetails}
                onCheckedChange={(value) =>
                  handleQuotationPreferenceChange(Boolean(value))
                }
              />
              <Label htmlFor="cart-want-quotation" className="text-xs">
                {t("client.cart.address.quotation.needDetails")}
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 min-w-0">
          <div className="grid gap-6 min-w-0">
            <div className="rounded-xl border bg-slate-50 p-4 min-w-0 overflow-hidden">
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <p className="text-sm font-semibold">
                      {t("client.cart.address.shipping.title")}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("client.cart.address.shipping.subtitle")}
                  </p>
                </div>
                {selectedAddress?.default && (
                  <Badge variant="outline" className="text-xs">
                    {t("client.cart.address.shipping.default")}
                  </Badge>
                )}
              </div>

              {addresses.length === 0 ? (
                <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                  <p>{t("client.cart.address.shipping.empty")}</p>
                  <Button
                    size="sm"
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("client.cart.address.shipping.addFirst")}
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {t("client.cart.address.shipping.savedLabel")}
                    </p>
                    <Select
                      value={selectedAddress?._id || ""}
                      onValueChange={(value) => {
                        const address = addresses.find(
                          (addr) => addr._id === value
                        );
                        if (address) onAddressSelect(address);
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue
                          placeholder={t("client.cart.address.shipping.select")}
                        />
                      </SelectTrigger>
                      <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                        {addresses.map((address) =>
                          address._id ? (
                            <SelectItem
                              key={address._id}
                              value={address._id}
                            >
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
                    {selectedAddress ? (
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium break-words">
                            {selectedAddress.name || "-"}
                          </p>
                          {selectedAddress.company && (
                            <p className="text-xs text-muted-foreground break-words">
                              {selectedAddress.company}
                            </p>
                          )}
                        </div>
                        <div className="text-muted-foreground break-words">
                          <p className="break-words">
                            {buildAddressLine(selectedAddress) || "-"}
                          </p>
                          <p className="break-words">
                            {buildRegionLine(selectedAddress) || "-"}
                          </p>
                          {selectedAddress.country && (
                            <p className="break-words">
                              {selectedAddress.country}
                            </p>
                          )}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("client.cart.address.fields.phone")}
                            </p>
                            <p className="font-medium break-words">
                              {selectedAddress.phone || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("client.cart.address.fields.contactEmail")}
                            </p>
                            <p className="font-medium break-words">
                              {selectedAddress.contactEmail ||
                                selectedAddress.email ||
                                userEmail ||
                                "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {t("client.cart.address.shipping.previewHint")}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditShippingAddress}
                      disabled={!selectedAddress}
                    >
                      {t("client.cart.address.shipping.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSidebarOpen(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("client.cart.address.shipping.addNew")}
                    </Button>
                    {!selectedAddress?.default && (
                      <Button
                        size="sm"
                        onClick={handleSetDefaultShipping}
                        disabled={
                          isSettingDefaultShipping || !selectedAddress
                        }
                      >
                        {isSettingDefaultShipping
                          ? t("client.cart.address.shipping.settingDefault")
                          : t("client.cart.address.shipping.makeDefault")}
                      </Button>
                    )}
                    {hasMoreAddresses && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAllAddressesSidebarOpen(true)}
                      >
                        <List className="w-4 h-4 mr-2" />
                        Show All {addresses.length} Addresses
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {showQuotationDetails && (
              <div className="rounded-xl border bg-slate-50 p-4 min-w-0 overflow-hidden">
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-600" />
                      <p className="text-sm font-semibold">Quotation Details</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Set alternate contact details for quotations.
                    </p>
                  </div>
                  {hasCustomQuotationDetails && (
                    <Badge variant="outline" className="text-xs">
                      Custom
                    </Badge>
                  )}
                </div>

                {addresses.length === 0 ? (
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t("client.cart.address.quotation.addShippingFirst")}
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>{t("client.cart.address.quotation.useDetails")}</Label>
                      <Select
                        value={quotationDetailsSelectValue}
                        onValueChange={(value) => {
                          if (value === "shipping") {
                            onQuotationDetailsSelect(null);
                            return;
                          }
                          const address = addresses.find(
                            (item) => item._id === value
                          );
                          if (address) onQuotationDetailsSelect(address);
                        }}
                        disabled={!hasSelectedAddress}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue
                            placeholder={
                              hasSelectedAddress
                                ? t("client.cart.address.quotation.select")
                                : t("client.cart.address.quotation.selectShippingFirst")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                          <SelectItem value="shipping">
                            {t("client.cart.address.quotation.sameAsShipping")}
                          </SelectItem>
                          {addresses.map((address) =>
                            address._id ? (
                              <SelectItem
                                key={address._id}
                                value={address._id}
                              >
                                <span className="block whitespace-normal break-words">
                                  {formatAddressLabel(address)}
                                </span>
                              </SelectItem>
                            ) : null
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("client.cart.address.salesContacts.label")}</Label>
                      <Select
                        value={selectedSalesContactId || "none"}
                        onValueChange={(value) =>
                          onSalesContactSelect(value === "none" ? null : value)
                        }
                        disabled={isLoadingSalesContacts}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue
                            placeholder={
                              isLoadingSalesContacts
                                ? t("client.cart.address.salesContacts.loading")
                                : t("client.cart.address.salesContacts.placeholder")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                          <SelectItem value="none">
                            {t("client.cart.address.salesContacts.placeholder")}
                          </SelectItem>
                          {salesContacts.map((contact) => (
                            <SelectItem key={contact._id} value={contact._id}>
                              <span className="block whitespace-normal break-words">
                                {contact.name ||
                                  t("client.cart.address.salesContacts.fallback")}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {salesContactsError && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                          {salesContactsError}
                        </div>
                      )}
                      {selectedSalesContact && (
                        <p className="text-xs text-muted-foreground">
                          {t("client.cart.address.salesContacts.selected", {
                            name:
                              selectedSalesContact.name ||
                              t("client.cart.address.salesContacts.fallback"),
                          })}
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border bg-white p-3 text-sm shadow-sm min-w-0">
                      {effectiveQuotationDetails ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.contactName")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.name || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.branch")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.branch || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.phone")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.phone || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.fax")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.fax || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.line")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.lineId || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.company")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.company || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.customerCode")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.customerCode || "-"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                {t("client.cart.address.fields.taxId")}
                              </p>
                              <p className="font-medium break-words">
                                {effectiveQuotationDetails.taxId || "-"}
                              </p>
                            </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs text-muted-foreground">
                              {t("client.cart.address.fields.contactEmail")}
                            </p>
                            <p className="font-medium break-words">
                              {quotationContactEmail || "-"}
                            </p>
                          </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("client.cart.address.fields.address")}
                            </p>
                            <p className="font-medium break-words">
                              {buildAddressLine(effectiveQuotationDetails) || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              {t("client.cart.address.fields.region")}
                            </p>
                            <p className="font-medium break-words">
                              {buildRegionLine(effectiveQuotationDetails) || "-"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t("client.cart.address.quotation.selectShippingToUpdate")}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-11"
                        onClick={handleAddQuotationDetails}
                      >
                        {t("client.cart.address.quotation.addDetails")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-11"
                        onClick={handleEditQuotationDetails}
                        disabled={!effectiveQuotationDetails}
                      >
                        {t("client.cart.address.quotation.editDetails")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isEditAddressDialogOpen}
        onOpenChange={setIsEditAddressDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("client.cart.address.shipping.editTitle")}</DialogTitle>
            <DialogBody>
              {t("client.cart.address.shipping.editDescription")}
            </DialogBody>
          </DialogHeader>
          <AddressForm
            initialValues={
              selectedAddress
                ? {
                    ...selectedAddress,
                    email: selectedAddress.email || userEmail,
                    contactEmail:
                      selectedAddress.contactEmail ||
                      selectedAddress.email ||
                      userEmail,
                  }
                : {
                    email: userEmail,
                    contactEmail: userEmail,
                    country: "Thailand",
                    countryCode: "",
                    stateCode: "",
                    subArea: "",
                  }
            }
            defaultContactEmail={userEmail}
            onSubmit={handleAddressFormSubmit}
            onCancel={() => setIsEditAddressDialogOpen(false)}
            submitLabel={t("client.cart.address.shipping.save")}
            cancelLabel={t("client.cart.address.shipping.cancel")}
            isSubmitting={isSavingAddress}
            showDefaultToggle={false}
          />
        </DialogContent>
      </Dialog>

      <AddAddressSidebar
        userEmail={userEmail}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onAddressAdded={handleAddressAdded}
        isFirstAddress={addresses.length === 0}
      />

      <AllAddressesSidebar
        isOpen={isAllAddressesSidebarOpen}
        onClose={() => setIsAllAddressesSidebarOpen(false)}
        addresses={addresses}
        selectedAddress={selectedAddress}
        onAddressSelect={onAddressSelect}
      />

      <Dialog
        open={isQuotationDialogOpen}
        onOpenChange={setIsQuotationDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {quotationDialogMode === "add"
                ? t("client.cart.address.quotation.addDetails")
                : t("client.cart.address.quotation.editDetailsTitle")}
            </DialogTitle>
            <DialogBody>
              {t("client.cart.address.quotation.dialogDescription")}
            </DialogBody>
          </DialogHeader>
          <form onSubmit={handleQuotationDetailsSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quotation-contact-name">
                  {t("client.cart.address.quotation.fields.contactName")}
                </Label>
                <Input
                  id="quotation-contact-name"
                  value={quotationDetails.name}
                  onChange={(event) =>
                    handleQuotationFieldChange("name", event.target.value)
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-branch">
                  {t("client.cart.address.quotation.fields.branch")}
                </Label>
                <Input
                  id="quotation-branch"
                  value={quotationDetails.branch}
                  onChange={(event) =>
                    handleQuotationFieldChange("branch", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-phone">
                  {t("client.cart.address.quotation.fields.phone")}
                </Label>
                <Input
                  id="quotation-phone"
                  value={quotationDetails.phone}
                  onChange={(event) =>
                    handleQuotationFieldChange("phone", event.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-fax">
                  {t("client.cart.address.quotation.fields.fax")}
                </Label>
                <Input
                  id="quotation-fax"
                  value={quotationDetails.fax}
                  onChange={(event) =>
                    handleQuotationFieldChange("fax", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.fax")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quotation-company">
                  {t("client.cart.address.quotation.fields.company")}
                </Label>
                <Input
                  id="quotation-company"
                  value={quotationDetails.company}
                  onChange={(event) =>
                    handleQuotationFieldChange("company", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.company")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-tax-id">
                  {t("client.cart.address.quotation.fields.taxId")}
                </Label>
                <Input
                  id="quotation-tax-id"
                  value={quotationDetails.taxId}
                  onChange={(event) =>
                    handleQuotationFieldChange("taxId", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.taxId")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-line-id">
                  {t("client.cart.address.quotation.fields.lineId")}
                </Label>
                <Input
                  id="quotation-line-id"
                  value={quotationDetails.lineId}
                  onChange={(event) =>
                    handleQuotationFieldChange("lineId", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.lineId")}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="quotation-contact-email">
                  {t("client.cart.address.quotation.fields.contactEmail")}
                </Label>
                <Input
                  id="quotation-contact-email"
                  type="email"
                  value={quotationDetails.contactEmail}
                  onChange={(event) =>
                    handleQuotationFieldChange(
                      "contactEmail",
                      event.target.value
                    )
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.contactEmail")}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quotation-address-type">
                  {t("client.cart.address.quotation.fields.addressType")}
                </Label>
                <Select
                  value={quotationDetails.type}
                  onValueChange={(value) =>
                    handleQuotationFieldChange(
                      "type",
                      value as QuotationDetailsForm["type"]
                    )
                  }
                >
                  <SelectTrigger id="quotation-address-type">
                    <SelectValue
                      placeholder={t("client.cart.address.quotation.placeholders.addressType")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">
                      {t("client.cart.address.quotation.addressType.home")}
                    </SelectItem>
                    <SelectItem value="office">
                      {t("client.cart.address.quotation.addressType.office")}
                    </SelectItem>
                    <SelectItem value="other">
                      {t("client.cart.address.quotation.addressType.other")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-country">
                  {t("client.cart.address.quotation.fields.country")}
                </Label>
                <Input
                  id="quotation-country"
                  value={quotationDetails.country}
                  onChange={(event) =>
                    handleQuotationFieldChange("country", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.country")}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="quotation-address">
                  {t("client.cart.address.quotation.fields.address")}
                </Label>
                <Input
                  id="quotation-address"
                  value={quotationDetails.address}
                  onChange={(event) =>
                    handleQuotationFieldChange("address", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.address")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-sub-area">
                  {t("client.cart.address.quotation.fields.subArea")}
                </Label>
                <Input
                  id="quotation-sub-area"
                  value={quotationDetails.subArea}
                  onChange={(event) =>
                    handleQuotationFieldChange("subArea", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.subArea")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-city">
                  {t("client.cart.address.quotation.fields.city")}
                </Label>
                <Input
                  id="quotation-city"
                  value={quotationDetails.city}
                  onChange={(event) =>
                    handleQuotationFieldChange("city", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.city")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-state">
                  {t("client.cart.address.quotation.fields.state")}
                </Label>
                <Input
                  id="quotation-state"
                  value={quotationDetails.state}
                  onChange={(event) =>
                    handleQuotationFieldChange("state", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.state")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-zip">
                  {t("client.cart.address.quotation.fields.zip")}
                </Label>
                <Input
                  id="quotation-zip"
                  value={quotationDetails.zip}
                  onChange={(event) =>
                    handleQuotationFieldChange("zip", event.target.value)
                  }
                  placeholder={t("client.cart.address.quotation.placeholders.zip")}
                  required
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuotationDialogOpen(false)}
                disabled={isSavingQuotationDetails}
              >
                {t("client.cart.address.quotation.dialogCancel")}
              </Button>
              <Button type="submit" disabled={isSavingQuotationDetails}>
                {isSavingQuotationDetails
                  ? t("client.cart.address.quotation.saving")
                  : quotationDialogMode === "add"
                    ? t("client.cart.address.quotation.addDetails")
                    : t("client.cart.address.quotation.saveDetails")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
