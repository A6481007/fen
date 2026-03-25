"use client";

import "@/app/i18n";
import { useTranslation } from "react-i18next";

const AccountAddressesHeader = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-shop_dark_green">
        {t("client.account.addresses.title")}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t("client.account.addresses.subtitle")}
      </p>
    </div>
  );
};

export default AccountAddressesHeader;
