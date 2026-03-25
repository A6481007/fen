"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export interface PromotionCardProps {
  promotion: {
    campaignId: string;
    name: string;
    shortDescription: string;
    thumbnailImage?: { url: string };
    discountType: string;
    discountValue: number;
    badgeLabel: string;
    badgeColor?: string;
    type: string;
    startDate: string;
    endDate: string;
    urgencyTrigger?: {
      showCountdown: boolean;
    };
  };
  variant?: "default" | "compact" | "horizontal";
  showCountdown?: boolean;
  onClick?: () => void;
  className?: string;
}

const typeIcons: Record<string, string> = {
  flashSale: "⚡",
  seasonal: "🎄",
  bundle: "📦",
  loyalty: "⭐",
  clearance: "🏷️",
  winBack: "👋",
};

export function PromotionCard({
  promotion,
  variant = "default",
  showCountdown = true,
  onClick,
  className = "",
}: PromotionCardProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!showCountdown) {
      setTimeRemaining("");
      return;
    }

    const endTime = new Date(promotion.endDate).getTime();
    if (Number.isNaN(endTime)) {
      setTimeRemaining("");
      return;
    }

    const updateTime = () => {
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setTimeRemaining("Ended");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m left`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [promotion.endDate, showCountdown]);

  const discountDisplay = formatDiscount(promotion.discountType, promotion.discountValue);
  const href = `/promotions/${promotion.campaignId}`;

  if (variant === "compact") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`promotion-card-compact flex items-center gap-3 rounded-lg border bg-white p-3 transition-shadow hover:shadow-md ${className}`}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl"
          style={{ backgroundColor: promotion.badgeColor || "#f0f0f0" }}
        >
          {typeIcons[promotion.type] || "🏷️"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{promotion.name}</p>
          <p className="text-xs text-gray-500">{discountDisplay}</p>
        </div>
        {timeRemaining ? (
          <span className="whitespace-nowrap text-xs font-medium text-orange-600">
            {timeRemaining}
          </span>
        ) : null}
      </Link>
    );
  }

  if (variant === "horizontal") {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`promotion-card-horizontal flex overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-lg ${className}`}
      >
        <div className="relative w-1/3">
          {promotion.thumbnailImage ? (
            <Image
              src={promotion.thumbnailImage.url}
              alt={promotion.name}
              fill
              sizes="(max-width: 640px) 40vw, (max-width: 1024px) 30vw, 320px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 text-4xl">
              {typeIcons[promotion.type] || "🏷️"}
            </div>
          )}
          <span
            className="absolute left-2 top-2 rounded px-2 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: promotion.badgeColor || "#FF5733" }}
          >
            {promotion.badgeLabel}
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <h3 className="mb-1 text-lg font-bold">{promotion.name}</h3>
            <p className="line-clamp-2 text-sm text-gray-600">{promotion.shortDescription}</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-2xl font-black text-primary">{discountDisplay}</span>
            {timeRemaining ? (
              <span className="text-sm font-medium text-orange-600">{timeRemaining}</span>
            ) : null}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`promotion-card group block overflow-hidden rounded-xl border bg-white transition-all hover:shadow-lg ${className}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {promotion.thumbnailImage ? (
          <Image
            src={promotion.thumbnailImage.url}
            alt={promotion.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40">
            <span className="text-6xl">{typeIcons[promotion.type] || "🏷️"}</span>
          </div>
        )}

        <span
          className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-md"
          style={{ backgroundColor: promotion.badgeColor || "#FF5733" }}
        >
          {promotion.badgeLabel}
        </span>

        <div className="absolute bottom-3 right-3 rounded-lg bg-white/95 px-3 py-1 shadow-md backdrop-blur">
          <span className="text-xl font-black text-primary">{discountDisplay}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-1 text-lg font-bold transition-colors group-hover:text-primary">
          {promotion.name}
        </h3>
        <p className="mb-3 line-clamp-2 text-sm text-gray-600">{promotion.shortDescription}</p>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {typeIcons[promotion.type]} {formatType(promotion.type)}
          </span>
          {timeRemaining && promotion.urgencyTrigger?.showCountdown ? (
            <span className="font-medium text-orange-600">⏰ {timeRemaining}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function formatDiscount(type: string, value: number): string {
  switch (type) {
    case "percentage":
      return `${value}% OFF`;
    case "fixed":
      return `$${value} OFF`;
    case "freeShipping":
      return "FREE SHIP";
    case "bxgy":
      return "BOGO";
    default:
      return `${value}% OFF`;
  }
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    flashSale: "Flash Sale",
    seasonal: "Seasonal",
    bundle: "Bundle",
    loyalty: "VIP",
    clearance: "Clearance",
    winBack: "Welcome Back",
  };
  return labels[type] || type;
}
