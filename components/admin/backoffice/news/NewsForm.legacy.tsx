"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutCanvas } from "@/components/admin/backoffice/layout/LayoutCanvas";
import type { FieldRegistry, LayoutNode } from "@/components/admin/backoffice/layout/layoutTypes";
import { PortableTextEditor } from "@/components/admin/backoffice/PortableTextEditor";
import { defaultLocaleValue } from "@/components/admin/backoffice/localeOptions";
import { ReferencePicker, type ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { AssetUploader } from "@/components/admin/backoffice/AssetUploader";
import { ImageUploader } from "@/components/admin/backoffice/ImageUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { NewsAttachment, NewsFormState } from "./types";
import { useTranslation } from "react-i18next";
import { normalizeLocaleCode } from "@/lib/i18n/normalizeLocale";
import { RichContentEditor } from "@/components/admin/backoffice/rich/RichContentEditor";
import { Info } from "lucide-react";

type AttachmentDraft = {
  title: string;
  description: string;
  fileType: string;
  status: string;
  assetId?: string | null;
};

type NewsFormProps = {
  initialValues?: Partial<NewsFormState>;
  initialLinkedEvent?: ReferenceOption | null;
  initialAttachments?: NewsAttachment[];
  basePath?: string;
  onSubmit: (values: NewsFormState) => Promise<{
    success: boolean;
    id?: string;
    status?: string;
    message?: string;
  }>;
  onAddAttachment?: (payload: {
    title: string;
    description?: string;
    fileType: string;
    status: string;
    assetId?: string | null;
  }) => Promise<{ success: boolean; attachments?: NewsAttachment[]; message?: string }>;
  onRemoveAttachment?: (attachmentKey: string) => Promise<{
    success: boolean;
    attachments?: NewsAttachment[];
    message?: string;
  }>;
  searchEvents: (query: string) => Promise<ReferenceOption[]>;
};

const categoryOptions = [
  { value: "announcement", labelKey: "admin.news.category.announcement", defaultLabel: "Announcement" },
  { value: "partnership", labelKey: "admin.news.category.partnership", defaultLabel: "Partnership" },
  { value: "event_announcement", labelKey: "admin.news.category.eventAnnouncement", defaultLabel: "Event Announcement" },
  { value: "general", labelKey: "admin.news.category.general", defaultLabel: "General" },
] as const;

const statusOptions = [
  { value: "draft", labelKey: "admin.news.status.draft", defaultLabel: "Draft" },
  { value: "published", labelKey: "admin.news.status.published", defaultLabel: "Published" },
] as const;

const heroLayoutOptions = [
  { value: "standard", label: "Standard" },
  { value: "fullBleed", label: "Full bleed" },
  { value: "imageLeft", label: "Image left" },
  { value: "imageRight", label: "Image right" },
  { value: "banner", label: "Banner" },
] as const;

const heroThemeOptions = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "overlay", label: "Overlay" },
] as const;

const fileTypeOptions = [
  { value: "PDF", labelKey: "admin.news.attachments.fileType.pdf", defaultLabel: "PDF" },
  { value: "image", labelKey: "admin.news.attachments.fileType.image", defaultLabel: "Image" },
  { value: "document", labelKey: "admin.news.attachments.fileType.document", defaultLabel: "Document" },
  { value: "link", labelKey: "admin.news.attachments.fileType.link", defaultLabel: "Link" },
] as const;

const attachmentStatusOptions = [
  { value: "public", labelKey: "admin.news.attachments.access.public", defaultLabel: "Public" },
  { value: "event_locked", labelKey: "admin.news.attachments.access.eventLocked", defaultLabel: "Event Locked" },
] as const;

const COVER_DISABLED_MESSAGE = "Upload an image first to configure these settings.";

const statusBadge: Record<string, "default" | "secondary"> = {
  published: "default",
  draft: "secondary",
};

const newsHeroLayout: LayoutNode[] = [
  {
    id: "row-hero",
    type: "row",
    children: [
      { id: "col-hero-helper", type: "column", width: 12, children: [{ id: "field-heroHelper", type: "field", fieldId: "heroHelper" }] },
      { id: "col-hero-image", type: "column", width: 12, children: [{ id: "field-heroImage", type: "field", fieldId: "heroImage" }] },
      { id: "col-hero-alt", type: "column", width: 6, children: [{ id: "field-heroAlt", type: "field", fieldId: "heroAlt" }] },
      { id: "col-hero-caption", type: "column", width: 6, children: [{ id: "field-heroCaption", type: "field", fieldId: "heroCaption" }] },
      { id: "col-hero-layout", type: "column", width: 6, children: [{ id: "field-heroLayout", type: "field", fieldId: "heroLayout" }] },
      { id: "col-hero-theme", type: "column", width: 6, children: [{ id: "field-heroTheme", type: "field", fieldId: "heroTheme" }] },
      { id: "col-publish-date", type: "column", width: 6, children: [{ id: "field-publishDate", type: "field", fieldId: "publishDate" }] },
    ],
  },
];

const newsMetadataLayout: LayoutNode[] = [
  {
    id: "row-metadata",
    type: "row",
    children: [
      {
        id: "col-metadata",
        type: "column",
        width: 12,
        children: [
          { id: "field-eventsHelper", type: "field", fieldId: "eventsHelper" },
          { id: "field-linkedEvent", type: "field", fieldId: "linkedEvent" },
          { id: "field-attachments", type: "field", fieldId: "attachments" },
        ],
      },
    ],
  },
];

const newsSeoLayout: LayoutNode[] = [
  {
    id: "row-seo",
    type: "row",
    children: [
      { id: "col-seo-helper", type: "column", width: 12, children: [{ id: "field-seoHelper", type: "field", fieldId: "seoHelper" }] },
      { id: "col-seo-title", type: "column", width: 6, children: [{ id: "field-seoMetaTitle", type: "field", fieldId: "seoMetaTitle" }] },
      { id: "col-seo-canonical", type: "column", width: 6, children: [{ id: "field-seoCanonicalUrl", type: "field", fieldId: "seoCanonicalUrl" }] },
      { id: "col-seo-description", type: "column", width: 12, children: [{ id: "field-seoMetaDescription", type: "field", fieldId: "seoMetaDescription" }] },
      { id: "col-seo-keywords", type: "column", width: 6, children: [{ id: "field-seoKeywords", type: "field", fieldId: "seoKeywords" }] },
      { id: "col-seo-noindex", type: "column", width: 6, children: [{ id: "field-seoNoIndex", type: "field", fieldId: "seoNoIndex" }] },
      { id: "col-seo-og", type: "column", width: 12, children: [{ id: "field-seoOgImage", type: "field", fieldId: "seoOgImage" }] },
    ],
  },
];

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

const buildInitialState = (
  values?: Partial<NewsFormState>,
  linkedEvent?: ReferenceOption | null,
  activeLocale?: string,
): NewsFormState => ({
  _id: values?._id,
  title: values?.title ?? "",
  titleTh: values?.titleTh ?? "",
  slug: values?.slug ?? "",
  locale: values?.locale ?? activeLocale ?? defaultLocaleValue,
  publishDate: toDateTimeInputValue(values?.publishDate ?? new Date().toISOString()),
  category: values?.category ?? "general",
  status: values?.status ?? "draft",
  content: values?.content ?? [],
  contentTh: values?.contentTh ?? [],
  linkedEventId: values?.linkedEventId ?? linkedEvent?.id ?? null,
  heroImageAssetId: values?.heroImageAssetId ?? null,
  heroImageAlt: values?.heroImageAlt ?? "",
  heroImageCaption: values?.heroImageCaption ?? "",
  heroLayout: values?.heroLayout ?? "standard",
  heroTheme: values?.heroTheme ?? "light",
  seoMetaTitle: values?.seoMetaTitle ?? "",
  seoMetaDescription: values?.seoMetaDescription ?? "",
  seoCanonicalUrl: values?.seoCanonicalUrl ?? "",
  seoKeywords: values?.seoKeywords ?? [],
  seoNoIndex: values?.seoNoIndex ?? false,
  seoOgImageAssetId: values?.seoOgImageAssetId ?? null,
});

const NewsForm = ({
  initialValues,
  initialLinkedEvent,
  initialAttachments,
  basePath,
  onSubmit,
  onAddAttachment,
  onRemoveAttachment,
  searchEvents,
}: NewsFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };
  const resolvedBasePath = basePath ?? "/admin/content/news";
  const resolvedLinkedEvent = useMemo(() => {
    if (!initialLinkedEvent) return null;
    const label = initialLinkedEvent.label?.trim() || t("admin.content.news.fallback.event");
    return { ...initialLinkedEvent, label };
  }, [initialLinkedEvent, t]);
  const currentLocale = useMemo(
    () => normalizeLocaleCode(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );
  const [formState, setFormState] = useState<NewsFormState>(
    buildInitialState(initialValues, resolvedLinkedEvent, currentLocale),
  );
  useEffect(() => {
    setFormState((prev) =>
      prev.locale === currentLocale ? prev : { ...prev, locale: currentLocale },
    );
  }, [currentLocale]);
  const optionLabel = (
    options: ReadonlyArray<{ value: string; labelKey: string; defaultLabel: string }>,
    value?: string | null,
  ) => {
    if (!value) return "";
    const option = options.find((item) => item.value === value);
    return option ? t(option.labelKey, option.defaultLabel) : value;
  };
  const [linkedEvent, setLinkedEvent] = useState<ReferenceOption | null>(resolvedLinkedEvent ?? null);
  const [slugDirty, setSlugDirty] = useState(Boolean(initialValues?.slug));
  const [attachments, setAttachments] = useState<NewsAttachment[]>(initialAttachments ?? []);
  const [attachmentDraft, setAttachmentDraft] = useState<AttachmentDraft>({
    title: "",
    description: "",
    fileType: "PDF",
    status: "public",
    assetId: null,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAttachmentPending, startAttachmentTransition] = useTransition();
  const bodyEnRef = useRef<HTMLDivElement | null>(null);
  const bodyThRef = useRef<HTMLDivElement | null>(null);
  const hasHeroImage = Boolean(formState.heroImageAssetId);
  const coverDisabled = !hasHeroImage;
  const coverDisabledMessage = coverDisabled ? COVER_DISABLED_MESSAGE : undefined;
  const coverDisabledClasses = coverDisabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "";
  const heroAltLength = (formState.heroImageAlt ?? "").length;
  const heroAltTooLong = heroAltLength > 125;
  const renderField = (fieldId: keyof FieldRegistry): ReactNode => {
    const renderer = fieldRegistry[fieldId];
    if (typeof renderer === "function") {
      return (renderer as () => ReactNode)();
    }
    return renderer ?? null;
  };

  const handleTitleChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      title: value,
      slug: slugDirty ? prev.slug : slugify(value),
    }));
  };
  const handleTitleThChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      titleTh: value,
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugDirty(true);
    setFormState((prev) => ({ ...prev, slug: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    const slugValue = (formState.slug || slugify(formState.title)).trim();

    const errors: Record<string, string> = {};
    if (!slugValue) {
      errors.slug = t("admin.news.errors.slugRequired");
    }

    const hasEnglishBody =
      Array.isArray(formState.content) &&
      formState.content.some((block) => {
        const text = ((block as { children?: { text?: string }[] }).children || [])
          .map((child) => child.text ?? "")
          .join("")
          .trim();
        return text.length > 0;
      });
    if (!hasEnglishBody) {
      errors.bodyEn = t("admin.news.errors.bodyRequired", "Please add English body content.");
    }

    const hasThaiBody =
      Array.isArray(formState.contentTh) &&
      formState.contentTh.some((block) => {
        const text = ((block as { children?: { text?: string }[] }).children || [])
          .map((child) => child.text ?? "")
          .join("")
          .trim();
        return text.length > 0;
      });
    if (!hasThaiBody) {
      errors.bodyTh = t("admin.news.errors.bodyRequiredTh", "Please add Thai body content.");
    }

    if (!formState.title?.trim()) {
      errors.title = t("admin.news.errors.titleRequired", "Title is required.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError(null);
      const first = errors.bodyEn
        ? bodyEnRef.current
        : errors.bodyTh
          ? bodyThRef.current
          : null;
      if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const publishDateIso = formState.publishDate
      ? new Date(formState.publishDate).toISOString()
      : new Date().toISOString();
    const localeValue = formState.locale?.trim() || currentLocale;

    const payload: NewsFormState = {
      ...formState,
      slug: slugValue,
      publishDate: publishDateIso,
      locale: localeValue,
      titleTh: formState.titleTh?.trim() || undefined,
      contentTh: formState.contentTh,
    };

    startTransition(() => {
      onSubmit(payload)
        .then((result) => {
          if (!result.success) {
            setSubmitError(resolveMessage(result.message, "admin.news.errors.saveFailed"));
            toast({
              description: resolveMessage(result.message, "admin.news.errors.saveFailed"),
            });
            return;
          }

          setSubmitError(null);
          toast({ description: t("admin.news.toast.saved") });

          if (!payload._id && result.id) {
            router.replace(`${resolvedBasePath}/${result.id}`);
          } else if (result.id) {
            setFormState((prev) => ({ ...prev, _id: result.id }));
          }
        })
        .catch((error) => {
          console.error("Failed to save news", error);
          setSubmitError(t("admin.news.errors.saveFailed"));
          toast({ description: t("admin.news.errors.saveFailedNow") });
        });
    });
  };

  const handleAddAttachment = () => {
    if (!onAddAttachment || !formState._id) {
      setAttachmentError(t("admin.news.attachments.errors.saveFirst"));
      return;
    }

    if (!attachmentDraft.title.trim()) {
      setAttachmentError(t("admin.news.attachments.errors.titleRequired"));
      return;
    }

    if (!attachmentDraft.assetId && attachmentDraft.fileType !== "link") {
      setAttachmentError(t("admin.news.attachments.errors.fileRequired"));
      return;
    }

    setAttachmentError(null);
    startAttachmentTransition(() => {
      onAddAttachment({
        title: attachmentDraft.title.trim(),
        description: attachmentDraft.description.trim() || undefined,
        fileType: attachmentDraft.fileType,
        status: attachmentDraft.status,
        assetId: attachmentDraft.assetId,
      })
        .then((result) => {
          if (!result.success || !result.attachments) {
            setAttachmentError(resolveMessage(result.message, "admin.news.attachments.errors.addFailed"));
            toast({ description: resolveMessage(result.message, "admin.news.attachments.errors.addFailed") });
            return;
          }

          setAttachments(result.attachments);
          setAttachmentDraft({
            title: "",
            description: "",
            fileType: "PDF",
            status: "public",
            assetId: null,
          });
          toast({ description: t("admin.news.attachments.toast.added") });
        })
        .catch((error) => {
          console.error("Failed to add attachment", error);
          setAttachmentError(t("admin.news.attachments.errors.addFailed"));
          toast({ description: t("admin.news.attachments.errors.addFailedNow") });
        });
    });
  };

  const handleRemoveAttachment = (attachmentKey?: string) => {
    if (!attachmentKey || !onRemoveAttachment || !formState._id) return;

    setRemovingKey(attachmentKey);
    startAttachmentTransition(() => {
      onRemoveAttachment(attachmentKey)
        .then((result) => {
          if (!result.success || !result.attachments) {
            toast({ description: resolveMessage(result.message, "admin.news.attachments.errors.removeFailed") });
            return;
          }
          setAttachments(result.attachments);
          toast({ description: t("admin.news.attachments.toast.removed") });
        })
        .catch((error) => {
          console.error("Failed to remove attachment", error);
          toast({ description: t("admin.news.attachments.errors.removeFailedNow") });
        })
        .finally(() => setRemovingKey(null));
    });
  };

  const fieldRegistry: FieldRegistry = {
    title: () => (
      <div className="space-y-2">
        <Label htmlFor="title">{t("admin.news.fields.title")}</Label>
        <Input
          id="title"
          value={formState.title}
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder={t("admin.news.fields.titlePlaceholder")}
          className={fieldErrors.title ? "border-red-500" : undefined}
        />
        {fieldErrors.title ? (
          <p className="text-xs text-red-600">{fieldErrors.title}</p>
        ) : null}
      </div>
    ),
    titleTh: () => (
      <div className="space-y-2">
        <Label htmlFor="titleTh">{t("admin.news.fields.titleTh", "Title (TH)")}</Label>
        <Input
          id="titleTh"
          value={formState.titleTh}
          onChange={(event) => handleTitleThChange(event.target.value)}
          placeholder={t("admin.news.fields.titleThPlaceholder", "Thai headline")}
        />
        <p className="text-xs text-slate-500">
          {t("admin.news.fields.titleThHint", "Optional. Falls back to English if empty.")}
        </p>
      </div>
    ),
    slug: () => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug">{t("admin.news.fields.slug")}</Label>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => handleSlugChange(slugify(formState.title))}
          >
            {t("admin.news.actions.regenerate")}
          </Button>
        </div>
        <Input
          id="slug"
          value={formState.slug}
          onChange={(event) => handleSlugChange(event.target.value)}
          placeholder={t("admin.news.fields.slugPlaceholder")}
          className={fieldErrors.slug ? "border-red-500" : undefined}
        />
        {fieldErrors.slug ? (
          <p className="text-xs text-red-600">{fieldErrors.slug}</p>
        ) : null}
      </div>
    ),
    category: () => (
      <div className="space-y-2">
        <Label htmlFor="category">{t("admin.news.fields.category")}</Label>
        <Select
          value={formState.category}
          onValueChange={(value) =>
            setFormState((prev) => ({ ...prev, category: value as NewsFormState["category"] }))
          }
        >
          <SelectTrigger id="category">
            <SelectValue placeholder={t("admin.news.fields.categoryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {categoryOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey, option.defaultLabel)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    status: () => (
      <div className="space-y-2">
        <Label htmlFor="status">{t("admin.news.fields.status")}</Label>
        <Select
          value={formState.status ?? "draft"}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value as NewsFormState["status"] }))}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder={t("admin.news.fields.statusPlaceholder")} />
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
    ),
    locale: () => (
      <div className="space-y-2">
        <Label htmlFor="locale">{t("admin.content.insights.form.localeLabel", "Locale")}</Label>
        <div
          id="locale"
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        >
          <Badge variant="secondary" className="uppercase">
            {(formState.locale || currentLocale || defaultLocaleValue).toUpperCase()}
          </Badge>
          <span className="text-xs text-slate-600">
            {t(
              "admin.content.insights.form.localeHint",
              "Locale follows the EN/TH switcher in the navigation.",
            )}
          </span>
        </div>
      </div>
    ),
    statusBadge: () => (
      <div className="flex items-center gap-2">
        <Badge variant={statusBadge[formState.status ?? "draft"] ?? "secondary"} className="capitalize">
          {optionLabel(statusOptions, formState.status ?? "draft")}
        </Badge>
        <p className="text-xs text-slate-500">
          {t("admin.news.fields.statusHint")}
        </p>
      </div>
    ),
    heroHelper: () => (
      <div className="text-sm text-slate-700">
        {t(
          "admin.news.hero.helper",
          "Control how this news story appears at the top of the page. Use full-bleed or banner for major announcements; keep standard layout for routine updates."
        )}
      </div>
    ),
    heroImage: () => (
      <ImageUploader
        label={t("admin.news.hero.imageLabel", "Hero image")}
        description={t("admin.news.hero.imageDescription", "Shown at the top of the article.")}
        onChange={(value) =>
          setFormState((prev) => ({ ...prev, heroImageAssetId: value?.assetId ?? null }))
        }
      />
    ),
    heroAlt: () => (
      <div className="space-y-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
        <Label htmlFor="heroAlt" className={coverDisabled ? "opacity-70" : undefined}>
          {t("admin.news.hero.altLabel", "Alt text")}
        </Label>
        <div className="space-y-1">
          <Input
            id="heroAlt"
            value={formState.heroImageAlt ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, heroImageAlt: event.target.value }))}
            placeholder={t("admin.news.hero.altPlaceholder", "Describe the image")}
            disabled={coverDisabled}
            aria-disabled={coverDisabled}
            title={coverDisabledMessage}
            className={coverDisabled ? coverDisabledClasses : undefined}
          />
          <div className="flex justify-end text-[11px] font-medium text-slate-400">
            <span className={heroAltTooLong ? "text-amber-500" : "text-slate-400"}>
              {heroAltLength} / 125 chars
            </span>
          </div>
          <p className={`text-[11px] transition-opacity duration-150 ${heroAltTooLong ? "text-amber-500" : "opacity-0"}`}>
            Screen readers recommend alt text under 125 characters
          </p>
        </div>
      </div>
    ),
    heroCaption: () => (
      <div className="space-y-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
        <Label htmlFor="heroCaption" className={coverDisabled ? "opacity-70" : undefined}>
          {t("admin.news.hero.captionLabel", "Caption")}
        </Label>
        <Input
          id="heroCaption"
          value={formState.heroImageCaption ?? ""}
          onChange={(event) =>
            setFormState((prev) => ({ ...prev, heroImageCaption: event.target.value }))
          }
          placeholder={t("admin.news.hero.captionPlaceholder", "Optional caption")}
          disabled={coverDisabled}
          aria-disabled={coverDisabled}
          title={coverDisabledMessage}
          className={coverDisabled ? coverDisabledClasses : undefined}
        />
      </div>
    ),
    heroLayout: () => (
      <div className="space-y-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
        <Label htmlFor="heroLayout" className={coverDisabled ? "opacity-70" : undefined}>
          {t("admin.news.hero.layoutLabel", "Layout")}
        </Label>
        <Select
          value={formState.heroLayout}
          disabled={coverDisabled}
          aria-disabled={coverDisabled}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, heroLayout: value as NewsFormState["heroLayout"] }))}
        >
          <SelectTrigger
            id="heroLayout"
            aria-disabled={coverDisabled}
            title={coverDisabledMessage}
            className={coverDisabled ? coverDisabledClasses : undefined}
          >
            <SelectValue placeholder={t("admin.news.hero.layoutPlaceholder", "Choose layout")} />
          </SelectTrigger>
          <SelectContent>
            {heroLayoutOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={coverDisabled} aria-disabled={coverDisabled}>
                {t(`admin.news.hero.layout.${option.value}`, option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    heroTheme: () => (
      <div className="space-y-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
        <Label htmlFor="heroTheme" className={coverDisabled ? "opacity-70" : undefined}>
          {t("admin.news.hero.themeLabel", "Theme")}
        </Label>
        <Select
          value={formState.heroTheme}
          disabled={coverDisabled}
          aria-disabled={coverDisabled}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, heroTheme: value as NewsFormState["heroTheme"] }))}
        >
          <SelectTrigger
            id="heroTheme"
            aria-disabled={coverDisabled}
            title={coverDisabledMessage}
            className={coverDisabled ? coverDisabledClasses : undefined}
          >
            <SelectValue placeholder={t("admin.news.hero.themePlaceholder", "Choose theme")} />
          </SelectTrigger>
          <SelectContent>
            {heroThemeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={coverDisabled} aria-disabled={coverDisabled}>
                {t(`admin.news.hero.theme.${option.value}`, option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    publishDate: () => (
      <div className="space-y-2">
        <Label htmlFor="publishDate">{t("admin.news.fields.publishDate")}</Label>
        <Input
          id="publishDate"
          type="datetime-local"
          value={formState.publishDate}
          onChange={(event) => setFormState((prev) => ({ ...prev, publishDate: event.target.value }))}
        />
      </div>
    ),
    bodyHeader: () => (
      <div className="space-y-2">
        <Label htmlFor="content">{t("admin.news.fields.bodyLabel", "Story body (article layout)")}</Label>
        <p className="text-sm text-slate-600">
          {t(
            "admin.news.fields.bodyDescription",
            "Write the full news story with headings, paragraphs, quotes, and inline images. Use the body to cover the key facts, background, and details that don’t fit in the headline and lead."
          )}
        </p>
        <p className="text-xs font-semibold text-slate-700">
          {t("admin.news.fields.bodyLocaleHint", "English only. Add Thai in Body (TH).")}
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          {t("admin.news.body.orderNote", "The order of blocks here matches exactly how the story appears on the site.")}
        </div>
      </div>
    ),
    bodyEditor: () => (
      <PortableTextEditor
        label={t("admin.news.fields.bodyLabel", "Story body (article layout)")}
        description={t(
          "admin.news.fields.bodyDescription",
          "Write the full news story with headings, paragraphs, quotes, and inline images. Use the body to cover the key facts, background, and details that don’t fit in the headline and lead."
        )}
        placeholder={t("admin.news.fields.bodyPlaceholder", "Enter the English body content")}
        value={formState.content ?? []}
        onChange={(body) => setFormState((prev) => ({ ...prev, content: body }))}
        minRows={16}
      />
    ),
    bodyEditorTh: () => (
      <PortableTextEditor
        label={t("admin.news.fields.bodyLabelTh", "Story body (Thai)")}
        description={t(
          "admin.news.fields.bodyDescriptionTh",
          "Add the Thai version of the story. If left empty, the English body will be used as a fallback."
        )}
        placeholder={t("admin.news.fields.bodyPlaceholderTh", "ใส่เนื้อหาภาษาไทย")}
        value={formState.contentTh ?? []}
        onChange={(body) => setFormState((prev) => ({ ...prev, contentTh: body }))}
        minRows={12}
      />
    ),
    bodyTips: () => (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
        <p className="font-semibold text-slate-800">
          {t("admin.news.layoutTipsTitle", "Layout tips")}
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("admin.news.tipLead", "Open with the key facts in the first 1–2 paragraphs.")}</li>
          <li>{t("admin.news.tipHeadings", "Use H2/H3 headings to break longer stories into clear sections.")}</li>
          <li>{t("admin.news.tipImagesBetween", "Insert \"Inline image\" blocks at natural breaks in the story.")}</li>
          <li>{t("admin.news.tipAlignment", "Use full or wide images for strong visuals; left/right for supporting photos.")}</li>
          <li>{t("admin.news.tipCaptions", "Add concise captions that explain why the image matters.")}</li>
          <li>{t("admin.news.tipDecorative", "Mark decorative images so they don’t require alt text.")}</li>
          <li>{t("admin.news.tipPlacement", "Avoid placing images mid-sentence; keep them between paragraphs.")}</li>
        </ul>
      </div>
    ),
    eventsHelper: () => (
      <div className="text-sm text-slate-700">
        {t(
          "admin.news.eventsDownloads.helper",
          "Link this story to events and gated resources. These settings do not affect how the article reads, only what extras are attached."
        )}
      </div>
    ),
    linkedEvent: () => (
      <ReferencePicker
        label={t("admin.news.relationships.linkedEvent")}
        placeholder={t("admin.news.relationships.searchEvents")}
        value={linkedEvent}
        onChange={(option) => {
          setLinkedEvent(option);
          setFormState((prev) => ({ ...prev, linkedEventId: option?.id ?? null }));
        }}
        onSearch={(query) => searchEvents(query)}
        description={t("admin.news.relationships.eventLockedHint")}
      />
    ),
    attachments: () => (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">{t("admin.news.attachments.title")}</p>
            <p className="text-xs text-slate-600">
              {t("admin.news.attachments.subtitle")}
            </p>
          </div>
          {attachments.length ? (
            <Badge variant="secondary">{t("admin.news.attachments.attachedCount", { count: attachments.length })}</Badge>
          ) : null}
        </div>

        {attachments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
            {t("admin.news.attachments.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment._key ?? attachment.title ?? "attachment"}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">
                    {attachment.title ?? t("admin.news.attachments.attachmentFallback")}
                  </p>
                  {attachment.description ? (
                    <p className="text-sm text-slate-600">{attachment.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <Badge variant="outline" className="capitalize">
                      {attachment.fileType
                        ? optionLabel(fileTypeOptions, attachment.fileType)
                        : t("admin.news.attachments.fileType.file")}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {attachment.status
                        ? optionLabel(attachmentStatusOptions, attachment.status)
                        : t("admin.news.attachments.access.public")}
                    </Badge>
                    {attachment.file?.asset?.originalFilename ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        {attachment.file.asset.originalFilename}
                      </span>
                    ) : attachment.file?.asset?._ref ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1">
                        {attachment.file.asset._ref}
                      </span>
                    ) : null}
                  </div>
                </div>
                {onRemoveAttachment && formState._id ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveAttachment(attachment._key)}
                    disabled={isAttachmentPending && removingKey === attachment._key}
                  >
                    {isAttachmentPending && removingKey === attachment._key
                      ? t("admin.news.attachments.removing")
                      : t("admin.news.attachments.remove")}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="attachmentTitle">{t("admin.news.attachments.titleLabel")}</Label>
            <Input
              id="attachmentTitle"
              value={attachmentDraft.title}
              onChange={(event) => setAttachmentDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder={t("admin.news.attachments.titlePlaceholder")}
              disabled={!formState._id}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachmentType">{t("admin.news.attachments.fileTypeLabel")}</Label>
            <Select
              value={attachmentDraft.fileType}
              onValueChange={(value) => setAttachmentDraft((prev) => ({ ...prev, fileType: value }))}
              disabled={!formState._id}
            >
              <SelectTrigger id="attachmentType">
                <SelectValue placeholder={t("admin.news.attachments.fileTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {fileTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachmentStatus">{t("admin.news.attachments.accessLabel")}</Label>
            <Select
              value={attachmentDraft.status}
              onValueChange={(value) => setAttachmentDraft((prev) => ({ ...prev, status: value }))}
              disabled={!formState._id}
            >
              <SelectTrigger id="attachmentStatus">
                <SelectValue placeholder={t("admin.news.attachments.accessPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {attachmentStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey, option.defaultLabel)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachmentDescription">{t("admin.news.attachments.descriptionLabel")}</Label>
            <Textarea
              id="attachmentDescription"
              rows={2}
              value={attachmentDraft.description}
              onChange={(event) => setAttachmentDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t("admin.news.attachments.descriptionPlaceholder")}
              disabled={!formState._id}
            />
          </div>
        </div>

        <AssetUploader
          label={t("admin.news.attachments.uploadLabel")}
          description={t("admin.news.attachments.uploadDescription")}
          onChange={(value) => setAttachmentDraft((prev) => ({ ...prev, assetId: value?.assetId ?? null }))}
          className="md:max-w-xl"
        />

        {attachmentError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {attachmentError}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleAddAttachment}
            disabled={!formState._id || isAttachmentPending}
          >
            {isAttachmentPending ? t("admin.news.attachments.adding") : t("admin.news.attachments.add")}
          </Button>
        </div>
      </div>
    ),
    seoHelper: () => (
      <div className="text-sm text-slate-700">
        {t(
          "admin.news.seo.helper",
          "Control how this story appears in search results and social previews."
        )}
      </div>
    ),
    seoMetaTitle: () => (
      <div className="space-y-2">
        <Label htmlFor="seoMetaTitle">{t("admin.news.seo.metaTitle", "Meta title")}</Label>
        <Input
          id="seoMetaTitle"
          value={formState.seoMetaTitle ?? ""}
          onChange={(event) => setFormState((prev) => ({ ...prev, seoMetaTitle: event.target.value }))}
          placeholder={t("admin.news.seo.metaTitlePlaceholder", "Headline for search and social")}
        />
      </div>
    ),
    seoCanonicalUrl: () => (
      <div className="space-y-2">
        <Label htmlFor="seoCanonicalUrl">{t("admin.news.seo.canonicalUrl", "Canonical URL")}</Label>
        <Input
          id="seoCanonicalUrl"
          type="url"
          value={formState.seoCanonicalUrl ?? ""}
          onChange={(event) => setFormState((prev) => ({ ...prev, seoCanonicalUrl: event.target.value }))}
          placeholder={t("admin.news.seo.canonicalUrlPlaceholder", "https://example.com/story")}
        />
      </div>
    ),
    seoMetaDescription: () => (
      <div className="space-y-2">
        <Label htmlFor="seoMetaDescription">{t("admin.news.seo.metaDescription", "Meta description")}</Label>
        <Textarea
          id="seoMetaDescription"
          rows={3}
          value={formState.seoMetaDescription ?? ""}
          onChange={(event) => setFormState((prev) => ({ ...prev, seoMetaDescription: event.target.value }))}
          placeholder={t("admin.news.seo.metaDescriptionPlaceholder", "150–160 character summary for snippets")}
        />
      </div>
    ),
    seoKeywords: () => (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="seoKeywords">
            {t("admin.news.seo.keywords", "SEO Keywords (language-independent)")}
          </Label>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-slate-400 transition hover:text-slate-600"
                  aria-label={t("admin.news.seo.keywordsTooltipLabel", "SEO keyword locale scope info")}
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-left">
                {t(
                  "admin.news.seo.keywordsTooltip",
                  "These keywords are shared across all locales and used in meta tags globally."
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="seoKeywords"
          value={(formState.seoKeywords ?? []).join(", ")}
          onChange={(event) => {
            const keywords = event.target.value
              .split(",")
              .map((keyword) => keyword.trim())
              .filter(Boolean);
            setFormState((prev) => ({ ...prev, seoKeywords: keywords }));
          }}
          placeholder={t("admin.news.seo.keywordsPlaceholder", "newsroom, sustainability, retail tech")}
        />
        <p className="text-xs text-slate-500">
          {t("admin.news.seo.keywordsHelper", "Separate keywords with commas.")}
        </p>
      </div>
    ),
    seoNoIndex: () => (
      <div className="space-y-2">
        <Label htmlFor="seoNoIndex">{t("admin.news.seo.noIndexLabel", "Hide from search engines")}</Label>
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Switch
            id="seoNoIndex"
            checked={Boolean(formState.seoNoIndex)}
            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, seoNoIndex: checked }))}
          />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-slate-900">
              {t("admin.news.seo.noIndexTitle", "No-index this story")}
            </p>
            <p className="text-xs text-slate-600">
              {t("admin.news.seo.noIndexHelper", "Enable to prevent indexing while keeping the story live.")}
            </p>
          </div>
        </div>
      </div>
    ),
    seoOgImage: () => (
      <ImageUploader
        label={t("admin.news.seo.ogImageLabel", "Social share image (OG)")}
        description={t("admin.news.seo.ogImageDescription", "Used for social cards when sharing this story.")}
        onChange={(value) =>
          setFormState((prev) => ({ ...prev, seoOgImageAssetId: value?.assetId ?? null }))
        }
      />
    ),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {formState._id ? t("admin.news.header.edit") : t("admin.news.header.new")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.news.header.hint")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={resolvedBasePath}>{t("admin.news.actions.cancel")}</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("admin.news.actions.saving") : t("admin.news.actions.save")}
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {!formState._id && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {t("admin.news.attachments.saveFirstHint")}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              {t("admin.news.sections.essentials", "Story essentials")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("title")}
              {renderField("slug")}
              {renderField("status")}
              {renderField("category")}
              {renderField("publishDate")}
              {renderField("locale")}
            </div>
          </div>

          <div ref={bodyEnRef} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <RichContentEditor
              label={t("admin.news.fields.bodyLabel", "Story body (EN)")}
              description={t("admin.news.fields.bodyDescription", "Write the English content.")}
              value={formState.content ?? []}
              onChange={(content) => setFormState((prev) => ({ ...prev, content }))}
              error={fieldErrors.bodyEn}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              {t("admin.news.fields.titleTh", "Thai content")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField("titleTh")}
            </div>
          </div>

          <div ref={bodyThRef} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <RichContentEditor
              label={t("admin.news.fields.bodyLabelTh", "Story body (TH)")}
              description={t("admin.news.fields.bodyDescriptionTh", "Provide the Thai translation.")}
              value={formState.contentTh ?? []}
              onChange={(contentTh) => setFormState((prev) => ({ ...prev, contentTh }))}
              error={fieldErrors.bodyTh}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            {t("admin.news.sections.heroMedia", "Hero & story context")}
          </p>
          <LayoutCanvas layout={newsHeroLayout} registry={fieldRegistry} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            {t("admin.news.sections.metadata", "Events & downloads")}
          </p>
          <LayoutCanvas layout={newsMetadataLayout} registry={fieldRegistry} />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          {t("admin.news.sections.seo", "SEO & social")}
        </p>
        <LayoutCanvas layout={newsSeoLayout} registry={fieldRegistry} />
      </div>
    </form>
  );
};

export default NewsForm;
