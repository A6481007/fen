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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { DownloadFormState, DownloadStatus } from "./types";
import { useTranslation } from "react-i18next";

type DownloadFormProps = {
  initialValues?: Partial<DownloadFormState>;
  initialRelatedProducts?: ReferenceOption[];
  onSubmit: (values: DownloadFormState) => Promise<{
    success: boolean;
    id?: string;
    status?: string;
    message?: string;
  }>;
  searchProducts: (query: string) => Promise<ReferenceOption[]>;
};

const statusOptions = [
  { value: "draft", labelKey: "admin.downloads.status.draft", defaultLabel: "Draft" },
  { value: "published", labelKey: "admin.downloads.status.published", defaultLabel: "Published" },
] as const;

const buildInitialState = (
  values?: Partial<DownloadFormState>,
  relatedProducts?: ReferenceOption[],
): {
  form: DownloadFormState;
  related: ReferenceOption[];
} => ({
  form: {
    _id: values?._id,
    title: values?.title ?? "",
    slug: values?.slug ?? "",
    summary: values?.summary ?? "",
    status: values?.status ?? "draft",
    fileAssetId: values?.fileAssetId ?? null,
    relatedProductIds: values?.relatedProductIds ?? relatedProducts?.map((p) => p.id),
  },
  related: relatedProducts ?? [],
});

const DownloadForm = ({
  initialValues,
  initialRelatedProducts,
  onSubmit,
  searchProducts,
}: DownloadFormProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [{ form, related }, setState] = useState(() =>
    buildInitialState(initialValues, initialRelatedProducts),
  );
  const [isPending, startTransition] = useTransition();

  const handleChange = <K extends keyof DownloadFormState>(key: K, value: DownloadFormState[K]) => {
    setState((prev) => ({ ...prev, form: { ...prev.form, [key]: value } }));
  };

  const relatedProductIds = useMemo(() => related.map((item) => item.id), [related]);

  const handleProductSelect = (option: ReferenceOption | null) => {
    if (!option) return;
    setState((prev) => {
      if (prev.related.some((item) => item.id === option.id)) return prev;
      const updated = [...prev.related, option];
      return {
        ...prev,
        related: updated,
        form: { ...prev.form, relatedProductIds: updated.map((item) => item.id) },
      };
    });
  };

  const handleRemoveProduct = (id: string) => {
    setState((prev) => {
      const filtered = prev.related.filter((item) => item.id !== id);
      return {
        ...prev,
        related: filtered,
        form: { ...prev.form, relatedProductIds: filtered.map((item) => item.id) },
      };
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(() => {
      onSubmit({ ...form, relatedProductIds })
        .then((result) => {
          if (!result.success) {
            toast({
              title: t("admin.downloads.toast.saveFailedTitle"),
              description:
                result.message ?? t("admin.downloads.toast.saveFailedDescription"),
              variant: "destructive",
            });
            return;
          }
          toast({
            title: t("admin.downloads.toast.savedTitle"),
            description: t("admin.downloads.toast.savedDescription"),
          });
          router.push(`/admin/content/downloads/${result.id ?? ""}`);
          router.refresh();
        })
        .catch((error) => {
          console.error("Failed to save download", error);
          toast({
            title: t("admin.downloads.toast.saveFailedTitle"),
            description: t("admin.downloads.toast.unexpectedError"),
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
            {form._id ? t("admin.downloads.header.edit") : t("admin.downloads.header.new")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.downloads.header.hint")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content/downloads">{t("admin.downloads.actions.cancel")}</Link>
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending
              ? t("admin.downloads.actions.saving")
              : t("admin.downloads.actions.save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="space-y-1">
            <Label htmlFor="title">{t("admin.downloads.fields.title")}</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => handleChange("title", event.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="slug">{t("admin.downloads.fields.slug")}</Label>
            <Input
              id="slug"
              value={form.slug}
              onChange={(event) => handleChange("slug", event.target.value)}
              placeholder={t("admin.downloads.fields.slugPlaceholder")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="summary">{t("admin.downloads.fields.summary")}</Label>
            <Textarea
              id="summary"
              rows={4}
              value={form.summary}
              onChange={(event) => handleChange("summary", event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("admin.downloads.fields.status")}</Label>
            <Select
              value={form.status}
              onValueChange={(value) => handleChange("status", value as DownloadStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("admin.downloads.fields.status")} />
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
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <AssetUploader
            label={t("admin.downloads.asset.label")}
            description={t("admin.downloads.asset.description")}
            assetType="file"
            onChange={(value) => handleChange("fileAssetId", value?.assetId ?? null)}
          />
          {form.fileAssetId && (
            <p className="text-xs text-emerald-700">
              {t("admin.downloads.asset.ready")}{" "}
              <code className="bg-emerald-50 px-1">{form.fileAssetId}</code>
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {t("admin.downloads.related.title")}
            </p>
            <p className="text-xs text-slate-600">
              {t("admin.downloads.related.subtitle")}
            </p>
          </div>
          {related.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
              {t("admin.downloads.related.linkedCount", {
                count: related.length,
              })}
            </span>
          )}
        </div>
        <ReferencePicker
          label={t("admin.downloads.related.addProduct")}
          placeholder={t("admin.downloads.related.searchPlaceholder")}
          value={null}
          onChange={handleProductSelect}
          onSearch={searchProducts}
          allowClear={false}
        />
        {related.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {related.map((product) => (
              <span
                key={product.id}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-800"
              >
                {product.label || t("admin.downloads.fallback.product")}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-slate-500 hover:text-slate-800"
                  type="button"
                  onClick={() => handleRemoveProduct(product.id)}
                >
                  {t("admin.downloads.related.remove")}
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>
    </form>
  );
};

export default DownloadForm;
