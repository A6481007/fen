"use client";

import { useMemo, type ReactNode } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Info } from "lucide-react";
import type { FieldId, FieldRegistry } from "./layoutTypes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type BaseFieldProps = {
  label?: string;
  placeholder?: string;
};

const TextField = ({ label, placeholder, ...controllerProps }: BaseFieldProps & { name: string; control: any }) => (
  <div className="flex flex-col gap-1">
    {label ? <label className="text-sm font-medium text-slate-800">{label}</label> : null}
    <Controller
      {...controllerProps}
      render={({ field }) => <Input {...field} placeholder={placeholder} />}
    />
  </div>
);

const TextAreaField = ({ label, placeholder, rows = 6, ...controllerProps }: BaseFieldProps & { name: string; control: any; rows?: number }) => (
  <div className="flex flex-col gap-1">
    {label ? <label className="text-sm font-medium text-slate-800">{label}</label> : null}
    <Controller
      {...controllerProps}
      render={({ field }) => <Textarea {...field} rows={rows} placeholder={placeholder} />}
    />
  </div>
);

const StatusBadgeField = ({ fieldName }: { fieldName: string }) => {
  const value = useWatch({ name: fieldName });
  return (
    <div className="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
      <span className="font-semibold uppercase tracking-wide">{value ?? "—"}</span>
      <span className="text-slate-500">status</span>
    </div>
  );
};

const HelperNote = ({ text }: { text: string }) => (
  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
    {text}
  </div>
);

export function useFieldRegistry(): FieldRegistry {
  const form = useFormContext();
  const { control } = form;
  const heroImageAssetId = useWatch({ control, name: "heroImageAssetId" });
  const heroImageValue = useWatch({ control, name: "heroImage" });
  const heroAlt = useWatch({ control, name: "heroAlt" }) ?? "";
  const heroAltLength = heroAlt.length;
  const heroAltTooLong = heroAltLength > 125;
  const hasHeroImage = Boolean(heroImageAssetId ?? heroImageValue);
  const coverDisabledMessage = hasHeroImage ? undefined : "Upload an image first to configure these settings.";
  const coverDisabledClasses = hasHeroImage ? "" : "cursor-not-allowed opacity-50 pointer-events-none";

  return useMemo<FieldRegistry>(() => {
    const map: Partial<Record<FieldId, ReactNode>> = {
      title: (
        <TextField
          name="title"
          control={control}
          label="Title"
          placeholder="Enter title"
        />
      ),
      slug: (
        <TextField
          name="slug"
          control={control}
          label="Slug"
          placeholder="news-story-slug"
        />
      ),
      locale: (
        <TextField
          name="locale"
          control={control}
          label="Locale"
          placeholder="en"
        />
      ),
      category: (
        <TextField
          name="category"
          control={control}
          label="Category"
          placeholder="general"
        />
      ),
      status: (
        <TextField
          name="status"
          control={control}
          label="Status"
          placeholder="draft | published"
        />
      ),
      statusBadge: <StatusBadgeField fieldName="status" />,
      insightType: (
        <TextField
          name="insightType"
          control={control}
          label="Insight type"
          placeholder="caseStudy | comparison"
        />
      ),
      author: (
        <TextField
          name="author"
          control={control}
          label="Author"
          placeholder="Author id or name"
        />
      ),
      primaryCategory: (
        <TextField
          name="primaryCategory"
          control={control}
          label="Primary category"
          placeholder="Category id"
        />
      ),
      linkedEvent: (
        <TextField
          name="linkedEvent"
          control={control}
          label="Linked event"
          placeholder="Event id"
        />
      ),
      attachments: (
        <HelperNote text="Attachments placeholder — replace with attachments widget." />
      ),
      eventsHelper: <HelperNote text="Attach related events or downloads." />,
      heroHelper: <HelperNote text="Control how the hero appears on the page." />,
      heroImage: (
        <TextField
          name="heroImage"
          control={control}
          label="Hero image"
          placeholder="Image URL or asset id"
        />
      ),
      heroAlt: (
        <div className="flex flex-col gap-1" title={coverDisabledMessage} aria-disabled={!hasHeroImage}>
          <label className={`text-sm font-medium text-slate-800 ${!hasHeroImage ? "opacity-70" : ""}`}>Hero alt text</label>
          <Controller
            name="heroAlt"
            control={control}
            render={({ field }) => (
              <div className="space-y-1">
                <Input
                  {...field}
                  placeholder="Describe the image"
                  disabled={!hasHeroImage}
                  aria-disabled={!hasHeroImage}
                  title={coverDisabledMessage}
                  className={coverDisabledClasses || undefined}
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
            )}
          />
        </div>
      ),
      heroCaption: (
        <div className="flex flex-col gap-1" title={coverDisabledMessage} aria-disabled={!hasHeroImage}>
          <label className={`text-sm font-medium text-slate-800 ${!hasHeroImage ? "opacity-70" : ""}`}>Hero caption</label>
          <Controller
            name="heroCaption"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Optional caption"
                disabled={!hasHeroImage}
                aria-disabled={!hasHeroImage}
                title={coverDisabledMessage}
                className={coverDisabledClasses || undefined}
              />
            )}
          />
        </div>
      ),
      heroLayout: (
        <div className="flex flex-col gap-1" title={coverDisabledMessage} aria-disabled={!hasHeroImage}>
          <label className={`text-sm font-medium text-slate-800 ${!hasHeroImage ? "opacity-70" : ""}`}>Hero layout</label>
          <Controller
            name="heroLayout"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="standard | banner | fullBleed"
                disabled={!hasHeroImage}
                aria-disabled={!hasHeroImage}
                title={coverDisabledMessage}
                className={coverDisabledClasses || undefined}
              />
            )}
          />
        </div>
      ),
      heroTheme: (
        <div className="flex flex-col gap-1" title={coverDisabledMessage} aria-disabled={!hasHeroImage}>
          <label className={`text-sm font-medium text-slate-800 ${!hasHeroImage ? "opacity-70" : ""}`}>Hero theme</label>
          <Controller
            name="heroTheme"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="light | dark | overlay"
                disabled={!hasHeroImage}
                aria-disabled={!hasHeroImage}
                title={coverDisabledMessage}
                className={coverDisabledClasses || undefined}
              />
            )}
          />
        </div>
      ),
      publishDate: (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-800">Publish date</label>
          <Controller
            name="publishDate"
            control={control}
            render={({ field }) => (
              <Input type="datetime-local" {...field} />
            )}
          />
        </div>
      ),
      summary: (
        <TextAreaField
          name="summary"
          control={control}
          label="Summary"
          placeholder="Short summary"
          rows={4}
        />
      ),
      body: (
        <TextAreaField
          name="body"
          control={control}
          label="Body"
          placeholder="Rich text body placeholder"
          rows={10}
        />
      ),
      bodyHeader: <HelperNote text="Story body content" />,
      bodyEditor: (
        <TextAreaField
          name="body"
          control={control}
          label="Body"
          placeholder="Rich text body placeholder"
          rows={12}
        />
      ),
      bodyTips: (
        <HelperNote text="Add headings, paragraphs, quotes, and inline images." />
      ),
      relationshipsHelper: (
        <HelperNote text="Assign categories, authors, or relationships here." />
      ),
      primaryKeyword: (
        <TextField
          name="primaryKeyword"
          control={control}
          label="Primary keyword"
          placeholder="seo keyword"
        />
      ),
      primaryKeywordTh: (
        <TextField
          name="primaryKeywordTh"
          control={control}
          label="Primary keyword (TH)"
          placeholder="thai seo keyword"
        />
      ),
      primaryKeywordVolume: (
        <TextField
          name="primaryKeywordVolume"
          control={control}
          label="Primary keyword volume"
          placeholder="0"
        />
      ),
      primaryKeywordDifficulty: (
        <TextField
          name="primaryKeywordDifficulty"
          control={control}
          label="Primary keyword difficulty"
          placeholder="0"
        />
      ),
      seoHelper: <HelperNote text="SEO preview and metadata." />,
      seoMetaTitle: (
        <TextField
          name="seoMetaTitle"
          control={control}
          label="SEO meta title"
          placeholder="Headline for search and social"
        />
      ),
      seoCanonicalUrl: (
        <TextField
          name="seoCanonicalUrl"
          control={control}
          label="Canonical URL"
          placeholder="https://example.com/article"
        />
      ),
      seoMetaDescription: (
        <TextAreaField
          name="seoMetaDescription"
          control={control}
          label="SEO meta description"
          placeholder="Search snippet description"
          rows={4}
        />
      ),
      seoKeywords: (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-800" htmlFor="seoKeywords">
              SEO keywords (language-independent)
            </label>
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
          <Controller
            name="seoKeywords"
            control={control}
            render={({ field }) => <Input {...field} id="seoKeywords" placeholder="keyword1, keyword2" />}
          />
        </div>
      ),
      seoNoIndex: (
        <TextField
          name="seoNoIndex"
          control={control}
          label="SEO noindex"
          placeholder="true | false"
        />
      ),
      seoOgImage: (
        <TextField
          name="seoOgImage"
          control={control}
          label="OG image"
          placeholder="Image URL or asset id"
        />
      ),
    };

    return map as FieldRegistry;
  }, [control, coverDisabledClasses, coverDisabledMessage, hasHeroImage]);
}
