"use client";

/**
 * ContentCreationPanel.tsx  — full rewrite
 *
 * Steps:  Essentials → Write → SEO → Publish   (was 5, now 4)
 *
 * Key changes vs previous version:
 *  • "Body" step + "Hero & Media" step are MERGED into one "Write" step.
 *    Cover photo lives at the top of the document surface (like a real editor).
 *    Hero settings (alt, caption, layout, theme) collapse under it.
 *  • Body editing now uses the DocEditor (Tiptap → PortableText) in this
 *    component; other RichContentEditor consumers stay unchanged.
 *  • No other logic changes — all form fields, validation, actions, i18n keys
 *    are identical to the previous version.
 */

import type React from "react";
import { useEffect, useMemo, useRef, useState, useTransition, type ComponentProps } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DocEditor } from "./content/DocEditor";
import { ImageUploader } from "@/components/admin/backoffice/ImageUploader";
import { ReferencePicker, type ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { normalizeLocaleCode } from "@/lib/i18n/normalizeLocale";
import type { InsightFormState, InsightReferenceOption } from "./insights/types";
import type { NewsFormState, NewsAttachment } from "./news/types";
import type { PortableTextBlock } from "@/types/portableText";

type SubmitResult = { success: boolean; id?: string; status?: string; message?: string };

// ─── prop types (unchanged) ────────────────────────────────────────────────────

type InsightWizardProps = {
  mode: "insight";
  initialValues?: Partial<InsightFormState>;
  initialAuthor?: InsightReferenceOption | null;
  initialPrimaryCategory?: InsightReferenceOption | null;
  onSubmit: (values: InsightFormState) => Promise<SubmitResult>;
  searchAuthors: (query: string) => Promise<InsightReferenceOption[]>;
  searchCategories: (query: string) => Promise<InsightReferenceOption[]>;
  basePath?: string;
};

type NewsWizardProps = {
  mode: "news";
  initialValues?: Partial<NewsFormState>;
  initialLinkedEvent?: ReferenceOption | null;
  onSubmit: (values: NewsFormState) => Promise<SubmitResult>;
  searchEvents: (query: string) => Promise<ReferenceOption[]>;
  initialAttachments?: NewsAttachment[];
  onAddAttachment?: (payload: {
    title: string;
    description?: string;
    fileType: string;
    status: string;
  }) => Promise<{ success: boolean; attachments?: NewsAttachment[]; message?: string }>;
  onRemoveAttachment?: (attachmentKey: string) => Promise<{ success: boolean; attachments?: NewsAttachment[]; message?: string }>;
  basePath?: string;
  newsId?: string;
};

export type ContentCreationPanelProps = InsightWizardProps | NewsWizardProps;

// ─── pure helpers (unchanged) ─────────────────────────────────────────────────

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
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const hasText = (blocks?: PortableTextBlock[]) =>
  Array.isArray(blocks) &&
  blocks.some((block) => {
    const children = (block as { children?: { text?: string }[] }).children ?? [];
    return children.map((c) => c.text ?? "").join("").trim().length > 0;
  });

// ─── entry point ──────────────────────────────────────────────────────────────

export function ContentCreationPanel(props: ContentCreationPanelProps) {
  if (props.mode === "insight") return <InsightWizard {...props} />;
  return <NewsWizard {...props} />;
}

// ══════════════════════════════════════════════════════════════════════════════
//  INSIGHT WIZARD
// ══════════════════════════════════════════════════════════════════════════════

function InsightWizard({
  initialValues,
  initialAuthor,
  initialPrimaryCategory,
  onSubmit,
  searchAuthors,
  searchCategories,
}: InsightWizardProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [writeLang, setWriteLang] = useState<"en" | "th">("en");
  const [coverSettingsOpen, setCoverSettingsOpen] = useState(false);
  const [authorOption, setAuthorOption] = useState<ReferenceOption | null>(
    initialAuthor
      ? { id: initialAuthor.id, label: initialAuthor.label, description: initialAuthor.description }
      : null,
  );
  const [categoryOption, setCategoryOption] = useState<ReferenceOption | null>(
    initialPrimaryCategory
      ? { id: initialPrimaryCategory.id, label: initialPrimaryCategory.label, description: initialPrimaryCategory.description }
      : null,
  );
  const slugDirtyRef = useRef(Boolean(initialValues?.slug));
  const currentLocale = useMemo(
    () => normalizeLocaleCode(i18n.resolvedLanguage || i18n.language) || "en",
    [i18n.language, i18n.resolvedLanguage],
  );

  const { control, register, handleSubmit, watch, setValue, trigger, formState: { errors } } =
    useForm<InsightFormState>({
      mode: "onBlur",
      defaultValues: {
        _id: initialValues?._id,
        title: initialValues?.title ?? "",
        titleTh: initialValues?.titleTh ?? "",
        slug: initialValues?.slug ?? "",
        locale: initialValues?.locale ?? currentLocale,
        status: initialValues?.status ?? "draft",
        insightType: initialValues?.insightType ?? "productKnowledge",
        summary: initialValues?.summary ?? "",
        summaryTh: initialValues?.summaryTh ?? "",
        body: initialValues?.body ?? [],
        bodyTh: initialValues?.bodyTh ?? [],
        authorId: initialValues?.authorId ?? null,
        primaryCategoryId: initialValues?.primaryCategoryId ?? null,
        primaryKeyword: initialValues?.primaryKeyword ?? "",
        primaryKeywordVolume: initialValues?.primaryKeywordVolume ?? null,
        primaryKeywordDifficulty: initialValues?.primaryKeywordDifficulty ?? null,
        heroImageAssetId: initialValues?.heroImageAssetId ?? null,
        heroImageAlt: initialValues?.heroImageAlt ?? "",
        heroImageCaption: initialValues?.heroImageCaption ?? "",
        heroLayout: initialValues?.heroLayout ?? "standard",
        heroTheme: initialValues?.heroTheme ?? "light",
        publishAsBanner: initialValues?.publishAsBanner ?? false,
        bannerSettings: initialValues?.bannerSettings,
      },
    });

  const title = watch("title");
  const slug = watch("slug");
  const slugRegister = register("slug", { required: t("admin.content.insights.form.errors.slugRequired", "Required") });
  const locale = watch("locale");
  const status = watch("status");
  const insightType = watch("insightType");
  const summaryValue = watch("summary") || "";
  const summaryThValue = watch("summaryTh") || "";

  useEffect(() => {
    if (slugDirtyRef.current) return;
    if (title) setValue("slug", slugify(title), { shouldDirty: true });
  }, [title, setValue]);

  // 4 steps: Essentials → Write → SEO → Publish
  const insightSteps = [
    {
      id: "essentials",
      label: t("admin.content.insights.form.sections.essentials", "Essentials"),
      fields: ["title", "slug", "status", "insightType", "authorId", "primaryCategoryId", "locale"] as (keyof InsightFormState)[],
    },
    {
      id: "write",
      label: t("admin.content.insights.form.sections.write", "Write"),
      fields: ["body", "heroImageAssetId"] as (keyof InsightFormState)[],
    },
    {
      id: "seo",
      label: "SEO",
      fields: ["seoMetaTitle", "seoMetaDescription", "seoCanonicalUrl", "seoKeywords", "seoNoIndex", "seoOgImageAssetId"] as (keyof InsightFormState)[],
    },
    {
      id: "publish",
      label: "Publish",
      fields: [] as (keyof InsightFormState)[],
    },
  ];

  const goNext = async () => {
    const ok = await trigger(insightSteps[step].fields);
    if (!ok) return;
    setStep((prev) => Math.min(prev + 1, insightSteps.length - 1));
  };
  const goPrev = () => setStep((prev) => Math.max(prev - 1, 0));

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const doSubmit = (overrideStatus?: InsightFormState["status"]) =>
    handleSubmit((values) => {
      setSubmitError(null);
      const payload: InsightFormState = {
        ...values,
        status: overrideStatus ?? values.status,
        slug: (values.slug || slugify(values.title || "")).trim(),
        locale: values.locale || currentLocale,
        primaryKeywordVolume: values.primaryKeywordVolume ? Number(values.primaryKeywordVolume) : null,
        primaryKeywordDifficulty: values.primaryKeywordDifficulty ? Number(values.primaryKeywordDifficulty) : null,
      };
      startTransition(() => {
        onSubmit(payload)
          .then((result) => {
            const ok = typeof result === "object" ? (result as any).success : true;
            if (!ok) {
              setSubmitError((result as any)?.message ?? t("admin.content.insights.form.errors.saveFailed", "Unable to save insight."));
              return;
            }
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
          })
          .catch((err) => {
            console.error("saveInsight failed", err);
            setSubmitError(t("admin.content.insights.form.errors.saveFailedToast", "Save failed."));
          });
      });
    })();

  return (
    <div className="space-y-4">
      <WizardHeader
        title={t("admin.content.insights.form.newTitle", "Create insight")}
        steps={insightSteps}
        step={step}
        stepErrors={{ essentials: Boolean(errors.title || errors.slug) }}
      />

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); doSubmit(); }}>

        {/* ── STEP 0: Essentials ── */}
        {step === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <div className="space-y-2">
              <FieldText
                label={t("admin.content.insights.form.titleLabel", "Title (EN)")}
                placeholder={t("admin.content.insights.form.titlePlaceholder", "Enter English title")}
                error={errors.title?.message}
                inputProps={register("title", { required: t("admin.content.insights.form.errors.titleRequired", "Required") })}
              />
              <FieldText
                label={t("admin.content.insights.form.titleLabelTh", "Title (TH)")}
                placeholder={t("admin.content.insights.form.titlePlaceholderTh", "Thai title")}
                inputProps={register("titleTh")}
              />
            </div>

            <SlugField
              label={t("admin.content.insights.form.slugLabel", "Slug")}
              placeholder={t("admin.content.insights.form.slugPlaceholder", "auto-from-title")}
              value={slug ?? ""}
              onReset={() => { slugDirtyRef.current = false; setValue("slug", slugify(title || ""), { shouldDirty: true, shouldValidate: true }); }}
              onChange={(value) => { slugDirtyRef.current = true; setValue("slug", value, { shouldDirty: true, shouldValidate: true }); }}
              error={errors.slug?.message}
              registerProps={slugRegister}
            />

            <div className="grid gap-3 md:grid-cols-2">
              <OptionCardGrid
                label={t("admin.content.insights.form.statusLabel", "Status")}
                options={[
                  { value: "draft",     label: t("admin.content.insights.status.draft",     "Draft"),     icon: "✏️" },
                  { value: "published", label: t("admin.content.insights.status.published", "Published"), icon: "🟢" },
                  { value: "archived",  label: t("admin.content.insights.status.archived",  "Archived"),  icon: "📦" },
                ]}
                value={status}
                onChange={(v) => setValue("status", v as InsightFormState["status"], { shouldDirty: true })}
              />
              <OptionCardGrid
                label={t("admin.content.insights.form.insightTypeLabel", "Type")}
                columns={3}
                options={[
                  { value: "productKnowledge",  label: "Product knowledge", icon: "📦" },
                  { value: "generalKnowledge",   label: "Market insight",    icon: "📈" },
                  { value: "comparison",         label: "Industry trends",   icon: "🌐" },
                  { value: "caseStudy",          label: "Case study",        icon: "🔬" },
                  { value: "validatedSolution",  label: "How-to",            icon: "📋" },
                ]}
                value={insightType}
                onChange={(v) => setValue("insightType", v as InsightFormState["insightType"], { shouldDirty: true })}
              />
            </div>

            <LocaleToggle value={locale ?? currentLocale} onChange={(next) => setValue("locale", next, { shouldDirty: true })} />

            <div className="grid gap-3 md:grid-cols-2">
              <Controller
                name="authorId"
                control={control}
                render={({ field }) => (
                  <ReferencePicker
                    label={t("admin.content.insights.form.authorLabel", "Author")}
                    placeholder={t("admin.content.insights.form.authorPlaceholder", "Search authors")}
                    value={authorOption}
                    onChange={(option) => { setAuthorOption(option); field.onChange(option?.id ?? null); }}
                    onSearch={async (query) => {
                      const results = await searchAuthors(query);
                      return results.map((r) => ({ id: r.id, label: r.label, description: r.description }));
                    }}
                  />
                )}
              />
              <Controller
                name="primaryCategoryId"
                control={control}
                render={({ field }) => (
                  <ReferencePicker
                    label={t("admin.content.insights.form.primaryCategoryLabel", "Primary category")}
                    placeholder={t("admin.content.insights.form.primaryCategoryPlaceholder", "Search categories")}
                    value={categoryOption}
                    onChange={(option) => { setCategoryOption(option); field.onChange(option?.id ?? null); }}
                    onSearch={async (query) => {
                      const results = await searchCategories(query);
                      return results.map((r) => ({ id: r.id, label: r.label, description: r.description }));
                    }}
                  />
                )}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FieldTextarea
                label={t("admin.content.insights.form.summaryLabel", "Summary (EN)")}
                placeholder={t("admin.content.insights.form.summaryPlaceholder", "Short preview text")}
                value={summaryValue}
                onChange={(val) => setValue("summary", val.slice(0, 280), { shouldDirty: true })}
                helper={`${summaryValue.length}/280`}
              />
              <FieldTextarea
                label={t("admin.content.insights.form.summaryLabelTh", "Summary (TH)")}
                placeholder={t("admin.content.insights.form.summaryPlaceholderTh", "Thai summary")}
                value={summaryThValue}
                onChange={(val) => setValue("summaryTh", val.slice(0, 280), { shouldDirty: true })}
                helper={`${summaryThValue.length}/280`}
              />
            </div>
          </div>
        )}

        {/* ── STEP 1: Write (cover image + body — merged) ── */}
        {step === 1 && (
          <WriteStep
            /* Cover image */
            heroImageAssetIdField={
              <Controller
                name="heroImageAssetId"
                control={control}
                render={({ field }) => (
                  <ImageUploader
                    label=""
                    description="Drag & drop your cover photo, or click to browse · 1200 × 630 px recommended"
                    onChange={(value) => field.onChange(value?.assetId ?? null)}
                  />
                )}
              />
            }
            heroSettingsOpen={coverSettingsOpen}
            onToggleHeroSettings={() => setCoverSettingsOpen((o) => !o)}
            heroAltField={<Input {...register("heroImageAlt")} placeholder="Describe the image for screen readers" className="h-8 text-sm" />}
            heroCaptionField={<Input {...register("heroImageCaption")} placeholder="Optional visible caption below the image" className="h-8 text-sm" />}
            heroLayout={watch("heroLayout") ?? "standard"}
            onHeroLayout={(v) => setValue("heroLayout", v as InsightFormState["heroLayout"], { shouldDirty: true })}
            heroTheme={watch("heroTheme") ?? "light"}
            onHeroTheme={(v) => setValue("heroTheme", v as InsightFormState["heroTheme"], { shouldDirty: true })}
            /* Document header */
            titlePreview={title}
            /* Language switcher */
            lang={writeLang}
            onLangChange={setWriteLang}
            /* Body editors */
            bodyEnField={
              <Controller
                name="body"
                control={control}
                rules={{
                  validate: (v) =>
                    hasText(v as unknown as PortableTextBlock[]) ||
                    t("admin.content.insights.form.errors.bodyRequired", "Body (EN) is required"),
                }}
                render={({ field, fieldState }) => (
                  <DocEditor
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            }
            bodyThField={
              <Controller
                name="bodyTh"
                control={control}
                render={({ field, fieldState }) => (
                  <DocEditor
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            }
            /* Insight extras */
            extras={
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SEO keywords</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <FieldText label="Primary keyword" placeholder="e.g. retail media platform"
                    inputProps={{ value: watch("primaryKeyword") ?? "", onChange: (e) => setValue("primaryKeyword", e.target.value, { shouldDirty: true }) }} />
                  <FieldText label="Monthly searches" type="number"
                    inputProps={{ value: watch("primaryKeywordVolume") ?? "", onChange: (e) => setValue("primaryKeywordVolume", e.target.value ? Number(e.target.value) : null, { shouldDirty: true }) }} />
                  <FieldText label="Difficulty 0–100" type="number"
                    inputProps={{ value: watch("primaryKeywordDifficulty") ?? "", onChange: (e) => setValue("primaryKeywordDifficulty", e.target.value ? Number(e.target.value) : null, { shouldDirty: true }), min: 0, max: 100 }} />
                </div>
                <KeywordDifficultyHint value={watch("primaryKeywordDifficulty")} />
              </div>
            }
          />
        )}

        {/* ── STEP 2: SEO ── */}
        {step === 2 && (
          <SeoStep
            seoMetaTitle={watch("seoMetaTitle") ?? ""}
            onSeoMetaTitle={(v) => setValue("seoMetaTitle", v.slice(0, 120), { shouldDirty: true })}
            seoMetaDescription={watch("seoMetaDescription") ?? ""}
            onSeoMetaDescription={(v) => setValue("seoMetaDescription", v.slice(0, 220), { shouldDirty: true })}
            seoCanonicalUrl={watch("seoCanonicalUrl") ?? ""}
            onSeoCanonicalUrl={(v) => setValue("seoCanonicalUrl", v, { shouldDirty: true })}
            seoKeywords={(watch("seoKeywords") ?? []).join(", ")}
            onSeoKeywords={(v) => setValue("seoKeywords", v.split(",").map((k) => k.trim()).filter(Boolean), { shouldDirty: true })}
            seoNoIndex={Boolean(watch("seoNoIndex"))}
            seoNoIndexField={
              <Controller name="seoNoIndex" control={control}
                render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />} />
            }
            seoOgImageField={
              <Controller name="seoOgImageAssetId" control={control}
                render={({ field }) => (
                  <ImageUploader label="Social share image (OG)"
                    description="Shown on Facebook, LINE, Twitter. Best: 1200×630px."
                    onChange={(value) => field.onChange(value?.assetId ?? null)} />
                )} />
            }
            slug={watch("slug") ?? ""}
            titleFallback={watch("title") ?? ""}
            summaryFallback={watch("summary") ?? ""}
            pathPrefix="insights"
          />
        )}

        {/* ── STEP 3: Publish ── */}
        {step === insightSteps.length - 1 ? (
          <PublishStep
            isInsight
            watchValues={watch as any}
            setStep={setStep}
            onSave={() => doSubmit()}
            onSavePublish={() => doSubmit("published")}
            isPending={isPending}
            submitError={submitError}
            submitSuccess={submitSuccess}
          />
        ) : (
          <WizardFooter step={step} total={insightSteps.length} onPrev={goPrev} onNext={goNext} isSaving={isPending} />
        )}
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  NEWS WIZARD
// ══════════════════════════════════════════════════════════════════════════════

function NewsWizard({
  initialValues,
  initialLinkedEvent,
  onSubmit,
  searchEvents,
  initialAttachments,
  onAddAttachment,
  onRemoveAttachment,
}: NewsWizardProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [writeLang, setWriteLang] = useState<"en" | "th">("en");
  const [coverSettingsOpen, setCoverSettingsOpen] = useState(false);
  const [eventOption, setEventOption] = useState<ReferenceOption | null>(initialLinkedEvent ?? null);
  const [attachments, setAttachments] = useState<NewsAttachment[]>(initialAttachments ?? []);
  const [attachmentDraft, setAttachmentDraft] = useState({ title: "", description: "", fileType: "pdf", status: "public" });
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentPending, startAttachmentTransition] = useTransition();
  const slugDirtyRef = useRef(Boolean(initialValues?.slug));
  const currentLocale = useMemo(
    () => normalizeLocaleCode(i18n.resolvedLanguage || i18n.language) || "en",
    [i18n.language, i18n.resolvedLanguage],
  );

  const { control, register, handleSubmit, watch, setValue, trigger, formState: { errors } } =
    useForm<NewsFormState>({
      mode: "onBlur",
      defaultValues: {
        _id: initialValues?._id,
        title: initialValues?.title ?? "",
        titleTh: initialValues?.titleTh ?? "",
        slug: initialValues?.slug ?? "",
        locale: initialValues?.locale ?? currentLocale,
        publishDate: toDateTimeInputValue(initialValues?.publishDate ?? new Date().toISOString()),
        category: initialValues?.category ?? "general",
        status: initialValues?.status ?? "draft",
        content: initialValues?.content ?? [],
        contentTh: initialValues?.contentTh ?? [],
        linkedEventId: initialValues?.linkedEventId ?? null,
        heroImageAssetId: initialValues?.heroImageAssetId ?? null,
        heroImageAlt: initialValues?.heroImageAlt ?? "",
        heroImageCaption: initialValues?.heroImageCaption ?? "",
        heroLayout: initialValues?.heroLayout ?? "standard",
        heroTheme: initialValues?.heroTheme ?? "light",
        publishAsBanner: initialValues?.publishAsBanner ?? false,
        bannerSettings: initialValues?.bannerSettings,
        seoMetaTitle: initialValues?.seoMetaTitle ?? "",
        seoMetaDescription: initialValues?.seoMetaDescription ?? "",
        seoCanonicalUrl: initialValues?.seoCanonicalUrl ?? "",
        seoKeywords: initialValues?.seoKeywords ?? [],
        seoNoIndex: initialValues?.seoNoIndex ?? false,
        seoOgImageAssetId: initialValues?.seoOgImageAssetId ?? null,
      },
    });

  const title = watch("title");
  const slug = watch("slug");
  const slugRegister = register("slug", { required: t("admin.news.errors.slugRequired", "Required") });
  const locale = watch("locale");
  const status = watch("status") ?? "draft";
  const category = watch("category") ?? "general";
  const publishRegister = register("publishDate");
  const currentId = watch("_id");

  useEffect(() => {
    if (slugDirtyRef.current) return;
    if (title) setValue("slug", slugify(title), { shouldDirty: true });
  }, [title, setValue]);

  // 4 steps: Essentials → Write → SEO → Publish
  const newsSteps = [
    {
      id: "essentials",
      label: t("admin.news.sections.essentials", "Essentials"),
      fields: ["title", "slug", "status", "category", "publishDate", "locale"] as (keyof NewsFormState)[],
    },
    {
      id: "write",
      label: t("admin.news.sections.write", "Write"),
      fields: ["content", "heroImageAssetId"] as (keyof NewsFormState)[],
    },
    {
      id: "seo",
      label: "SEO",
      fields: ["seoMetaTitle", "seoMetaDescription", "seoCanonicalUrl", "seoKeywords", "seoNoIndex", "seoOgImageAssetId"] as (keyof NewsFormState)[],
    },
    {
      id: "publish",
      label: "Publish",
      fields: [] as (keyof NewsFormState)[],
    },
  ];

  const goNext = async () => {
    const ok = await trigger(newsSteps[step].fields);
    if (!ok) return;
    setStep((prev) => Math.min(prev + 1, newsSteps.length - 1));
  };
  const goPrev = () => setStep((prev) => Math.max(prev - 1, 0));

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const doSubmitNews = (overrideStatus?: NewsFormState["status"]) =>
    handleSubmit((values) => {
      setSubmitError(null);
      const payload: NewsFormState = {
        ...values,
        status: overrideStatus ?? values.status,
        slug: (values.slug || slugify(values.title || "")).trim(),
        locale: values.locale || currentLocale,
        publishDate: values.publishDate ? new Date(values.publishDate).toISOString() : new Date().toISOString(),
        seoKeywords: values.seoKeywords ?? [],
      };
      startTransition(() => {
        onSubmit(payload)
          .then((result) => {
            const ok = typeof result === "object" ? (result as any).success : true;
            if (!ok) { setSubmitError((result as any)?.message ?? t("admin.news.errors.saveFailed", "Unable to save news.")); return; }
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
          })
          .catch((err) => { console.error("saveNews failed", err); setSubmitError(t("admin.news.errors.saveFailedNow", "Save failed.")); });
      });
    })();

  const handleAddAttachment = () => {
    if (!onAddAttachment || !currentId) { setAttachmentError(t("admin.news.attachments.saveFirstHint", "Save the story first.")); return; }
    if (!attachmentDraft.title.trim()) { setAttachmentError(t("admin.news.attachments.errors.titleRequired", "Title is required.")); return; }
    setAttachmentError(null);
    startAttachmentTransition(() => {
      onAddAttachment({ title: attachmentDraft.title.trim(), description: attachmentDraft.description.trim() || undefined, fileType: attachmentDraft.fileType, status: attachmentDraft.status })
        .then((result) => {
          if (!result.success || !result.attachments) { setAttachmentError(result.message ?? t("admin.news.attachments.errors.addFailed", "Unable to add attachment.")); return; }
          setAttachments(result.attachments);
          setAttachmentDraft({ title: "", description: "", fileType: "pdf", status: "public" });
        })
        .catch(() => setAttachmentError(t("admin.news.attachments.errors.addFailed", "Unable to add attachment.")));
    });
  };

  const handleRemoveAttachment = (key?: string) => {
    if (!key || !onRemoveAttachment || !currentId) return;
    startAttachmentTransition(() => {
      onRemoveAttachment(key)
        .then((result) => { if (result.success && result.attachments) setAttachments(result.attachments); })
        .catch(() => setAttachmentError(t("admin.news.attachments.errors.removeFailed", "Remove failed.")));
    });
  };

  return (
    <div className="space-y-4">
      <WizardHeader
        title={t("admin.news.header.new", "Create news")}
        steps={newsSteps}
        step={step}
        stepErrors={{ essentials: Boolean(errors.title || errors.slug) }}
      />

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); doSubmitNews(); }}>

        {/* ── STEP 0: Essentials ── */}
        {step === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <FieldText
              label={t("admin.news.fields.title", "Title (EN)")}
              placeholder={t("admin.news.fields.titlePlaceholder", "English title")}
              error={errors.title?.message}
              inputProps={register("title", { required: t("admin.news.errors.titleRequired", "Required") })}
            />
            <FieldText
              label={t("admin.news.fields.titleTh", "Title (TH)")}
              placeholder={t("admin.news.fields.titleThPlaceholder", "Thai title")}
              inputProps={register("titleTh")}
            />
            <SlugField
              label={t("admin.news.fields.slug", "Slug")}
              placeholder={t("admin.news.fields.slugPlaceholder", "auto-from-title")}
              value={slug ?? ""}
              onReset={() => { slugDirtyRef.current = false; setValue("slug", slugify(title || ""), { shouldDirty: true, shouldValidate: true }); }}
              onChange={(value) => { slugDirtyRef.current = true; setValue("slug", value, { shouldDirty: true, shouldValidate: true }); }}
              error={errors.slug?.message}
              registerProps={slugRegister}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <OptionCardGrid
                label={t("admin.news.fields.category", "Category")}
                options={[
                  { value: "announcement",       label: t("admin.news.category.announcement",      "Announcement"),       icon: "📣" },
                  { value: "partnership",         label: t("admin.news.category.partnership",       "Partnership"),        icon: "🤝" },
                  { value: "event_announcement",  label: t("admin.news.category.eventAnnouncement", "Event"),              icon: "🎫" },
                  { value: "general",             label: t("admin.news.category.general",           "General"),            icon: "📰" },
                ]}
                value={category}
                onChange={(v) => setValue("category", v as NewsFormState["category"], { shouldDirty: true })}
              />
              <OptionCardGrid
                label={t("admin.news.fields.status", "Status")}
                options={[
                  { value: "draft",     label: t("admin.news.status.draft",     "Draft"),     icon: "✏️" },
                  { value: "published", label: t("admin.news.status.published", "Published"), icon: "🟢" },
                ]}
                value={status}
                onChange={(v) => setValue("status", v as NewsFormState["status"], { shouldDirty: true })}
              />
            </div>
            <LocaleToggle value={locale ?? currentLocale} onChange={(next) => setValue("locale", next, { shouldDirty: true })} />
            <FieldText
              label={t("admin.news.fields.publishDate", "Publish date")}
              type="datetime-local"
              inputProps={{
                ...publishRegister,
                value: toDateTimeInputValue(watch("publishDate")),
                onChange: (e) => { publishRegister.onChange(e); setValue("publishDate", e.target.value, { shouldDirty: true }); },
              }}
            />
            <Controller
              name="linkedEventId"
              control={control}
              render={({ field }) => (
                <ReferencePicker
                  label={t("admin.news.relationships.linkedEvent", "Linked event")}
                  placeholder={t("admin.news.relationships.searchEvents", "Search events")}
                  value={eventOption}
                  onChange={(option) => { setEventOption(option); field.onChange(option?.id ?? null); }}
                  onSearch={searchEvents}
                />
              )}
            />
          </div>
        )}

        {/* ── STEP 1: Write (cover image + body — merged) ── */}
        {step === 1 && (
          <WriteStep
            heroImageAssetIdField={
              <Controller
                name="heroImageAssetId"
                control={control}
                render={({ field }) => (
                  <ImageUploader
                    label=""
                    description="Drag & drop your cover photo, or click to browse · 1200 × 630 px recommended"
                    onChange={(value) => field.onChange(value?.assetId ?? null)}
                  />
                )}
              />
            }
            heroSettingsOpen={coverSettingsOpen}
            onToggleHeroSettings={() => setCoverSettingsOpen((o) => !o)}
            heroAltField={<Input {...register("heroImageAlt")} placeholder="Describe the image for screen readers" className="h-8 text-sm" />}
            heroCaptionField={<Input {...register("heroImageCaption")} placeholder="Optional visible caption below the image" className="h-8 text-sm" />}
            heroLayout={watch("heroLayout") ?? "standard"}
            onHeroLayout={(v) => setValue("heroLayout", v as NewsFormState["heroLayout"], { shouldDirty: true })}
            heroTheme={watch("heroTheme") ?? "light"}
            onHeroTheme={(v) => setValue("heroTheme", v as NewsFormState["heroTheme"], { shouldDirty: true })}
            titlePreview={title}
            lang={writeLang}
            onLangChange={setWriteLang}
            bodyEnField={
              <Controller
                name="content"
                control={control}
                rules={{
                  validate: (v) =>
                    hasText(v as unknown as PortableTextBlock[]) ||
                    t("admin.news.errors.bodyRequired", "Body (EN) is required"),
                }}
                render={({ field, fieldState }) => (
                  <DocEditor
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            }
            bodyThField={
              <Controller
                name="contentTh"
                control={control}
                render={({ field, fieldState }) => (
                  <DocEditor
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />
            }
            extras={
              <div className="space-y-4">
                {/* Banner toggle */}
                <Controller
                  name="publishAsBanner"
                  control={control}
                  render={({ field }) => (
                    <div className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${field.value ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Show as site-wide announcement banner</p>
                        <p className="text-xs text-slate-500 mt-0.5">Displays a strip at the top of every page.</p>
                      </div>
                      <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                {/* Attachments */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Downloadable attachments</p>
                  {!currentId && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {t("admin.news.attachments.saveFirstHint", "Save the story first before adding attachments.")}
                    </div>
                  )}
                  {attachments.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                      {t("admin.news.attachments.empty", "No attachments yet.")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div key={att._key ?? att.title} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-slate-900">{att.title ?? "Untitled"}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">{fileTypeIcon(att.fileType)} {att.fileType}</span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5">{att.status ?? "public"}</span>
                            </div>
                          </div>
                          {onRemoveAttachment && currentId ? (
                            <Button type="button" variant="ghost" size="sm" disabled={isAttachmentPending} onClick={() => handleRemoveAttachment(att._key)}>
                              {t("admin.news.attachments.remove", "Remove")}
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <FieldText label={t("admin.news.attachments.titleLabel", "Title")}
                      inputProps={{ value: attachmentDraft.title, onChange: (e) => setAttachmentDraft((p) => ({ ...p, title: e.target.value })), disabled: !currentId }} />
                    <SelectField label={t("admin.news.attachments.fileTypeLabel", "File type")}
                      value={attachmentDraft.fileType} onValueChange={(v) => setAttachmentDraft((p) => ({ ...p, fileType: v }))}
                      options={[{ value: "pdf", label: "PDF" }, { value: "image", label: "Image" }, { value: "document", label: "Document" }, { value: "link", label: "Link" }]} />
                    <SelectField label={t("admin.news.attachments.accessLabel", "Access")}
                      value={attachmentDraft.status} onValueChange={(v) => setAttachmentDraft((p) => ({ ...p, status: v }))}
                      options={[{ value: "public", label: t("admin.news.attachments.access.public", "Public") }, { value: "event_locked", label: t("admin.news.attachments.access.eventLocked", "Event locked") }]} />
                    <FieldTextarea label={t("admin.news.attachments.descriptionLabel", "Description")}
                      value={attachmentDraft.description} onChange={(v) => setAttachmentDraft((p) => ({ ...p, description: v }))}
                      placeholder={t("admin.news.attachments.descriptionPlaceholder", "Short description")} />
                  </div>
                  {attachmentError && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{attachmentError}</div>}
                  <div className="flex justify-end">
                    <Button type="button" size="sm" disabled={!currentId || isAttachmentPending} onClick={handleAddAttachment}>
                      {t("admin.news.attachments.add", "Add attachment")}
                    </Button>
                  </div>
                </div>
              </div>
            }
          />
        )}

        {/* ── STEP 2: SEO ── */}
        {step === 2 && (
          <SeoStep
            seoMetaTitle={watch("seoMetaTitle") ?? ""}
            onSeoMetaTitle={(v) => setValue("seoMetaTitle", v.slice(0, 120), { shouldDirty: true })}
            seoMetaDescription={watch("seoMetaDescription") ?? ""}
            onSeoMetaDescription={(v) => setValue("seoMetaDescription", v.slice(0, 220), { shouldDirty: true })}
            seoCanonicalUrl={watch("seoCanonicalUrl") ?? ""}
            onSeoCanonicalUrl={(v) => setValue("seoCanonicalUrl", v, { shouldDirty: true })}
            seoKeywords={(watch("seoKeywords") ?? []).join(", ")}
            onSeoKeywords={(v) => setValue("seoKeywords", v.split(",").map((k) => k.trim()).filter(Boolean), { shouldDirty: true })}
            seoNoIndex={Boolean(watch("seoNoIndex"))}
            seoNoIndexField={
              <Controller name="seoNoIndex" control={control}
                render={({ field }) => <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />} />
            }
            seoOgImageField={
              <Controller name="seoOgImageAssetId" control={control}
                render={({ field }) => (
                  <ImageUploader label="Social share image (OG)"
                    description="Shown on Facebook, LINE, Twitter. Best: 1200×630px."
                    onChange={(value) => field.onChange(value?.assetId ?? null)} />
                )} />
            }
            slug={watch("slug") ?? ""}
            titleFallback={watch("title") ?? ""}
            summaryFallback={""}
            pathPrefix="news"
          />
        )}

        {/* ── STEP 3: Publish ── */}
        {step === newsSteps.length - 1 ? (
          <PublishStep
            isInsight={false}
            watchValues={watch as any}
            setStep={setStep}
            onSave={() => doSubmitNews()}
            onSavePublish={() => doSubmitNews("published")}
            isPending={isPending}
            submitError={submitError}
            submitSuccess={submitSuccess}
          />
        ) : (
          <WizardFooter step={step} total={newsSteps.length} onPrev={goPrev} onNext={goNext} isSaving={isPending} />
        )}
      </form>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  WRITE STEP — unified cover photo + bilingual body editor
// ══════════════════════════════════════════════════════════════════════════════

const HERO_LAYOUTS = [
  { value: "standard",   label: "Standard"    },
  { value: "fullBleed",  label: "Full bleed"  },
  { value: "imageLeft",  label: "Left"        },
  { value: "imageRight", label: "Right"       },
  { value: "banner",     label: "Banner"      },
] as const;

const HERO_THEMES = [
  { value: "light",   label: "Light ☀️"   },
  { value: "dark",    label: "Dark 🌙"    },
  { value: "overlay", label: "Overlay 🔆" },
] as const;

type WriteStepProps = {
  heroImageAssetIdField: React.ReactNode;
  heroSettingsOpen: boolean;
  onToggleHeroSettings: () => void;
  heroAltField: React.ReactNode;
  heroCaptionField: React.ReactNode;
  heroLayout: string;
  onHeroLayout: (v: string) => void;
  heroTheme: string;
  onHeroTheme: (v: string) => void;
  titlePreview?: string;
  lang: "en" | "th";
  onLangChange: (l: "en" | "th") => void;
  bodyEnField: React.ReactNode;
  bodyThField: React.ReactNode;
  extras?: React.ReactNode;
};

function WriteStep({
  heroImageAssetIdField,
  heroSettingsOpen,
  onToggleHeroSettings,
  heroAltField,
  heroCaptionField,
  heroLayout,
  onHeroLayout,
  heroTheme,
  onHeroTheme,
  titlePreview,
  lang,
  onLangChange,
  bodyEnField,
  bodyThField,
  extras,
}: WriteStepProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">

      {/* Cover image — full-width, looks like a real document cover */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative">{heroImageAssetIdField}</div>

        {/* Collapsed settings panel */}
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onToggleHeroSettings}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <span className={`inline-block transition-transform duration-200 ${heroSettingsOpen ? "rotate-90" : ""}`}>▶</span>
            Cover image settings (alt text, layout, theme)
          </button>

          {heroSettingsOpen && (
            <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Alt text</Label>
                {heroAltField}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Caption</Label>
                {heroCaptionField}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs text-slate-500">Layout</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HERO_LAYOUTS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => onHeroLayout(opt.value)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${heroLayout === opt.value ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs text-slate-500">Text theme over image</Label>
                <div className="flex flex-wrap gap-1.5">
                  {HERO_THEMES.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => onHeroTheme(opt.value)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${heroTheme === opt.value ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Title preview — shows what the reader will see */}
      <div className="px-1">
        {titlePreview
          ? <p className="text-2xl font-bold leading-snug text-slate-900">{titlePreview}</p>
          : <p className="text-2xl font-bold leading-snug text-slate-300">Your article title goes here…</p>
        }
      </div>

      {/* Language switcher */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-2">
          {["en", "th"].map((l) => (
            <button key={l} type="button" onClick={() => onLangChange(l as "en" | "th")}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${l === lang ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>
              {l === "en" ? "🇬🇧 English" : "🇹🇭 Thai"}
            </button>
          ))}
        </div>
        {lang === "th" && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
            Left empty → English shown as fallback
          </span>
        )}
      </div>

      {/*
        rich-editor-light: forces Sanity's dark-theme editor into light mode.
        Add the CSS block at the very bottom of this file to globals.css.
      */}
      <div className="rich-editor-light overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {lang === "en" ? bodyEnField : bodyThField}
      </div>

      {/* Extras — keywords (insight) or banner + attachments (news) */}
      {extras}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SEO STEP — shared between both wizards
// ══════════════════════════════════════════════════════════════════════════════

type SeoStepProps = {
  seoMetaTitle: string;          onSeoMetaTitle: (v: string) => void;
  seoMetaDescription: string;    onSeoMetaDescription: (v: string) => void;
  seoCanonicalUrl: string;       onSeoCanonicalUrl: (v: string) => void;
  seoKeywords: string;           onSeoKeywords: (v: string) => void;
  seoNoIndex: boolean;           seoNoIndexField: React.ReactNode;
  seoOgImageField: React.ReactNode;
  slug: string;
  titleFallback: string;
  summaryFallback: string;
  pathPrefix: string;
};

function SeoStep({
  seoMetaTitle, onSeoMetaTitle,
  seoMetaDescription, onSeoMetaDescription,
  seoCanonicalUrl, onSeoCanonicalUrl,
  seoKeywords, onSeoKeywords,
  seoNoIndex, seoNoIndexField,
  seoOgImageField,
  slug, titleFallback, summaryFallback, pathPrefix,
}: SeoStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Search engine settings</p>
          <p className="text-xs text-slate-500">Leave empty and we'll fall back to the title & summary as defaults.</p>
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-slate-700">Meta title</Label>
          <Input value={seoMetaTitle} onChange={(e) => onSeoMetaTitle(e.target.value)} />
          <CharCounter value={seoMetaTitle} limit={60} />
        </div>

        <div className="space-y-1">
          <Label className="text-sm text-slate-700">Meta description</Label>
          <Textarea rows={3} value={seoMetaDescription} onChange={(e) => onSeoMetaDescription(e.target.value)} className="resize-none" />
          <CharCounter value={seoMetaDescription} limit={160} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-sm text-slate-700">Canonical URL</Label>
            <Input type="url" value={seoCanonicalUrl} onChange={(e) => onSeoCanonicalUrl(e.target.value)} placeholder="https://example.com/story" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-slate-700">Keywords</Label>
            <Input value={seoKeywords} onChange={(e) => onSeoKeywords(e.target.value)} placeholder="newsroom, retail tech, Thailand" />
            <p className="text-xs text-slate-400">Separate with commas</p>
          </div>
        </div>

        <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${seoNoIndex ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
          <div>
            <p className="text-sm font-semibold text-slate-900">🚫 Hide from Google</p>
            <p className="text-xs text-slate-500">Prevents this page from appearing in search results.</p>
          </div>
          {seoNoIndexField}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-slate-900">Social share image (OG)</p>
        {seoOgImageField}
      </div>

      {/* Live Google snippet preview */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <p className="text-xs font-medium text-slate-400">📱 Live Google preview</p>
        <p className="text-xs text-emerald-700">/{pathPrefix}/{slug.toLowerCase()}</p>
        <p className="text-[17px] leading-snug text-indigo-700">{(seoMetaTitle || titleFallback).slice(0, 70) || "Your title will appear here"}</p>
        <p className="text-[13px] leading-snug text-slate-500">{(seoMetaDescription || summaryFallback).slice(0, 180) || "Your meta description will appear here."}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PUBLISH STEP (unchanged)
// ══════════════════════════════════════════════════════════════════════════════

type PublishStepProps = {
  isInsight: boolean;
  watchValues: ReturnType<typeof useForm>["watch"];
  setStep: (s: number) => void;
  onSave: () => void;
  onSavePublish: () => void;
  isPending: boolean;
  submitError: string | null;
  submitSuccess: boolean;
};

const PublishStep = ({ isInsight, watchValues, setStep, onSave, onSavePublish, isPending, submitError, submitSuccess }: PublishStepProps) => {
  const title = (watchValues("title") as string) || "";
  const slug = (watchValues("slug") as string) || "";
  const heroImageAssetId = watchValues("heroImageAssetId");
  const seoMetaTitle = (watchValues("seoMetaTitle") as string) || "";
  const seoMetaDescription = (watchValues("seoMetaDescription") as string) || "";
  const hasBody = hasText(watchValues(isInsight ? "body" : "content"));
  const status = (watchValues("status") as string) || "draft";

  const items = [
    { label: "Title set",            done: Boolean(title.trim()),          fixStep: 0 },
    { label: "Slug set",             done: Boolean(slug.trim()),           fixStep: 0 },
    { label: "Content written",      done: hasBody,                        fixStep: 1 },
    { label: "Hero image uploaded",  done: Boolean(heroImageAssetId),      fixStep: 1 },
    { label: "SEO title set",        done: Boolean(seoMetaTitle.trim()),   fixStep: 2 },
    { label: "Meta description set", done: Boolean(seoMetaDescription.trim()), fixStep: 2 },
  ];
  const score = Math.round((items.filter((i) => i.done).length / items.length) * 100);
  const barColor = score >= 80 ? "from-emerald-500 to-emerald-400" : "from-amber-500 to-amber-400";
  const scoreColor = score >= 80 ? "text-emerald-600" : "text-amber-600";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-slate-900">Readiness checklist</p>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label} className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${item.done ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              <div className="flex items-center gap-2">
                <span>{item.done ? "✅" : "⚠️"}</span>
                <span>{item.label}</span>
              </div>
              {!item.done && (
                <Button type="button" variant="ghost" size="sm" className="text-indigo-700" onClick={() => setStep(item.fixStep)}>
                  Fix →
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
            <span>Overall completeness</span>
            <span className={scoreColor}>{score}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-indigo-200 bg-white p-4 shadow-sm">
        <div className="rounded-md bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
          {status === "published" ? "🟢 This will go live as soon as you save"
            : status === "archived" ? "📦 This will be archived"
            : "✏️ This will be saved as a draft — not visible to the public yet"}
        </div>
        {submitSuccess && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            ✅ {isInsight ? "Insight" : "Story"} saved successfully!
          </div>
        )}
        {submitError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isPending} onClick={onSave} className="shadow-md shadow-indigo-200">
            💾 Save {isInsight ? "insight" : "story"}
          </Button>
          {status === "draft" && (
            <Button type="button" variant="secondary" disabled={isPending} onClick={onSavePublish} className="shadow-md shadow-indigo-100">
              🚀 Save &amp; Publish now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  SHARED UI COMPONENTS (all unchanged from original)
// ══════════════════════════════════════════════════════════════════════════════

type WizardHeaderProps = { title: string; steps: { id: string; label: string }[]; step: number; stepErrors?: Record<string, boolean> };

const WizardHeader = ({ title, steps, step, stepErrors }: WizardHeaderProps) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">Step {step + 1} of {steps.length}</p>
      </div>
      <div className="flex items-center gap-2">
        {steps.map((item, index) => (
          <div key={item.id} className="relative">
            {stepErrors?.[item.id] && <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />}
            <Badge variant={index === step ? "default" : "secondary"}>{item.label}</Badge>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const WizardFooter = ({ step, total, onPrev, onNext, isSaving }: { step: number; total: number; onPrev: () => void; onNext: () => void; isSaving: boolean }) => (
  <div className="flex justify-between">
    <div className="flex gap-2">
      <Button type="button" variant="outline" onClick={onPrev} disabled={step === 0}>Prev</Button>
      {step < total - 1 && <Button type="button" onClick={onNext}>Next</Button>}
    </div>
    {step === total - 1 && <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save"}</Button>}
  </div>
);

const SelectField = ({ label, value, onValueChange, options, error }: { label: string; value?: string | null; onValueChange: (v: string) => void; options: { value: string; label: string }[]; error?: string }) => (
  <div className="space-y-1">
    <Label className="text-sm text-slate-700">{label}</Label>
    <Select value={value ?? ""} onValueChange={onValueChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const FieldText = ({ label, placeholder, error, type = "text", inputProps }: { label: string; placeholder?: string; error?: string; type?: string; inputProps?: ComponentProps<typeof Input> }) => (
  <div className="space-y-1">
    <Label className="text-sm text-slate-700">{label}</Label>
    <Input type={type} placeholder={placeholder} {...inputProps} className={error ? "border-red-500" : inputProps?.className} />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const FieldTextarea = ({ label, placeholder, value, onChange, error, helper }: { label: string; placeholder?: string; value?: string; onChange: (v: string) => void; error?: string; helper?: string }) => (
  <div className="space-y-1">
    <Label className="text-sm text-slate-700">{label}</Label>
    <Textarea rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={error ? "border-red-500" : undefined} />
    <div className="flex items-center justify-between">
      {error ? <p className="text-xs text-red-600">{error}</p> : <span />}
      {helper && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  </div>
);

const CharCounter = ({ value, limit }: { value: string; limit: number }) => (
  <p className={`text-xs ${value.length > limit ? "text-red-600" : "text-slate-500"}`}>{value.length}/{limit}</p>
);

const OptionCardGrid = ({ label, options, value, onChange, columns = 2 }: { label: string; options: { value: string; label: string; icon?: string; hint?: string }[]; value?: string | null; onChange: (v: string) => void; columns?: 2 | 3 | 4 }) => (
  <div className="space-y-2">
    <Label className="text-sm text-slate-700">{label}</Label>
    <div className={`grid gap-2 ${{ 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" }[columns]}`}>
      {options.map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
          className={`flex h-full w-full flex-col items-start gap-1 rounded-lg border p-3 text-left shadow-sm transition hover:shadow-md ${value === opt.value ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"}`}>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {opt.icon && <span className="text-lg">{opt.icon}</span>}
              <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
            </div>
            {value === opt.value && <span className="text-indigo-600">✓</span>}
          </div>
          {opt.hint && <p className="text-xs text-slate-600">{opt.hint}</p>}
        </button>
      ))}
    </div>
  </div>
);

const LocaleToggle = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-2">
    <Label className="mr-2 text-sm text-slate-700">Locale</Label>
    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
      {[{ code: "en", label: "EN 🇬🇧" }, { code: "th", label: "TH 🇹🇭" }].map((opt) => (
        <button key={opt.code} type="button" onClick={() => onChange(opt.code)}
          className={`rounded px-3 py-1 text-sm transition ${value === opt.code ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

const SlugField = ({ label, placeholder, value, onChange, onReset, error, registerProps }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; onReset: () => void; error?: string; registerProps?: ComponentProps<typeof Input> }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label className="text-sm text-slate-700">{label}</Label>
      <Button type="button" variant="ghost" size="sm" onClick={onReset}>Reset</Button>
    </div>
    <Input value={value} placeholder={placeholder} {...registerProps}
      onChange={(e) => { registerProps?.onChange?.(e); onChange(e.target.value); }}
      className={error ? "border-red-500" : undefined} />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
);

const fileTypeIcon = (fileType?: string) => ({ pdf: "📄", image: "🖼️", document: "📑", link: "🔗" }[fileType ?? ""] ?? "📁");

function KeywordDifficultyHint({ value }: { value?: number | null }) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  if (n < 30) return <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">🟢 Great difficulty — very achievable to rank</p>;
  if (n <= 60) return <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700">🟡 Moderate — achievable with good content</p>;
  return <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">🔴 High difficulty — you'll need strong domain authority</p>;
}

/*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ADD THIS BLOCK TO globals.css   (src/app/globals.css or src/styles/globals.css)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Forces Sanity's dark-theme RichContentEditor into light mode at the DOM level.
  No changes to RichContentEditor itself are needed.

.rich-editor-light [data-ui="Card"],
.rich-editor-light [class*="sc-"],
.rich-editor-light [data-scheme="dark"],
.rich-editor-light [data-tone="default"] {
  --card-bg-color:             #ffffff !important;
  --card-border-color:         #e5e7eb !important;
  --card-fg-color:             #111827 !important;
  --card-muted-fg-color:       #6b7280 !important;
  --card-hairline-soft-color:  #f3f4f6 !important;
  --card-hairline-hard-color:  #e5e7eb !important;
  color-scheme: light !important;
  background-color: #ffffff !important;
  color: #111827 !important;
}

.rich-editor-light [data-ui="TextInput"],
.rich-editor-light [role="textbox"],
.rich-editor-light .ProseMirror,
.rich-editor-light [contenteditable="true"] {
  background-color: #ffffff !important;
  color: #111827 !important;
  caret-color: #4f46e5 !important;
}

.rich-editor-light [data-ui="Button"],
.rich-editor-light button[data-selected="false"] {
  background-color: transparent !important;
  color: #374151 !important;
}

.rich-editor-light [data-ui="Button"]:hover,
.rich-editor-light button:hover {
  background-color: #f3f4f6 !important;
}

.rich-editor-light [data-ui="Popover"],
.rich-editor-light [data-ui="Menu"] {
  background-color: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08) !important;
  color: #111827 !important;
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
*/
