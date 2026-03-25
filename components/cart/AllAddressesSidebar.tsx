"use client";

import "@/app/i18n";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Address } from "@/lib/address";
import { useTranslation } from "react-i18next";

interface AllAddressesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedAddress: Address | null;
  onAddressSelect: (address: Address) => void;
}

export function AllAddressesSidebar({
  isOpen,
  onClose,
  addresses,
  selectedAddress,
  onAddressSelect,
}: AllAddressesSidebarProps) {
  const { t } = useTranslation();
  const handleSelectAddress = (address: Address) => {
    onAddressSelect(address);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t("client.cart.address.all.title")}
          </SheetTitle>
          <SheetDescription>
            {addresses.length === 1
              ? t("client.cart.address.all.descriptionSingle", {
                  count: addresses.length,
                })
              : t("client.cart.address.all.descriptionPlural", {
                  count: addresses.length,
                })}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6 p-5">
          <RadioGroup
            value={selectedAddress?._id || ""}
            onValueChange={(value) => {
              const address = addresses.find((addr) => addr._id === value);
              if (address) handleSelectAddress(address);
            }}
            className="space-y-4"
          >
            {addresses.map((address) => (
              <div
                key={address._id}
                className={`
                  relative border rounded-lg p-4 cursor-pointer transition-all
                  ${
                    selectedAddress?._id === address._id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
                onClick={() => handleSelectAddress(address)}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={address._id ?? ""}
                    id={`address-${address._id ?? "unknown"}`}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={`address-${address._id}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-base">
                          {address.name}
                        </div>
                        <div className="flex items-center gap-2">
                          {address.default && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                              {t("client.cart.address.all.default")}
                            </span>
                          )}
                          {selectedAddress?._id === address._id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {address.address}
                        {address.subArea ? `, ${address.subArea}` : ""}
                      </div>
                      <div className="text-sm text-gray-600">
                        {address.city}
                        {address.state ? `, ${address.state}` : ""} {address.zip}
                      </div>
                      {address.company && (
                        <div className="text-xs text-gray-500">
                          {address.company}
                        </div>
                      )}
                      {(address.contactEmail || address.email) && (
                        <div className="text-xs text-gray-500">
                          {address.contactEmail || address.email}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t">
          <Button variant="outline" className="w-full" onClick={onClose}>
            {t("client.cart.address.all.cancel")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
