"use client";

import "@/app/i18n";
import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Address } from "@/lib/address";
import { useTranslation } from "react-i18next";

interface AddAddressSidebarProps {
  userEmail: string;
  isOpen: boolean;
  onClose: () => void;
  onAddressAdded?: () => Promise<void>;
  isFirstAddress?: boolean;
}

type RequiredField = "name" | "address" | "city" | "state" | "zip";

const requiredFields: RequiredField[] = [
  "name",
  "address",
  "city",
  "state",
  "zip",
];

export function AddAddressSidebar({
  userEmail,
  isOpen,
  onClose,
  onAddressAdded,
  isFirstAddress = false,
}: AddAddressSidebarProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState<Address>({
    name: "",
    email: userEmail,
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "Thailand",
    countryCode: "",
    stateCode: "",
    subArea: "",
    type: "home",
    phone: "",
    default: isFirstAddress, // First address is default by default
  });
  const [errors, setErrors] = useState<Partial<Record<RequiredField, string>>>(
    {}
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Partial<Record<RequiredField, string>> = {};
    if (!formData.name.trim()) nextErrors.name = t("client.cart.address.form.required");
    if (!formData.address.trim()) nextErrors.address = t("client.cart.address.form.required");
    if (!formData.city.trim()) nextErrors.city = t("client.cart.address.form.required");
    if (!formData.state.trim()) nextErrors.state = t("client.cart.address.form.required");
    if (!formData.zip.trim()) nextErrors.zip = t("client.cart.address.form.required");

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    startTransition(async () => {
      try {
        const payload: Partial<Address> = { ...formData };
        delete payload.customerCode;
        const response = await fetch("/api/user/addresses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || t("client.cart.address.form.createError")
          );
        }

        await response.json();
        toast.success(t("client.cart.address.form.createSuccess"));
        setFormData({
          name: "",
          email: userEmail,
          address: "",
          city: "",
          state: "",
          zip: "",
          country: "Thailand",
          countryCode: "",
          stateCode: "",
          subArea: "",
          type: "home",
          phone: "",
          default: false,
        });
        setErrors({});
        onClose();

        // Call the callback to refresh addresses if provided
        if (onAddressAdded) {
          await onAddressAdded();
        } else {
          // Fallback to page refresh if no callback provided
          window.location.reload();
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("client.cart.address.form.createError")
        );
        console.error("Address creation error:", error);
      }
    });
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (typeof value === "string") {
      const errorKey = field as RequiredField;
      if (requiredFields.includes(errorKey) && value.trim()) {
        setErrors((prev) => {
          if (!prev[errorKey]) return prev;
          const next = { ...prev };
          delete next[errorKey];
          return next;
        });
      }
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isPending) {
      onClose();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {isFirstAddress
              ? t("client.cart.address.form.addFirstTitle")
              : t("client.cart.address.form.addTitle")}
          </SheetTitle>
          <SheetDescription>
            {t("client.cart.address.form.addDescription", { email: userEmail })}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full px-3"
          noValidate
        >
          <div className="flex-1 space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                {t("client.cart.address.form.fields.contactName")}
              </Label>
              <Input
                id="name"
                placeholder={t("client.cart.address.form.placeholders.contactName")}
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "add-address-name-error" : undefined}
                className={`w-full ${errors.name ? "border-destructive" : ""}`}
              />
              {errors.name && (
                <p id="add-address-name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                {t("client.cart.address.form.fields.phone")}
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t("client.cart.address.form.placeholders.phone")}
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                disabled={isPending}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm font-medium">
                {t("client.cart.address.form.fields.address")}
              </Label>
              <Input
                id="address"
                placeholder={t("client.cart.address.form.placeholders.address")}
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.address)}
                aria-describedby={
                  errors.address ? "add-address-street-error" : undefined
                }
                className={`w-full ${errors.address ? "border-destructive" : ""}`}
              />
              {errors.address && (
                <p
                  id="add-address-street-error"
                  className="text-xs text-destructive"
                >
                  {errors.address}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subArea" className="text-sm font-medium">
                {t("client.cart.address.form.fields.subArea")}
              </Label>
              <Input
                id="subArea"
                placeholder={t("client.cart.address.form.placeholders.subArea")}
                value={formData.subArea}
                onChange={(e) => handleInputChange("subArea", e.target.value)}
                disabled={isPending}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  {t("client.cart.address.form.fields.city")}
                </Label>
                <Input
                  id="city"
                  placeholder={t("client.cart.address.form.placeholders.city")}
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.city)}
                  aria-describedby={
                    errors.city ? "add-address-city-error" : undefined
                  }
                  className={`w-full ${errors.city ? "border-destructive" : ""}`}
                />
                {errors.city && (
                  <p
                    id="add-address-city-error"
                    className="text-xs text-destructive"
                  >
                    {errors.city}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium">
                  {t("client.cart.address.form.fields.state")}
                </Label>
                <Input
                  id="state"
                  placeholder={t("client.cart.address.form.placeholders.state")}
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.state)}
                  aria-describedby={
                    errors.state ? "add-address-state-error" : undefined
                  }
                  className={`w-full ${errors.state ? "border-destructive" : ""}`}
                />
                {errors.state && (
                  <p
                    id="add-address-state-error"
                    className="text-xs text-destructive"
                  >
                    {errors.state}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip" className="text-sm font-medium">
                {t("client.cart.address.form.fields.zip")}
              </Label>
              <Input
                id="zip"
                placeholder={t("client.cart.address.form.placeholders.zip")}
                value={formData.zip}
                onChange={(e) => handleInputChange("zip", e.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(errors.zip)}
                aria-describedby={
                  errors.zip ? "add-address-zip-error" : undefined
                }
                className={`w-full ${errors.zip ? "border-destructive" : ""}`}
              />
              {errors.zip && (
                <p
                  id="add-address-zip-error"
                  className="text-xs text-destructive"
                >
                  {errors.zip}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="default"
                checked={formData.default}
                onChange={(e) => handleInputChange("default", e.target.checked)}
                disabled={isPending || isFirstAddress}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="default" className="text-sm">
                {isFirstAddress
                  ? t("client.cart.address.form.defaultFirst")
                  : t("client.cart.address.form.default")}
              </Label>
            </div>
          </div>

          <SheetFooter className="flex-shrink-0">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose()}
                disabled={isPending}
                className="flex-1"
              >
                {t("client.cart.address.form.cancel")}
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t("client.cart.address.form.adding")}
                  </>
                ) : (
                  t("client.cart.address.form.add")
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
