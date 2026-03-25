"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import Title from "@/components/Title";
import { Button } from "@/components/ui/button";

interface UserOrdersHeaderProps {
  loaded: number;
  total: number;
}

export default function UserOrdersHeader({
  loaded,
  total,
}: UserOrdersHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <Title>{t("client.userOrders.title")}</Title>
        {total > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {t("client.userOrders.summary", { loaded, total })}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="h-11">
          <Link href="/cart">{t("client.userOrders.actions.viewCart")}</Link>
        </Button>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/shop">
            {t("client.userOrders.actions.continueShopping")}
          </Link>
        </Button>
      </div>
    </>
  );
}
