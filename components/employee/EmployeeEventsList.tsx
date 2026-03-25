"use client";

/*
[PROPOSED] EmployeeEventsList - scaffolded events list view for content ops.
[EXISTING] uses FilterPanel, Card, Badge, Button, Table, Separator.
*/

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import FilterPanel, { type FilterConfig } from "@/components/shared/FilterPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Pencil, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

type EventStatus =
  | "draft"
  | "review"
  | "scheduled"
  | "live"
  | "completed"
  | "cancelled";

type EventType = "webinar" | "in-person" | "hybrid" | "workshop";

type EventRow = {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  owner: string;
  region: string;
  location: string;
  timezone: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  registrations: number;
  capacity: number;
  updatedAt: string;
  slug: string;
};

const EVENTS: EventRow[] = [
  {
    id: "EVT-4101",
    title: "Predictive Maintenance Virtual Summit",
    type: "webinar",
    status: "scheduled",
    owner: "Alicia Park",
    region: "Global",
    location: "Virtual",
    timezone: "UTC",
    startDate: "2026-02-05",
    endDate: "2026-02-05",
    startTime: "09:00",
    endTime: "12:00",
    registrations: 320,
    capacity: 500,
    updatedAt: "2026-01-12",
    slug: "predictive-maintenance-summit",
  },
  {
    id: "EVT-4102",
    title: "Operations Leaders Roundtable",
    type: "in-person",
    status: "draft",
    owner: "Ravi Patel",
    region: "APAC",
    location: "Singapore",
    timezone: "SGT",
    startDate: "2026-03-15",
    endDate: "2026-03-15",
    startTime: "14:00",
    endTime: "17:00",
    registrations: 0,
    capacity: 80,
    updatedAt: "2026-01-10",
    slug: "ops-roundtable-singapore",
  },
  {
    id: "EVT-4103",
    title: "Safety Automation Workshop",
    type: "workshop",
    status: "live",
    owner: "Priya Nair",
    region: "North America",
    location: "Austin, TX",
    timezone: "CST",
    startDate: "2026-01-19",
    endDate: "2026-01-19",
    startTime: "10:00",
    endTime: "16:00",
    registrations: 42,
    capacity: 60,
    updatedAt: "2026-01-18",
    slug: "safety-automation-workshop",
  },
  {
    id: "EVT-4104",
    title: "Energy Efficiency Roadshow",
    type: "hybrid",
    status: "completed",
    owner: "Jordan Lee",
    region: "EMEA",
    location: "Berlin + Virtual",
    timezone: "CET",
    startDate: "2025-12-10",
    endDate: "2025-12-10",
    startTime: "09:30",
    endTime: "13:00",
    registrations: 180,
    capacity: 200,
    updatedAt: "2025-12-12",
    slug: "energy-efficiency-roadshow",
  },
  {
    id: "EVT-4105",
    title: "Incident Response Webinar",
    type: "webinar",
    status: "cancelled",
    owner: "Dana Hughes",
    region: "Global",
    location: "Virtual",
    timezone: "UTC",
    startDate: "2026-01-28",
    endDate: "2026-01-28",
    startTime: "15:00",
    endTime: "16:00",
    registrations: 210,
    capacity: 300,
    updatedAt: "2026-01-14",
    slug: "incident-response-webinar",
  },
];

type EventFilters = {
  status: string;
  type: string;
  region: string;
  sort: string;
  search: string;
};

const DEFAULT_FILTERS: EventFilters = {
  status: "all",
  type: "all",
  region: "all",
  sort: "updated_desc",
  search: "",
};

const statusStyles: Record<EventStatus, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

const regionKeyMap: Record<string, string> = {
  Global: "global",
  "North America": "northAmerica",
  APAC: "apac",
  EMEA: "emea",
};

const formatSchedule = (
  event: EventRow,
  formatDate: (value: string) => string,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  const start = formatDate(event.startDate);
  const end = formatDate(event.endDate);
  const dateRange =
    start === end
      ? start
      : t("employee.events.schedule.range", { start, end });
  const timeRange =
    event.startTime && event.endTime
      ? t("employee.events.schedule.timeRange", {
          start: event.startTime,
          end: event.endTime,
        })
      : event.startTime;
  const timeSegment = timeRange
    ? t("employee.events.schedule.withTime", { time: timeRange })
    : "";
  return `${dateRange}${timeSegment} ${event.timezone}`.trim();
};

const EmployeeEventsList = () => {
  const { t, i18n } = useTranslation();
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);

  const handleChange = useCallback((updates: Partial<EventFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const stats = useMemo(() => {
    const counts = {
      total: EVENTS.length,
      upcoming: 0,
      live: 0,
      completed: 0,
    };

    EVENTS.forEach((event) => {
      if (event.status === "live") counts.live += 1;
      else if (event.status === "completed") counts.completed += 1;
      else if (event.status !== "cancelled") counts.upcoming += 1;
    });

    return counts;
  }, []);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        type: "select",
        label: t("employee.events.filters.status.label"),
        options: [
          { label: t("employee.events.filters.status.all"), value: "all" },
          { label: t("employee.events.status.draft"), value: "draft" },
          { label: t("employee.events.status.review"), value: "review" },
          { label: t("employee.events.status.scheduled"), value: "scheduled" },
          { label: t("employee.events.status.live"), value: "live" },
          { label: t("employee.events.status.completed"), value: "completed" },
          { label: t("employee.events.status.cancelled"), value: "cancelled" },
        ],
        value: filters.status,
        onChange: (value) => handleChange({ status: value as string }),
      },
      {
        type: "select",
        label: t("employee.events.filters.type.label"),
        options: [
          { label: t("employee.events.filters.type.all"), value: "all" },
          { label: t("employee.events.type.webinar"), value: "webinar" },
          { label: t("employee.events.type.inPerson"), value: "in-person" },
          { label: t("employee.events.type.hybrid"), value: "hybrid" },
          { label: t("employee.events.type.workshop"), value: "workshop" },
        ],
        value: filters.type,
        onChange: (value) => handleChange({ type: value as string }),
      },
      {
        type: "select",
        label: t("employee.events.filters.region.label"),
        options: [
          { label: t("employee.events.filters.region.all"), value: "all" },
          { label: t("employee.events.region.global"), value: "Global" },
          { label: t("employee.events.region.northAmerica"), value: "North America" },
          { label: t("employee.events.region.emea"), value: "EMEA" },
          { label: t("employee.events.region.apac"), value: "APAC" },
        ],
        value: filters.region,
        onChange: (value) => handleChange({ region: value as string }),
      },
      {
        type: "search",
        label: t("employee.events.filters.search.label"),
        placeholder: t("employee.events.filters.search.placeholder"),
        value: filters.search,
        onChange: (value) =>
          handleChange({ search: typeof value === "string" ? value : "" }),
        debounceMs: 350,
      },
      {
        type: "sort",
        label: t("employee.events.filters.sort.label"),
        options: [
          { label: t("employee.events.filters.sort.updatedDesc"), value: "updated_desc" },
          { label: t("employee.events.filters.sort.startAsc"), value: "start_asc" },
          { label: t("employee.events.filters.sort.startDesc"), value: "start_desc" },
          { label: t("employee.events.filters.sort.registrationsDesc"), value: "registrations_desc" },
        ],
        value: filters.sort,
        onChange: (value) => handleChange({ sort: value as string }),
      },
    ],
    [
      filters.region,
      filters.search,
      filters.sort,
      filters.status,
      filters.type,
      handleChange,
      t,
    ]
  );

  const getTitle = useCallback(
    (event: EventRow) =>
      t(`employee.events.mock.${event.id}.title`, event.title),
    [t]
  );

  const getOwner = useCallback(
    (event: EventRow) =>
      t(`employee.events.mock.${event.id}.owner`, event.owner),
    [t]
  );

  const getLocation = useCallback(
    (event: EventRow) =>
      t(`employee.events.mock.${event.id}.location`, event.location),
    [t]
  );

  const getRegion = useCallback(
    (event: EventRow) =>
      t(`employee.events.region.${regionKeyMap[event.region] ?? ""}`, event.region),
    [t]
  );

  const formatDate = useCallback(
    (value: string) =>
      new Date(value).toLocaleDateString(
        i18n.language === "th" ? "th-TH" : "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      ),
    [i18n.language]
  );

  const filtered = useMemo(() => {
    const term = filters.search.trim().toLowerCase();

    return EVENTS.filter((event) => {
      if (filters.status !== "all" && event.status !== filters.status) {
        return false;
      }
      if (filters.type !== "all" && event.type !== filters.type) {
        return false;
      }
      if (filters.region !== "all" && event.region !== filters.region) {
        return false;
      }
      if (term) {
        const haystack =
          `${getTitle(event)} ${getOwner(event)} ${getLocation(event)} ${event.slug} ${getRegion(event)}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [
    filters.region,
    filters.search,
    filters.status,
    filters.type,
    getLocation,
    getOwner,
    getRegion,
    getTitle,
  ]);

  const sorted = useMemo(() => {
    const next = [...filtered];

    if (filters.sort === "start_asc") {
      next.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    } else if (filters.sort === "start_desc") {
      next.sort(
        (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
    } else if (filters.sort === "registrations_desc") {
      next.sort((a, b) => b.registrations - a.registrations);
    } else {
      next.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    return next;
  }, [filtered, filters.sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{t("employee.events.title")}</h1>
          <p className="text-muted-foreground">
            {t("employee.events.subtitle")}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/employee/content/events/new">
            <Plus className="h-4 w-4" />
            {t("employee.events.actions.new")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.events.stats.total")}
            </p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.events.stats.upcoming")}
            </p>
            <p className="text-2xl font-semibold">{stats.upcoming}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.events.stats.live")}
            </p>
            <p className="text-2xl font-semibold">{stats.live}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {t("employee.events.stats.completed")}
            </p>
            <p className="text-2xl font-semibold">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel
        filters={filterConfigs}
        onReset={handleReset}
        resultCount={sorted.length}
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>{t("employee.events.table.event")}</TableHead>
                <TableHead>{t("employee.events.table.type")}</TableHead>
                <TableHead>{t("employee.events.table.status")}</TableHead>
                <TableHead>{t("employee.events.table.schedule")}</TableHead>
                <TableHead>{t("employee.events.table.registrations")}</TableHead>
                <TableHead>{t("employee.events.table.owner")}</TableHead>
                <TableHead className="text-right">
                  {t("employee.events.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        {t("employee.events.empty.title")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("employee.events.empty.subtitle")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((event) => (
                  <TableRow key={event.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="space-y-1">
                        <Link
                          href={`/employee/content/events/${event.id}/edit`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {getTitle(event)}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {t("employee.events.table.meta", {
                            location: getLocation(event),
                            region: getRegion(event),
                          })}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t(`employee.events.type.${event.type === "in-person" ? "inPerson" : event.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`capitalize ${statusStyles[event.status]}`}
                      >
                        {t(`employee.events.status.${event.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatSchedule(event, formatDate, t)}</TableCell>
                    <TableCell>
                      {t("employee.events.table.registrationsValue", {
                        registrations: event.registrations,
                        capacity: event.capacity,
                      })}
                    </TableCell>
                    <TableCell>{getOwner(event)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/news/events/${event.slug}`}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            {t("employee.events.actions.view")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/events/${event.id}/registrations`}
                            className="flex items-center gap-1"
                          >
                            <Users className="h-4 w-4" />
                            {t("employee.events.actions.registrations")}
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/employee/content/events/${event.id}/edit`}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("employee.events.actions.edit")}
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Separator />

      <div className="text-xs text-muted-foreground">
        {t("employee.events.footer.showing", {
          shown: sorted.length,
          total: EVENTS.length,
        })}
      </div>
    </div>
  );
};

export default EmployeeEventsList;
