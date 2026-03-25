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
import { createContext, useCallback, useEffect, useMemo, useRef, useState, useTransition, type ComponentProps, type MutableRefObject } from "react";
import { Info, Pencil } from "lucide-react";
import { Controller, useForm, useWatch, type FieldValues, type UseFormWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DocEditor } from "./content/DocEditor";
import { hasContent as hasLocaleContent, hasPortableTextContent } from "./content/localeContent";
import { ImageUploader } from "@/components/admin/backoffice/ImageUploader";
import { ReferencePicker, type ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import UnsavedChangesModal from "@/components/admin/backoffice/UnsavedChangesModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resetUnsavedChangesState, useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { normalizeLocaleCode } from "@/lib/i18n/normalizeLocale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { LastSavedIndicator } from "@/components/LastSavedIndicator";
import { useAutosave } from "@/hooks/useAutosave";
import type { InsightFormState, InsightReferenceOption } from "./insights/types";
import type { NewsFormState, NewsAttachment } from "./news/types";
import type { PortableTextBlock } from "@/types/portableText";

type SubmitResult = { success: boolean; id?: string; status?: string; message?: string };

type WriteDirtyContextValue = {
  isDirty: boolean;
  markSaved: (snapshot?: unknown) => void;
  restoreSaved: () => unknown;
};
const WriteDirtyContext = createContext<WriteDirtyContextValue | null>(null);

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

const COVER_DISABLED_MESSAGE = "Upload an image first to configure these settings.";
const AUTOSAVE_STORAGE_PREFIX = "autosave:ncs-ecom";

// Tracks dirty state for the Write step (body + cover settings).
function useWriteDirtyTracker<T>(values: T) {
  const [isDirty, setIsDirty] = useState(false);
  const savedRef = useRef<string>(JSON.stringify(values));
  const latestRef = useRef(values);

  useEffect(() => {
    latestRef.current = values;
    const serialized = JSON.stringify(values);
    if (!savedRef.current) savedRef.current = serialized;
    setIsDirty(serialized !== savedRef.current);
  }, [values]);

  const markSaved = useCallback((snapshot?: T) => {
    const nextSnapshot = snapshot ?? latestRef.current;
    savedRef.current = JSON.stringify(nextSnapshot);
    setIsDirty(false);
  }, []);

  const restoreSaved = useCallback(() => {
    try {
      return JSON.parse(savedRef.current) as T;
    } catch {
      return values;
    }
  }, [values]);

  return { isDirty, markSaved, restoreSaved, latest: () => latestRef.current };
}

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
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [writeLang, setWriteLang] = useState<"en" | "th">("en");
  const pendingStepRef = useRef<number | null>(null);
  const [coverSettingsOpen, setCoverSettingsOpen] = useState(
    Boolean(
      initialValues?.heroImageAssetId ||
      initialValues?.heroImageAlt ||
      initialValues?.heroImageCaption
    ),
  );
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
  const initialInsightId = initialValues?._id;
  const insightDefaults = useMemo<InsightFormState>(
    () => ({
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
      primaryKeywordTh: initialValues?.primaryKeywordTh ?? "",
      primaryKeywordVolume: initialValues?.primaryKeywordVolume ?? null,
      primaryKeywordDifficulty: initialValues?.primaryKeywordDifficulty ?? null,
      heroImageAssetId: initialValues?.heroImageAssetId ?? null,
      heroImageAlt: initialValues?.heroImageAlt ?? "",
      heroImageCaption: initialValues?.heroImageCaption ?? "",
      heroLayout: initialValues?.heroLayout ?? "standard",
      heroTheme: initialValues?.heroTheme ?? "light",
      publishAsBanner: initialValues?.publishAsBanner ?? false,
      bannerSettings: initialValues?.bannerSettings,
    }),
    [currentLocale, initialValues],
  );

  const { control, register, handleSubmit, watch, setValue, trigger, setError, clearErrors, reset, formState: { errors } } =
    useForm<InsightFormState>({
      mode: "onBlur",
      // Keep form values when swapping editor instances (language tabs).
      shouldUnregister: false,
      defaultValues: insightDefaults,
    });

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const focusTitleNextRef = useRef(false);
  const titleRegister = register("title", { required: t("admin.content.insights.form.errors.titleRequired", "Required") });
  const setTitleInputRef = useCallback((node: HTMLInputElement | null) => {
    titleInputRef.current = node;
    if (typeof titleRegister.ref === "function") {
      titleRegister.ref(node);
    } else if (titleRegister.ref) {
      (titleRegister.ref as MutableRefObject<HTMLInputElement | null>).current = node;
    }
  }, [titleRegister.ref]);
  const monthlySearchesErrorMessage = "Must be a positive whole number";
  const difficultyErrorMessage = "Must be a number between 0 and 100";

  const [primaryKeywordValue, setPrimaryKeywordValue] = useState(initialValues?.primaryKeyword ?? "");
  const [monthlySearchesValue, setMonthlySearchesValue] = useState(
    initialValues?.primaryKeywordVolume != null ? String(initialValues.primaryKeywordVolume) : "",
  );
  const [monthlySearchesError, setMonthlySearchesError] = useState<string | null>(null);
  const [difficultyValue, setDifficultyValue] = useState(
    initialValues?.primaryKeywordDifficulty != null ? String(initialValues.primaryKeywordDifficulty) : "",
  );
  const [difficultyError, setDifficultyError] = useState<string | null>(null);

  const validateDifficultyValue = useCallback(
    (raw: string, showError = true): { valid: boolean; parsed: number | null } => {
      if (raw === "") {
        if (showError) setDifficultyError(null);
        clearErrors("primaryKeywordDifficulty");
        return { valid: true, parsed: null };
      }
      const parsed = Number(raw);
      const valid = /^-?\d+$/.test(raw) && Number.isInteger(parsed) && parsed >= 0 && parsed <= 100;
      if (!valid) {
        if (showError) setDifficultyError(difficultyErrorMessage);
        setError("primaryKeywordDifficulty", { type: "manual", message: difficultyErrorMessage });
        return { valid: false, parsed: null };
      }
      if (showError) setDifficultyError(null);
      clearErrors("primaryKeywordDifficulty");
      return { valid: true, parsed };
    },
    [clearErrors, difficultyErrorMessage, setError],
  );

  const validateMonthlySearchesValue = useCallback(
    (raw: string, showError = true): { valid: boolean; parsed: number | null } => {
      const parsed = Number(raw);
      const valid = /^\d+$/.test(raw) && Number.isInteger(parsed) && parsed > 0;
      if (!valid) {
        if (showError) setMonthlySearchesError(monthlySearchesErrorMessage);
        setError("primaryKeywordVolume", { type: "manual", message: monthlySearchesErrorMessage });
        return { valid: false, parsed: null };
      }
      if (showError) setMonthlySearchesError(null);
      clearErrors("primaryKeywordVolume");
      return { valid: true, parsed };
    },
    [clearErrors, monthlySearchesErrorMessage, setError],
  );

  const title = watch("title");
  const slug = watch("slug");
  const slugRegister = register("slug", { required: t("admin.content.insights.form.errors.slugRequired", "Required") });
  const locale = watch("locale");
  const status = watch("status");
  const insightType = watch("insightType");
  const titleTh = watch("titleTh") || "";
  const summaryValue = watch("summary") || "";
  const summaryThValue = watch("summaryTh") || "";
  const bodyValue = watch("body") as PortableTextBlock[] | undefined;
  const bodyThValue = watch("bodyTh") as PortableTextBlock[] | undefined;
  const bodyRequiredMessage = t(
    "admin.content.insights.form.errors.bodyRequired",
    "กรุณากรอกเนื้อหาก่อนดำเนินการต่อ / Body content is required before proceeding",
  );
  const [writeStepError, setWriteStepError] = useState<string | null>(null);
  const heroImageAssetId = watch("heroImageAssetId");
  const heroImageAlt = watch("heroImageAlt") ?? "";
  const heroAltLength = heroImageAlt.length;
  const heroAltTooLong = heroAltLength > 125;
  const heroImageCaption = watch("heroImageCaption") ?? "";
  const heroLayoutValue = watch("heroLayout") ?? "standard";
  const heroThemeValue = watch("heroTheme") ?? "light";
  const primaryKeywordVolumeValue = watch("primaryKeywordVolume");
  const hasHeroImage = Boolean(heroImageAssetId);
  const previousHeroImageId = useRef<string | null>(initialValues?.heroImageAssetId ?? null);
  type InsightWriteSnapshot = {
    body: PortableTextBlock[] | undefined;
    bodyTh: PortableTextBlock[] | undefined;
    heroImageAssetId: string | null | undefined;
    heroImageAlt: string;
    heroImageCaption: string;
    heroLayout: string;
    heroTheme: string;
  };
  const writeSnapshot = useMemo<InsightWriteSnapshot>(
    () => ({
      body: bodyValue,
      bodyTh: bodyThValue,
      heroImageAssetId,
      heroImageAlt,
      heroImageCaption,
      heroLayout: heroLayoutValue,
      heroTheme: heroThemeValue,
    }),
    [bodyValue, bodyThValue, heroImageAssetId, heroImageAlt, heroImageCaption, heroLayoutValue, heroThemeValue],
  );
  const writeDirty = useWriteDirtyTracker(writeSnapshot);
  const toInsightWriteSnapshot = useCallback(
    (values: Partial<InsightFormState>): InsightWriteSnapshot => ({
      body: values.body as PortableTextBlock[] | undefined,
      bodyTh: values.bodyTh as PortableTextBlock[] | undefined,
      heroImageAssetId: (values.heroImageAssetId as string | null | undefined) ?? null,
      heroImageAlt: (values.heroImageAlt as string | undefined) ?? "",
      heroImageCaption: (values.heroImageCaption as string | undefined) ?? "",
      heroLayout: (values.heroLayout as string | undefined) ?? "standard",
      heroTheme: (values.heroTheme as string | undefined) ?? "light",
    }),
    [],
  );
  const autosaveStorageKey = useMemo(
    () => `${AUTOSAVE_STORAGE_PREFIX}:insight:${initialInsightId ?? "new"}`,
    [initialInsightId],
  );
  const autosaveValues = useWatch({ control }) as InsightFormState;
  const hasRestoredDraftRef = useRef(false);
  const lastInitializedInsightIdRef = useRef<string | null | undefined>(undefined);

  const resetInsightDraftState = useCallback(() => {
    const nextAuthorOption = initialAuthor
      ? { id: initialAuthor.id, label: initialAuthor.label, description: initialAuthor.description }
      : null;
    const nextCategoryOption = initialPrimaryCategory
      ? { id: initialPrimaryCategory.id, label: initialPrimaryCategory.label, description: initialPrimaryCategory.description }
      : null;

    setStep(0);
    setWriteLang("en");
    setCoverSettingsOpen(Boolean(
      initialValues?.heroImageAssetId ||
      initialValues?.heroImageAlt ||
      initialValues?.heroImageCaption
    ));
    setAuthorOption(nextAuthorOption);
    setCategoryOption(nextCategoryOption);
    setPrimaryKeywordValue(initialValues?.primaryKeyword ?? "");
    setMonthlySearchesValue(
      initialValues?.primaryKeywordVolume != null ? String(initialValues.primaryKeywordVolume) : "",
    );
    setDifficultyValue(
      initialValues?.primaryKeywordDifficulty != null ? String(initialValues.primaryKeywordDifficulty) : "",
    );
    setMonthlySearchesError(null);
    setDifficultyError(null);
    slugDirtyRef.current = Boolean(initialValues?.slug);
    previousHeroImageId.current = initialValues?.heroImageAssetId ?? null;

    reset(insightDefaults, { keepDefaultValues: true, keepDirty: false });
    writeDirty.markSaved(toInsightWriteSnapshot(insightDefaults));
    resetUnsavedChangesState();

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${AUTOSAVE_STORAGE_PREFIX}:insight:new`);
      if (!initialInsightId) {
        window.localStorage.removeItem(autosaveStorageKey);
      }
    }

    hasRestoredDraftRef.current = !initialInsightId;
  }, [
    autosaveStorageKey,
    initialAuthor,
    initialInsightId,
    initialPrimaryCategory,
    initialValues,
    insightDefaults,
    reset,
    toInsightWriteSnapshot,
    writeDirty.markSaved,
    resetUnsavedChangesState,
  ]);

  useEffect(() => {
    const currentId = initialInsightId ?? null;
    if (lastInitializedInsightIdRef.current === currentId) return;
    resetInsightDraftState();
    lastInitializedInsightIdRef.current = currentId;
  }, [initialInsightId, resetInsightDraftState]);

  useEffect(() => {
    if (hasRestoredDraftRef.current) return;
    if (typeof window === "undefined") return;
    if (initialInsightId) return;
    const saved = window.localStorage.getItem(autosaveStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<InsightFormState> & { __autosavedAt?: string };
      const draft = { ...parsed };
      delete (draft as { __autosavedAt?: string }).__autosavedAt;
      const current = watch();
      const merged = { ...current, ...draft };
      reset(merged, { keepDefaultValues: true, keepDirty: false });
      writeDirty.markSaved(toInsightWriteSnapshot(merged));
      hasRestoredDraftRef.current = true;
    } catch (error) {
      console.error("Failed to restore insight autosave draft", error);
    }
  }, [autosaveStorageKey, initialInsightId, reset, toInsightWriteSnapshot, watch, writeDirty]);
  const cleanupHeroSettings = useCallback(() => {
    if (heroImageAlt) setValue("heroImageAlt", "", { shouldDirty: true });
    if (heroImageCaption) setValue("heroImageCaption", "", { shouldDirty: true });
    if (heroLayoutValue !== "standard") setValue("heroLayout", "standard" as InsightFormState["heroLayout"], { shouldDirty: true });
    if (heroThemeValue !== "light") setValue("heroTheme", "light" as InsightFormState["heroTheme"], { shouldDirty: true });
  }, [heroImageAlt, heroImageCaption, heroLayoutValue, heroThemeValue, setValue]);

  useEffect(() => {
    if (slugDirtyRef.current) return;
    if (title) setValue("slug", slugify(title), { shouldDirty: true });
  }, [title, setValue]);

  useEffect(() => {
    if (hasHeroImage) {
      previousHeroImageId.current = heroImageAssetId ?? null;
      return;
    }

    const hasOrphanedSettings =
      Boolean(heroImageAlt || heroImageCaption) ||
      heroLayoutValue !== "standard" ||
      heroThemeValue !== "light";

    if (previousHeroImageId.current || hasOrphanedSettings) {
      cleanupHeroSettings();
      setCoverSettingsOpen(false);
    }

    previousHeroImageId.current = heroImageAssetId ?? null;
  }, [hasHeroImage, heroImageAssetId, heroImageAlt, heroImageCaption, heroLayoutValue, heroThemeValue, cleanupHeroSettings, setCoverSettingsOpen]);

  const localeHasContent = useCallback(
    (locale: "en" | "th") => {
      const fields = locale === "en"
        ? { title, body: bodyValue }
        : { title: titleTh, body: bodyThValue };
      return hasLocaleContent(fields);
    },
    [bodyThValue, bodyValue, title, titleTh],
  );

  useEffect(() => {
    if (writeStepError && hasPortableTextContent(bodyValue)) {
      setWriteStepError(null);
      clearErrors("body");
    }
  }, [bodyValue, clearErrors, writeStepError]);

  const ensureBodyContent = useCallback(() => {
    const hasBody = hasPortableTextContent(bodyValue);
    if (hasBody) {
      setWriteStepError(null);
      clearErrors("body");
      return true;
    }
    setWriteStepError(bodyRequiredMessage);
    setError("body", { type: "manual", message: bodyRequiredMessage });
    return false;
  }, [bodyRequiredMessage, bodyValue, clearErrors, setError]);

  const isEditing = Boolean(initialInsightId);

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
      fields: ["body", "heroImageAssetId", "primaryKeywordVolume"] as (keyof InsightFormState)[],
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

  const confirmMissingLocaleContent = useCallback((stepToCheck?: number) => {
    const currentStep = typeof stepToCheck === "number" ? stepToCheck : step;
    if (currentStep !== 1) return true;
    const inactiveLocale = writeLang === "en" ? "th" : "en";
    if (localeHasContent(inactiveLocale)) return true;
    const localeLabel = inactiveLocale === "th" ? "Thai" : "English";
    return window.confirm(`${localeLabel} content is empty. Are you sure you want to continue?`);
  }, [localeHasContent, step, writeLang]);

  const [navSaving, setNavSaving] = useState(false);
  const {
    isDirty,
    modalOpen,
    markDirty,
    markClean,
    confirmNavigation,
    runPendingNavigation,
    cancelPendingNavigation,
    closeModal,
  } = useUnsavedChanges();

  useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (writeDirty.isDirty) {
      markDirty();
    } else {
      markClean();
    }
  }, [markClean, markDirty, writeDirty.isDirty]);

  const guardDirty = (targetStep: number) => {
    if (!writeDirty.isDirty || targetStep === step) return false;
    pendingStepRef.current = targetStep;
    confirmNavigation(() => {
      pendingStepRef.current = null;
      setStep(targetStep);
    });
    return true;
  };

  const validateSeoKeywordFields = () => {
    const volumeValid = validateMonthlySearchesValue(monthlySearchesValue, true).valid;
    const difficultyValid = validateDifficultyValue(difficultyValue, true).valid;
    return volumeValid && difficultyValid;
  };

  const validateInsightStep = async (currentStep: number, targetStep: number) => {
    if (currentStep === 1 && !ensureBodyContent()) return false;
    const ok = await trigger(insightSteps[currentStep].fields);
    if (!ok) return false;
    if (currentStep === 1 && !validateSeoKeywordFields()) return false;
    if (currentStep === 1 && targetStep > currentStep && !confirmMissingLocaleContent(currentStep)) return false;
    return true;
  };

  const bodyHasContent = hasPortableTextContent(bodyValue);
  const essentialsComplete = Boolean((title || "").trim()) && Boolean((slug || "").trim());
  const primaryKeywordVolumeValid =
    typeof primaryKeywordVolumeValue === "number" && Number.isFinite(primaryKeywordVolumeValue) && primaryKeywordVolumeValue > 0;

  const seoStepBlockedReason = !essentialsComplete
    ? t("admin.content.insights.form.errors.essentialsIncomplete", "Complete Essentials first")
    : !bodyHasContent
      ? bodyRequiredMessage
      : !primaryKeywordVolumeValid
        ? monthlySearchesErrorMessage
        : null;

  const focusPrerequisiteStep = useCallback(async () => {
    if (!essentialsComplete) {
      setStep(0);
      await trigger(insightSteps[0].fields);
      return;
    }
    setStep(1);
    ensureBodyContent();
    if (!primaryKeywordVolumeValid) {
      setMonthlySearchesError(monthlySearchesErrorMessage);
      setError("primaryKeywordVolume", { type: "manual", message: monthlySearchesErrorMessage });
    }
  }, [
    ensureBodyContent,
    essentialsComplete,
    insightSteps,
    monthlySearchesErrorMessage,
    primaryKeywordVolumeValid,
    setError,
    setMonthlySearchesError,
    trigger,
  ]);

  const insightStepGuards = useMemo(
    () => ({
      seo: seoStepBlockedReason ? { disabled: true, reason: seoStepBlockedReason, onBlocked: focusPrerequisiteStep } : undefined,
      publish: seoStepBlockedReason ? { disabled: true, reason: seoStepBlockedReason, onBlocked: focusPrerequisiteStep } : undefined,
    }),
    [focusPrerequisiteStep, seoStepBlockedReason],
  );

  const goNext = async () => {
    const target = Math.min(step + 1, insightSteps.length - 1);
    const ok = await validateInsightStep(step, target);
    if (!ok) return;
    if (guardDirty(target)) return;
    setStep(target);
  };
  const goPrev = () => {
    const target = Math.max(step - 1, 0);
    if (guardDirty(target)) return;
    setStep(target);
  };
  const handleStepChange = async (target: number) => {
    const next = Math.min(Math.max(target, 0), insightSteps.length - 1);
    if (next === step) return;
    // Validate all steps up to the requested one; backward jumps are always allowed.
    if (next > step) {
      for (let i = step; i < next; i += 1) {
        const ok = await validateInsightStep(i, next);
        if (!ok) {
          if (i !== step) setStep(i);
          return;
        }
      }
    }
    if (guardDirty(next)) return;
    setStep(next);
  };

  useEffect(() => {
    if (step !== 0 || !focusTitleNextRef.current) return;
    focusTitleNextRef.current = false;
    requestAnimationFrame(() => {
      const node = titleInputRef.current;
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.focus({ preventScroll: true });
    });
  }, [step]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const normalizeNumericField = (value?: number | null) =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  const restoreWriteValues = useCallback(() => {
    const saved = writeDirty.restoreSaved();
    const snapshot = saved as InsightWriteSnapshot;
    setValue("body", snapshot.body ?? [], { shouldDirty: false });
    setValue("bodyTh", snapshot.bodyTh ?? [], { shouldDirty: false });
    setValue("heroImageAssetId", (snapshot.heroImageAssetId ?? null) as InsightFormState["heroImageAssetId"], { shouldDirty: false });
    setValue("heroImageAlt", snapshot.heroImageAlt ?? "", { shouldDirty: false });
    setValue("heroImageCaption", snapshot.heroImageCaption ?? "", { shouldDirty: false });
    setValue("heroLayout", (snapshot.heroLayout ?? "standard") as InsightFormState["heroLayout"], { shouldDirty: false });
    setValue("heroTheme", (snapshot.heroTheme ?? "light") as InsightFormState["heroTheme"], { shouldDirty: false });
    return snapshot;
  }, [setValue, writeDirty]);

  const insightAutosaveFn = useCallback(async (draft: InsightFormState) => {
    const autosavedAt = new Date().toISOString();
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          autosaveStorageKey,
          JSON.stringify({ ...draft, __autosavedAt: autosavedAt }),
        );
      }
    } catch (error) {
      console.error("Autosave (insight) localStorage failed", error);
    }

    const snapshot = toInsightWriteSnapshot(draft);
    const titleValue = (draft.title ?? "").trim();
    const slugValue = (draft.slug || slugify(titleValue)).trim();
    const keywordVolume =
      typeof draft.primaryKeywordVolume === "number" && Number.isFinite(draft.primaryKeywordVolume)
        ? draft.primaryKeywordVolume
        : null;
    const keywordDifficulty =
      typeof draft.primaryKeywordDifficulty === "number" && Number.isFinite(draft.primaryKeywordDifficulty)
        ? draft.primaryKeywordDifficulty
        : null;

    const canSyncWithServer =
      Boolean(draft._id) ||
      (Boolean(titleValue) && Boolean(slugValue) && typeof keywordVolume === "number" && keywordVolume > 0);

    if (!canSyncWithServer) {
      writeDirty.markSaved(snapshot);
      return;
    }

    const payload: InsightFormState = {
      ...draft,
      title: titleValue,
      slug: slugValue,
      locale: draft.locale || currentLocale,
      status: draft.status ?? "draft",
      primaryKeywordVolume: keywordVolume,
      primaryKeywordDifficulty: keywordDifficulty,
    };

    const result = await onSubmit(payload);
    if (!result?.success) {
      throw new Error(result?.message ?? "Autosave failed");
    }

    if (result.id && !draft._id) {
      setValue("_id", result.id, { shouldDirty: false });
    }

    writeDirty.markSaved(snapshot);
  }, [autosaveStorageKey, currentLocale, onSubmit, setValue, toInsightWriteSnapshot, writeDirty]);

  const { lastSavedAt: autosaveLastSavedAt, isSaving: isAutosaving, saveStatus: autosaveStatus } =
    useAutosave(autosaveValues, insightAutosaveFn);

  const doSubmit = (overrideStatus?: InsightFormState["status"]) => {
    if (!hasHeroImage) {
      cleanupHeroSettings();
      setCoverSettingsOpen(false);
    }

    return new Promise<boolean>((resolve) => handleSubmit((values) => {
      setSubmitError(null);
      const payload: InsightFormState = {
        ...values,
        status: overrideStatus ?? values.status,
        slug: (values.slug || slugify(values.title || "")).trim(),
        locale: values.locale || currentLocale,
        primaryKeywordVolume: normalizeNumericField(values.primaryKeywordVolume),
        primaryKeywordDifficulty: normalizeNumericField(values.primaryKeywordDifficulty),
      };
      startTransition(() => {
        onSubmit(payload)
          .then((result) => {
            const ok = typeof result === "object" ? result.success : true;
            if (!ok) {
              setSubmitError(result?.message ?? t("admin.content.insights.form.errors.saveFailed", "Unable to save insight."));
              resolve(false);
              return;
            }
            writeDirty.markSaved();
            markClean();
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
            resolve(true);
          })
          .catch((err) => {
            console.error("saveInsight failed", err);
            setSubmitError(t("admin.content.insights.form.errors.saveFailedToast", "Save failed."));
            resolve(false);
          });
      });
    }, () => Promise.resolve(resolve(false)))());
  };

  const handleDiscard = () => {
    const restored = restoreWriteValues();
    writeDirty.markSaved(restored);
    markClean();
    runPendingNavigation();
    closeModal();
    if (pendingStepRef.current != null) {
      setStep(pendingStepRef.current);
      pendingStepRef.current = null;
    }
    resetUnsavedChangesState();
  };

  const handleSaveAndContinue = async () => {
    if (navSaving) return;
    setNavSaving(true);
    const ok = await doSubmit();
    setNavSaving(false);
    if (!ok) return;
    markClean();
    runPendingNavigation();
    closeModal();
    resetUnsavedChangesState();
  };

  const handleCancelDirty = () => {
    cancelPendingNavigation();
  };

  const handleEditTitleInEssentials = () => {
    focusTitleNextRef.current = true;
    if (guardDirty(0)) return;
    setStep(0);
  };

  return (
    <WriteDirtyContext.Provider value={{
      isDirty: writeDirty.isDirty,
      markSaved: writeDirty.markSaved,
      restoreSaved: restoreWriteValues,
    }}>
      <div className="space-y-4">
      <WizardHeader
        title={isEditing ? t("admin.content.insights.form.editTitle", "Edit Insight") : t("admin.content.insights.form.newTitle", "Create insight")}
        stepLabel={isEditing ? t("admin.content.insights.form.editingLabel", "แก้ไข") : undefined}
        steps={insightSteps}
        stepGuards={insightStepGuards}
        step={step}
        stepErrors={{ essentials: Boolean(errors.title || errors.slug) }}
        lastSavedAt={autosaveLastSavedAt}
        isSaving={isAutosaving}
        saveStatus={autosaveStatus}
        onStepChange={handleStepChange}
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
                inputProps={{ ...titleRegister, ref: setTitleInputRef }}
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
            hasHeroImage={hasHeroImage}
            heroSettingsOpen={coverSettingsOpen}
            onHeroSettingsOpenChange={setCoverSettingsOpen}
            heroAltField={
              <div className="space-y-1">
                <Input
                  {...register("heroImageAlt")}
                  disabled={!hasHeroImage}
                  aria-disabled={!hasHeroImage}
                  title={!hasHeroImage ? COVER_DISABLED_MESSAGE : undefined}
                  placeholder="Describe the image for screen readers"
                  className={`h-8 text-sm ${!hasHeroImage ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
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
            }
            heroCaptionField={
              <Input
                {...register("heroImageCaption")}
                disabled={!hasHeroImage}
                aria-disabled={!hasHeroImage}
                title={!hasHeroImage ? COVER_DISABLED_MESSAGE : undefined}
                placeholder="Optional visible caption below the image"
                className={`h-8 text-sm ${!hasHeroImage ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
              />
            }
            heroLayout={heroLayoutValue}
            onHeroLayout={(v) => setValue("heroLayout", v as InsightFormState["heroLayout"], { shouldDirty: true })}
            heroTheme={heroThemeValue}
            onHeroTheme={(v) => setValue("heroTheme", v as InsightFormState["heroTheme"], { shouldDirty: true })}
            /* Document header */
            title={title}
            onTitleChange={(v) => setValue("title", v, { shouldDirty: true, shouldValidate: true })}
            titleMaxLength={200}
            onEditEssentials={handleEditTitleInEssentials}
            /* Language switcher */
            lang={writeLang}
            onLangChange={setWriteLang}
            localeHasContent={localeHasContent}
            /* Body editors */
            bodyEnField={
              <Controller
                name="body"
                control={control}
                rules={{
                  validate: (v) =>
                    hasPortableTextContent(v as unknown as PortableTextBlock[]) ||
                    bodyRequiredMessage,
                }}
                render={({ field, fieldState }) => (
                  <DocEditor
                    key={`doc-${initialInsightId ?? "new"}-en`}
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    locale="en"
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
                    key={`doc-${initialInsightId ?? "new"}-th`}
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    locale="th"
                  />
                )}
              />
            }
            validationError={writeStepError}
            /* Insight extras */
            extras={
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">SEO keywords</p>
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-sm text-slate-700">Primary keyword</Label>
                    <div className="relative pb-4">
                      <Input
                        type="text"
                        placeholder="e.g. retail media platform"
                        value={primaryKeywordValue}
                        onChange={(e) => {
                          const limited = e.target.value.slice(0, 60);
                          setPrimaryKeywordValue(limited);
                          setValue("primaryKeyword", limited, { shouldDirty: true });
                        }}
                      />
                      <span className={`pointer-events-none absolute right-2 -bottom-1 text-xs ${primaryKeywordValue.length >= 50 ? "text-red-500" : "text-gray-400"}`}>
                        {primaryKeywordValue.length}/60
                      </span>
                    </div>
                  </div>
                  <FieldText
                    label="Primary keyword (TH)"
                    placeholder="e.g. ระบบบริหารสต็อก"
                    inputProps={{
                      value: watch("primaryKeywordTh") ?? "",
                      onChange: (e) =>
                        setValue("primaryKeywordTh", e.target.value, { shouldDirty: true }),
                    }}
                  />
                  <Controller
                    name="primaryKeywordVolume"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (value == null) return monthlySearchesErrorMessage;
                        if (!Number.isInteger(value) || value <= 0) return monthlySearchesErrorMessage;
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-sm text-slate-700">Monthly searches</Label>
                        <Input
                          ref={field.ref}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          value={monthlySearchesValue}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setMonthlySearchesValue(raw);
                            const { parsed } = validateMonthlySearchesValue(raw, true);
                            field.onChange(parsed);
                          }}
                          onBlur={(e) => {
                            field.onBlur();
                            const { parsed } = validateMonthlySearchesValue(e.target.value, true);
                            field.onChange(parsed);
                          }}
                          onKeyDown={(e) => {
                            if ([".", "e", "E", "-", "+"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                        />
                        {monthlySearchesError && <p className="text-xs text-red-500">{monthlySearchesError}</p>}
                      </div>
                    )}
                  />
                  <Controller
                    name="primaryKeywordDifficulty"
                    control={control}
                    rules={{
                      validate: (value) => {
                        if (value == null) return true;
                        if (!Number.isInteger(value) || value < 0 || value > 100) return difficultyErrorMessage;
                        return true;
                      },
                    }}
                    render={({ field }) => (
                      <div className="space-y-1">
                        <Label className="text-sm text-slate-700">Difficulty 0–100</Label>
                        <Input
                          ref={field.ref}
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={difficultyValue}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setDifficultyValue(raw);
                            const { parsed } = validateDifficultyValue(raw, true);
                            field.onChange(parsed);
                          }}
                          onBlur={(e) => {
                            field.onBlur();
                            const { parsed } = validateDifficultyValue(e.target.value, true);
                            field.onChange(parsed);
                          }}
                        />
                        {difficultyError && <p className="text-xs text-red-500">{difficultyError}</p>}
                      </div>
                    )}
                  />
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
          <PublishStep<InsightFormState>
            isInsight
            watchValues={watch}
            setStep={(target) => {
              if (guardDirty(target)) return;
              setStep(target);
            }}
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
      <UnsavedChangesModal
        isOpen={modalOpen}
        onDiscard={handleDiscard}
        onSave={handleSaveAndContinue}
        onCancel={handleCancelDirty}
        isSaving={navSaving}
      />
    </div>
    </WriteDirtyContext.Provider>
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
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [writeLang, setWriteLang] = useState<"en" | "th">("en");
  const pendingStepRef = useRef<number | null>(null);
  const [coverSettingsOpen, setCoverSettingsOpen] = useState(
    Boolean(
      initialValues?.heroImageAssetId ||
      initialValues?.heroImageAlt ||
      initialValues?.heroImageCaption
    ),
  );
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
  const initialNewsId = initialValues?._id;

  const { control, register, handleSubmit, watch, setValue, trigger, reset, formState: { errors } } =
    useForm<NewsFormState>({
      mode: "onBlur",
      // Preserve both language drafts when toggling the editor tab.
      shouldUnregister: false,
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

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const focusTitleNextRef = useRef(false);
  const titleRegister = register("title", { required: t("admin.news.errors.titleRequired", "Required") });
  const setTitleInputRef = useCallback((node: HTMLInputElement | null) => {
    titleInputRef.current = node;
    if (typeof titleRegister.ref === "function") {
      titleRegister.ref(node);
    } else if (titleRegister.ref) {
      (titleRegister.ref as MutableRefObject<HTMLInputElement | null>).current = node;
    }
  }, [titleRegister.ref]);
  const title = watch("title");
  const slug = watch("slug");
  const slugRegister = register("slug", { required: t("admin.news.errors.slugRequired", "Required") });
  const locale = watch("locale");
  const titleTh = watch("titleTh") || "";
  const status = watch("status") ?? "draft";
  const category = watch("category") ?? "general";
  const publishRegister = register("publishDate");
  const currentId = watch("_id");
  const contentValue = watch("content") as PortableTextBlock[] | undefined;
  const contentThValue = watch("contentTh") as PortableTextBlock[] | undefined;
  const heroImageAssetId = watch("heroImageAssetId");
  const heroImageAlt = watch("heroImageAlt") ?? "";
  const heroAltLength = heroImageAlt.length;
  const heroAltTooLong = heroAltLength > 125;
  const heroImageCaption = watch("heroImageCaption") ?? "";
  const heroLayoutValue = watch("heroLayout") ?? "standard";
  const heroThemeValue = watch("heroTheme") ?? "light";
  const hasHeroImage = Boolean(heroImageAssetId);
  const previousHeroImageId = useRef<string | null>(initialValues?.heroImageAssetId ?? null);
  type NewsWriteSnapshot = {
    content: PortableTextBlock[] | undefined;
    contentTh: PortableTextBlock[] | undefined;
    heroImageAssetId: string | null | undefined;
    heroImageAlt: string;
    heroImageCaption: string;
    heroLayout: string;
    heroTheme: string;
  };
  const newsWriteSnapshot = useMemo<NewsWriteSnapshot>(
    () => ({
      content: contentValue,
      contentTh: contentThValue,
      heroImageAssetId,
      heroImageAlt,
      heroImageCaption,
      heroLayout: heroLayoutValue,
      heroTheme: heroThemeValue,
    }),
    [contentValue, contentThValue, heroImageAssetId, heroImageAlt, heroImageCaption, heroLayoutValue, heroThemeValue],
  );
  const writeDirty = useWriteDirtyTracker(newsWriteSnapshot);
  const toNewsWriteSnapshot = useCallback(
    (values: Partial<NewsFormState>): NewsWriteSnapshot => ({
      content: values.content as PortableTextBlock[] | undefined,
      contentTh: values.contentTh as PortableTextBlock[] | undefined,
      heroImageAssetId: (values.heroImageAssetId as string | null | undefined) ?? null,
      heroImageAlt: (values.heroImageAlt as string | undefined) ?? "",
      heroImageCaption: (values.heroImageCaption as string | undefined) ?? "",
      heroLayout: (values.heroLayout as string | undefined) ?? "standard",
      heroTheme: (values.heroTheme as string | undefined) ?? "light",
    }),
    [],
  );
  const newsAutosaveStorageKey = useMemo(
    () => `${AUTOSAVE_STORAGE_PREFIX}:news:${initialNewsId ?? "new"}`,
    [initialNewsId],
  );
  const newsAutosaveValues = useWatch({ control }) as NewsFormState;
  const hasRestoredNewsDraftRef = useRef(false);

  useEffect(() => {
    if (hasRestoredNewsDraftRef.current) return;
    if (typeof window === "undefined") return;
    if (initialNewsId) return;
    const saved = window.localStorage.getItem(newsAutosaveStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<NewsFormState> & { __autosavedAt?: string };
      const draft = { ...parsed };
      delete (draft as { __autosavedAt?: string }).__autosavedAt;
      const current = watch();
      const merged = { ...current, ...draft };
      reset(merged, { keepDefaultValues: true, keepDirty: false });
      writeDirty.markSaved(toNewsWriteSnapshot(merged));
      hasRestoredNewsDraftRef.current = true;
    } catch (error) {
      console.error("Failed to restore news autosave draft", error);
    }
  }, [initialNewsId, newsAutosaveStorageKey, reset, toNewsWriteSnapshot, watch, writeDirty]);
  const cleanupHeroSettings = useCallback(() => {
    if (heroImageAlt) setValue("heroImageAlt", "", { shouldDirty: true });
    if (heroImageCaption) setValue("heroImageCaption", "", { shouldDirty: true });
    if (heroLayoutValue !== "standard") setValue("heroLayout", "standard" as NewsFormState["heroLayout"], { shouldDirty: true });
    if (heroThemeValue !== "light") setValue("heroTheme", "light" as NewsFormState["heroTheme"], { shouldDirty: true });
  }, [heroImageAlt, heroImageCaption, heroLayoutValue, heroThemeValue, setValue]);

  useEffect(() => {
    if (slugDirtyRef.current) return;
    if (title) setValue("slug", slugify(title), { shouldDirty: true });
  }, [title, setValue]);

  useEffect(() => {
    if (hasHeroImage) {
      previousHeroImageId.current = heroImageAssetId ?? null;
      return;
    }

    const hasOrphanedSettings =
      Boolean(heroImageAlt || heroImageCaption) ||
      heroLayoutValue !== "standard" ||
      heroThemeValue !== "light";

    if (previousHeroImageId.current || hasOrphanedSettings) {
      cleanupHeroSettings();
      setCoverSettingsOpen(false);
    }

    previousHeroImageId.current = heroImageAssetId ?? null;
  }, [hasHeroImage, heroImageAssetId, heroImageAlt, heroImageCaption, heroLayoutValue, heroThemeValue, cleanupHeroSettings, setCoverSettingsOpen]);

  const localeHasContent = useCallback(
    (locale: "en" | "th") => {
      const fields = locale === "en"
        ? { title, body: contentValue }
        : { title: titleTh, body: contentThValue };
      return hasLocaleContent(fields);
    },
    [contentThValue, contentValue, title, titleTh],
  );

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

  const confirmMissingLocaleContent = useCallback(() => {
    if (step !== 1) return true;
    const inactiveLocale = writeLang === "en" ? "th" : "en";
    if (localeHasContent(inactiveLocale)) return true;
    const localeLabel = inactiveLocale === "th" ? "Thai" : "English";
    return window.confirm(`${localeLabel} content is empty. Are you sure you want to continue?`);
  }, [localeHasContent, step, writeLang]);

  const [navSaving, setNavSaving] = useState(false);
  const {
    isDirty,
    modalOpen,
    markDirty,
    markClean,
    confirmNavigation,
    runPendingNavigation,
    cancelPendingNavigation,
    closeModal,
  } = useUnsavedChanges();

  useUnsavedChangesGuard(isDirty);

  useEffect(() => {
    if (writeDirty.isDirty) {
      markDirty();
    } else {
      markClean();
    }
  }, [markClean, markDirty, writeDirty.isDirty]);

  const guardDirty = (targetStep: number) => {
    if (!writeDirty.isDirty || targetStep === step) return false;
    pendingStepRef.current = targetStep;
    confirmNavigation(() => {
      pendingStepRef.current = null;
      setStep(targetStep);
    });
    return true;
  };

  const goNext = async () => {
    const ok = await trigger(newsSteps[step].fields);
    if (!ok) return;
    if (!confirmMissingLocaleContent()) return;
    const target = Math.min(step + 1, newsSteps.length - 1);
    if (guardDirty(target)) return;
    setStep(target);
  };
  const goPrev = () => {
    const target = Math.max(step - 1, 0);
    if (guardDirty(target)) return;
    setStep(target);
  };
  const handleStepChange = async (target: number) => {
    const next = Math.min(Math.max(target, 0), newsSteps.length - 1);
    if (next === step) return;
    // Require the current step to pass validation before moving forward; allow backward jumps.
    if (next > step) {
      const ok = await trigger(newsSteps[step].fields);
      if (!ok) return;
      if (!confirmMissingLocaleContent()) return;
    }
    if (guardDirty(next)) return;
    setStep(next);
  };

  useEffect(() => {
    if (step !== 0 || !focusTitleNextRef.current) return;
    focusTitleNextRef.current = false;
    requestAnimationFrame(() => {
      const node = titleInputRef.current;
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      node.focus({ preventScroll: true });
    });
  }, [step]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const restoreWriteValues = useCallback(() => {
    const snapshot = writeDirty.restoreSaved() as NewsWriteSnapshot;
    setValue("content", snapshot.content ?? [], { shouldDirty: false });
    setValue("contentTh", snapshot.contentTh ?? [], { shouldDirty: false });
    setValue("heroImageAssetId", (snapshot.heroImageAssetId ?? null) as NewsFormState["heroImageAssetId"], { shouldDirty: false });
    setValue("heroImageAlt", snapshot.heroImageAlt ?? "", { shouldDirty: false });
    setValue("heroImageCaption", snapshot.heroImageCaption ?? "", { shouldDirty: false });
    setValue("heroLayout", (snapshot.heroLayout ?? "standard") as NewsFormState["heroLayout"], { shouldDirty: false });
    setValue("heroTheme", (snapshot.heroTheme ?? "light") as NewsFormState["heroTheme"], { shouldDirty: false });
    return snapshot;
  }, [setValue, writeDirty]);

  const newsAutosaveFn = useCallback(async (draft: NewsFormState) => {
    const autosavedAt = new Date().toISOString();
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          newsAutosaveStorageKey,
          JSON.stringify({ ...draft, __autosavedAt: autosavedAt }),
        );
      }
    } catch (error) {
      console.error("Autosave (news) localStorage failed", error);
    }

    const snapshot = toNewsWriteSnapshot(draft);
    const titleValue = (draft.title ?? "").trim();
    const slugValue = (draft.slug || slugify(titleValue)).trim();

    const canSyncWithServer = Boolean(draft._id) || (Boolean(slugValue) && Boolean(titleValue));

    if (!canSyncWithServer) {
      writeDirty.markSaved(snapshot);
      return;
    }

    const payload: NewsFormState = {
      ...draft,
      title: titleValue || slugValue,
      slug: slugValue,
      locale: draft.locale || currentLocale,
      status: draft.status ?? "draft",
      publishDate: draft.publishDate || new Date().toISOString(),
    };

    const result = await onSubmit(payload);
    if (!result?.success) {
      throw new Error(result?.message ?? "Autosave failed");
    }

    if (result.id && !draft._id) {
      setValue("_id", result.id, { shouldDirty: false });
    }

    writeDirty.markSaved(snapshot);
  }, [currentLocale, newsAutosaveStorageKey, onSubmit, setValue, toNewsWriteSnapshot, writeDirty]);

  const { lastSavedAt: newsAutosaveLastSavedAt, isSaving: isNewsAutosaving, saveStatus: newsAutosaveStatus } =
    useAutosave(newsAutosaveValues, newsAutosaveFn);

  const doSubmitNews = (overrideStatus?: NewsFormState["status"]) => {
    if (!hasHeroImage) {
      cleanupHeroSettings();
      setCoverSettingsOpen(false);
    }

    return new Promise<boolean>((resolve) => handleSubmit((values) => {
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
            const ok = typeof result === "object" ? result.success : true;
            if (!ok) { setSubmitError(result?.message ?? t("admin.news.errors.saveFailed", "Unable to save news.")); resolve(false); return; }
            writeDirty.markSaved();
            markClean();
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
            resolve(true);
          })
          .catch((err) => { console.error("saveNews failed", err); setSubmitError(t("admin.news.errors.saveFailedNow", "Save failed.")); resolve(false); });
      });
    }, () => Promise.resolve(resolve(false)))());
  };

  const handleDiscard = () => {
    const restored = restoreWriteValues();
    writeDirty.markSaved(restored);
    markClean();
    runPendingNavigation();
    closeModal();
    if (pendingStepRef.current != null) {
      setStep(pendingStepRef.current);
      pendingStepRef.current = null;
    }
    resetUnsavedChangesState();
  };

  const handleSaveAndContinue = async () => {
    if (navSaving) return;
    setNavSaving(true);
    const ok = await doSubmitNews();
    setNavSaving(false);
    if (!ok) return;
    markClean();
    runPendingNavigation();
    closeModal();
    resetUnsavedChangesState();
  };

  const handleCancelDirty = () => {
    cancelPendingNavigation();
  };

  const handleEditTitleInEssentials = () => {
    focusTitleNextRef.current = true;
    if (guardDirty(0)) return;
    setStep(0);
  };

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
    <WriteDirtyContext.Provider value={{
      isDirty: writeDirty.isDirty,
      markSaved: writeDirty.markSaved,
      restoreSaved: restoreWriteValues,
    }}>
    <div className="space-y-4">
      <WizardHeader
        title={t("admin.news.header.new", "Create news")}
        steps={newsSteps}
        step={step}
        stepErrors={{ essentials: Boolean(errors.title || errors.slug) }}
        lastSavedAt={newsAutosaveLastSavedAt}
        isSaving={isNewsAutosaving}
        saveStatus={newsAutosaveStatus}
        onStepChange={handleStepChange}
      />

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); doSubmitNews(); }}>

        {/* ── STEP 0: Essentials ── */}
        {step === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <FieldText
              label={t("admin.news.fields.title", "Title (EN)")}
              placeholder={t("admin.news.fields.titlePlaceholder", "English title")}
              error={errors.title?.message}
              inputProps={{ ...titleRegister, ref: setTitleInputRef }}
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
            hasHeroImage={hasHeroImage}
            heroSettingsOpen={coverSettingsOpen}
            onHeroSettingsOpenChange={setCoverSettingsOpen}
            heroAltField={
              <div className="space-y-1">
                <Input
                  {...register("heroImageAlt")}
                  disabled={!hasHeroImage}
                  aria-disabled={!hasHeroImage}
                  title={!hasHeroImage ? COVER_DISABLED_MESSAGE : undefined}
                  placeholder="Describe the image for screen readers"
                  className={`h-8 text-sm ${!hasHeroImage ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
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
            }
            heroCaptionField={
              <Input
                {...register("heroImageCaption")}
                disabled={!hasHeroImage}
                aria-disabled={!hasHeroImage}
                title={!hasHeroImage ? COVER_DISABLED_MESSAGE : undefined}
                placeholder="Optional visible caption below the image"
                className={`h-8 text-sm ${!hasHeroImage ? "cursor-not-allowed opacity-50 pointer-events-none" : ""}`}
              />
            }
            heroLayout={heroLayoutValue}
            onHeroLayout={(v) => setValue("heroLayout", v as NewsFormState["heroLayout"], { shouldDirty: true })}
            heroTheme={heroThemeValue}
            onHeroTheme={(v) => setValue("heroTheme", v as NewsFormState["heroTheme"], { shouldDirty: true })}
            title={title}
            onTitleChange={(v) => setValue("title", v, { shouldDirty: true, shouldValidate: true })}
            titleMaxLength={200}
            onEditEssentials={handleEditTitleInEssentials}
            lang={writeLang}
            onLangChange={setWriteLang}
            localeHasContent={localeHasContent}
            bodyEnField={
              <Controller
                name="content"
                control={control}
                rules={{
                  validate: (v) =>
                    hasPortableTextContent(v as unknown as PortableTextBlock[]) ||
                    t("admin.news.errors.bodyRequired", "Body (EN) is required"),
                }}
                render={({ field, fieldState }) => (
                  <DocEditor
                    key={`doc-${currentId ?? "news-new"}-en`}
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    locale="en"
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
                    key={`doc-${currentId ?? "news-new"}-th`}
                    value={(field.value ?? []) as PortableTextBlock[]}
                    onChange={field.onChange}
                    error={fieldState.error?.message}
                    locale="th"
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
          <PublishStep<NewsFormState>
            isInsight={false}
            watchValues={watch}
            setStep={(target) => {
              if (guardDirty(target)) return;
              setStep(target);
            }}
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
      <UnsavedChangesModal
        isOpen={modalOpen}
        onDiscard={handleDiscard}
        onSave={handleSaveAndContinue}
        onCancel={handleCancelDirty}
        isSaving={navSaving}
      />
    </div>
    </WriteDirtyContext.Provider>
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
  hasHeroImage: boolean;
  heroSettingsOpen: boolean;
  onHeroSettingsOpenChange: (open: boolean) => void;
  heroAltField: React.ReactNode;
  heroCaptionField: React.ReactNode;
  heroLayout: string;
  onHeroLayout: (v: string) => void;
  heroTheme: string;
  onHeroTheme: (v: string) => void;
  title: string;
  onTitleChange: (v: string) => void;
  titleMaxLength?: number;
  onEditEssentials?: () => void;
  lang: "en" | "th";
  onLangChange: (l: "en" | "th") => void;
  localeHasContent: (l: "en" | "th") => boolean;
  bodyEnField: React.ReactNode;
  bodyThField: React.ReactNode;
  extras?: React.ReactNode;
  validationError?: string | null;
};

export function WriteStep({
  heroImageAssetIdField,
  hasHeroImage,
  heroSettingsOpen,
  onHeroSettingsOpenChange,
  heroAltField,
  heroCaptionField,
  heroLayout,
  onHeroLayout,
  heroTheme,
  onHeroTheme,
  title,
  onTitleChange,
  titleMaxLength = 200,
  onEditEssentials,
  lang,
  onLangChange,
  localeHasContent,
  bodyEnField,
  bodyThField,
  extras,
  validationError,
}: WriteStepProps) {
  const settingsId = `hero-settings-${lang}`;
  const coverDisabled = !hasHeroImage;
  const coverDisabledMessage = coverDisabled ? COVER_DISABLED_MESSAGE : undefined;
  const coverDisabledClasses = coverDisabled ? "cursor-not-allowed opacity-50 pointer-events-none" : "";
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const prevTitleRef = useRef(title ?? "");

  useEffect(() => {
    if (!isEditingTitle) {
      setDraftTitle(title ?? "");
      prevTitleRef.current = title ?? "";
    }
  }, [title, isEditingTitle]);

  const handleStartEdit = () => {
    setIsEditingTitle(true);
    setDraftTitle(title ?? "");
  };

  const commitTitle = useCallback(() => {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setDraftTitle(prevTitleRef.current);
      setIsEditingTitle(false);
      return;
    }
    if (trimmed !== title) {
      onTitleChange(trimmed);
      prevTitleRef.current = trimmed;
    }
    setIsEditingTitle(false);
  }, [draftTitle, onTitleChange, title]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">

      {/* Cover image — full-width, looks like a real document cover */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="relative">{heroImageAssetIdField}</div>

        {/* Collapsible settings panel */}
        <Collapsible open={heroSettingsOpen} onOpenChange={(open) => hasHeroImage && onHeroSettingsOpenChange(open)}>
          <div
            className="border-t border-slate-100 bg-slate-50 px-4 py-3"
            title={coverDisabledMessage}
            aria-disabled={coverDisabled}
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-expanded={heroSettingsOpen}
                aria-controls={settingsId}
                aria-disabled={coverDisabled}
                disabled={coverDisabled}
                title={coverDisabledMessage}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${coverDisabled ? `text-slate-300 ${coverDisabledClasses}` : "text-slate-500 hover:text-slate-800"}`}
              >
                <span className={`inline-block transition-transform duration-200 ${heroSettingsOpen ? "rotate-90" : ""}`}>▶</span>
                Cover image settings (alt text, layout, theme)
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent
              id={settingsId}
              aria-disabled={coverDisabled}
              title={coverDisabledMessage}
              className="data-[state=closed]:hidden"
            >
              <div className="mt-3 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
                <div className="space-y-1" title={coverDisabledMessage} aria-disabled={coverDisabled}>
                  <Label className={`text-xs text-slate-500 ${coverDisabled ? "opacity-70" : ""}`}>Alt text</Label>
                  <div className={coverDisabled ? "pointer-events-none" : undefined}>
                    {heroAltField}
                  </div>
                </div>
                <div className="space-y-1" title={coverDisabledMessage} aria-disabled={coverDisabled}>
                  <Label className={`text-xs text-slate-500 ${coverDisabled ? "opacity-70" : ""}`}>Caption</Label>
                  <div className={coverDisabled ? "pointer-events-none" : undefined}>
                    {heroCaptionField}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
                  <Label className={`text-xs text-slate-500 ${coverDisabled ? "opacity-70" : ""}`}>Layout</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {HERO_LAYOUTS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={coverDisabled}
                        aria-disabled={coverDisabled}
                        onClick={() => onHeroLayout(opt.value)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${heroLayout === opt.value ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"} ${coverDisabled ? coverDisabledClasses : ""}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2" title={coverDisabledMessage} aria-disabled={coverDisabled}>
                  <Label className={`text-xs text-slate-500 ${coverDisabled ? "opacity-70" : ""}`}>Text theme over image</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {HERO_THEMES.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={coverDisabled}
                        aria-disabled={coverDisabled}
                        onClick={() => onHeroTheme(opt.value)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${heroTheme === opt.value ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"} ${coverDisabled ? coverDisabledClasses : ""}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Title preview — now inline editable */}
      <div className="px-1 space-y-1">
        <div className="group relative inline-flex w-full items-center gap-2">
          {isEditingTitle ? (
            <input
              aria-label="Insight title"
              autoFocus
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value.slice(0, titleMaxLength))}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTitle();
                  (e.currentTarget as HTMLInputElement).blur();
                }
              }}
              className="w-full border-b border-slate-300 bg-transparent text-2xl font-bold leading-snug text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-0"
            />
          ) : (
            <button
              type="button"
              aria-label="Edit insight title"
              onClick={handleStartEdit}
              className="flex w-full items-center gap-2 text-left"
            >
              <span className={`text-2xl font-bold leading-snug ${title ? "text-slate-900" : "text-slate-300"}`}>
                {title || "Your article title goes here…"}
              </span>
              <span className="rounded-full p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <Pencil className="h-4 w-4" aria-hidden />
              </span>
            </button>
          )}
        </div>
        {onEditEssentials && (
          <button
            type="button"
            onClick={onEditEssentials}
            className="text-xs text-slate-400 transition hover:text-slate-600"
          >
            ← Edit in Essentials
          </button>
        )}
      </div>

      {/* Language switcher */}
      <div className="flex items-center justify-between px-1">
        <div className="flex gap-2">
          {["en", "th"].map((l) => {
            const filled = localeHasContent(l as "en" | "th");
            return (
              <button
                key={l}
                type="button"
                onClick={() => onLangChange(l as "en" | "th")}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  l === lang ? "bg-slate-900 text-white shadow-sm" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                <span>{l === "en" ? "🇬🇧 English" : "🇹🇭 Thai"}</span>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${filled ? "bg-emerald-400" : "bg-red-500"}`}
                  aria-label={filled ? `${l === "en" ? "English" : "Thai"} content added` : `${l === "en" ? "English" : "Thai"} content empty`}
                />
                {!filled && (
                  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                    Empty
                  </span>
                )}
              </button>
            );
          })}
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
      {/* Keyed by lang so the editor remounts with the correct document instead of reusing the previous tiptap state. */}
      <div
        key={lang}
        className="rich-editor-light overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {lang === "en" ? bodyEnField : bodyThField}
      </div>

      {validationError ? (
        <p className="px-1 text-sm font-medium text-red-600">{validationError}</p>
      ) : null}

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
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-700" htmlFor="seoKeywords">
                SEO Keywords (language-independent)
              </Label>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-slate-400 transition hover:text-slate-600"
                      aria-label="SEO keyword locale scope info"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-left">
                    These keywords are shared across all locales and used in meta tags globally.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input id="seoKeywords" value={seoKeywords} onChange={(e) => onSeoKeywords(e.target.value)} placeholder="newsroom, retail tech, Thailand" />
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

type PublishStepProps<TFormValues extends FieldValues> = {
  isInsight: boolean;
  watchValues: UseFormWatch<TFormValues>;
  setStep: (s: number) => void;
  onSave: () => void;
  onSavePublish: () => void;
  isPending: boolean;
  submitError: string | null;
  submitSuccess: boolean;
};

const PublishStep = <TFormValues extends FieldValues>({
  isInsight,
  watchValues,
  setStep,
  onSave,
  onSavePublish,
  isPending,
  submitError,
  submitSuccess,
}: PublishStepProps<TFormValues>) => {
  const title = (watchValues("title") as string) || "";
  const slug = (watchValues("slug") as string) || "";
  const heroImageAssetId = watchValues("heroImageAssetId");
  const seoMetaTitle = (watchValues("seoMetaTitle") as string) || "";
  const seoMetaDescription = (watchValues("seoMetaDescription") as string) || "";
  const bodyBlocks = (watchValues(isInsight ? "body" : "content") ?? []) as PortableTextBlock[];
  const hasBody = hasPortableTextContent(bodyBlocks);
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

type WizardHeaderProps = {
  title: string;
  steps: { id: string; label: string }[];
  step: number;
  stepErrors?: Record<string, boolean>;
  onStepChange?: (index: number) => void;
  lastSavedAt?: Date | null;
  isSaving?: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  stepLabel?: string | null;
  stepGuards?: Record<string, { disabled?: boolean; reason?: string; onBlocked?: () => void } | undefined>;
};

const WizardHeader = ({ title, steps, step, stepErrors, onStepChange, lastSavedAt, isSaving, saveStatus, stepLabel, stepGuards }: WizardHeaderProps) => {
  const labelText = stepLabel === null ? null : stepLabel ?? `Step ${step + 1} of ${steps.length}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-900">{title}</p>
          {labelText ? <p className="text-xs text-slate-600">{labelText}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
          <LastSavedIndicator lastSavedAt={lastSavedAt ?? null} isSaving={Boolean(isSaving)} saveStatus={saveStatus} />
          <div className="flex flex-wrap items-center justify-end gap-2">
            {steps.map((item, index) => {
              const guard = stepGuards?.[item.id];
              const blocked = Boolean(guard?.disabled);
              const button = (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (blocked) {
                      guard?.onBlocked?.();
                      return;
                    }
                    onStepChange?.(index);
                  }}
                  // Turn badges into real buttons so the step tabs respond to clicks (previously inert).
                  className={`relative focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded-md ${blocked ? "cursor-not-allowed opacity-60" : ""}`}
                  aria-current={index === step ? "step" : undefined}
                  aria-disabled={blocked}
                >
                  {stepErrors?.[item.id] && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  )}
                  <Badge variant={index === step ? "default" : "secondary"} className={blocked ? "cursor-not-allowed" : "cursor-pointer"}>
                    {item.label}
                  </Badge>
                </button>
              );

              if (guard?.reason) {
                return (
                  <TooltipProvider delayDuration={150} key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent>{guard.reason}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return button;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

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
    <Input
      type={type}
      placeholder={placeholder}
      {...inputProps}
      className={`${inputProps?.className ?? ""} ${error ? "border-red-500" : ""}`.trim() || undefined}
    />
    {error && <p className="text-xs text-red-500">{error}</p>}
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

type KeywordDifficultyLevel = "easy" | "moderate" | "hard" | "veryHard";

type KeywordDifficultyMeta = {
  label: string;
  emoji: string;
  badgeCopy: string;
  description: string;
  domainAuthority: string;
  competitiveLevel: string;
};

const keywordDifficultyConfig: Record<KeywordDifficultyLevel, KeywordDifficultyMeta> = {
  easy: {
    label: "Easy",
    emoji: "🟢",
    badgeCopy: "very achievable to rank",
    description: "Low competition keywords that reward well-structured, relevant content. Good writing and basic on-page SEO are usually enough to show up.",
    domainAuthority: "DA 10–30 recommended",
    competitiveLevel: "Few established pages — clear answers and relevance win",
  },
  moderate: {
    label: "Moderate",
    emoji: "🟡",
    badgeCopy: "achievable with good content",
    description: "This keyword has meaningful competition. You'll need solid content structure and some domain authority to rank.",
    domainAuthority: "DA 30–50 recommended",
    competitiveLevel: "Several established pages competing — quality and structure matter",
  },
  hard: {
    label: "Hard",
    emoji: "🟠",
    badgeCopy: "requires strong content & authority",
    description: "Competitive space with authoritative sites. Publish comprehensive, trustworthy content and expect to build supporting links.",
    domainAuthority: "DA 50–70 recommended",
    competitiveLevel: "Authority sites dominate — depth, expertise, and links needed",
  },
  veryHard: {
    label: "Very Hard",
    emoji: "🔴",
    badgeCopy: "expect heavy competition",
    description: "Highly competitive keyword, often led by strong brands. Ranking usually needs significant authority, links, and time.",
    domainAuthority: "DA 70+ strongly recommended",
    competitiveLevel: "Multiple authoritative incumbents — long-term effort required",
  },
};

const keywordDifficultyStyles: Record<KeywordDifficultyLevel, string> = {
  easy: "border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-200",
  moderate: "border-amber-200 bg-amber-50 text-amber-700 focus:ring-amber-200",
  hard: "border-orange-200 bg-orange-50 text-orange-700 focus:ring-orange-200",
  veryHard: "border-red-200 bg-red-50 text-red-700 focus:ring-red-200",
};

const getKeywordDifficultyLevel = (n: number): KeywordDifficultyLevel | null => {
  if (Number.isNaN(n) || n < 0 || n > 100) return null;
  if (n < 30) return "easy";
  if (n <= 60) return "moderate";
  if (n <= 80) return "hard";
  return "veryHard";
};

function KeywordDifficultyHint({ value }: { value?: number | null }) {
  const [open, setOpen] = useState(false);
  const numericValue = value == null ? NaN : Number(value);
  const level = getKeywordDifficultyLevel(numericValue);
  if (!level) return null;

  const meta = keywordDifficultyConfig[level];
  const badgeClasses = keywordDifficultyStyles[level];

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen} disableHoverableContent>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className={`mt-2 inline-flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${badgeClasses}`}
            aria-label={`${meta.label} difficulty details`}
          >
            <span>{meta.emoji}</span>
            <span className="font-semibold">{meta.label}</span>
            <span className="text-[11px] font-normal text-current opacity-90">— {meta.badgeCopy}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent align="start" className="max-w-sm bg-slate-900 text-left text-slate-50 shadow-lg">
          <p className="flex items-center gap-2 text-sm font-semibold leading-tight">
            <span>{meta.emoji}</span>
            <span>{meta.label} difficulty</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-100">{meta.description}</p>
          <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-slate-100">
            <p><span className="font-semibold text-slate-50">Recommended domain authority: </span>{meta.domainAuthority}</p>
            <p><span className="font-semibold text-slate-50">Competition: </span>{meta.competitiveLevel}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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
