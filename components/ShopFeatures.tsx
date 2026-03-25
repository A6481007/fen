"use client";

import { useState } from "react";
import Container from "./Container";
import Title from "./Title";
import FeatureModal from "./FeatureModal";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Headphones,
  RefreshCw,
  Award,
  Clock,
  Heart,
  LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface FeatureType {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
  benefits: string[];
}

const ShopFeatures = () => {
  const { t } = useTranslation();
  const [selectedFeature, setSelectedFeature] = useState<FeatureType | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getList = (key: string) =>
    t(key, { returnObjects: true }) as string[];

  const features: FeatureType[] = [
    {
      icon: ShieldCheck,
      title: t("client.home.features.items.secure.title"),
      description: t("client.home.features.items.secure.description"),
      details: getList("client.home.features.items.secure.details"),
      benefits: getList("client.home.features.items.secure.benefits"),
    },
    {
      icon: Truck,
      title: t("client.home.features.items.delivery.title"),
      description: t("client.home.features.items.delivery.description"),
      details: getList("client.home.features.items.delivery.details"),
      benefits: getList("client.home.features.items.delivery.benefits"),
    },
    {
      icon: CreditCard,
      title: t("client.home.features.items.payments.title"),
      description: t("client.home.features.items.payments.description"),
      details: getList("client.home.features.items.payments.details"),
      benefits: getList("client.home.features.items.payments.benefits"),
    },
    {
      icon: Headphones,
      title: t("client.home.features.items.support.title"),
      description: t("client.home.features.items.support.description"),
      details: getList("client.home.features.items.support.details"),
      benefits: getList("client.home.features.items.support.benefits"),
    },
    {
      icon: RefreshCw,
      title: t("client.home.features.items.returns.title"),
      description: t("client.home.features.items.returns.description"),
      details: getList("client.home.features.items.returns.details"),
      benefits: getList("client.home.features.items.returns.benefits"),
    },
    {
      icon: Award,
      title: t("client.home.features.items.quality.title"),
      description: t("client.home.features.items.quality.description"),
      details: getList("client.home.features.items.quality.details"),
      benefits: getList("client.home.features.items.quality.benefits"),
    },
    {
      icon: Clock,
      title: t("client.home.features.items.processing.title"),
      description: t("client.home.features.items.processing.description"),
      details: getList("client.home.features.items.processing.details"),
      benefits: getList("client.home.features.items.processing.benefits"),
    },
    {
      icon: Heart,
      title: t("client.home.features.items.pricing.title"),
      description: t("client.home.features.items.pricing.description"),
      details: getList("client.home.features.items.pricing.details"),
      benefits: getList("client.home.features.items.pricing.benefits"),
    },
  ];

  const handleFeatureClick = (feature: FeatureType) => {
    setSelectedFeature(feature);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedFeature(null), 300);
  };

  return (
    <Container className="my-16 lg:my-24 space-y-8">
      <div className="text-center space-y-3">
        <Title className="text-3xl lg:text-4xl font-semibold text-ink-strong">
          {t("client.home.features.header.title")}
        </Title>
        <p className="text-ink-muted text-lg max-w-2xl mx-auto">
          {t("client.home.features.header.subtitle")}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-0 p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <button
                key={index}
                onClick={() => handleFeatureClick(feature)}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border bg-surface-0 p-5 text-left transition hover:border-ink"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-1 text-ink">
                    <IconComponent className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-ink-strong">{feature.title}</h3>
                </div>
                <p className="text-sm text-ink-muted leading-relaxed">{feature.description}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  {t("client.home.features.cardHintShort")}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm text-ink-muted sm:grid-cols-4">
          <div>{t("client.home.features.stats.metric.customers")}</div>
          <div>{t("client.home.features.stats.metric.satisfaction")}</div>
          <div>{t("client.home.features.stats.metric.support")}</div>
          <div>{t("client.home.features.stats.metric.priceMatch")}</div>
        </div>
      </div>

      <FeatureModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        feature={selectedFeature}
      />
    </Container>
  );
};

export default ShopFeatures;
