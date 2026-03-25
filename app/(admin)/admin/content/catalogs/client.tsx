"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { CatalogListRow } from "@/components/admin/backoffice/catalogs/types";
import { deleteCatalogById, fetchCatalogsTable } from "./actions";

type CatalogsPageClientProps = {
  initialData: { items: CatalogListRow[]; total: number; page: number; pageSize: number };
  initialSearch?: string;
  initialStatus?: string;
  initialCategory?: string;
};

type StatusOption = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

type CatalogStatusFilter = "" | "draft" | "published";

const statusOptions: StatusOption[] = [
  { value: "", labelKey: "admin.content.catalogs.list.statusAll", defaultLabel: "All statuses" },
  { value: "draft", labelKey: "admin.downloads.status.draft", defaultLabel: "Draft" },
  { value: "published", labelKey: "admin.downloads.status.published", defaultLabel: "Published" },
];

export const CatalogsPageClient = ({
  initialData,
  initialSearch = "",
  initialStatus = "",
  initialCategory = "",
}: CatalogsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<CatalogListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<CatalogStatusFilter>(initialStatus as CatalogStatusFilter);
  const [category, setCategory] = useState(initialCategory);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const didHydrateRef = useRef(false);
  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.content.catalogs.list.date.na");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.content.catalogs.list.date.na");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [locale, t],
  );

  const columns: DataTableColumn<CatalogListRow>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.content.catalogs.list.columns.title"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.title}</div>
            <p className="text-xs text-slate-500">
              {t("admin.content.catalogs.list.slug", {
                slug: row.slug ?? t("admin.content.catalogs.list.notAvailable"),
              })}
            </p>
          </div>
        ),
        className: "min-w-[240px]",
      },
      {
        id: "category",
        header: t("admin.content.catalogs.list.columns.category"),
        accessor: (row) => row.category ?? t("admin.content.catalogs.list.notAvailable"),
      },
      {
        id: "status",
        header: t("admin.content.catalogs.list.columns.status"),
        accessor: (row) =>
          row.status ? (
            <Badge variant="outline">{row.status}</Badge>
          ) : (
            t("admin.content.catalogs.list.notAvailable")
          ),
      },
      {
        id: "fileType",
        header: t("admin.content.catalogs.list.columns.fileType"),
        accessor: (row) => row.fileType ?? t("admin.content.catalogs.list.notAvailable"),
      },
      {
        id: "dates",
        header: t("admin.content.catalogs.list.columns.dates"),
        accessor: (row) => (
          <div className="text-xs text-slate-600 space-y-0.5">
            <div>
              {t("admin.content.catalogs.list.publishDate", {
                date: formatDate(row.publishDate),
              })}
            </div>
            <div>
              {t("admin.content.catalogs.list.updatedDate", {
                date: formatDate(row.updatedAt),
              })}
            </div>
          </div>
        ),
        className: "min-w-[180px]",
      },
    ],
    [formatDate, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchCatalogsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || undefined,
          category: category || undefined,
        })
          .then((result) => {
            if (!result.success) {
              toast({
                description: result.message ?? t("admin.content.catalogs.list.errors.loadFailed"),
              });
              return;
            }
            if (!result.data) {
              toast({ description: t("admin.content.catalogs.list.errors.loadFailed") });
              return;
            }
            setRows(result.data.items);
            setTotal(result.data.total);
            setPage(result.data.page);
          })
          .catch((error) => {
            console.error("Failed to load catalogs", error);
            toast({ description: t("admin.content.catalogs.list.errors.loadFailed") });
          });
      });
    },
    [category, pageSize, search, status, t, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [category, status, search, loadPage]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);
  };

  const handleDelete = (id: string): Promise<void> => {
    setDeleteTarget(id);
    return new Promise((resolve) => {
      startDeleteTransition(() => {
        deleteCatalogById(id)
          .then((result) => {
            if (!result.success) {
              toast({
                variant: "destructive",
                description: result.message ?? t("admin.content.catalogs.list.errors.deleteFailed"),
              });
              return;
            }

            setRows((prev) => prev.filter((row) => row.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast({ description: t("admin.content.catalogs.list.success.deleted") });
          })
          .catch((error) => {
            console.error("Failed to delete catalog", error);
            toast({
              variant: "destructive",
              description: t("admin.content.catalogs.list.errors.deleteFailed"),
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
            {t("admin.content.catalogs.list.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.content.catalogs.list.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/content/catalogs/new">
            {t("admin.content.catalogs.list.new")}
          </Link>
        </Button>
      </div>

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        statusOptions={statusOptions.map((option) => ({
          value: option.value,
          label: t(option.labelKey, option.defaultLabel),
        }))}
        onStatusChange={(value) => setStatus((value ?? "") as CatalogStatusFilter)}
        searchPlaceholder={t("admin.content.catalogs.list.searchPlaceholder")}
        referenceFilters={
          <div className="flex min-w-[200px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              {t("admin.content.catalogs.list.filters.category")}
            </label>
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder={t("admin.content.catalogs.list.filters.categoryPlaceholder")}
            />
          </div>
        }
        onReset={handleReset}
      />

      <DataTable
        data={rows}
        columns={columns}
        loading={isPending}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={loadPage}
        rowKey={(row) => row.id}
        renderActions={(row) => (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/content/catalogs/${row.id}`}>
                {t("admin.content.catalogs.list.actions.open")}
              </Link>
            </Button>
            <ConfirmDialog
              title={t("admin.content.catalogs.list.delete.title")}
              description={t("admin.content.catalogs.list.delete.description")}
              confirmLabel={t("admin.content.catalogs.list.delete.confirm")}
              variant="danger"
              onConfirm={() => handleDelete(row.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={isDeleting && deleteTarget === row.id}
                >
                  {t("admin.content.catalogs.list.actions.delete")}
                </Button>
              }
            />
          </>
        )}
      />
    </div>
  );
};
