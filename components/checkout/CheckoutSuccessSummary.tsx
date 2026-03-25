"use client";

import "@/app/i18n";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import PriceFormatter from "@/components/PriceFormatter";
import { DownloadQuotationButton } from "@/components/checkout/DownloadQuotationButton";

type CheckoutSuccessProduct = {
  id: string;
  name?: string;
  quantity: number;
  lineTotal: number;
  unitPrice: number;
};

type CheckoutSuccessSummaryProps = {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  orderId: string;
  products: CheckoutSuccessProduct[];
  invoiceUrl?: string;
  canDownloadQuotation: boolean;
};

const CheckoutSuccessSummary = ({
  subtotal,
  discount,
  shipping,
  tax,
  total,
  orderId,
  products,
  invoiceUrl,
  canDownloadQuotation,
}: CheckoutSuccessSummaryProps) => {
  const { t } = useTranslation();
  const itemCount = products.reduce((sum, product) => sum + product.quantity, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("client.checkoutSuccess.summary.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>{t("client.checkoutSuccess.summary.subtotal", { count: itemCount })}</span>
            <PriceFormatter amount={subtotal} />
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-success-base">
              <span>{t("client.checkoutSuccess.summary.discount")}</span>
              <span>
                -<PriceFormatter amount={discount} />
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t("client.checkoutSuccess.summary.shipping")}</span>
            {shipping === 0 ? (
              <span className="text-success-base font-medium">
                {t("client.checkoutSuccess.summary.free")}
              </span>
            ) : (
              <PriceFormatter amount={shipping} />
            )}
          </div>
          <div className="flex justify-between">
            <span>{t("client.checkoutSuccess.summary.tax")}</span>
            <PriceFormatter amount={tax} />
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>{t("client.checkoutSuccess.summary.total")}</span>
            <PriceFormatter amount={total} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("client.checkoutSuccess.items.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {products.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <p className="font-medium">
                  {item.name || t("client.checkoutSuccess.items.fallback")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("client.checkoutSuccess.items.qty", { count: item.quantity })}
                </p>
              </div>
              <PriceFormatter amount={item.lineTotal} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/user/orders/${orderId}`}>
            {t("client.checkoutSuccess.actions.viewStatus")}
          </Link>
        </Button>
        {invoiceUrl ? (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <a href={invoiceUrl} target="_blank" rel="noreferrer">
              {t("client.checkoutSuccess.actions.downloadInvoice")}
            </a>
          </Button>
        ) : (
          <div className="flex items-center text-xs text-muted-foreground">
            {t("client.checkoutSuccess.actions.invoicePending")}
          </div>
        )}
        {canDownloadQuotation && (
          <DownloadQuotationButton
            orderId={orderId}
            className="w-full sm:w-auto"
          />
        )}
      </div>
    </>
  );
};

export default CheckoutSuccessSummary;
