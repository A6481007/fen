"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { DownloadListRow } from "@/components/admin/backoffice/downloads/types";
import { deleteDownloadById, fetchDownloadsTable } from "./actions";

type DownloadsPageClientProps = {
  initialData: { items: DownloadListRow[]; total: number; page: number; pageSize: number };
  initialSearch?: string;
  initialStatus?: string;
};

type StatusOption = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

const statusOptions: StatusOption[] = [
  { value: "draft", labelKey: "admin.downloads.status.draft", defaultLabel: "Draft" },
  { value: "published", labelKey: "admin.downloads.status.published", defaultLabel: "Published" },
];

type DownloadStatusFilter = "" | "draft" | "published";

export const DownloadsPageClient = ({
  initialData,
  initialSearch = "",
  initialStatus = "",
}: DownloadsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<DownloadListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<DownloadStatusFilter>(initialStatus as DownloadStatusFilter);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const didHydrateRef = useRef(false);
  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.content.downloads.list.date.na");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.content.downloads.list.date.na");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    },
    [locale, t],
  );

  const columns: DataTableColumn<DownloadListRow>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.content.downloads.list.columns.title"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.title}</div>
            <p className="text-xs text-slate-500">
              {t("admin.content.downloads.list.slug", {
                slug: row.slug ?? t("admin.content.downloads.list.notAvailable"),
              })}
            </p>
          </div>
        ),
        className: "min-w-[240px]",
      },
      {
        id: "status",
        header: t("admin.content.downloads.list.columns.status"),
        accessor: (row) =>
          row.status ? (
            <Badge variant="outline">{row.status}</Badge>
          ) : (
            t("admin.content.downloads.list.notAvailable")
          ),
      },
      {
        id: "file",
        header: t("admin.content.downloads.list.columns.file"),
        accessor: (row) => row.fileRef ?? t("admin.content.downloads.list.notAvailable"),
      },
      {
        id: "related",
        header: t("admin.content.downloads.list.columns.related"),
        accessor: (row) => row.relatedProductsCount ?? 0,
      },
      {
        id: "updated",
        header: t("admin.content.downloads.list.columns.updated"),
        accessor: (row) => formatDate(row.updatedAt),
      },
    ],
    [formatDate, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchDownloadsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || undefined,
        })
          .then((result) => {
            if (!result.success || !result.data) {
              toast({ description: result.message ?? t("admin.content.downloads.list.errors.loadFailed") });
              return;
            }
            setRows(result.data.items);
            setTotal(result.data.total);
            setPage(result.data.page);
          })
          .catch((error) => {
            console.error("Failed to load downloads", error);
            toast({ description: t("admin.content.downloads.list.errors.loadFailed") });
          });
      });
    },
    [pageSize, search, status, t, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [status, search, loadPage]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const handleDelete = (id: string): Promise<void> => {
    setDeleteTarget(id);
    return new Promise((resolve) => {
      startDeleteTransition(() => {
        deleteDownloadById(id)
          .then((result) => {
            if (!result.success) {
              toast({
                variant: "destructive",
                description: result.message ?? t("admin.content.downloads.list.errors.deleteFailed"),
              });
              return;
            }

            setRows((prev) => prev.filter((row) => row.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast({ description: t("admin.content.downloads.list.success.deleted") });
          })
          .catch((error) => {
            console.error("Failed to delete download", error);
            toast({
              variant: "destructive",
              description: t("admin.content.downloads.list.errors.deleteFailed"),
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
            {t("admin.content.downloads.list.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.content.downloads.list.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/content/downloads/new">
            {t("admin.content.downloads.list.new")}
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
        onStatusChange={(value) => setStatus((value ?? "") as DownloadStatusFilter)}
        searchPlaceholder={t("admin.content.downloads.list.searchPlaceholder")}
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
              <Link href={`/admin/content/downloads/${row.id}`}>
                {t("admin.content.downloads.list.actions.open")}
              </Link>
            </Button>
            <ConfirmDialog
              title={t("admin.content.downloads.list.delete.title")}
              description={t("admin.content.downloads.list.delete.description")}
              confirmLabel={t("admin.content.downloads.list.delete.confirm")}
              variant="danger"
              onConfirm={() => handleDelete(row.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  disabled={isDeleting && deleteTarget === row.id}
                >
                  {t("admin.content.downloads.list.actions.delete")}
                </Button>
              }
            />
          </>
        )}
      />
    </div>
  );
};
