"use client";

/*
[PROPOSED] EmployeeEventEditor - scaffolded event create/edit view for content ops.
[EXISTING] uses Badge, Button, Card, Input, Label, Select, Separator, Switch, Tabs, Textarea.
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Eye, Save, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

type EventStatus =
  | "draft"
  | "review"
  | "scheduled"
  | "live"
  | "completed"
  | "cancelled";

type EventType = "webinar" | "in-person" | "hybrid" | "workshop";

type EventAccess = "free" | "paid" | "invite-only";

type EventDetail = {
  id: string;
  title: string;
  status: EventStatus;
  type: EventType;
  summary: string;
  slug: string;
  owner: string;
  coordinator: string;
  region: string;
  timezone: string;
  location: string;
  platform: string;
  streamUrl: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registrations: number;
  registrationOpen: string;
  registrationClose: string;
  access: EventAccess;
  price: string;
  featured: boolean;
  channels: string[];
  segments: string[];
  speakers: string[];
  agendaHighlights: string[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
};

const EVENTS: EventDetail[] = [
  {
    id: "EVT-4101",
    title: "Predictive Maintenance Virtual Summit",
    status: "scheduled",
    type: "webinar",
    summary:
      "Virtual summit focused on predictive maintenance playbooks, sensor strategy, and reliability wins.",
    slug: "predictive-maintenance-summit",
    owner: "Alicia Park",
    coordinator: "Dana Hughes",
    region: "Global",
    timezone: "UTC",
    location: "Virtual",
    platform: "NCS Live",
    streamUrl: "https://events.ncs.shop/predictive-maintenance",
    startDate: "2026-02-05",
    endDate: "2026-02-05",
    startTime: "09:00",
    endTime: "12:00",
    capacity: 500,
    registrations: 320,
    registrationOpen: "2026-01-05",
    registrationClose: "2026-02-04",
    access: "free",
    price: "0",
    featured: true,
    channels: ["events", "email", "homepage"],
    segments: ["operations", "manufacturing"],
    speakers: ["Alicia Park", "Jordan Lee"],
    agendaHighlights: [
      "Keynote: Reliability at scale",
      "Panel: Sensor strategy",
      "Live demo: Asset health workflows",
    ],
    seoTitle: "Predictive Maintenance Virtual Summit",
    seoDescription:
      "Join the virtual summit on predictive maintenance playbooks and reliability insights.",
    keywords: ["predictive maintenance", "summit", "reliability"],
    ogTitle: "Predictive Maintenance Virtual Summit",
    ogDescription:
      "Reserve your seat for the predictive maintenance summit and virtual sessions.",
    ogImageAlt: "Virtual summit speaker stage",
  },
  {
    id: "EVT-4102",
    title: "Operations Leaders Roundtable",
    status: "draft",
    type: "in-person",
    summary:
      "Closed-door roundtable for operations leaders to share throughput strategies and ROI stories.",
    slug: "ops-roundtable-singapore",
    owner: "Ravi Patel",
    coordinator: "Priya Nair",
    region: "APAC",
    timezone: "SGT",
    location: "Singapore",
    platform: "In-person",
    streamUrl: "",
    startDate: "2026-03-15",
    endDate: "2026-03-15",
    startTime: "14:00",
    endTime: "17:00",
    capacity: 80,
    registrations: 0,
    registrationOpen: "2026-02-10",
    registrationClose: "2026-03-08",
    access: "invite-only",
    price: "0",
    featured: false,
    channels: ["events", "sales"],
    segments: ["enterprise", "operations"],
    speakers: ["Ravi Patel", "Dana Hughes"],
    agendaHighlights: [
      "Executive roundtable",
      "Regional success stories",
      "Peer networking session",
    ],
    seoTitle: "Operations Leaders Roundtable Singapore",
    seoDescription:
      "Invite-only roundtable for operations leaders in Singapore to share best practices.",
    keywords: ["operations", "roundtable", "APAC"],
    ogTitle: "Operations Leaders Roundtable",
    ogDescription:
      "Exclusive roundtable for enterprise operations leaders in Singapore.",
    ogImageAlt: "Roundtable discussion in a conference room",
  },
];

const DEFAULT_EVENT: EventDetail = {
  id: "EVT-NEW",
  title: "New event",
  status: "draft",
  type: "webinar",
  summary: "Draft a summary to align stakeholders on the event goals and agenda.",
  slug: "new-event",
  owner: "Content Operations",
  coordinator: "",
  region: "Global",
  timezone: "UTC",
  location: "Virtual",
  platform: "NCS Live",
  streamUrl: "",
  startDate: "2026-02-20",
  endDate: "2026-02-20",
  startTime: "09:00",
  endTime: "10:00",
  capacity: 300,
  registrations: 0,
  registrationOpen: "2026-01-25",
  registrationClose: "2026-02-19",
  access: "free",
  price: "0",
  featured: false,
  channels: ["events"],
  segments: ["general"],
  speakers: ["TBD"],
  agendaHighlights: ["Agenda item 1", "Agenda item 2"],
  seoTitle: "SEO title",
  seoDescription: "SEO description for the event landing page.",
  keywords: ["event", "operations"],
  ogTitle: "Open Graph title",
  ogDescription: "Open Graph description for social sharing.",
  ogImageAlt: "Social share preview image alt text",
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

const statusOptions: EventStatus[] = [
  "draft",
  "review",
  "scheduled",
  "live",
  "completed",
  "cancelled",
];

const typeOptions: EventType[] = ["webinar", "in-person", "hybrid", "workshop"];

const accessOptions: EventAccess[] = ["free", "paid", "invite-only"];

type EmployeeEventEditorProps = {
  mode: "create" | "edit";
  eventId?: string;
};

const EmployeeEventEditor = ({ mode, eventId }: EmployeeEventEditorProps) => {
  const { t, i18n } = useTranslation();
  const isEditing = mode === "edit";
  const getRegionLabel = useCallback(
    (region: string) =>
      t(`employee.events.region.${regionKeyMap[region] ?? ""}`, region),
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

  const localizeEvent = useCallback(
    (item: EventDetail) => ({
      ...item,
      title: t(`employee.events.editor.mock.${item.id}.title`, item.title),
      summary: t(
        `employee.events.editor.mock.${item.id}.summary`,
        item.summary
      ),
      owner: t(`employee.events.editor.mock.${item.id}.owner`, item.owner),
      coordinator: t(
        `employee.events.editor.mock.${item.id}.coordinator`,
        item.coordinator
      ),
      region: getRegionLabel(item.region),
      location: t(
        `employee.events.editor.mock.${item.id}.location`,
        item.location
      ),
      platform: t(
        `employee.events.editor.mock.${item.id}.platform`,
        item.platform
      ),
      agendaHighlights: item.agendaHighlights.map((highlight, index) =>
        t(
          `employee.events.editor.mock.${item.id}.agenda.${index}`,
          highlight
        )
      ),
      seoTitle: t(
        `employee.events.editor.mock.${item.id}.seoTitle`,
        item.seoTitle
      ),
      seoDescription: t(
        `employee.events.editor.mock.${item.id}.seoDescription`,
        item.seoDescription
      ),
      ogTitle: t(
        `employee.events.editor.mock.${item.id}.ogTitle`,
        item.ogTitle
      ),
      ogDescription: t(
        `employee.events.editor.mock.${item.id}.ogDescription`,
        item.ogDescription
      ),
      ogImageAlt: t(
        `employee.events.editor.mock.${item.id}.ogImageAlt`,
        item.ogImageAlt
      ),
    }),
    [getRegionLabel, t]
  );

  const event = useMemo(() => {
    if (!isEditing) return localizeEvent(DEFAULT_EVENT);
    const found = EVENTS.find((item) => item.id === eventId);
    return found ? localizeEvent(found) : null;
  }, [isEditing, eventId, localizeEvent]);

  const [ogAlt, setOgAlt] = useState(event?.ogImageAlt ?? "");
  useEffect(() => {
    setOgAlt(event?.ogImageAlt ?? "");
  }, [event]);
  const ogAltLength = ogAlt.length;
  const ogAltTooLong = ogAltLength > 125;

  if (!event) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm font-medium">
            {t("employee.events.editor.notFound.title")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("employee.events.editor.notFound.subtitle", { eventId })}
          </p>
          <Button asChild variant="outline">
            <Link href="/employee/content/events">
              {t("employee.events.editor.actions.backToEvents")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const previewHref = `/news/events/${event.slug}`;
  const fieldPrefix = event.id.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="gap-2 w-fit">
            <Link href="/employee/content/events">
              <ArrowLeft className="h-4 w-4" />
              {t("employee.events.editor.actions.backToEvents")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <Badge
              variant="outline"
              className={`capitalize ${statusStyles[event.status]}`}
            >
              {t(`employee.events.status.${event.status}`)}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {t(
                `employee.events.type.${event.type === "in-person" ? "inPerson" : event.type}`
              )}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl">{event.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <Button asChild variant="outline" className="gap-2">
              <Link href={previewHref}>
                <Eye className="h-4 w-4" />
                {t("employee.events.editor.actions.preview")}
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            {t("employee.events.editor.actions.saveDraft")}
          </Button>
          <Button variant="outline" className="gap-2">
            <Send className="h-4 w-4" />
            {t("employee.events.editor.actions.requestReview")}
          </Button>
          <Button className="gap-2">
            <Send className="h-4 w-4" />
            {t("employee.events.editor.actions.publish")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="details">
            {t("employee.events.editor.tabs.details")}
          </TabsTrigger>
          <TabsTrigger value="schedule">
            {t("employee.events.editor.tabs.schedule")}
          </TabsTrigger>
          <TabsTrigger value="registration">
            {t("employee.events.editor.tabs.registration")}
          </TabsTrigger>
          <TabsTrigger value="seo">
            {t("employee.events.editor.tabs.seo")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.events.editor.sections.eventDetails")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-title`}>
                    {t("employee.events.editor.fields.title")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-title`}
                    defaultValue={event.title}
                    placeholder={t("employee.events.editor.placeholders.title")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-summary`}>
                    {t("employee.events.editor.fields.summary")}
                  </Label>
                  <Textarea
                    id={`${fieldPrefix}-summary`}
                    defaultValue={event.summary}
                    placeholder={t("employee.events.editor.placeholders.summary")}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-slug`}>
                    {t("employee.events.editor.fields.slug")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-slug`}
                    defaultValue={event.slug}
                    placeholder={t("employee.events.editor.placeholders.slug")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.events.editor.sections.ownershipAndFormat")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-owner`}>
                      {t("employee.events.editor.fields.owner")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-owner`}
                      defaultValue={event.owner}
                      placeholder={t("employee.events.editor.placeholders.owner")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-coordinator`}>
                      {t("employee.events.editor.fields.coordinator")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-coordinator`}
                      defaultValue={event.coordinator}
                      placeholder={t(
                        "employee.events.editor.placeholders.coordinator"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-region`}>
                      {t("employee.events.editor.fields.region")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-region`}
                      defaultValue={event.region}
                      placeholder={t("employee.events.editor.placeholders.region")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-location`}>
                      {t("employee.events.editor.fields.location")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-location`}
                      defaultValue={event.location}
                      placeholder={t("employee.events.editor.placeholders.location")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("employee.events.editor.fields.status")}</Label>
                    <Select defaultValue={event.status}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "employee.events.editor.placeholders.status"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`employee.events.status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("employee.events.editor.fields.format")}</Label>
                    <Select defaultValue={event.type}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "employee.events.editor.placeholders.format"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(
                              `employee.events.type.${type === "in-person" ? "inPerson" : type}`
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.events.editor.fields.featured.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.events.editor.fields.featured.description")}
                    </p>
                  </div>
                  <Switch defaultChecked={event.featured} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("employee.events.editor.sections.audienceAndHighlights")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor={`${fieldPrefix}-channels`}>
                  {t("employee.events.editor.fields.channels")}
                </Label>
                <Input
                  id={`${fieldPrefix}-channels`}
                  defaultValue={event.channels.join(", ")}
                  placeholder={t("employee.events.editor.placeholders.channels")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldPrefix}-segments`}>
                  {t("employee.events.editor.fields.segments")}
                </Label>
                <Input
                  id={`${fieldPrefix}-segments`}
                  defaultValue={event.segments.join(", ")}
                  placeholder={t("employee.events.editor.placeholders.segments")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${fieldPrefix}-speakers`}>
                  {t("employee.events.editor.fields.speakers")}
                </Label>
                <Input
                  id={`${fieldPrefix}-speakers`}
                  defaultValue={event.speakers.join(", ")}
                  placeholder={t("employee.events.editor.placeholders.speakers")}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor={`${fieldPrefix}-agenda`}>
                  {t("employee.events.editor.fields.agenda")}
                </Label>
                <Textarea
                  id={`${fieldPrefix}-agenda`}
                  defaultValue={event.agendaHighlights.join("\n")}
                  placeholder={t("employee.events.editor.placeholders.agenda")}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("employee.events.editor.sections.schedule")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-start-date`}>
                    {t("employee.events.editor.fields.startDate")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-start-date`}
                    type="date"
                    defaultValue={event.startDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-start-time`}>
                    {t("employee.events.editor.fields.startTime")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-start-time`}
                    type="time"
                    defaultValue={event.startTime}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-end-date`}>
                    {t("employee.events.editor.fields.endDate")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-end-date`}
                    type="date"
                    defaultValue={event.endDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-end-time`}>
                    {t("employee.events.editor.fields.endTime")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-end-time`}
                    type="time"
                    defaultValue={event.endTime}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor={`${fieldPrefix}-timezone`}>
                    {t("employee.events.editor.fields.timezone")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-timezone`}
                    defaultValue={event.timezone}
                    placeholder={t("employee.events.editor.placeholders.timezone")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.events.editor.sections.deliveryDetails")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-platform`}>
                    {t("employee.events.editor.fields.platform")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-platform`}
                    defaultValue={event.platform}
                    placeholder={t("employee.events.editor.placeholders.platform")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-stream-url`}>
                    {t("employee.events.editor.fields.streamUrl")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-stream-url`}
                    defaultValue={event.streamUrl}
                    placeholder={t("employee.events.editor.placeholders.streamUrl")}
                  />
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.events.editor.summary.start")}
                    </span>
                    <span className="font-medium">
                      {formatDate(event.startDate)} {event.startTime}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.events.editor.summary.end")}
                    </span>
                    <span className="font-medium">
                      {formatDate(event.endDate)} {event.endTime}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="registration" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.events.editor.sections.registrationSettings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-registration-open`}>
                      {t("employee.events.editor.fields.registrationOpen")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-registration-open`}
                      type="date"
                      defaultValue={event.registrationOpen}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-registration-close`}>
                      {t("employee.events.editor.fields.registrationClose")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-registration-close`}
                      type="date"
                      defaultValue={event.registrationClose}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("employee.events.editor.fields.access")}</Label>
                    <Select defaultValue={event.access}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "employee.events.editor.placeholders.access"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {accessOptions.map((access) => (
                          <SelectItem key={access} value={access}>
                            {t(
                              `employee.events.editor.access.${access === "invite-only" ? "inviteOnly" : access}`
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-price`}>
                      {t("employee.events.editor.fields.price")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-price`}
                      defaultValue={event.price}
                      placeholder={t("employee.events.editor.placeholders.price")}
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.events.editor.fields.waitlist.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.events.editor.fields.waitlist.description")}
                    </p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {t("employee.events.editor.fields.approval.title")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("employee.events.editor.fields.approval.description")}
                    </p>
                  </div>
                  <Switch defaultChecked={event.access === "invite-only"} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.events.editor.sections.capacityAndStaffing")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-capacity`}>
                      {t("employee.events.editor.fields.capacity")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-capacity`}
                      type="number"
                      defaultValue={event.capacity}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-registrations`}>
                      {t("employee.events.editor.fields.registrations")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-registrations`}
                      type="number"
                      defaultValue={event.registrations}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-host`}>
                      {t("employee.events.editor.fields.host")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-host`}
                      defaultValue={event.owner}
                      placeholder={t("employee.events.editor.placeholders.host")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-support`}>
                      {t("employee.events.editor.fields.supportLead")}
                    </Label>
                    <Input
                      id={`${fieldPrefix}-support`}
                      defaultValue={event.coordinator}
                      placeholder={t(
                        "employee.events.editor.placeholders.supportLead"
                      )}
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.events.editor.summary.capacityUsed")}
                    </span>
                    <span className="font-medium">
                      {event.registrations} / {event.capacity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {t("employee.events.editor.summary.registrationsClose")}
                    </span>
                    <span className="font-medium">
                      {formatDate(event.registrationClose)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.events.editor.sections.seoMetadata")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-seo-title`}>
                    {t("employee.events.editor.fields.seoTitle")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-seo-title`}
                    defaultValue={event.seoTitle}
                    placeholder={t("employee.events.editor.placeholders.seoTitle")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-seo-description`}>
                    {t("employee.events.editor.fields.seoDescription")}
                  </Label>
                  <Textarea
                    id={`${fieldPrefix}-seo-description`}
                    defaultValue={event.seoDescription}
                    placeholder={t(
                      "employee.events.editor.placeholders.seoDescription"
                    )}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-keywords`}>
                    {t("employee.events.editor.fields.keywords")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-keywords`}
                    defaultValue={event.keywords.join(", ")}
                    placeholder={t("employee.events.editor.placeholders.keywords")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t("employee.events.editor.sections.socialPreview")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-og-title`}>
                    {t("employee.events.editor.fields.ogTitle")}
                  </Label>
                  <Input
                    id={`${fieldPrefix}-og-title`}
                    defaultValue={event.ogTitle}
                    placeholder={t("employee.events.editor.placeholders.ogTitle")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-og-description`}>
                    {t("employee.events.editor.fields.ogDescription")}
                  </Label>
                  <Textarea
                    id={`${fieldPrefix}-og-description`}
                    defaultValue={event.ogDescription}
                    placeholder={t(
                      "employee.events.editor.placeholders.ogDescription"
                    )}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldPrefix}-og-image-alt`}>
                    {t("employee.events.editor.fields.ogImageAlt")}
                  </Label>
                  <div className="space-y-1">
                    <Input
                      id={`${fieldPrefix}-og-image-alt`}
                      value={ogAlt}
                      onChange={(event) => setOgAlt(event.target.value)}
                      placeholder={t(
                        "employee.events.editor.placeholders.ogImageAlt"
                      )}
                    />
                    <div className="flex justify-end text-[11px] font-medium text-slate-400">
                      <span className={ogAltTooLong ? "text-amber-500" : "text-slate-400"}>
                        {ogAltLength} / 125 chars
                      </span>
                    </div>
                    <p className={`text-[11px] transition-opacity duration-150 ${ogAltTooLong ? "text-amber-500" : "opacity-0"}`}>
                      Screen readers recommend alt text under 125 characters
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeEventEditor;
