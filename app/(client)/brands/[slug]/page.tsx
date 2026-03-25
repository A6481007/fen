"use client";

import Container from "@/components/Container";
import { useTranslation } from "react-i18next";

const SingleBrand = () => {
  const { t } = useTranslation();

  return (
    <div>
      <Container>{t("client.brands.single.placeholder")}</Container>
    </div>
  );
};

export default SingleBrand;
