"use client";

import "@/app/i18n";
import { CheckCircle2, Package } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";

type CheckoutSuccessHeroProps = {
  paymentStatusKey?: string;
  paymentStatusParams?: Record<string, unknown>;
  headlineKey: string;
  headlineParams?: { order: string };
  subheadingKey: string;
  subheadingParams?: { order: string };
  detailKey?: string;
  detailParams?: Record<string, unknown>;
  orderNumber: string;
  emailKey: string;
  emailParams?: Record<string, unknown>;
};

const AlertBlock = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
    {children}
  </div>
);

const CheckoutSuccessHero = ({
  paymentStatusKey,
  paymentStatusParams,
  headlineKey,
  headlineParams,
  subheadingKey,
  subheadingParams,
  detailKey,
  detailParams,
  orderNumber,
  emailKey,
  emailParams,
}: CheckoutSuccessHeroProps) => {
  const { t } = useTranslation();

  return (
    <>
      {paymentStatusKey && (
        <AlertBlock>{t(paymentStatusKey, paymentStatusParams)}</AlertBlock>
      )}

      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t(headlineKey, headlineParams)}</h1>
            <p className="text-muted-foreground">{t(subheadingKey, subheadingParams)}</p>
            {detailKey && (
              <p className="text-sm text-muted-foreground">
                {t(detailKey, detailParams)}
              </p>
            )}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {t("client.checkoutSuccess.orderNumberLabel")}
            </span>
            <span className="font-medium">{orderNumber}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t(emailKey, emailParams)}
          </p>
        </CardContent>
      </Card>
    </>
  );
};

export default CheckoutSuccessHero;
