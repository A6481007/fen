"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { EventRsvpRecord } from "@/actions/backoffice/eventsActions";
import { exportRsvpsCsv, fetchEventRsvps, updateRsvpStatusAction } from "../../actions";

type EventRsvpsClientProps = {
  eventId: string;
  eventTitle: string;
  eventSlug?: string;
  eventDate?: string;
  eventStatus?: string;
  attendeeCount?: number;
  basePath?: string;
  initialData: {
    items: EventRsvpRecord[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialStatus?: string;
  initialSearch?: string;
  initialRegistrationType?: string;
  initialPriority?: string;
};

const ALL_VALUE = "all";

const statusOptions = [
  { value: ALL_VALUE },
  { value: "new" },
  { value: "waitlisted" },
  { value: "confirmed" },
  { value: "checked_in" },
  { value: "contacted" },
  { value: "cancelled" },
  { value: "archived" },
] as const;

const registrationTypeOptions = [
  { value: ALL_VALUE },
  { value: "individual" },
  { value: "team_lead" },
  { value: "team_member" },
] as const;

const priorityOptions = [
  { value: ALL_VALUE },
  { value: "normal" },
  { value: "high" },
] as const;

const EventRsvpsClient = ({
  eventId,
  eventTitle,
  eventSlug,
  eventDate,
  eventStatus,
  attendeeCount = 0,
  basePath = "/admin/content/events",
  initialData,
  initialStatus = "",
  initialSearch = "",
  initialRegistrationType = "",
  initialPriority = "",
}: EventRsvpsClientProps) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [rows, setRows] = useState<EventRsvpRecord[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<string>(initialStatus || ALL_VALUE);
  const [registrationType, setRegistrationType] = useState<string>(initialRegistrationType || ALL_VALUE);
  const [priority, setPriority] = useState<string>(initialPriority || ALL_VALUE);
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExportTransition] = useTransition();
  const [statusPendingId, setStatusPendingId] = useState<string | null>(null);
  const didHydrateRef = useRef(false);

  const locale = i18n.language === "th" ? "th-TH" : "en-US";

  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.content.events.rsvps.date.na");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.content.events.rsvps.date.na");
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

  const statusLabel = (value?: string) =>
    value
      ? t(`admin.content.events.rsvps.status.${value}`, value)
      : t("admin.content.events.rsvps.status.new");

  const registrationTypeLabel = (value?: string) =>
    value
      ? t(`admin.content.events.rsvps.registration.${value}`, value)
      : t("admin.content.events.rsvps.registration.individual");

  const priorityLabel = (value?: string) =>
    value
      ? t(`admin.content.events.rsvps.priority.${value}`, value)
      : t("admin.content.events.rsvps.priority.normal");

  const columns: DataTableColumn<EventRsvpRecord>[] = useMemo(
    () => [
      {
        id: "name",
        header: t("admin.content.events.rsvps.columns.attendee"),
        accessor: (row) => (
          <div className="space-y-1">
            <div className="font-medium text-slate-900">{row.name ?? t("admin.content.events.rsvps.unnamed")}</div>
            <p className="text-xs text-slate-500">
              {row.email ?? t("admin.content.events.rsvps.noEmail")} | {registrationTypeLabel(row.registrationType)}
            </p>
          </div>
        ),
        className: "min-w-[220px]",
      },
      {
        id: "org",
        header: t("admin.content.events.rsvps.columns.organization"),
        accessor: (row) => row.organization ?? t("admin.content.events.rsvps.notAvailable"),
      },
      {
        id: "status",
        header: t("admin.content.events.rsvps.columns.status"),
        accessor: (row) => <Badge variant="outline">{statusLabel(row.status)}</Badge>,
      },
      {
        id: "guests",
        header: t("admin.content.events.rsvps.columns.guests"),
        accessor: (row) => row.guestsCount ?? 1,
      },
      {
        id: "submittedAt",
        header: t("admin.content.events.rsvps.columns.submitted"),
        accessor: (row) => formatDate(row.submittedAt),
      },
    ],
    [formatDate, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchEventRsvps(eventId, {
          page: nextPage,
          pageSize,
          search,
          status: status === ALL_VALUE ? undefined : status,
          registrationType: registrationType === ALL_VALUE ? undefined : registrationType,
          priority: priority === ALL_VALUE ? undefined : priority,
        })
          .then((result) => {
            setRows(result.items);
            setTotal(result.total);
            setPage(result.page);
          })
          .catch((error) => {
            console.error("Failed to load RSVPs", error);
            toast.error(t("admin.content.events.rsvps.errors.loadFailed"));
          });
      });
    },
    [eventId, pageSize, priority, registrationType, search, status, t, toast],
  );

  useEffect(() => {
    if (!didHydrateRef.current) {
      didHydrateRef.current = true;
      return;
    }
    loadPage(1);
  }, [loadPage, search, status, registrationType, priority]);

  const handleReset = () => {
    setSearch("");
    setStatus(ALL_VALUE);
    setRegistrationType(ALL_VALUE);
    setPriority(ALL_VALUE);
    setPage(1);
  };

  const handleStatusChange = (rsvpId: string, nextStatus: string) => {
    setStatusPendingId(rsvpId);
    updateRsvpStatusAction(eventId, rsvpId, nextStatus)
      .then((result) => {
        if (!result.success) {
          toast.error(resolveMessage(result.message, "admin.content.events.rsvps.errors.updateFailed"));
          return;
        }
        setRows((prev) =>
          prev.map((row) => (row._id === rsvpId ? { ...row, status: nextStatus } : row)),
        );
        toast.success(t("admin.content.events.rsvps.success.updated"));
      })
      .catch((error) => {
        console.error("Failed to update RSVP", error);
        toast.error(t("admin.content.events.rsvps.errors.updateFailed"));
      })
      .finally(() => setStatusPendingId(null));
  };

  const handleExport = () => {
    startExportTransition(() => {
      exportRsvpsCsv(eventId)
        .then((result) => {
          if (!result.success || !result.content) {
            toast.error(resolveMessage(result.message, "admin.content.events.rsvps.errors.exportFailed"));
            return;
          }
          const blob = new Blob([result.content], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = result.filename || "event-rsvps.csv";
          anchor.style.display = "none";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
          toast.success(t("admin.content.events.rsvps.success.exported"));
        })
        .catch((error) => {
          console.error("Failed to export RSVPs", error);
          toast.error(t("admin.content.events.rsvps.errors.exportFailed"));
        });
    });
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {eventTitle || t("admin.content.events.rsvps.eventFallback")}
          </p>
          <p className="text-xs text-slate-600">
            {eventSlug
              ? t("admin.content.events.rsvps.slug", { slug: eventSlug })
              : t("admin.content.events.rsvps.noSlug")} | {formatDate(eventDate)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {eventStatus && <Badge variant="outline">{statusLabel(eventStatus)}</Badge>}
            <Badge variant="outline">
              {t("admin.content.events.rsvps.registrations", { count: attendeeCount })}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`${basePath}/${eventId}`}>{t("admin.content.events.rsvps.backToEvent")}</Link>
          </Button>
          <Button size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting
              ? t("admin.content.events.rsvps.exporting")
              : t("admin.content.events.rsvps.exportCsv")}
          </Button>
        </div>
      </div>

      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        onReset={handleReset}
        referenceFilters={
          <div className="flex flex-wrap gap-4">
            <div className="flex min-w-[160px] flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {t("admin.content.events.rsvps.filters.status")}
              </label>
              <Select value={status} onValueChange={(value) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.content.events.rsvps.statusAll")} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === ALL_VALUE
                        ? t("admin.content.events.rsvps.statusAll")
                        : statusLabel(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {t("admin.content.events.rsvps.filters.registrationType")}
              </label>
              <Select value={registrationType} onValueChange={(value) => setRegistrationType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.content.events.rsvps.registrationAll")} />
                </SelectTrigger>
                <SelectContent>
                  {registrationTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === ALL_VALUE
                        ? t("admin.content.events.rsvps.registrationAll")
                        : registrationTypeLabel(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-[160px] flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {t("admin.content.events.rsvps.filters.priority")}
              </label>
              <Select value={priority} onValueChange={(value) => setPriority(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.content.events.rsvps.priorityAll")} />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.value === ALL_VALUE
                        ? t("admin.content.events.rsvps.priorityAll")
                        : priorityLabel(option.value)}
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
        rowKey={(row) => row._id}
        renderActions={(row) => (
          <div className="flex items-center gap-2">
            <Select
              value={row.status ?? "new"}
              onValueChange={(value) => handleStatusChange(row._id, value)}
              disabled={statusPendingId === row._id}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("admin.content.events.rsvps.statusLabel")} />
              </SelectTrigger>
              <SelectContent>
                {statusOptions
                  .filter((option) => option.value !== ALL_VALUE)
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {statusLabel(option.value)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />
    </div>
  );
};

export default EventRsvpsClient;
