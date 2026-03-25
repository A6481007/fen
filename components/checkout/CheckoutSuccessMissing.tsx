"use client";

import "@/app/i18n";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import Container from "@/components/Container";
import CheckoutSuccessBreadcrumb from "@/components/checkout/CheckoutSuccessBreadcrumb";

const CheckoutSuccessMissing = () => {
  const { t } = useTranslation();

  return (
    <Container className="py-8">
      <CheckoutSuccessBreadcrumb />
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          {t("client.checkoutSuccess.missing.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("client.checkoutSuccess.missing.subtitle")}
        </p>
        <Button asChild>
          <Link href="/user/orders">
            {t("client.checkoutSuccess.missing.cta")}
          </Link>
        </Button>
      </div>
    </Container>
  );
};

export default CheckoutSuccessMissing;
