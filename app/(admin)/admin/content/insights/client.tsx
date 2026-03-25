"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { deleteInsightById, fetchInsightsTable, type InsightListRow } from "./actions";
import { useTranslation } from "react-i18next";
import { normalizeLocaleCode } from "@/lib/i18n/normalizeLocale";

type InsightsPageClientProps = {
  initialData: {
    items: InsightListRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialStatus?: string;
  initialSearch?: string;
};

const statusColors: Record<string, "secondary" | "default" | "outline"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
};

const InsightsPageClient = ({
  initialData,
  initialStatus = "",
  initialSearch = "",
}: InsightsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const activeLocale = useMemo(
    () => normalizeLocaleCode(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );
  const [rows, setRows] = useState<InsightListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const didHydrateRef = useRef(false);
  const { toast } = useToast();

  const statusOptions = useMemo(
    () => [
      { value: "", label: t("admin.content.insights.list.statusAll") },
      { value: "published", label: t("admin.content.insights.status.published") },
      { value: "draft", label: t("admin.content.insights.status.draft") },
      { value: "archived", label: t("admin.content.insights.status.archived") },
    ],
    [t],
  );

  const insightTypeLabels = useMemo(
    () => ({
      productKnowledge: t("admin.content.insights.types.productKnowledge"),
      generalKnowledge: t("admin.content.insights.types.generalKnowledge"),
      problemKnowledge: t("admin.content.insights.types.problemKnowledge"),
      comparison: t("admin.content.insights.types.comparison"),
      caseStudy: t("admin.content.insights.types.caseStudy"),
      validatedSolution: t("admin.content.insights.types.validatedSolution"),
      theoreticalSolution: t("admin.content.insights.types.theoreticalSolution"),
    }),
    [t],
  );

  const statusLabel = (value?: string) =>
    value ? t(`admin.content.insights.status.${value}`, value) : t("admin.content.insights.status.draft");

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.content.insights.list.dateUnavailable");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.content.insights.list.dateUnavailable");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [locale, t],
  );

  const columns: DataTableColumn<InsightListRow>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.content.insights.list.columns.title"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.title}</div>
            <p className="text-xs text-slate-500">
              {row.authorName ? t("admin.content.insights.list.byAuthor", { name: row.authorName }) : t("admin.content.insights.list.unassigned")} - {row.primaryCategory ?? t("admin.content.insights.list.uncategorized")}
            </p>
          </div>
        ),
        className: "min-w-[260px]",
      },
      {
        id: "insightType",
        header: t("admin.content.insights.list.columns.type"),
        accessor: (row) => (
          <Badge variant="outline">
            {row.insightType
              ? insightTypeLabels[row.insightType as keyof typeof insightTypeLabels] ?? row.insightType
              : t("admin.content.insights.list.unlabeled")}
          </Badge>
        ),
      },
      {
        id: "status",
        header: t("admin.content.insights.list.columns.status"),
        accessor: (row) => (
          <Badge variant={statusColors[row.status ?? "draft"] ?? "outline"} className="capitalize">
            {statusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "updatedAt",
        header: t("admin.content.insights.list.columns.updated"),
        accessor: (row) => formatDate(row.updatedAt),
      },
      {
        id: "publishedAt",
        header: t("admin.content.insights.list.columns.published"),
        accessor: (row) => formatDate(row.publishedAt),
      },
    ],
    [formatDate, insightTypeLabels, statusLabel, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchInsightsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || "all",
          locale: activeLocale,
        })
          .then((result) => {
            setRows(result.items);
            setTotal(result.total);
            setPage(result.page);
          })
          .catch((error) => {
            console.error("Failed to load insights", error);
            toast({
              description: t("admin.content.insights.list.errors.loadFailed"),
            });
          });
      });
    },
    [activeLocale, pageSize, search, status, t, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [loadPage, search, status]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const handleDelete = (id: string): Promise<void> => {
    setDeleteTarget(id);
    return new Promise((resolve) => {
      startDeleteTransition(() => {
        deleteInsightById(id)
          .then((result) => {
            if (!result.success) {
              toast({
                variant: "destructive",
                description:
                  result.message ??
                  t("admin.content.insights.list.errors.deleteFailed"),
              });
              return;
            }

            setRows((prev) => prev.filter((row) => row.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast({ description: t("admin.content.insights.list.success.deleted") });
          })
          .catch((error) => {
            console.error("Failed to delete insight", error);
            toast({
              variant: "destructive",
              description: t("admin.content.insights.list.errors.deleteFailedToast"),
            });
          })
          .finally(() => {
            setDeleteTarget(null);
            resolve();
          });
      });
    });
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.content.insights.list.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.content.insights.list.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/content/insights/new">
            {t("admin.content.insights.list.newInsight")}
          </Link>
        </Button>
      </div>

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        statusOptions={statusOptions.map(({ value, label }) => ({ value, label }))}
        onStatusChange={(value) => setStatus(value ?? "")}
        onReset={handleReset}
      />

      <DataTable
        data={rows}
        columns={columns}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={loadPage}
        loading={isPending}
        rowKey={(row) => row.id}
        renderActions={(row) => (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/content/insights/${row.id}`}>
                {t("admin.content.insights.list.actions.edit")}
              </Link>
            </Button>
            <ConfirmDialog
              title={t("admin.content.insights.list.delete.title")}
              description={t("admin.content.insights.list.delete.description")}
              confirmLabel={t("admin.content.insights.list.delete.confirm")}
              variant="danger"
              onConfirm={() => handleDelete(row.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={isDeleting && deleteTarget === row.id}
                >
                  {t("admin.content.insights.list.actions.delete")}
                </Button>
              }
            />
          </>
        )}
      />
    </div>
  );
};

export default InsightsPageClient;

