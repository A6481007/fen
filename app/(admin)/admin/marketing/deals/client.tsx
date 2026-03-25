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
import { fetchDealsTable, type DealListRow, type DealTableResult } from "./actions";
import { useTranslation } from "react-i18next";
import InlineErrorMessage from "@/components/admin/InlineErrorMessage";

type DealsPageClientProps = {
  initialData: DealTableResult;
  initialSearch?: string;
  initialStatus?: string;
  initialDealType?: string;
  initialFrom?: string;
  initialTo?: string;
};

const ALL_DEAL_TYPES_VALUE = "__all_deal_types";
export function DealsPageClient({
  initialData,
  initialSearch = "",
  initialStatus = "",
  initialDealType = "",
  initialFrom = "",
  initialTo = "",
}: DealsPageClientProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const [rows, setRows] = useState<DealListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus);
  const [dealType, setDealType] = useState<string>(initialDealType || ALL_DEAL_TYPES_VALUE);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [isPending, startTransition] = useTransition();
  const didHydrateRef = useRef(false);
  const { toast } = useToast();

  const statusOptions = useMemo(
    () => [
      { value: "", label: t("admin.marketing.deals.filters.statusAll") },
      { value: "draft", label: t("admin.marketing.deals.status.draft") },
      { value: "active", label: t("admin.marketing.deals.status.active") },
      { value: "ended", label: t("admin.marketing.deals.status.ended") },
    ],
    [t],
  );

  const typeOptions = useMemo(
    () => [
      { value: "", label: t("admin.marketing.deals.filters.templateAll") },
      { value: "featured", label: t("admin.marketing.deals.templates.featured") },
      { value: "priceDrop", label: t("admin.marketing.deals.templates.priceDrop") },
      { value: "limitedQty", label: t("admin.marketing.deals.templates.limitedQty") },
      { value: "daily", label: t("admin.marketing.deals.templates.daily") },
      { value: "clearance", label: t("admin.marketing.deals.templates.clearance") },
    ],
    [t],
  );

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.marketing.deals.dateUnavailable");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.marketing.deals.dateUnavailable");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [locale, t],
  );

  const formatPrice = useCallback(
    (value?: number) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return t("admin.marketing.deals.priceUnavailable");
      }
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "THB",
      }).format(value);
    },
    [locale, t],
  );

  const columns: DataTableColumn<DealListRow>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.marketing.deals.columns.deal"),
        accessor: (row) => (
          <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-900">
                {row.title || t("admin.marketing.deals.untitledDeal")}
              </span>
                {row.dealType && (
                <Badge variant="secondary">
                  {t(`admin.marketing.deals.templates.${row.dealType}`, row.dealType)}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600">
              {row.dealId
                ? t("admin.marketing.deals.dealId", { id: row.dealId })
                : t("admin.marketing.deals.noDealId")}
            </p>
          </div>
        ),
        className: "min-w-[220px]",
      },
      {
        id: "product",
        header: t("admin.marketing.deals.columns.product"),
        accessor: (row) => (
          <span className="text-sm text-slate-800">{row.productName ?? t("admin.marketing.deals.productFallback")}</span>
        ),
      },
      {
        id: "status",
        header: t("admin.marketing.deals.columns.status"),
        accessor: (row) => <StatusBadge status={row.status ?? "draft"} />,
      },
      {
        id: "schedule",
        header: t("admin.marketing.deals.columns.schedule"),
        accessor: (row) => (
          <div className="text-xs text-slate-700">
            <div>{formatDate(row.startDate)}</div>
            <div className="text-slate-500">
              {t("admin.marketing.deals.toLabel", { date: formatDate(row.endDate) })}
            </div>
          </div>
        ),
        className: "min-w-[200px]",
      },
      {
        id: "pricing",
        header: t("admin.marketing.deals.columns.pricing"),
        accessor: (row) => (
          <div className="text-sm text-slate-800">
            <div>{formatPrice(row.dealPrice)}</div>
            <div className="text-xs text-slate-500">
              {row.originalPrice
                ? t("admin.marketing.deals.originalPrice", {
                    price: formatPrice(row.originalPrice),
                  })
                : t("admin.marketing.deals.usesProductPrice")}
            </div>
          </div>
        ),
        className: "min-w-[140px]",
      },
      {
        id: "inventory",
        header: t("admin.marketing.deals.columns.inventory"),
        accessor: (row) => (
          <div className="text-xs text-slate-700">
            <div>
              {typeof row.soldCount === "number"
                ? t("admin.marketing.deals.soldLabel", { count: row.soldCount })
                : t("admin.marketing.deals.countUnavailable")}
            </div>
            <div className="text-slate-500">
              {typeof row.remainingQty === "number" && typeof row.quantityLimit === "number"
                ? t("admin.marketing.deals.remainingLabel", {
                    remaining: row.remainingQty,
                    limit: row.quantityLimit,
                  })
                : t("admin.marketing.deals.noCap")}
            </div>
          </div>
        ),
      },
    ],
    [formatDate, formatPrice, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchDealsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || undefined,
          dealType: dealType === ALL_DEAL_TYPES_VALUE ? undefined : dealType || undefined,
          from: from || undefined,
          to: to || undefined,
        }).then((result) => {
          if (!result.success) {
            toast({ description: result.message ?? t("admin.marketing.deals.errors.loadDeals") });
          }
          setRows(result.items);
          setTotal(result.total);
          setPage(result.page);
        }).catch((error) => {
          console.error("Failed to load deals", error);
          toast({ description: t("admin.marketing.deals.errors.loadDeals") });
        });
      });
    },
    [dealType, from, pageSize, search, status, t, to, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [dealType, from, loadPage, search, status, to]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setDealType(ALL_DEAL_TYPES_VALUE);
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <div className="space-y-4 p-6">
      {!initialData.success && (
        <InlineErrorMessage
          message={initialData.message}
          fallbackKey="admin.marketing.deals.errors.loadDeals"
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.marketing.deals.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.marketing.deals.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/marketing/deals/new">
            {t("admin.marketing.deals.newDeal")}
          </Link>
        </Button>
      </div>

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        statusOptions={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
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
              {t("admin.marketing.deals.filters.templateLabel")}
            </label>
            <Select value={dealType} onValueChange={(value) => setDealType(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.marketing.deals.filters.templateAll")} />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem
                    key={option.value || ALL_DEAL_TYPES_VALUE}
                    value={option.value === "" ? ALL_DEAL_TYPES_VALUE : option.value}
                  >
                    {option.label}
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
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/admin/marketing/deals/${row.id}`}>
              {t("admin.marketing.deals.actions.edit")}
            </Link>
          </Button>
        )}
      />
    </div>
  );
}

export default DealsPageClient;
