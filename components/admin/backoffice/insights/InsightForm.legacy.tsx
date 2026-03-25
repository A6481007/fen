"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutCanvas } from "@/components/admin/backoffice/layout/LayoutCanvas";
import type { FieldRegistry, LayoutNode } from "@/components/admin/backoffice/layout/layoutTypes";
import { ReferencePicker, type ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/backoffice/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { defaultLocaleValue } from "@/components/admin/backoffice/localeOptions";
import { normalizeLocaleCode } from "@/lib/i18n/normalizeLocale";
import { RichContentEditor } from "@/components/admin/backoffice/rich/RichContentEditor";
import { PortableTextEditor } from "@/components/admin/backoffice/PortableTextEditor";
import type { PortableTextBlock } from "@/types/portableText";
import type {
  InsightFormState,
  InsightReferenceOption,
} from "./types";

type InsightFormProps = {
  initialValues?: Partial<InsightFormState>;
  initialThaiValues?: Partial<InsightFormState>;
  initialAuthor?: InsightReferenceOption | null;
  initialPrimaryCategory?: InsightReferenceOption | null;
  onSubmit: (values: InsightFormState) => Promise<{
    success: boolean;
    id?: string;
    status?: string;
    message?: string;
  }>;
  searchAuthors: (query: string) => Promise<InsightReferenceOption[]>;
  searchCategories: (query: string) => Promise<InsightReferenceOption[]>;
};

const statusBadge: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  draft: "secondary",
  archived: "outline",
};

const COVER_DISABLED_MESSAGE = "Upload an image first to configure these settings.";

const insightHeroLayout: LayoutNode[] = [
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
    ],
  },
];

const insightMetadataLayout: LayoutNode[] = [
  {
    id: "row-metadata",
    type: "row",
    children: [
      {
        id: "col-metadata",
        type: "column",
        width: 12,
        children: [
          { id: "field-primaryCategory", type: "field", fieldId: "primaryCategory" },
          { id: "field-relationshipsHelper", type: "field", fieldId: "relationshipsHelper" },
          {
            id: "row-keywords",
            type: "row",
            children: [
              { id: "col-primaryKeyword", type: "column", width: 4, children: [{ id: "field-primaryKeyword", type: "field", fieldId: "primaryKeyword" }] },
              { id: "col-primaryKeywordVolume", type: "column", width: 4, children: [{ id: "field-primaryKeywordVolume", type: "field", fieldId: "primaryKeywordVolume" }] },
              { id: "col-primaryKeywordDifficulty", type: "column", width: 4, children: [{ id: "field-primaryKeywordDifficulty", type: "field", fieldId: "primaryKeywordDifficulty" }] },
            ],
          },
        ],
      },
    ],
  },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

const toPickerOption = (option?: InsightReferenceOption | null): ReferenceOption | null => {
  if (!option) return null;
  return { id: option.id, label: option.label, description: option.description };
};

const buildInitialState = (
  values?: Partial<InsightFormState>,
  author?: InsightReferenceOption | null,
  primaryCategory?: InsightReferenceOption | null,
  activeLocale?: string,
): InsightFormState => ({
  _id: values?._id,
  thId: values?.thId,
  title: values?.title ?? "",
  titleTh: values?.titleTh ?? "",
  slug: values?.slug ?? "",
  locale: values?.locale ?? activeLocale ?? defaultLocaleValue,
  status: values?.status ?? "draft",
  insightType: values?.insightType ?? "productKnowledge",
  summary: values?.summary ?? "",
  summaryTh: values?.summaryTh ?? "",
  body: values?.body ?? [],
  bodyTh: values?.bodyTh ?? [],
  authorId: values?.authorId ?? author?.id ?? null,
  primaryCategoryId: values?.primaryCategoryId ?? primaryCategory?.id ?? null,
  categoryIds: values?.categoryIds ?? [],
  primaryKeyword: values?.primaryKeyword ?? "",
  primaryKeywordVolume: values?.primaryKeywordVolume ?? null,
  primaryKeywordDifficulty: values?.primaryKeywordDifficulty ?? null,
  heroImageAssetId: values?.heroImageAssetId ?? null,
  heroImageAlt: values?.heroImageAlt ?? "",
  heroImageCaption: values?.heroImageCaption ?? "",
  heroLayout: values?.heroLayout ?? "standard",
  heroTheme: values?.heroTheme ?? "light",
  publishAsBanner: values?.publishAsBanner ?? false,
  bannerSettings: values?.bannerSettings ?? undefined,
});

const InsightForm = ({
  initialValues,
  initialThaiValues,
  initialAuthor,
  initialPrimaryCategory,
  onSubmit,
  searchAuthors,
  searchCategories,
}: InsightFormProps) => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const resolvedAuthor = useMemo(() => {
    if (!initialAuthor) return null;
    const label = initialAuthor.label?.trim() || t("admin.content.insights.fallback.author");
    return { ...initialAuthor, label };
  }, [initialAuthor, t]);
  const resolvedPrimaryCategory = useMemo(() => {
    if (!initialPrimaryCategory) return null;
    const label =
      initialPrimaryCategory.label?.trim() ||
      t("admin.content.insights.fallback.primaryCategory");
    return { ...initialPrimaryCategory, label };
  }, [initialPrimaryCategory, t]);
  const currentLocale = useMemo(
    () => normalizeLocaleCode(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );
  const [formState, setFormState] = useState<InsightFormState>(
    buildInitialState(initialValues, resolvedAuthor, resolvedPrimaryCategory, currentLocale),
  );
  const [thaiState, setThaiState] = useState<InsightFormState>(
    buildInitialState(
      initialThaiValues,
      resolvedAuthor,
      resolvedPrimaryCategory,
      "th",
    ),
  );
  useEffect(() => {
    setFormState((prev) =>
      prev.locale === currentLocale ? prev : { ...prev, locale: currentLocale },
    );
  }, [currentLocale]);
  const [author, setAuthor] = useState<ReferenceOption | null>(toPickerOption(resolvedAuthor));
  const [primaryCategory, setPrimaryCategory] = useState<ReferenceOption | null>(
    toPickerOption(resolvedPrimaryCategory),
  );
  const [slugDirty, setSlugDirty] = useState(Boolean(initialValues?.slug));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const bodyEnRef = useRef<HTMLDivElement | null>(null);
  const bodyThRef = useRef<HTMLDivElement | null>(null);
  const hasHeroImage = Boolean(formState.heroImageAssetId);
  const coverDisabled = !hasHeroImage;
  const coverDisabledMessage = coverDisabled ? COVER_DISABLED_MESSAGE : undefined;
  const coverDisabledClasses = coverDisabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "";
  const heroAltLength = (formState.heroImageAlt ?? "").length;
  const heroAltTooLong = heroAltLength > 125;

  const insightTypeOptions = useMemo(
    () => [
      { value: "productKnowledge", label: t("admin.content.insights.types.productKnowledge") },
      { value: "generalKnowledge", label: t("admin.content.insights.types.generalKnowledge") },
      { value: "problemKnowledge", label: t("admin.content.insights.types.problemKnowledge") },
      { value: "comparison", label: t("admin.content.insights.types.comparison") },
      { value: "caseStudy", label: t("admin.content.insights.types.caseStudy") },
      { value: "validatedSolution", label: t("admin.content.insights.types.validatedSolution") },
      { value: "theoreticalSolution", label: t("admin.content.insights.types.theoreticalSolution") },
    ],
    [t],
  );

  const statusOptions = useMemo(
    () => [
      { value: "draft", label: t("admin.content.insights.status.draft") },
      { value: "published", label: t("admin.content.insights.status.published") },
      { value: "archived", label: t("admin.content.insights.status.archived") },
    ],
    [t],
  );

  const heroLayoutOptions = useMemo(
    () => [
      { value: "standard", label: t("admin.content.insights.form.hero.layout.standard", "Standard") },
      { value: "fullBleed", label: t("admin.content.insights.form.hero.layout.fullBleed", "Full bleed") },
      { value: "imageLeft", label: t("admin.content.insights.form.hero.layout.imageLeft", "Image left") },
      { value: "imageRight", label: t("admin.content.insights.form.hero.layout.imageRight", "Image right") },
      { value: "banner", label: t("admin.content.insights.form.hero.layout.banner", "Banner") },
    ],
    [t],
  );

  const heroThemeOptions = useMemo(
    () => [
      { value: "light", label: t("admin.content.insights.form.hero.theme.light", "Light") },
      { value: "dark", label: t("admin.content.insights.form.hero.theme.dark", "Dark") },
      { value: "overlay", label: t("admin.content.insights.form.hero.theme.overlay", "Overlay") },
    ],
    [t],
  );

  const statusLabel = (value: string) =>
    t(`admin.content.insights.status.${value}`, value);

  const handleTitleChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      title: value,
      slug: slugDirty ? prev.slug : slugify(value),
    }));
  };
  const handleTitleThChange = (value: string) => {
    setThaiState((prev) => ({
      ...prev,
      title: value,
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugDirty(true);
    setFormState((prev) => ({ ...prev, slug: value }));
    setThaiState((prev) => ({ ...prev, slug: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    const baseTitle = (formState.title || thaiState.title || "").trim();
    const slugValue = (formState.slug || slugify(baseTitle)).trim();
    const errors: Record<string, string> = {};

    if (!slugValue) {
      errors.slug = t("admin.content.insights.form.errors.slugRequired");
    }

    const titleValue = formState.title?.trim() || "";
    if (!titleValue) {
      errors.title = t("admin.content.insights.form.errors.titleRequired", "English title is required.");
    }

    const hasEnglishBody =
      Array.isArray(formState.body) &&
      formState.body.some((block) => {
        const text = ((block as { children?: { text?: string }[] }).children || [])
          .map((child) => child.text ?? "")
          .join("")
          .trim();
        return text.length > 0;
      });

    if (!hasEnglishBody) {
      errors.bodyEn = t("admin.content.insights.form.errors.bodyRequired", "Body (EN) is required.");
    }

    const hasThaiBody =
      Array.isArray(thaiState.body) &&
      thaiState.body.some((block) => {
        const text = ((block as { children?: { text?: string }[] }).children || [])
          .map((child) => child.text ?? "")
          .join("")
          .trim();
        return text.length > 0;
      });

    if (!hasThaiBody) {
      errors.bodyTh = t("admin.content.insights.form.errors.bodyRequiredTh", "Body (TH) is required.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError(null);
      const first = errors.bodyEn
        ? bodyEnRef.current
        : errors.bodyTh
          ? bodyThRef.current
          : null;
      if (first) {
        first.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    const summaryValue = formState.summary?.trim() || "";

    const payload: InsightFormState = {
      ...formState,
      slug: slugValue,
      locale: formState.locale?.trim() || currentLocale,
      title: titleValue,
      titleTh: thaiState.title?.trim() || undefined,
      summary: summaryValue,
      summaryTh: thaiState.summary?.trim() || undefined,
      body: formState.body ?? [],
      bodyTh: thaiState.body ?? [],
    };

    startTransition(() => {
      onSubmit(payload)
        .then((result) => {
          if (!result.success) {
            setSubmitError(result.message ?? t("admin.content.insights.form.errors.saveFailed"));
            toast({
              variant: "destructive",
              description:
                result.message ?? t("admin.content.insights.form.errors.saveFailedToast"),
            });
            return;
          }

          setSubmitError(null);
          toast({ description: t("admin.content.insights.form.success.saved") });

          if (!payload._id && result.id) {
            setFormState((prev) => ({ ...prev, _id: result.id }));
          } else if (result.id) {
            setFormState((prev) => ({ ...prev, _id: result.id }));
          }

          router.replace("/admin/content/insights");
        })
        .catch((error) => {
          console.error("Failed to save insight", error);
          setSubmitError(t("admin.content.insights.form.errors.saveFailed"));
          toast({
            variant: "destructive",
            description: t("admin.content.insights.form.errors.saveFailedToast"),
          });
        });
    });
  };

  const renderField = (field?: any) => (typeof field === "function" ? field() : field ?? null);

  const fieldRegistry: FieldRegistry = {
    title: () => (
      <div className="space-y-2">
        <Label htmlFor="title">{t("admin.content.insights.form.titleLabel")}</Label>
        <Input
          id="title"
          value={formState.title}
          onChange={(event) => handleTitleChange(event.target.value)}
          placeholder={t("admin.content.insights.form.titlePlaceholder")}
          className={fieldErrors.title ? "border-red-500" : undefined}
        />
        {fieldErrors.title ? (
          <p className="text-xs text-red-600">{fieldErrors.title}</p>
        ) : null}
      </div>
    ),
    titleTh: () => (
      <div className="space-y-2">
        <Label htmlFor="titleTh">{t("admin.content.insights.form.titleLabelTh", "Title (TH)")}</Label>
        <Input
          id="titleTh"
          value={thaiState.title}
          onChange={(event) => handleTitleThChange(event.target.value)}
          placeholder={t("admin.content.insights.form.titlePlaceholderTh", "Thai title")}
        />
        <p className="text-xs text-slate-500">
          {t("admin.content.insights.form.titleHintTh", "Optional. Falls back to English if empty.")}
        </p>
      </div>
    ),
    slug: () => (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="slug">{t("admin.content.insights.form.slugLabel")}</Label>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => handleSlugChange(slugify(formState.title))}
          >
            {t("admin.content.insights.form.slugRegenerate")}
          </Button>
        </div>
        <Input
          id="slug"
          value={formState.slug}
          onChange={(event) => handleSlugChange(event.target.value)}
          placeholder={t("admin.content.insights.form.slugPlaceholder")}
          className={fieldErrors.slug ? "border-red-500" : undefined}
        />
        {fieldErrors.slug ? (
          <p className="text-xs text-red-600">{fieldErrors.slug}</p>
        ) : null}
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
    status: () => (
      <div className="space-y-2">
        <Label htmlFor="status">{t("admin.content.insights.form.statusLabel")}</Label>
        <Select
          value={formState.status}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value as InsightFormState["status"] }))}
        >
          <SelectTrigger id="status">
            <SelectValue placeholder={t("admin.content.insights.form.statusPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    insightType: () => (
      <div className="space-y-2">
        <Label htmlFor="insightType">
          {t("admin.content.insights.form.insightTypeLabel")}
        </Label>
        <Select
          value={formState.insightType ?? ""}
          onValueChange={(value) =>
            setFormState((prev) => ({ ...prev, insightType: value as InsightFormState["insightType"] }))
          }
        >
          <SelectTrigger id="insightType">
            <SelectValue placeholder={t("admin.content.insights.form.insightTypePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {insightTypeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    author: () => (
      <ReferencePicker
        label={t("admin.content.insights.form.authorLabel")}
        placeholder={t("admin.content.insights.form.authorPlaceholder")}
        value={author}
        onChange={(option) => {
          setAuthor(option);
          setFormState((prev) => ({ ...prev, authorId: option?.id ?? null }));
        }}
        onSearch={(query) => searchAuthors(query)}
      />
    ),
    statusBadge: () => (
      <div className="flex items-center gap-2">
        <Badge variant={statusBadge[formState.status] ?? "secondary"} className="capitalize">
          {statusLabel(formState.status)}
        </Badge>
        <p className="text-xs text-slate-500">
          {t("admin.content.insights.form.statusHelper")}
        </p>
      </div>
    ),
    heroHelper: () => (
      <div className="text-sm text-slate-700">
        {t(
          "admin.content.insights.form.hero.helper",
          "Choose how the hero image and title appear at the top of the insight. Use full-bleed or banner for flagship pieces; standard fits most articles."
        )}
      </div>
    ),
    heroImage: () => (
      <ImageUploader
        label={t("admin.content.insights.form.hero.imageLabel", "Hero image")}
        description={t("admin.content.insights.form.hero.imageDescription", "Shown at the top of the article.")}
        onChange={(value) =>
          setFormState((prev) => ({ ...prev, heroImageAssetId: value?.assetId ?? null }))
        }
      />
    ),
    heroAlt: () => (
      <div className="space-y-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
        <Label htmlFor="heroAlt" className={coverDisabled ? "opacity-70" : undefined}>
          {t("admin.content.insights.form.hero.alt", "Alt text")}
        </Label>
        <div className="space-y-1">
          <Input
            id="heroAlt"
            value={formState.heroImageAlt ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, heroImageAlt: event.target.value }))}
            placeholder={t("admin.content.insights.form.hero.altPlaceholder", "Describe the image")}
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
          {t("admin.content.insights.form.hero.caption", "Caption")}
        </Label>
        <Input
          id="heroCaption"
          value={formState.heroImageCaption ?? ""}
          onChange={(event) => setFormState((prev) => ({ ...prev, heroImageCaption: event.target.value }))}
          placeholder={t("admin.content.insights.form.hero.captionPlaceholder", "Optional caption")}
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
          {t("admin.content.insights.form.hero.layoutLabel", "Layout")}
        </Label>
        <Select
          value={formState.heroLayout}
          disabled={coverDisabled}
          aria-disabled={coverDisabled}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, heroLayout: value as InsightFormState["heroLayout"] }))}
        >
          <SelectTrigger
            id="heroLayout"
            aria-disabled={coverDisabled}
            title={coverDisabledMessage}
            className={coverDisabled ? coverDisabledClasses : undefined}
          >
            <SelectValue placeholder={t("admin.content.insights.form.hero.layoutPlaceholder", "Choose layout")} />
          </SelectTrigger>
          <SelectContent>
            {heroLayoutOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={coverDisabled} aria-disabled={coverDisabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    heroTheme: () => (
      <div className="space-y-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
        <Label htmlFor="heroTheme" className={coverDisabled ? "opacity-70" : undefined}>
          {t("admin.content.insights.form.hero.themeLabel", "Theme")}
        </Label>
        <Select
          value={formState.heroTheme}
          disabled={coverDisabled}
          aria-disabled={coverDisabled}
          onValueChange={(value) => setFormState((prev) => ({ ...prev, heroTheme: value as InsightFormState["heroTheme"] }))}
        >
          <SelectTrigger
            id="heroTheme"
            aria-disabled={coverDisabled}
            title={coverDisabledMessage}
            className={coverDisabled ? coverDisabledClasses : undefined}
          >
            <SelectValue placeholder={t("admin.content.insights.form.hero.themePlaceholder", "Choose theme")} />
          </SelectTrigger>
          <SelectContent>
            {heroThemeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={coverDisabled} aria-disabled={coverDisabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    ),
    summary: () => (
      <div className="space-y-2">
        <Label htmlFor="summary">
          {t("admin.content.insights.form.summaryLabel")}
        </Label>
        <Textarea
          id="summary"
          rows={3}
          value={formState.summary}
          onChange={(event) => setFormState((prev) => ({ ...prev, summary: event.target.value }))}
          placeholder={t("admin.content.insights.form.summaryPlaceholder")}
        />
      </div>
    ),
    summaryTh: () => (
      <div className="space-y-2">
        <Label htmlFor="summaryTh">
          {t("admin.content.insights.form.summaryLabelTh", "Summary (TH)")}
        </Label>
        <Textarea
          id="summaryTh"
          rows={3}
          value={thaiState.summary ?? ""}
          onChange={(event) => setThaiState((prev) => ({ ...prev, summary: event.target.value }))}
          placeholder={t("admin.content.insights.form.summaryPlaceholderTh", "Thai summary")}
        />
        <p className="text-xs text-slate-500">
          {t("admin.content.insights.form.summaryHintTh", "Optional. Falls back to English if empty.")}
        </p>
      </div>
    ),
    bodyEditor: () => (
      <PortableTextEditor
        label={t("admin.content.insights.form.bodyLabel", "Body (article layout)")}
        description={t(
          "admin.content.insights.form.bodyDescription",
          "Write the full insight article with headings, paragraphs, lists, quotes, and inline images. Use the body to explain the problem, your perspective, and the practical steps or recommendations."
        )}
        placeholder={t("admin.content.insights.form.bodyPlaceholder", "Enter English body content")}
        value={formState.body}
        onChange={(body) => setFormState((prev) => ({ ...prev, body }))}
        minRows={14}
      />
    ),
    bodyEditorTh: () => (
      <PortableTextEditor
        label={t("admin.content.insights.form.bodyLabelTh", "Body (Thai)")}
        description={t(
          "admin.content.insights.form.bodyDescriptionTh",
          "Add the Thai version. If left empty, English content will be used as fallback."
        )}
        placeholder={t("admin.content.insights.form.bodyPlaceholderTh", "ใส่เนื้อหาภาษาไทย")}
        value={thaiState.body ?? []}
        onChange={(body) => setThaiState((prev) => ({ ...prev, body }))}
        minRows={12}
      />
    ),
    bodyTips: () => (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
        <p className="font-semibold text-slate-800">{t("admin.content.insights.form.layoutTipsTitle", "Layout tips")}</p>
        <ul className="list-disc space-y-1 pl-4">
          <li>{t("admin.content.insights.form.tipHeadings", "Break the article into clear sections with H2/H3 headings.")}</li>
          <li>{t("admin.content.insights.form.tipImagesBetween", "Insert \"Inline image\" blocks between paragraphs where they add clarity.")}</li>
          <li>{t("admin.content.insights.form.tipAlignment", "Use alignment (full, wide, left, right, center) to create rhythm, not chaos.")}</li>
          <li>{t("admin.content.insights.form.tipSizes", "Keep most images medium/large and avoid stacking too many images in a row.")}</li>
          <li>{t("admin.content.insights.form.tipDecorative", "Mark purely decorative images so screen readers can skip them.")}</li>
        </ul>
      </div>
    ),
    primaryCategory: () => (
      <ReferencePicker
        label={t("admin.content.insights.form.primaryCategoryLabel")}
        placeholder={t("admin.content.insights.form.primaryCategoryPlaceholder")}
        value={primaryCategory}
        onChange={(option) => {
          setPrimaryCategory(option);
          setFormState((prev) => ({ ...prev, primaryCategoryId: option?.id ?? null }));
        }}
        onSearch={(query) => searchCategories(query)}
      />
    ),
    relationshipsHelper: () => (
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
        {t("admin.content.insights.form.relationshipsHelper")}
      </div>
    ),
    primaryKeyword: () => (
      <div className="space-y-2">
        <Label htmlFor="primaryKeyword">
          {t("admin.content.insights.form.primaryKeywordLabel")}
        </Label>
        <Input
          id="primaryKeyword"
          value={formState.primaryKeyword ?? ""}
          onChange={(event) => setFormState((prev) => ({ ...prev, primaryKeyword: event.target.value }))}
          placeholder={t("admin.content.insights.form.primaryKeywordPlaceholder")}
        />
      </div>
    ),
    primaryKeywordVolume: () => (
      <div className="space-y-2">
        <Label htmlFor="primaryKeywordVolume">
          {t("admin.content.insights.form.primaryKeywordVolumeLabel")}
        </Label>
        <Input
          id="primaryKeywordVolume"
          type="number"
          value={formState.primaryKeywordVolume ?? ""}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              primaryKeywordVolume: event.target.value ? Number(event.target.value) : null,
            }))
          }
          placeholder={t("admin.content.insights.form.primaryKeywordVolumePlaceholder")}
        />
      </div>
    ),
    primaryKeywordDifficulty: () => (
      <div className="space-y-2">
        <Label htmlFor="primaryKeywordDifficulty">
          {t("admin.content.insights.form.primaryKeywordDifficultyLabel")}
        </Label>
        <Input
          id="primaryKeywordDifficulty"
          type="number"
          value={formState.primaryKeywordDifficulty ?? ""}
          onChange={(event) =>
            setFormState((prev) => ({
              ...prev,
              primaryKeywordDifficulty: event.target.value ? Number(event.target.value) : null,
            }))
          }
          placeholder={t(
            "admin.content.insights.form.primaryKeywordDifficultyPlaceholder"
          )}
        />
      </div>
    ),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">
            {formState._id ? t("admin.content.insights.form.editTitle") : t("admin.content.insights.form.newTitle")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.content.insights.form.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content/insights">{t("admin.content.insights.form.cancel")}</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("admin.content.insights.form.saving") : t("admin.content.insights.form.save")}
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">
              {t("admin.content.insights.form.sections.essentials", "Essentials")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField(fieldRegistry.title)}
              {renderField(fieldRegistry.slug)}
              {renderField(fieldRegistry.status)}
              {renderField(fieldRegistry.insightType)}
              {renderField(fieldRegistry.locale)}
              {renderField(fieldRegistry.author)}
            </div>
          </div>

          <div ref={bodyEnRef} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <RichContentEditor
              label="Body (EN)"
              description="Write the English content. Do NOT include Thai here."
              value={formState.body as unknown as PortableTextBlock[]}
              onChange={(body) => setFormState((prev) => ({ ...prev, body: body as any }))}
              error={fieldErrors.bodyEn}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-slate-900">Thai & summaries</p>
            <div className="grid gap-3 md:grid-cols-2">
              {renderField(fieldRegistry.titleTh)}
              {renderField(fieldRegistry.summary)}
              {renderField(fieldRegistry.summaryTh)}
            </div>
          </div>

          <div ref={bodyThRef} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <RichContentEditor
              label="Body (TH)"
              description="Provide the Thai translation of the English content."
              value={(thaiState.body ?? []) as unknown as PortableTextBlock[]}
              onChange={(body) => setThaiState((prev) => ({ ...prev, body: body as any }))}
              error={fieldErrors.bodyTh}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            {t("admin.content.insights.form.sections.heroMedia", "Hero & media")}
          </p>
          <LayoutCanvas layout={insightHeroLayout} registry={fieldRegistry} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            {t("admin.content.insights.form.sections.metadata", "Metadata & SEO")}
          </p>
          <LayoutCanvas layout={insightMetadataLayout} registry={fieldRegistry} />
        </div>
      </div>
    </form>
  );
};

export default InsightForm;
