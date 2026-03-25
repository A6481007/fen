"use client";

import { useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AddressSelectorSkeleton } from "@/components/cart/CartSkeleton";
import type { Address } from "@/lib/address";

type OrderAddress = Address & {
  _id: string;
  lastUsedAt?: string;
  orderNumber: string;
  source: "order";
};

interface OrderAddressSelectorProps {
  addresses: OrderAddress[];
  selectedAddress: OrderAddress | null;
  onAddressSelect: (address: OrderAddress) => void;
  isLoading?: boolean;
}

export function OrderAddressSelector({
  addresses,
  selectedAddress,
  onAddressSelect,
  isLoading = false,
}: OrderAddressSelectorProps) {
  useEffect(() => {
    if (isLoading || selectedAddress || addresses.length === 0) return;
    const defaultAddress =
      addresses.find((address) => address.default) ?? addresses[0];
    if (defaultAddress) {
      onAddressSelect(defaultAddress);
    }
  }, [addresses, isLoading, onAddressSelect, selectedAddress]);

  if (isLoading) {
    return <AddressSelectorSkeleton />;
  }

  if (addresses.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground mb-2">
          No previous addresses found
        </p>
        <p className="text-sm text-muted-foreground">
          You can enter a new address during payment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedAddress?._id || ""}
        onValueChange={(value) => {
          const address = addresses.find((addr) => addr._id === value);
          if (address) onAddressSelect(address);
        }}
      >
        {addresses.map((address) => (
          <div key={address._id} className="flex items-start space-x-2">
            <RadioGroupItem
              value={address._id}
              id={address._id}
              className="mt-1"
            />
            <Label htmlFor={address._id} className="flex-1 cursor-pointer">
              <div className="space-y-1">
                <div className="font-medium flex items-center gap-2">
                  {address.name}
                  {address.default && (
                    <span className="text-xs bg-success-highlight text-success-base px-2 py-1 rounded">
                      Most Recent
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {address.address}
                </div>
                <div className="text-sm text-muted-foreground">
                  {address.city}, {address.state} {address.zip}
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
