"use client";

import Container from "@/components/Container";
import { ClientCartContent } from "@/components/cart/ClientCartContent";
import { ShoppingBag } from "lucide-react";
import DynamicBreadcrumb from "@/components/DynamicBreadcrumb";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

function CartPage() {
  const { t } = useTranslation();

  return (
    <Container className="py-4 sm:py-6">
      {/* Breadcrumb */}
      <DynamicBreadcrumb className="mb-4 sm:mb-6" />

      {/* Cart Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-6">
        <ShoppingBag className="h-6 w-6" aria-hidden="true" />
        <h1 className="text-xl font-bold sm:text-2xl">
          {t("client.cart.title")}
        </h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11">
          <Link href="/user/orders">{t("client.cart.viewOrders")}</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/shop">{t("client.cart.continueShopping")}</Link>
        </Button>
      </div>

      {/* Client Cart Content with Loading */}
      <ClientCartContent />
    </Container>
  );
}

export default CartPage;
