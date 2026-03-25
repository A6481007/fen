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
import { deleteEventById, fetchEventsTable, type EventListRow } from "./actions";

type EventsPageClientProps = {
  initialData: {
    items: EventListRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialStatus?: string;
  initialPublishStatus?: string;
  initialEventType?: string;
  initialSearch?: string;
  basePath?: string;
  canPublish?: boolean;
};

type OptionConfig = {
  value: string;
  labelKey: string;
  defaultLabel: string;
};

const statusOptions: OptionConfig[] = [
  { value: "upcoming", labelKey: "admin.content.events.list.status.upcoming", defaultLabel: "Upcoming" },
  { value: "ongoing", labelKey: "admin.content.events.list.status.ongoing", defaultLabel: "Ongoing" },
  { value: "ended", labelKey: "admin.content.events.list.status.ended", defaultLabel: "Ended" },
];

const eventTypeOptions: OptionConfig[] = [
  { value: "seminar", labelKey: "admin.content.events.list.type.seminar", defaultLabel: "Seminar" },
  { value: "workshop", labelKey: "admin.content.events.list.type.workshop", defaultLabel: "Workshop" },
  { value: "webinar", labelKey: "admin.content.events.list.type.webinar", defaultLabel: "Webinar" },
  { value: "conference", labelKey: "admin.content.events.list.type.conference", defaultLabel: "Conference" },
  { value: "training", labelKey: "admin.content.events.list.type.training", defaultLabel: "Training" },
];

const ALL_STATUS_VALUE = "__all_status";
const ALL_TYPES_VALUE = "__all_types";

const EventsPageClient = ({
  initialData,
  initialStatus = "",
  initialPublishStatus = "",
  initialEventType = "",
  initialSearch = "",
  basePath,
  canPublish,
}: EventsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<EventListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus);
  const [eventType, setEventType] = useState<string>(initialEventType);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const didHydrateRef = useRef(false);
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.content.events.list.date.na");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.content.events.list.date.na");
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    },
    [locale, t],
  );

  const columns: DataTableColumn<EventListRow>[] = useMemo(
    () => [
      {
        id: "title",
        header: t("admin.content.events.list.columns.title"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.title?.trim() || t("admin.content.events.fallback.untitled")}</div>
            <p className="text-xs text-slate-500">
              {row.slug
                ? t("admin.content.events.list.slug", { slug: row.slug })
                : t("admin.content.events.list.noSlug")}{" "}
              |{" "}
              {row.eventType
                ? t(`admin.content.events.list.type.${row.eventType}`, row.eventType)
                : t("admin.content.events.list.uncategorized")}
            </p>
          </div>
        ),
        className: "min-w-[260px]",
      },
      {
        id: "date",
        header: t("admin.content.events.list.columns.date"),
        accessor: (row) => formatDate(row.date),
      },
      {
        id: "location",
        header: t("admin.content.events.list.columns.location"),
        accessor: (row) => row.location || t("admin.content.events.list.notAvailable"),
      },
      {
        id: "status",
        header: t("admin.content.events.list.columns.status"),
        accessor: (row) => (
          <div className="flex items-center gap-2">
            {row.computedStatus ? (
              <Badge variant="outline">
                {t(`admin.content.events.list.status.${row.computedStatus}`, row.computedStatus)}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("admin.content.events.list.unknown")}</Badge>
            )}
            {row.registrationOpen === false && (
              <Badge variant="destructive">{t("admin.content.events.list.closed")}</Badge>
            )}
          </div>
        ),
      },
      {
        id: "attendees",
        header: t("admin.content.events.list.columns.registrations"),
        accessor: (row) => <Badge variant="outline">{row.attendeeCount ?? 0}</Badge>,
      },
    ],
    [formatDate, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchEventsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || undefined,
          eventType: eventType || undefined,
        })
          .then((result) => {
            setRows(result.items);
            setTotal(result.total);
            setPage(result.page);
          })
          .catch((error) => {
            console.error("Failed to load events", error);
            toast({ description: t("admin.content.events.list.errors.loadFailed") });
          });
      });
    },
    [eventType, pageSize, search, status, t, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [eventType, status, search, loadPage]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setEventType("");
    setPage(1);
  };

  const handleDelete = (id: string): Promise<void> => {
    setDeleteTarget(id);
    return new Promise((resolve) => {
      startDeleteTransition(() => {
        deleteEventById(id)
          .then((result) => {
            if (!result.success) {
              toast({
                variant: "destructive",
                description: resolveMessage(result.message, "admin.content.events.list.errors.deleteFailed"),
              });
              return;
            }

            setRows((prev) => prev.filter((row) => row.id !== id));
            setTotal((prev) => Math.max(0, prev - 1));
            toast({ description: t("admin.content.events.list.success.deleted") });
          })
          .catch((error) => {
            console.error("Failed to delete event", error);
            toast({
              variant: "destructive",
              description: t("admin.content.events.list.errors.deleteFailed"),
            });
          })
          .finally(() => {
            setDeleteTarget(null);
            resolve();
          });
      });
    });
  };

  const resolvedStatusValue = status && status.length > 0 ? status : ALL_STATUS_VALUE;
  const resolvedEventTypeValue =
    eventType && eventType.length > 0 ? eventType : ALL_TYPES_VALUE;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.content.events.list.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.content.events.list.subtitle")}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/admin/content/events/new">{t("admin.content.events.list.new")}</Link>
        </Button>
      </div>

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        onReset={handleReset}
        referenceFilters={
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[180px] flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {t("admin.content.events.list.filters.status")}
              </label>
              <Select
                value={resolvedStatusValue}
                onValueChange={(value) => setStatus(value === ALL_STATUS_VALUE ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.content.events.list.statusAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_VALUE}>
                    {t("admin.content.events.list.statusAll")}
                  </SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey, option.defaultLabel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[200px] flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {t("admin.content.events.list.filters.type")}
              </label>
              <Select
                value={resolvedEventTypeValue}
                onValueChange={(value) => setEventType(value === ALL_TYPES_VALUE ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.content.events.list.typeAll")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_TYPES_VALUE}>
                    {t("admin.content.events.list.typeAll")}
                  </SelectItem>
                  {eventTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.labelKey, option.defaultLabel)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/content/events/${row.id}`}>
                {t("admin.content.events.list.actions.edit")}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/admin/content/events/${row.id}/rsvps`}>
                {t("admin.content.events.list.actions.rsvps")}
              </Link>
            </Button>
            <ConfirmDialog
              title={t("admin.content.events.list.delete.title")}
              description={t("admin.content.events.list.delete.description")}
              confirmLabel={t("admin.content.events.list.delete.confirm")}
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
          </div>
        )}
      />
    </div>
  );
};

export default EventsPageClient;


