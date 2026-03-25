"use client";

import "@/app/i18n";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

const WishlistHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 mb-8">
      <Heart className="w-6 h-6 text-red-500" />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t("client.wishlist.title")}
        </h1>
        <p className="text-gray-600 mt-1">{t("client.wishlist.subtitle")}</p>
      </div>
    </div>
  );
};

export default WishlistHeader;
