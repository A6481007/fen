"use client";

import "@/app/i18n";
import { useTranslation } from "react-i18next";
import NoAccessToCart from "@/components/NoAccessToCart";

const WishlistNoAccess = () => {
  const { t } = useTranslation();

  return <NoAccessToCart details={t("client.wishlist.noAccess")} />;
};

export default WishlistNoAccess;
