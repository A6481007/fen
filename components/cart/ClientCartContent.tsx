"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { ServerCartContent } from "./ServerCartContent";
import { CartSkeleton } from "./CartSkeleton";
import { trackCartView } from "@/lib/analytics";
import { useCartAbandonmentSync } from "@/hooks/useCartAbandonmentSync";
import { useCart } from "@/hooks/useCart";
import NoAccessToCart from "@/components/NoAccessToCart";
import type { Address } from "@/lib/address";
import "@/app/i18n";
import { useTranslation } from "react-i18next";

export function ClientCartContent() {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { abandonmentStatus } = useCartAbandonmentSync();
  const { view, refreshInBackground } = useCart();

  const fetchAddresses = useCallback(async () => {
    if (!isLoaded || !user) return;

    try {
      setLoading(true);
      const response = await fetch("/api/user/addresses");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData?.error || t("client.cart.addresses.fetchError")
        );
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("client.cart.addresses.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [isLoaded, t, user]);

  const refreshAddresses = async () => {
    if (!user) return;

    try {
      const response = await fetch("/api/user/addresses");

      if (!response.ok) {
        throw new Error(t("client.cart.addresses.refreshError"));
      }

      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error("Failed to refresh addresses:", err);
      // Don't show error toast for refresh failures
    }
  };

  useEffect(() => {
    fetchAddresses();
    // Track cart view with view-model summary when available
    if (user && view) {
      trackCartView({
        userId: user.id,
        itemCount: view.summary.itemCount,
        cartValue: view.summary.total,
        promotionCount: view.summary.promotionCount,
      });
    }
  }, [user, fetchAddresses, view]);

  useEffect(() => {
    void refreshInBackground();
  }, [refreshInBackground]);

  if (!isLoaded || loading) {
    return <CartSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!user) {
    return <NoAccessToCart />;
  }

  const userEmail = user.emailAddresses[0]?.emailAddress || "";

  return (
    <ServerCartContent
      userEmail={userEmail}
      userAddresses={addresses}
      onAddressesRefresh={refreshAddresses}
      abandonmentStatus={abandonmentStatus}
    />
  );
}
