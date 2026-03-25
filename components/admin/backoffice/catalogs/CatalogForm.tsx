"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AssetUploader } from "@/components/admin/backoffice/AssetUploader";
import { ReferencePicker, type ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { CatalogFormState, CatalogStatus } from "./types";
import { useTranslation } from "react-i18next";

type CatalogFormProps = {
  initialValues?: Partial<CatalogFormState>;
  initialRelatedDownloads?: ReferenceOption[];
  onSubmit: (values: CatalogFormState) => Promise<{
    success: boolean;
    id?: string;
    status?: string;
    message?: string;
  }>;
  searchDownloads: (query: string) => Promise<ReferenceOption[]>;
};

const statusOptions = [
  { value: "draft", labelKey: "admin.catalogs.status.draft", defaultLabel: "Draft" },
  { value: "published", labelKey: "admin.catalogs.status.published", defaultLabel: "Published" },
] as const;

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => `${input}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildInitialState = (
  values?: Partial<CatalogFormState>,
  relatedDownloads?: ReferenceOption[],
): {
  form: CatalogFormState;
  related: ReferenceOption[];
  tagInput: string;
} => ({
  form: {
    _id: values?._id,
    title: values?.title ?? "",
    slug: values?.slug ?? "",
    description: values?.description ?? "",
    publishDate: toDateTimeInputValue(values?.publishDate ?? new Date().toISOString()),
    status: values?.status ?? "draft",
    category: values?.category ?? "",
    tags: values?.tags ?? [],
    version: values?.version ?? "",
    fileAssetId: values?.fileAssetId ?? null,
    useAutoGeneration: values?.useAutoGeneration ?? true,
    customCoverAssetId: values?.customCoverAssetId ?? null,
    relatedDownloadIds: values?.relatedDownloadIds ?? relatedDownloads?.map((d) => d.id),
  },
  related: relatedDownloads ?? [],
  tagInput: values?.tags?.join(", ") ?? "",
});

const CatalogForm = ({
  initialValues,
  initialRelatedDownloads,
  onSubmit,
  searchDownloads,
}: CatalogFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [{ form, related, tagInput }, setState] = useState(() =>
    buildInitialState(initialValues, initialRelatedDownloads),
  );
  const [isPending, startTransition] = useTransition();

  const handleChange = <K extends keyof CatalogFormState>(key: K, value: CatalogFormState[K]) => {
    setState((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));
  };

  const handleTagInput = (value: string) => {
    setState((prev) => ({ ...prev, tagInput: value }));
  };

  const relatedDownloadIds = useMemo(() => related.map((item) => item.id), [related]);

  const handleDownloadSelect = (option: ReferenceOption | null) => {
    if (!option) return;
    setState((prev) => {
      if (prev.related.some((item) => item.id === option.id)) return prev;
      return {
        ...prev,
        related: [...prev.related, option],
        form: {
          ...prev.form,
          relatedDownloadIds: [...(prev.form.relatedDownloadIds ?? []), option.id],
        },
      };
    });
  };

  const handleRemoveDownload = (id: string) => {
    setState((prev) => {
      const filtered = prev.related.filter((item) => item.id !== id);
      return {
        ...prev,
        related: filtered,
        form: { ...prev.form, relatedDownloadIds: filtered.map((item) => item.id) },
      };
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const tags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    startTransition(() => {
      onSubmit({ ...form, tags, relatedDownloadIds })
        .then((result) => {
          if (!result.success) {
            toast({
              title: t("admin.catalogs.toast.saveFailedTitle"),
              description: result.message ?? t("admin.catalogs.toast.saveFailedDescription"),
              variant: "destructive",
            });
            return;
          }

          toast({
            title: t("admin.catalogs.toast.savedTitle"),
            description: t("admin.catalogs.toast.savedDescription"),
          });
          router.push(`/admin/content/catalogs/${result.id}`);
          router.refresh();
        })
        .catch((error) => {
          console.error("Failed to save catalog", error);
          toast({
            title: t("admin.catalogs.toast.saveFailedTitle"),
            description: t("admin.catalogs.toast.unexpectedError"),
            variant: "destructive",
          });
        });
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {form._id ? t("admin.catalogs.header.edit") : t("admin.catalogs.header.new")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.catalogs.header.hint")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content/catalogs">{t("admin.catalogs.actions.cancel")}</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? t("admin.catalogs.actions.saving") : t("admin.catalogs.actions.save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="space-y-1">
            <Label htmlFor="title">{t("admin.catalogs.fields.title")}</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="slug">{t("admin.catalogs.fields.slug")}</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => handleChange("slug", event.target.value)}
              placeholder={t("admin.catalogs.fields.slugPlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="description">{t("admin.catalogs.fields.description")}</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(event) => handleChange("description", event.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("admin.catalogs.fields.status")}</Label>
              <Select
                value={form.status}
                onValueChange={(value) => handleChange("status", value as CatalogStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.catalogs.fields.status")} />
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
            <div className="space-y-1">
              <Label htmlFor="publishDate">{t("admin.catalogs.fields.publishDate")}</Label>
              <Input
                id="publishDate"
                type="datetime-local"
                value={form.publishDate}
                onChange={(event) => handleChange("publishDate", event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="category">{t("admin.catalogs.fields.category")}</Label>
              <Input
                id="category"
                value={form.category ?? ""}
                onChange={(event) => handleChange("category", event.target.value)}
                placeholder={t("admin.catalogs.fields.categoryPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="version">{t("admin.catalogs.fields.version")}</Label>
              <Input
                id="version"
                value={form.version ?? ""}
                onChange={(event) => handleChange("version", event.target.value)}
                placeholder={t("admin.catalogs.fields.versionPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="tags">{t("admin.catalogs.fields.tags")}</Label>
            <Input
              id="tags"
              value={tagInput}
              onChange={(event) => handleTagInput(event.target.value)}
              placeholder={t("admin.catalogs.fields.tagsPlaceholder")}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{t("admin.catalogs.cover.autoTitle")}</p>
              <p className="text-xs text-slate-600">
                {t("admin.catalogs.cover.autoDescription")}
              </p>
            </div>
            <Switch
              checked={form.useAutoGeneration !== false}
              onCheckedChange={(checked) => handleChange("useAutoGeneration", checked)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <AssetUploader
            label={t("admin.catalogs.file.label")}
            description={t("admin.catalogs.file.description")}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
            assetType="file"
            onChange={(value) => handleChange("fileAssetId", value?.assetId ?? null)}
          />
          {form.fileAssetId && (
            <p className="mt-2 text-xs text-emerald-700">
              {t("admin.catalogs.file.ready")} <code className="bg-emerald-50 px-1">{form.fileAssetId}</code>
            </p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <AssetUploader
            label={t("admin.catalogs.cover.customLabel")}
            description={t("admin.catalogs.cover.customDescription")}
            accept="image/*"
            assetType="image"
            onChange={(value) => handleChange("customCoverAssetId", value?.assetId ?? null)}
          />
          {form.customCoverAssetId && (
            <p className="text-xs text-slate-600">
              {t("admin.catalogs.cover.asset")} <code className="bg-slate-100 px-1">{form.customCoverAssetId}</code>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("admin.catalogs.related.title")}</p>
            <p className="text-xs text-slate-600">{t("admin.catalogs.related.subtitle")}</p>
          </div>
          {related.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {t("admin.catalogs.related.linkedCount", { count: related.length })}
            </span>
          )}
        </div>
        <ReferencePicker
          label={t("admin.catalogs.related.addDownload")}
          placeholder={t("admin.catalogs.related.searchPlaceholder")}
          value={null}
          onChange={handleDownloadSelect}
          onSearch={searchDownloads}
          allowClear={false}
        />
        {related.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {related.map((download) => (
              <span
                key={download.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-800"
              >
                {download.label || t("admin.catalogs.fallback.download")}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-500 hover:text-slate-800"
                  type="button"
                  onClick={() => handleRemoveDownload(download.id)}
                >
                  {t("admin.catalogs.related.remove")}
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>
    </form>
  );
};

export default CatalogForm;
