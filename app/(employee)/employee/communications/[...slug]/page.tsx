"use client";

import ListPageShell from "@/components/backoffice/ListPageShell";
import PlaceholderDataTable from "@/components/backoffice/PlaceholderDataTable";
import PagePlaceholder from "@/components/backoffice/PagePlaceholder";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface CommunicationsPageProps {
  params: { slug?: string[] };
}

const TITLE_MAP: Record<string, string> = {
  contacts: "employee.communications.sections.contacts",
  subscriptions: "employee.communications.sections.subscriptions",
  notifications: "employee.communications.sections.notifications",
};

export default function CommunicationsPage({
  params,
}: CommunicationsPageProps) {
  const { t } = useTranslation();
  const [section] = params.slug ?? [];
  const normalized = section?.toLowerCase();

  if (!normalized || !TITLE_MAP[normalized]) {
    return (
      <PagePlaceholder
        title={t("employee.communications.placeholder.title")}
        description={t("employee.communications.placeholder.description")}
        actionLabel={t("employee.communications.placeholder.action")}
        actionHref="/employee/dashboard"
      />
    );
  }

  const title = t(TITLE_MAP[normalized]);
  const showNewAction = normalized === "notifications";

  return (
    <ListPageShell
      title={title}
      description={t("employee.communications.section.description", { title })}
      actions={
        showNewAction ? (
          <Button size="sm" variant="default">
            {t("employee.communications.actions.compose")}
          </Button>
        ) : undefined
      }
    >
      <PlaceholderDataTable />
    </ListPageShell>
  );
}
