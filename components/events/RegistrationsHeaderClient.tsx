"use client";

import { useTranslation } from "react-i18next";
import Title from "@/components/Title";

const RegistrationsHeaderClient = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Title>{t("client.registrations.title")}</Title>
      <p className="text-sm text-muted-foreground">
        {t("client.registrations.subtitle")}
      </p>
    </div>
  );
};

export default RegistrationsHeaderClient;
