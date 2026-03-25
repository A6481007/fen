"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { normalizeLocaleCode } from "@/lib/i18n/normalizeLocale";
import { deleteNewsById, fetchNewsTable, type NewsListRow } from "./actions";

type NewsPageClientProps = {
  initialData: {
    items: NewsListRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialCategory?: string;
  initialSearch?: string;
  basePath?: string;
};

type CategoryOption = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

const categoryOptions: CategoryOption[] = [
  {
    value: "announcement",
    labelKey: "admin.content.news.category.announcement",
    defaultLabel: "Announcement",
  },
  {
    value: "partnership",
    labelKey: "admin.content.news.category.partnership",
    defaultLabel: "Partnership",
  },
  {
    value: "event_announcement",
    labelKey: "admin.content.news.category.event_announcement",
    defaultLabel: "Event Announcement",
  },
  {
    value: "general",
    labelKey: "admin.content.news.category.general",
    defaultLabel: "General",
  },
];

const ALL_CATEGORIES_VALUE = "__all";

const NewsPageClient = ({
  initialData,
  initialCategory = "",
  initialSearch = "",
  basePath = "/admin/content/news",
}: NewsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<NewsListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState<string>(
    initialCategory && initialCategory.length > 0 ? initialCategory : "",
  );
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const didHydrateRef = useRef(false);
  const { toast } = useToast();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const activeLocale = useMemo(
    () => normalizeLocaleCode(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );
  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.content.news.date.na");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.content.news.date.na");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [locale, t],
  );

  const columns: DataTableColumn<NewsListRow>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.content.news.table.title"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.title?.trim() || t("admin.content.news.fallback.untitled")}</div>
            <p className="text-xs text-slate-500">
              {row.slug
                ? t("admin.content.news.table.slug", { slug: row.slug })
                : t("admin.content.news.table.noSlug")}{" "}
              |{" "}
              {row.category
                ? t(
                    `admin.content.news.category.${row.category}`,
                    row.category.replace("_", " "),
                  )
                : t("admin.content.news.category.uncategorized")}
            </p>
          </div>
        ),
        className: "min-w-[260px]",
      },
      {
        id: "publishDate",
        header: t("admin.content.news.table.publishDate"),
        accessor: (row) => formatDate(row.publishDate),
      },
      {
        id: "updatedAt",
        header: t("admin.content.news.table.updated"),
        accessor: (row) => formatDate(row.updatedAt),
      },
      {
        id: "linkedEvent",
        header: t("admin.content.news.table.linkedEvent"),
        accessor: (row) =>
          row.linkedEventTitle ?? t("admin.content.news.table.linkedEventEmpty"),
      },
      {
        id: "attachments",
        header: t("admin.content.news.table.attachments"),
        accessor: (row) => (
          <Badge variant="outline">{row.attachmentsCount ?? 0}</Badge>
        ),
      },
    ],
    [formatDate, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchNewsTable({
          page: nextPage,
          pageSize,
          search,
          category: category || undefined,
          locale: activeLocale,
        })
          .then((result) => {
            setRows(result.items);
            setTotal(result.total);
            setPage(result.page);
          })
          .catch((error) => {
            console.error("Failed to load news", error);
            toast({
              description: t("admin.content.news.errors.loadFailed"),
            });
          });
      });
    },
    [activeLocale, category, pageSize, search, t, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [category, loadPage, search]);

  const handleReset = () => {
    setSearch("");
    setCategory("");
    setPage(1);
  };

  const handleDelete = (id: string): Promise<void> => {
    setDeleteTarget(id);
    return new Promise((resolve) => {
      startDeleteTransition(() => {
        deleteNewsById(id)
          .then((result) => {
            if (!result.success) {
              toast({
                variant: "destructive",
                description: resolveMessage(result.message, "admin.content.news.errors.deleteFailed"),
              });
              return;
            }

            setRows((prev) => prev.filter((row) => row.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast({ description: t("admin.content.news.toast.deleted") });
          })
          .catch((error) => {
            console.error("Failed to delete news", error);
            toast({
              variant: "destructive",
              description: t("admin.content.news.errors.deleteFailed"),
            });
          })
          .finally(() => {
            setDeleteTarget(null);
            resolve();
          });
      });
    });
  };

  const resolvedCategoryValue =
    category && category.length > 0 ? category : ALL_CATEGORIES_VALUE;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.content.news.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.content.news.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href={`${basePath}/new`}>{t("admin.content.news.new")}</Link>
        </Button>
      </div>

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        onReset={handleReset}
        referenceFilters={
          <div className="flex min-w-[200px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              {t("admin.content.news.filters.category")}
            </label>
            <Select
              value={resolvedCategoryValue}
              onValueChange={(value) =>
                setCategory(value === ALL_CATEGORIES_VALUE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.content.news.filters.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_VALUE}>
                  {t("admin.content.news.filters.allCategories")}
                </SelectItem>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
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
              <Link href={`${basePath}/${row.id}`}>
                {t("admin.content.news.actions.edit")}
              </Link>
            </Button>
            <ConfirmDialog
              title={t("admin.content.news.delete.title")}
              description={t("admin.content.news.delete.description")}
              confirmLabel={t("admin.content.news.delete.confirm")}
              variant="danger"
              onConfirm={() => handleDelete(row.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={isDeleting && deleteTarget === row.id}
                >
                  {t("admin.content.news.actions.delete")}
                </Button>
              }
            />
          </>
        )}
      />
    </div>
  );
};

export default NewsPageClient;


