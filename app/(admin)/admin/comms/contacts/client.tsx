"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/admin/backoffice/DataTable";
import { FiltersBar } from "@/components/admin/backoffice/FiltersBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ContactRecord } from "@/actions/backoffice/commsActions";
import {
  fetchContactsTable,
  loadContactDetail,
  resolveContact,
  type ContactListRow,
} from "./actions";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Mail,
  MessageSquare,
  RefreshCw,
  Clock3,
} from "lucide-react";

type ContactsPageClientProps = {
  initialData: {
    items: ContactListRow[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialStatus?: string;
  initialSearch?: string;
};

type ContactStatus = "" | "all" | "new" | "read" | "replied" | "closed";

const statusBadge: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  new: "destructive",
  read: "secondary",
  replied: "default",
  closed: "outline",
  resolved: "outline",
};

const priorityClass: Record<string, string> = {
  urgent: "bg-red-600 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-700",
};

const ContactsPageClient = ({
  initialData,
  initialStatus = "",
  initialSearch = "",
}: ContactsPageClientProps) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const [rows, setRows] = useState<ContactListRow[]>(initialData.items);
  const [page, setPage] = useState(initialData.page);
  const [pageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<ContactStatus>(initialStatus as ContactStatus);
  const [isPending, startTransition] = useTransition();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailContact, setDetailContact] = useState<ContactRecord | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const didHydrateRef = useRef(false);
  const { toast } = useToast();

  const statusLabel = useCallback(
    (value?: string) =>
      value ? t(`admin.comms.contacts.status.${value}`, value) : t("admin.comms.contacts.status.unknown"),
    [t],
  );

  const priorityLabel = useCallback(
    (value?: string) =>
      value ? t(`admin.comms.contacts.priority.${value}`, value) : t("admin.comms.contacts.priority.none"),
    [t],
  );

  const formatDate = useCallback(
    (value?: string) => {
      if (!value) return t("admin.comms.contacts.dateUnavailable");
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t("admin.comms.contacts.dateUnavailable");
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

  const statusOptions = useMemo(
    () => [
      { value: "", label: t("admin.comms.contacts.status.all") },
      { value: "new", label: t("admin.comms.contacts.status.new") },
      { value: "read", label: t("admin.comms.contacts.status.read") },
      { value: "replied", label: t("admin.comms.contacts.status.replied") },
      { value: "closed", label: t("admin.comms.contacts.status.closed") },
    ],
    [t],
  );

  const statusFilters = useMemo(
    () => statusOptions.map((option) => ({ value: option.value, label: option.label })),
    [statusOptions],
  );

  const columns: DataTableColumn<ContactListRow>[] = useMemo(
    () => [
      {
        id: "contact",
        header: t("admin.comms.contacts.columns.contact"),
        accessor: (row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">
              {row.name || t("admin.comms.contacts.unknownSender")}
            </p>
            <p className="text-xs text-slate-600">
              {row.email || t("admin.comms.contacts.noEmail")}
            </p>
          </div>
        ),
        className: "min-w-[220px]",
      },
      {
        id: "subject",
        header: t("admin.comms.contacts.columns.subject"),
        accessor: (row) => (
          <div className="space-y-1">
            <p className="font-medium text-slate-900">
              {row.subject || t("admin.comms.contacts.noSubject")}
            </p>
            {row.message && (
              <p className="text-xs text-slate-500 line-clamp-2">{row.message}</p>
            )}
          </div>
        ),
        className: "min-w-[260px]",
      },
      {
        id: "status",
        header: t("admin.comms.contacts.columns.status"),
        accessor: (row) => (
          <Badge
            variant={statusBadge[row.status ?? ""] ?? "outline"}
            className="capitalize"
          >
            {statusLabel(row.status)}
          </Badge>
        ),
      },
      {
        id: "priority",
        header: t("admin.comms.contacts.columns.priority"),
        accessor: (row) =>
          row.priority ? (
            <Badge className={cn("capitalize", priorityClass[row.priority] ?? "")}>
              {priorityLabel(row.priority)}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("admin.comms.contacts.priority.none")}</Badge>
          ),
      },
      {
        id: "submittedAt",
        header: t("admin.comms.contacts.columns.received"),
        accessor: (row) => (
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Clock3 className="h-4 w-4 text-slate-400" />
            {formatDate(row.submittedAt)}
          </div>
        ),
      },
    ],
    [formatDate, priorityLabel, statusLabel, t],
  );

  const loadPage = useCallback(
    (nextPage: number) => {
      startTransition(() => {
        fetchContactsTable({
          page: nextPage,
          pageSize,
          search,
          status: status || undefined,
        })
          .then((result) => {
            setRows(result.items);
            setTotal(result.total);
            setPage(result.page);
          })
          .catch((error) => {
            console.error("Failed to load contacts", error);
            toast({
              description: t("admin.comms.contacts.errors.loadContacts"),
            });
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
  }, [loadPage, search, status]);

  const handleReset = () => {
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const handleResolve = useCallback(
    (id: string) => {
      setResolvingId(id);
      resolveContact(id)
        .then((result) => {
          if (!result.success) {
            toast({
              description:
                result.message ?? t("admin.comms.contacts.errors.updateContact"),
              variant: "destructive",
            });
            return;
          }

          const nextStatus = result.status ?? "closed";

          setRows((current) =>
            current.map((row) =>
              row.id === id
                ? {
                    ...row,
                    status: nextStatus as ContactListRow["status"],
                  }
                : row,
            ),
          );

          setDetailContact((current) =>
            current && current._id === id
              ? {
                  ...current,
                  status: nextStatus as ContactRecord["status"],
                  resolvedAt: result.resolvedAt ?? current.resolvedAt,
                  resolvedBy: result.resolvedBy ?? current.resolvedBy,
                }
              : current,
          );

          toast({ description: t("admin.comms.contacts.success.closed") });
        })
        .catch((error) => {
          console.error("Failed to resolve contact", error);
          toast({
            description: t("admin.comms.contacts.errors.updateContact"),
            variant: "destructive",
          });
        })
        .finally(() => setResolvingId(null));
    },
    [t, toast],
  );

  const openContact = useCallback(
    (id: string) => {
      setActiveId(id);
      setDetailContact(null);
      setDetailLoading(true);
      setDetailOpen(true);

      loadContactDetail(id)
        .then((contact) => setDetailContact(contact))
        .catch((error) => {
          console.error("Failed to load contact detail", error);
          toast({
            description: t("admin.comms.contacts.errors.loadDetail"),
            variant: "destructive",
          });
        })
        .finally(() => setDetailLoading(false));
    },
    [t, toast],
  );

  const refreshCurrentPage = () => loadPage(page);

  const renderActions = (row: ContactListRow) => {
    const isClosed =
      (row.status ?? "").toLowerCase() === "closed" ||
      (row.status ?? "").toLowerCase() === "resolved";

    return (
      <>
        <Button variant="ghost" size="sm" onClick={() => openContact(row.id)}>
          <Eye className="h-4 w-4 mr-2" />
          {t("admin.comms.contacts.actions.view")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isClosed || resolvingId === row.id}
          onClick={() => handleResolve(row.id)}
          className={cn(isClosed && "text-slate-400")}
        >
          <CheckCircle2
            className={cn(
              "h-4 w-4 mr-2",
              resolvingId === row.id ? "animate-spin text-brand-text-main" : undefined,
            )}
          />
          {isClosed
            ? t("admin.comms.contacts.actions.closed")
            : t("admin.comms.contacts.actions.resolve")}
        </Button>
      </>
    );
  };

  return (
    <>
      <div className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-brand-text-main" />
              {t("admin.comms.contacts.title")}
            </p>
            <p className="text-xs text-slate-600">
              {t("admin.comms.contacts.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshCurrentPage} disabled={isPending}>
              <RefreshCw
                className={cn("h-4 w-4 mr-2", isPending ? "animate-spin" : undefined)}
              />
              {t("admin.comms.contacts.actions.refresh")}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/subscriptions">
                {t("admin.comms.contacts.actions.subscriptions")}
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/notifications">
                {t("admin.comms.contacts.actions.notifications")}
              </Link>
            </Button>
          </div>
        </div>

        <FiltersBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          statusOptions={statusFilters}
          onStatusChange={(value) => setStatus((value ?? "") as ContactStatus)}
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
          renderActions={renderActions}
        />
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full border-l border-slate-200 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-text-main" />
              {t("admin.comms.contacts.detail.title")}
            </SheetTitle>
            <SheetDescription>
              {t("admin.comms.contacts.detail.subtitle")}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {detailLoading ? (
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("admin.comms.contacts.detail.loading")}
                </div>
              </div>
            ) : detailContact ? (
              <ScrollArea className="h-[70vh] pr-2">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={statusBadge[detailContact.status ?? ""] ?? "outline"}
                      className="capitalize"
                    >
                      {statusLabel(detailContact.status)}
                    </Badge>
                    {detailContact.priority && (
                      <Badge className={cn("capitalize", priorityClass[detailContact.priority] ?? "")}>
                        {priorityLabel(detailContact.priority)}
                      </Badge>
                    )}
                    {detailContact.resolvedAt && (
                      <Badge variant="outline" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {t("admin.comms.contacts.detail.closedAt", {
                          date: formatDate(detailContact.resolvedAt),
                        })}
                      </Badge>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t("admin.comms.contacts.detail.subjectLabel")}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">
                      {detailContact.subject || t("admin.comms.contacts.noSubject")}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {t("admin.comms.contacts.detail.messageLabel")}
                    </p>
                    <p className="whitespace-pre-line text-sm text-slate-900">
                      {detailContact.message || t("admin.comms.contacts.noMessage")}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 p-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">
                        {t("admin.comms.contacts.detail.fromLabel")}
                      </p>
                      <p className="font-medium text-slate-900">
                        {detailContact.name || t("admin.comms.contacts.unknownSender")}
                      </p>
                      <p className="text-xs text-slate-600">
                        {detailContact.email || t("admin.comms.contacts.noEmailShort")}
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">
                        {t("admin.comms.contacts.detail.receivedLabel")}
                      </p>
                      <p className="font-medium text-slate-900">
                        {formatDate(detailContact.submittedAt ?? detailContact._createdAt)}
                      </p>
                    </div>
                    {detailContact.relatedOrder && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500">
                            {t("admin.comms.contacts.detail.relatedOrderLabel")}
                          </p>
                          <p className="font-medium text-slate-900">
                            {detailContact.relatedOrder.orderNumber || detailContact.relatedOrder._id}
                          </p>
                          <p className="text-xs text-slate-600">
                            {detailContact.relatedOrder.status ||
                              detailContact.relatedOrder.orderKind ||
                              t("admin.comms.contacts.detail.orderFallback")}
                          </p>
                        </div>
                      </>
                    )}
                    {detailContact.ipAddress && (
                      <>
                        <Separator />
                        <div className="space-y-1">
                          <p className="text-xs text-slate-500">
                            {t("admin.comms.contacts.detail.submittedFromLabel")}
                          </p>
                          <p className="font-medium text-slate-900">{detailContact.ipAddress}</p>
                          {detailContact.userAgent && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {detailContact.userAgent}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {detailContact.status !== "closed" && detailContact.status !== "resolved" && (
                      <Button
                        size="sm"
                        onClick={() => activeId && handleResolve(activeId)}
                        disabled={Boolean(resolvingId)}
                        className="gap-2"
                      >
                        {resolvingId ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {t("admin.comms.contacts.actions.markClosed")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailOpen(false)}
                      className="gap-2"
                    >
                      <AlertTriangle className="h-4 w-4 text-slate-500" />
                      {t("admin.comms.contacts.actions.closePanel")}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
                {t("admin.comms.contacts.detail.empty")}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ContactsPageClient;
