"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormTabs, type FormSection } from "@/components/admin/backoffice/FormTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { EventFormState } from "./types";
import type { EventPublishStatus } from "@/lib/events/types";
import { useTranslation } from "react-i18next";

const statusOptions = [
  { value: "upcoming", labelKey: "admin.events.status.upcoming", defaultLabel: "Upcoming" },
  { value: "ongoing", labelKey: "admin.events.status.ongoing", defaultLabel: "Ongoing" },
  { value: "ended", labelKey: "admin.events.status.ended", defaultLabel: "Ended" },
] as const;

const eventTypeOptions = [
  { value: "seminar", labelKey: "admin.events.type.seminar", defaultLabel: "Seminar" },
  { value: "workshop", labelKey: "admin.events.type.workshop", defaultLabel: "Workshop" },
  { value: "webinar", labelKey: "admin.events.type.webinar", defaultLabel: "Webinar" },
  { value: "conference", labelKey: "admin.events.type.conference", defaultLabel: "Conference" },
  { value: "training", labelKey: "admin.events.type.training", defaultLabel: "Training" },
] as const;

const currencyOptions = [
  { value: "THB", label: "THB" },
  { value: "USD", label: "USD" },
] as const;

const NO_OVERRIDE_VALUE = "__none";
const NO_EVENT_TYPE_VALUE = "__no_event_type";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => `${input}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const generateKey = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildInitialState = (values?: Partial<EventFormState>): EventFormState => ({
  _id: values?._id,
  title: values?.title ?? "",
  slug: values?.slug ?? "",
  locale: values?.locale ?? "en",
  description: values?.description ?? "",
  date: toDateTimeInputValue(values?.date ?? new Date().toISOString()),
  location: values?.location ?? "",
  registrationOpen: values?.registrationOpen ?? true,
  maxAttendees: values?.maxAttendees,
  registrationDeadline: toDateTimeInputValue(values?.registrationDeadline),
  earlyBirdDeadline: toDateTimeInputValue(values?.earlyBirdDeadline),
  teamRegistrationEnabled: values?.teamRegistrationEnabled ?? true,
  minTeamSize: values?.minTeamSize,
  maxTeamSize: values?.maxTeamSize,
  eventType: values?.eventType ?? "",
  targetAudience: values?.targetAudience ?? [],
  registrationFee: values?.registrationFee,
  currency: values?.currency ?? "THB",
  status: values?.status ?? "upcoming",
  statusOverride: values?.statusOverride ?? "",
  publishStatus: (values?.publishStatus as EventPublishStatus | undefined) ?? "draft",
  agenda: values?.agenda ?? [],
  speakers: values?.speakers ?? [],
  resources: values?.resources ?? [],
  publishAsBanner: values?.publishAsBanner ?? false,
  bannerSettings: values?.bannerSettings,
});

type EventFormProps = {
  initialValues?: Partial<EventFormState>;
  canPublish?: boolean;
  basePath?: string;
  onSubmit: (values: EventFormState) => Promise<{
    success: boolean;
    id?: string;
    message?: string;
  }>;
};

const EventForm = ({
  initialValues,
  canPublish = true,
  basePath = "/admin/content/events",
  onSubmit,
}: EventFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };
  const resolvedInitialState: EventFormState = (() => {
    const baseState = buildInitialState(initialValues);
    if (!canPublish && ["published", "archived"].includes(baseState.publishStatus)) {
      return { ...baseState, publishStatus: "review" as EventFormState["publishStatus"] };
    }
    return baseState;
  })();
  const [formState, setFormState] = useState<EventFormState>(resolvedInitialState);
  const [slugDirty, setSlugDirty] = useState(Boolean(initialValues?.slug));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [targetAudienceInput, setTargetAudienceInput] = useState(
    (initialValues?.targetAudience ?? []).join(", "),
  );
  const targetAudienceHint = t("admin.events.form.targetAudienceHint");
  const statusLabel = (value: string) => {
    const option = statusOptions.find((item) => item.value === value);
    if (!option) return value;
    return t(option.labelKey, option.defaultLabel);
  };

  const handleTitleChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      title: value,
      slug: slugDirty ? prev.slug : slugify(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugDirty(true);
    setFormState((prev) => ({ ...prev, slug: value }));
  };

  const handleTargetAudienceChange = (value: string) => {
    setTargetAudienceInput(value);
    const parts = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    setFormState((prev) => ({ ...prev, targetAudience: parts }));
  };

  const updateAgendaItem = (index: number, field: keyof EventFormState["agenda"][number], value: string) => {
    setFormState((prev) => {
      const agenda = [...prev.agenda];
      agenda[index] = { ...agenda[index], [field]: value };
      return { ...prev, agenda };
    });
  };

  const addAgendaItem = () => {
    setFormState((prev) => ({
      ...prev,
      agenda: [...prev.agenda, { _key: generateKey(), title: "", time: "" }],
    }));
  };

  const removeAgendaItem = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      agenda: prev.agenda.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateSpeaker = (index: number, field: keyof EventFormState["speakers"][number], value: string) => {
    setFormState((prev) => {
      const speakers = [...prev.speakers];
      speakers[index] = { ...speakers[index], [field]: value };
      return { ...prev, speakers };
    });
  };

  const addSpeaker = () => {
    setFormState((prev) => ({
      ...prev,
      speakers: [...prev.speakers, { _key: generateKey(), name: "", title: "", company: "" }],
    }));
  };

  const removeSpeaker = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      speakers: prev.speakers.filter((_, speakerIndex) => speakerIndex !== index),
    }));
  };

  const parseNumberInput = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const slugValue = (formState.slug || slugify(formState.title)).trim();

    if (!slugValue) {
      setSubmitError(t("admin.events.form.errors.slugRequired"));
      return;
    }

    if (!formState.date) {
      setSubmitError(t("admin.events.form.errors.dateRequired"));
      return;
    }

    setSubmitError(null);

    const payload: EventFormState = {
      ...formState,
      slug: slugValue,
      targetAudience: formState.targetAudience.map((entry) => entry.trim()).filter(Boolean),
    };

    startTransition(() => {
      onSubmit(payload)
        .then((result) => {
          if (!result.success) {
            setSubmitError(resolveMessage(result.message, "admin.events.form.errors.saveFailed"));
            toast({ description: resolveMessage(result.message, "admin.events.form.errors.saveFailed") });
            return;
          }

          toast({ description: t("admin.events.form.toast.saved") });

          if (!payload._id && result.id) {
            router.replace(`${basePath}/${result.id}`);
          } else if (result.id) {
            setFormState((prev) => ({ ...prev, _id: result.id }));
          }
        })
        .catch((error) => {
          console.error("Failed to save event", error);
          setSubmitError(t("admin.events.form.errors.saveFailed"));
          toast({ description: t("admin.events.form.errors.saveFailedNow") });
        });
    });
  };

  const sections: FormSection[] = useMemo(() => {
    const basics = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">{t("admin.events.form.titleLabel")}</Label>
          <Input
            id="title"
            value={formState.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder={t("admin.events.form.titlePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="slug">{t("admin.events.form.slugLabel")}</Label>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => handleSlugChange(slugify(formState.title))}
            >
              {t("admin.events.form.regenerate")}
            </Button>
          </div>
          <Input
            id="slug"
            value={formState.slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            placeholder={t("admin.events.form.slugPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">{t("admin.events.form.dateLabel")}</Label>
          <Input
            id="date"
            type="datetime-local"
            value={formState.date}
            onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t("admin.events.form.locationLabel")}</Label>
          <Input
            id="location"
            value={formState.location ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
            placeholder={t("admin.events.form.locationPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("admin.events.form.statusLabel")}</Label>
          <Select
            value={formState.status ?? ""}
            onValueChange={(value) =>
              setFormState((prev) => ({ ...prev, status: value as EventFormState["status"] }))
            }
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t("admin.events.form.statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="statusOverride">
            {t("admin.events.form.statusOverrideLabel")}
          </Label>
          <Select
            value={formState.statusOverride && formState.statusOverride.length > 0 ? formState.statusOverride : NO_OVERRIDE_VALUE}
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                statusOverride:
                  value === NO_OVERRIDE_VALUE ? "" : (value || "") as EventFormState["statusOverride"],
              }))
            }
          >
            <SelectTrigger id="statusOverride">
              <SelectValue placeholder={t("admin.events.form.statusOverrideNone")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_OVERRIDE_VALUE}>
                {t("admin.events.form.statusOverrideNone")}
              </SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">{t("admin.events.form.descriptionLabel")}</Label>
          <Textarea
            id="description"
            value={formState.description ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={t("admin.events.form.descriptionPlaceholder")}
            rows={3}
          />
        </div>
      </div>
    );

    const registration = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("admin.events.form.registrationOpenLabel")}</Label>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <Switch
              checked={formState.registrationOpen}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, registrationOpen: checked }))
              }
              id="registrationOpen"
            />
            <span className="text-sm text-slate-700">
              {formState.registrationOpen
                ? t("admin.events.form.registrationOpen")
                : t("admin.events.form.registrationClosed")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventType">{t("admin.events.form.eventTypeLabel")}</Label>
          <Select
            value={
              formState.eventType && formState.eventType.length > 0
                ? formState.eventType
                : NO_EVENT_TYPE_VALUE
            }
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                eventType: value === NO_EVENT_TYPE_VALUE ? "" : value,
              }))
            }
          >
            <SelectTrigger id="eventType">
              <SelectValue placeholder={t("admin.events.form.eventTypePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_EVENT_TYPE_VALUE}>
                {t("admin.events.form.eventTypePlaceholder")}
              </SelectItem>
              {eventTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxAttendees">{t("admin.events.form.maxAttendeesLabel")}</Label>
          <Input
            id="maxAttendees"
            type="number"
            value={formState.maxAttendees ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                maxAttendees: parseNumberInput(event.target.value),
              }))
            }
            placeholder={t("admin.events.form.maxAttendeesPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationDeadline">
            {t("admin.events.form.registrationDeadlineLabel")}
          </Label>
          <Input
            id="registrationDeadline"
            type="datetime-local"
            value={formState.registrationDeadline ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, registrationDeadline: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="earlyBirdDeadline">
            {t("admin.events.form.earlyBirdDeadlineLabel")}
          </Label>
          <Input
            id="earlyBirdDeadline"
            type="datetime-local"
            value={formState.earlyBirdDeadline ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, earlyBirdDeadline: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="registrationFee">
            {t("admin.events.form.registrationFeeLabel")}
          </Label>
          <div className="flex gap-2">
            <Select
              value={formState.currency ?? ""}
              onValueChange={(value) => setFormState((prev) => ({ ...prev, currency: value }))}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder={t("admin.events.form.currencyPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {currencyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="registrationFee"
              type="number"
              value={formState.registrationFee ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  registrationFee: parseNumberInput(event.target.value),
                }))
              }
              placeholder={t("admin.events.form.registrationFeePlaceholder")}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("admin.events.form.teamRegistrationLabel")}</Label>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
            <Switch
              checked={formState.teamRegistrationEnabled}
              onCheckedChange={(checked) =>
                setFormState((prev) => ({ ...prev, teamRegistrationEnabled: checked }))
              }
              id="teamRegistrationEnabled"
            />
            <span className="text-sm text-slate-700">
              {formState.teamRegistrationEnabled
                ? t("admin.events.form.teamsAllowed")
                : t("admin.events.form.teamsDisabled")}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minTeamSize">{t("admin.events.form.minTeamSizeLabel")}</Label>
          <Input
            id="minTeamSize"
            type="number"
            value={formState.minTeamSize ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                minTeamSize: parseNumberInput(event.target.value),
              }))
            }
            placeholder={t("admin.events.form.minTeamSizePlaceholder")}
            disabled={!formState.teamRegistrationEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxTeamSize">{t("admin.events.form.maxTeamSizeLabel")}</Label>
          <Input
            id="maxTeamSize"
            type="number"
            value={formState.maxTeamSize ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                maxTeamSize: parseNumberInput(event.target.value),
              }))
            }
            placeholder={t("admin.events.form.maxTeamSizePlaceholder")}
            disabled={!formState.teamRegistrationEnabled}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="targetAudience">
            {t("admin.events.form.targetAudienceLabel")}
          </Label>
          <Input
            id="targetAudience"
            value={targetAudienceInput}
            onChange={(event) => handleTargetAudienceChange(event.target.value)}
            placeholder={targetAudienceHint}
          />
          <p className="text-xs text-slate-500">{targetAudienceHint}</p>
          {formState.targetAudience.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {formState.targetAudience.map((audience) => (
                <Badge key={audience} variant="outline">
                  {audience}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    );

    const agendaAndSpeakers = (
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("admin.events.form.agendaTitle")}</Label>
              <p className="text-xs text-slate-500">
                {t("admin.events.form.agendaHint")}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addAgendaItem}>
              {t("admin.events.form.addAgendaItem")}
            </Button>
          </div>
          {formState.agenda.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("admin.events.form.noAgendaItems")}
            </p>
          ) : (
            <div className="space-y-3">
              {formState.agenda.map((item, index) => (
                <div
                  key={item._key ?? index}
                  className="rounded-lg border border-slate-200 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <Label>{t("admin.events.form.agendaItemTitle")}</Label>
                      <Input
                        value={item.title ?? ""}
                        onChange={(event) => updateAgendaItem(index, "title", event.target.value)}
                        placeholder={t("admin.events.form.agendaItemTitlePlaceholder")}
                      />
                    </div>
                    <div className="w-full min-[520px]:w-48 space-y-2">
                      <Label>{t("admin.events.form.agendaItemTime")}</Label>
                      <Input
                        value={item.time ?? ""}
                        onChange={(event) => updateAgendaItem(index, "time", event.target.value)}
                        placeholder={t("admin.events.form.agendaItemTimePlaceholder")}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAgendaItem(index)}
                    >
                      {t("admin.events.form.remove")}
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>{t("admin.events.form.agendaItemDescription")}</Label>
                      <Textarea
                        value={item.description ?? ""}
                        onChange={(event) =>
                          updateAgendaItem(index, "description", event.target.value)
                        }
                        rows={2}
                        placeholder={t("admin.events.form.agendaItemDescriptionPlaceholder")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("admin.events.form.agendaItemSpeaker")}</Label>
                      <Input
                        value={item.speaker ?? ""}
                        onChange={(event) => updateAgendaItem(index, "speaker", event.target.value)}
                        placeholder={t("admin.events.form.agendaItemSpeakerPlaceholder")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t("admin.events.form.speakersTitle")}</Label>
              <p className="text-xs text-slate-500">
                {t("admin.events.form.speakersHint")}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addSpeaker}>
              {t("admin.events.form.addSpeaker")}
            </Button>
          </div>
          {formState.speakers.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("admin.events.form.noSpeakers")}
            </p>
          ) : (
            <div className="space-y-3">
              {formState.speakers.map((speaker, index) => (
                <div
                  key={speaker._key ?? index}
                  className="rounded-lg border border-slate-200 p-3 shadow-sm"
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>{t("admin.events.form.speakerName")}</Label>
                      <Input
                        value={speaker.name ?? ""}
                        onChange={(event) => updateSpeaker(index, "name", event.target.value)}
                        placeholder={t("admin.events.form.speakerNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("admin.events.form.speakerTitle")}</Label>
                      <Input
                        value={speaker.title ?? ""}
                        onChange={(event) => updateSpeaker(index, "title", event.target.value)}
                        placeholder={t("admin.events.form.speakerTitlePlaceholder")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{t("admin.events.form.speakerCompany")}</Label>
                      <Input
                        value={speaker.company ?? ""}
                        onChange={(event) => updateSpeaker(index, "company", event.target.value)}
                        placeholder={t("admin.events.form.speakerCompanyPlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Label>{t("admin.events.form.speakerBio")}</Label>
                    <Textarea
                      value={speaker.bio ?? ""}
                      onChange={(event) => updateSpeaker(index, "bio", event.target.value)}
                      rows={2}
                      placeholder={t("admin.events.form.speakerBioPlaceholder")}
                    />
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpeaker(index)}
                    >
                      {t("admin.events.form.removeSpeaker")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );

    return [
      {
        id: "basics",
        label: t("admin.events.form.sections.basics"),
        description: t("admin.events.form.sections.basicsDesc"),
        content: basics,
      },
      {
        id: "registration",
        label: t("admin.events.form.sections.registration"),
        description: t("admin.events.form.sections.registrationDesc"),
        content: registration,
      },
      {
        id: "agenda",
        label: t("admin.events.form.sections.agenda"),
        description: t("admin.events.form.sections.agendaDesc"),
        content: agendaAndSpeakers,
      },
    ];
  }, [formState, targetAudienceInput, t, targetAudienceHint]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {formState.title || t("admin.events.form.newDraft")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.events.form.summary")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {formState.status && (
            <Badge variant="outline">{statusLabel(formState.status)}</Badge>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t("admin.events.form.saving")
              : t("admin.events.form.save")}
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <FormTabs sections={sections} defaultSection="basics" />
    </form>
  );
};

export default EventForm;


