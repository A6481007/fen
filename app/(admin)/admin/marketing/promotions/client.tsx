"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { StatusBadge } from "@/components/admin/promotions/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { fetchPromotionsTable, type PromotionListRow, type PromotionTableResult } from "./actions";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";
import { removePromotion } from "./actions";

type PromotionsPageClientProps = {
  initialData: PromotionTableResult;
  initialSearch?: string;
  initialStatus?: string;
  initialType?: string;
  initialFrom?: string;
  initialTo?: string;
  canDelete?: boolean;
};

type StatusOption = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

type TemplateOption = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

const statusOptions: StatusOption[] = [
  { value: "draft", labelKey: "admin.promotions.form.status.draft", defaultLabel: "Draft" },
  { value: "scheduled", labelKey: "admin.promotions.form.status.scheduled", defaultLabel: "Scheduled" },
  { value: "active", labelKey: "admin.promotions.form.status.active", defaultLabel: "Active" },
  { value: "paused", labelKey: "admin.promotions.form.status.paused", defaultLabel: "Paused" },
  { value: "ended", labelKey: "admin.promotions.form.status.ended", defaultLabel: "Ended" },
];

const typeOptions: TemplateOption[] = [
  { value: "flashSale", labelKey: "admin.promotions.form.template.flashSale", defaultLabel: "Flash Sale" },
  { value: "seasonal", labelKey: "admin.promotions.form.template.seasonal", defaultLabel: "Seasonal" },
  { value: "bundle", labelKey: "admin.promotions.form.template.bundle", defaultLabel: "Bundle / BXGY" },
  { value: "loyalty", labelKey: "admin.promotions.form.template.loyalty", defaultLabel: "Loyalty" },
  { value: "clearance", labelKey: "admin.promotions.form.template.clearance", defaultLabel: "Clearance" },
  { value: "winBack", labelKey: "admin.promotions.form.template.winBack", defaultLabel: "Win-Back" },
  { value: "firstPurchase", labelKey: "admin.promotions.form.template.firstPurchase", defaultLabel: "First Purchase" },
  { value: "freeShipping", labelKey: "admin.promotions.form.template.freeShipping", defaultLabel: "Free Shipping" },
];

export function PromotionsPageClient({
  initialData,
  initialSearch = "",
  initialStatus = "",
  initialType = "",
  initialFrom = "",
  initialTo = "",
  canDelete = false,
}: PromotionsPageClientProps) {
  const { t, i18n } = useTranslation();
  const ALL_TYPES_VALUE = "__all";
  const [rows, setRows] = useState<PromotionListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus);
  const [promotionType, setPromotionType] = useState<string>(initialType);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const didHydrateRef = useRef(false);
  const { toast } = useToast();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.marketing.promotions.list.date.na");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.marketing.promotions.list.date.na");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [locale, t],
  );

  const columns: DataTableColumn<PromotionListRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("admin.marketing.promotions.list.columns.promotion"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.name}</div>
            <p className="text-xs text-slate-600">
              {row.campaignId
                ? t("admin.marketing.promotions.list.campaign", { id: row.campaignId })
                : t("admin.marketing.promotions.list.noCampaign")}
            </p>
          </div>
        ),
        className: "min-w-[220px]",
      },
      {
        id: "type",
        header: t("admin.marketing.promotions.list.columns.template"),
        accessor: (row) => (
          <Badge variant="secondary">
            {row.type
              ? t(`admin.promotions.form.template.${row.type}`, row.type)
              : t("admin.marketing.promotions.list.notAvailable")}
          </Badge>
        ),
      },
      {
        id: "status",
        header: t("admin.marketing.promotions.list.columns.status"),
        accessor: (row) => <StatusBadge status={row.status ?? "draft"} />,
      },
      {
        id: "schedule",
        header: t("admin.marketing.promotions.list.columns.schedule"),
        accessor: (row) => (
          <div className="text-xs text-slate-700">
            <div>{formatDate(row.startDate)}</div>
            <div className="text-slate-500">
              {t("admin.marketing.promotions.list.schedule.to", {
                end: formatDate(row.endDate),
              })}
            </div>
          </div>
        ),
        className: "min-w-[200px]",
      },
      {
        id: "updatedAt",
        header: t("admin.marketing.promotions.list.columns.updated"),
        accessor: (row) => (
          <span className="text-sm text-slate-700">{formatDate(row.updatedAt)}</span>
        ),
      },
    ],
    [formatDate, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchPromotionsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || undefined,
          type: promotionType || undefined,
          from: from || undefined,
          to: to || undefined,
        }).then((result) => {
          if (!result.success) {
            toast({ description: result.message ?? t("admin.marketing.promotions.list.errors.loadFailed") });
          }
          setRows(result.items);
          setTotal(result.total);
          setPage(result.page);
        }).catch((error) => {
          console.error("Failed to load promotions", error);
          toast({ description: t("admin.marketing.promotions.list.errors.loadFailed") });
        });
      });
    },
    [from, pageSize, promotionType, search, status, t, to, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [loadPage, search, status, promotionType, from, to]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setPromotionType("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const handleDelete = (id: string): Promise<void> => {
    setDeleteTarget(id);
    return new Promise((resolve) => {
      startDeleteTransition(() => {
        removePromotion(id)
          .then((result) => {
            if (!result.success) {
              toast({
                variant: "destructive",
                description: result.message ?? t("admin.marketing.promotions.list.errors.loadFailed"),
              });
              return;
            }

            setRows((prev) => prev.filter((row) => row.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast({ description: t("admin.marketing.promotions.list.toast.deleted", "Promotion deleted") });
          })
          .catch((error) => {
            console.error("Failed to delete promotion", error);
            toast({
              variant: "destructive",
              description: t("admin.marketing.promotions.list.errors.loadFailed"),
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
      {!initialData.success && (
        <InlineErrorMessage
          message={initialData.message}
          fallbackKey="admin.marketing.promotions.list.errors.loadFailed"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.marketing.promotions.list.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.marketing.promotions.list.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/marketing/promotions/new">
            {t("admin.marketing.promotions.list.new")}
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
        onStatusChange={(value) => setStatus(value ?? "")}
        dateRange={{
          from,
          to,
          onChange: (range) => {
            setFrom(range.from ?? "");
            setTo(range.to ?? "");
          },
        }}
        referenceFilters={
          <div className="flex min-w-[200px] flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">
              {t("admin.marketing.promotions.list.filters.template")}
            </label>
            <Select
              value={promotionType && promotionType.length > 0 ? promotionType : ALL_TYPES_VALUE}
              onValueChange={(value) => setPromotionType(value === ALL_TYPES_VALUE ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.marketing.promotions.list.templateAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_TYPES_VALUE}>
                  {t("admin.marketing.promotions.list.templateAll")}
                </SelectItem>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
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
              <Link href={`/admin/marketing/promotions/${row.id}`}>
                {t("admin.marketing.promotions.list.actions.edit")}
              </Link>
            </Button>
            {canDelete && (
              <ConfirmDialog
                title={t("admin.marketing.promotions.list.deleteTitle", "Delete promotion?")}
                description={t("admin.marketing.promotions.list.deleteDescription", "This action cannot be undone.")}
                confirmLabel={t("admin.confirmDialog.confirm")}
                cancelLabel={t("admin.confirmDialog.cancel")}
                variant="danger"
                onConfirm={() => handleDelete(row.id)}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={isDeleting && deleteTarget === row.id}
                  >
                    {t("admin.content.events.list.actions.delete")}
                  </Button>
                }
              />
            )}
          </>
        )}
      />
    </div>
  );
}
