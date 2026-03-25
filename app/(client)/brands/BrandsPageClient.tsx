"use client";

import "@/app/i18n";
import Container from "@/components/Container";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { useTranslation } from "react-i18next";

type BrandsPageClientProps = {
  showHeroSection?: boolean;
};

const BrandsPageClient = ({ showHeroSection = true }: BrandsPageClientProps) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-shop_light_bg via-white to-shop_light_pink">
      <Container className="py-10">
        <div className="mb-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/">{t("client.brands.breadcrumb.home")}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t("client.brands.breadcrumb.brands")}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        {showHeroSection ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold text-shop_dark_green mb-4">
              {t("client.brands.title")}
            </h1>
            <p className="text-lg text-dark-text">
              {t("client.brands.subtitle")}
            </p>
          </div>
        ) : null}
      </Container>
    </div>
  );
};

export default BrandsPageClient;
