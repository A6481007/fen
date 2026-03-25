"use client";

import ListPageShell from "@/components/backoffice/ListPageShell";
import PlaceholderDataTable from "@/components/backoffice/PlaceholderDataTable";
import PagePlaceholder from "@/components/backoffice/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface MarketingPageProps {
  params: { slug?: string[] };
}

const TITLE_MAP: Record<string, string> = {
  promotions: "employee.marketing.sections.promotions",
  deals: "employee.marketing.sections.deals",
  banners: "employee.marketing.sections.banners",
};

export default function MarketingPage({ params }: MarketingPageProps) {
  const { t } = useTranslation();
  const [section] = params.slug ?? [];
  const normalized = section?.toLowerCase();

  if (!normalized || !TITLE_MAP[normalized]) {
    return (
      <PagePlaceholder
        title={t("employee.marketing.placeholder.title")}
        description={t("employee.marketing.placeholder.description")}
        actionLabel={t("employee.marketing.placeholder.action")}
        actionHref="/employee/dashboard"
      />
    );
  }

  const title = t(TITLE_MAP[normalized]);

  return (
    <ListPageShell
      title={title}
      description={t("employee.marketing.section.description", { title })}
      actions={
        <Button size="sm" variant="default">
          {t("employee.marketing.actions.new", { title })}
        </Button>
      }
    >
      <PlaceholderDataTable />
    </ListPageShell>
  );
}
