"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormTabs, type FormSection } from "@/components/admin/backoffice/FormTabs";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";
import { ReferencePicker, type ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { StatusBadge } from "@/components/admin/promotions/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { DealFormState } from "./types";

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

const parseFloatOrUndefined = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseIntOrUndefined = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildInitialState = (values?: Partial<DealFormState>): DealFormState => {
  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return {
    _id: values?._id,
    dealId: values?.dealId ?? "",
    title: values?.title ?? "",
    locale: values?.locale ?? "en",
    status: values?.status ?? "draft",
    dealType: values?.dealType ?? "featured",
    productId: values?.productId,
    productLabel: values?.productLabel,
    originalPrice: values?.originalPrice,
    dealPrice: values?.dealPrice,
    badge: values?.badge ?? "",
    badgeColor: values?.badgeColor ?? "",
    showOnHomepage: Boolean(values?.showOnHomepage),
    priority: typeof values?.priority === "number" ? values.priority : 50,
    startDate: toDateTimeInputValue(values?.startDate ?? now.toISOString()),
    endDate: toDateTimeInputValue(values?.endDate ?? defaultEnd.toISOString()),
    quantityLimit: values?.quantityLimit,
    perCustomerLimit: typeof values?.perCustomerLimit === "number" ? values.perCustomerLimit : 1,
    soldCount: values?.soldCount,
    allowSoldCountOverride: Boolean(values?.allowSoldCountOverride),
  };
};

type DealFormProps = {
  initialValues?: Partial<DealFormState>;
  onSubmit: (values: DealFormState) => Promise<{
    success: boolean;
    id?: string;
    status?: string;
    message?: string;
  }>;
  onSearchProduct: (query: string) => Promise<ReferenceOption[]>;
};

export function DealForm({ initialValues, onSubmit, onSearchProduct }: DealFormProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [formState, setFormState] = useState<DealFormState>(buildInitialState(initialValues));
  const [selectedProduct, setSelectedProduct] = useState<ReferenceOption | null>(
    initialValues?.productId
      ? {
          id: initialValues.productId,
          label:
            initialValues.productLabel ||
            t("admin.marketing.deals.form.selectedProduct"),
        }
      : null,
  );
  const [dealIdDirty, setDealIdDirty] = useState(Boolean(initialValues?.dealId));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };

  const statusOptions = useMemo(
    () => [
      { value: "draft", label: t("admin.marketing.deals.status.draft") },
      { value: "active", label: t("admin.marketing.deals.status.active") },
      { value: "ended", label: t("admin.marketing.deals.status.ended") },
    ],
    [t],
  );

  const typeOptions = useMemo(
    () => [
      { value: "featured", label: t("admin.marketing.deals.templates.featured") },
      { value: "priceDrop", label: t("admin.marketing.deals.templates.priceDrop") },
      { value: "limitedQty", label: t("admin.marketing.deals.templates.limitedQty") },
      { value: "daily", label: t("admin.marketing.deals.templates.daily") },
      { value: "clearance", label: t("admin.marketing.deals.templates.clearance") },
    ],
    [t],
  );

  const statusLabel = (value: string) =>
    t(`admin.marketing.deals.status.${value}`, value);

  const discountPercent = useMemo(() => {
    if (typeof formState.originalPrice !== "number" || typeof formState.dealPrice !== "number") {
      return null;
    }
    const base = formState.originalPrice;
    if (!base || base <= 0) return null;
    const discount = Math.round(((base - formState.dealPrice) / base) * 100);
    return Number.isFinite(discount) ? discount : null;
  }, [formState.dealPrice, formState.originalPrice]);

  const handleTitleChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      title: value,
      dealId: dealIdDirty ? prev.dealId : slugify(value),
    }));
  };

  const handleDealIdChange = (value: string) => {
    setDealIdDirty(true);
    setFormState((prev) => ({ ...prev, dealId: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDealId = slugify(formState.dealId || formState.title);
    const productId = selectedProduct?.id ?? formState.productId;

    if (!formState.title.trim()) {
      setSubmitError(t("admin.marketing.deals.form.errors.titleRequired"));
      return;
    }

    if (!normalizedDealId) {
      setSubmitError(t("admin.marketing.deals.form.errors.dealIdRequired"));
      return;
    }

    if (!productId) {
      setSubmitError(t("admin.marketing.deals.form.errors.productRequired"));
      return;
    }

    if (typeof formState.dealPrice !== "number" || formState.dealPrice <= 0) {
      setSubmitError(t("admin.marketing.deals.form.errors.dealPriceInvalid"));
      return;
    }

    setSubmitError(null);

    const payload: DealFormState = {
      ...formState,
      dealId: normalizedDealId,
      productId,
      productLabel: selectedProduct?.label ?? formState.productLabel,
    };

    startTransition(() => {
      onSubmit(payload)
        .then((result) => {
          if (!result.success) {
            const errorMessage = resolveMessage(
              result.message,
              "admin.marketing.deals.form.errors.saveFailed",
            );
            setSubmitError(errorMessage);
            toast({
              description: errorMessage,
            });
            return;
          }

          toast({ description: t("admin.marketing.deals.form.success.saved") });

          if (!payload._id && result.id) {
            router.replace(`/admin/marketing/deals/${result.id}`);
          } else if (result.id) {
            setFormState((prev) => ({ ...prev, _id: result.id }));
          }
        })
        .catch((error) => {
          console.error("Failed to save deal", error);
          setSubmitError(t("admin.marketing.deals.form.errors.saveFailed"));
          toast({ description: t("admin.marketing.deals.form.errors.saveFailedToast") });
        });
    });
  };

  const sections: FormSection[] = useMemo(() => {
    const setupSection = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">{t("admin.marketing.deals.form.titleLabel")}</Label>
          <Input
            id="title"
            value={formState.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder={t("admin.marketing.deals.form.titlePlaceholder")}
          />
          <p className="text-xs text-slate-500">
            {t("admin.marketing.deals.form.titleHelper")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dealId">{t("admin.marketing.deals.form.dealIdLabel")}</Label>
          <Input
            id="dealId"
            value={formState.dealId}
            onChange={(event) => handleDealIdChange(event.target.value)}
            placeholder={t("admin.marketing.deals.form.dealIdPlaceholder")}
          />
          <p className="text-xs text-slate-500">
            {t("admin.marketing.deals.form.dealIdHelper")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("admin.marketing.deals.form.statusLabel")}</Label>
          <Select
            value={formState.status}
            onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t("admin.marketing.deals.form.statusPlaceholder")} />
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

        <div className="space-y-2">
          <Label htmlFor="dealType">{t("admin.marketing.deals.form.templateLabel")}</Label>
          <Select
            value={formState.dealType}
            onValueChange={(value) => setFormState((prev) => ({ ...prev, dealType: value }))}
          >
            <SelectTrigger id="dealType">
              <SelectValue
                placeholder={t("admin.marketing.deals.form.templatePlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ReferencePicker
          label={t("admin.marketing.deals.form.productLabel")}
          placeholder={t("admin.marketing.deals.form.productPlaceholder")}
          description={t("admin.marketing.deals.form.productHelper")}
          value={selectedProduct}
          onChange={(option) => {
            setSelectedProduct(option);
            setFormState((prev) => ({
              ...prev,
              productId: option?.id,
              productLabel: option?.label,
            }));
          }}
          onSearch={onSearchProduct}
          className="md:col-span-2"
        />

        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
          <div>
            <p className="text-sm font-medium text-slate-800">
              {t("admin.marketing.deals.form.showOnHomepageLabel")}
            </p>
            <p className="text-xs text-slate-500">
              {t("admin.marketing.deals.form.showOnHomepageHelper")}
            </p>
          </div>
          <Switch
            checked={Boolean(formState.showOnHomepage)}
            onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, showOnHomepage: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">{t("admin.marketing.deals.form.priorityLabel")}</Label>
          <Input
            id="priority"
            type="number"
            min={0}
            max={100}
            value={typeof formState.priority === "number" ? formState.priority : ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                priority: parseIntOrUndefined(event.target.value),
              }))
            }
            placeholder={t("admin.marketing.deals.form.priorityPlaceholder")}
          />
          <p className="text-xs text-slate-500">
            {t("admin.marketing.deals.form.priorityHelper")}
          </p>
        </div>
      </div>
    );

    const pricingSection = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="originalPrice">
            {t("admin.marketing.deals.form.originalPriceLabel")}
          </Label>
          <Input
            id="originalPrice"
            type="number"
            min={0}
            step="0.01"
            value={typeof formState.originalPrice === "number" ? formState.originalPrice : ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                originalPrice: parseFloatOrUndefined(event.target.value),
              }))
            }
            placeholder={t("admin.marketing.deals.form.originalPricePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dealPrice">
            {t("admin.marketing.deals.form.dealPriceLabel")}
          </Label>
          <Input
            id="dealPrice"
            type="number"
            min={0}
            step="0.01"
            required
            value={typeof formState.dealPrice === "number" ? formState.dealPrice : ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                dealPrice: parseFloatOrUndefined(event.target.value),
              }))
            }
            placeholder={t("admin.marketing.deals.form.dealPricePlaceholder")}
          />
        </div>

        <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2">
          <p className="text-xs font-medium text-slate-600">
            {t("admin.marketing.deals.form.atAGlance")}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-800">
            <Badge variant="secondary">
              {t(`admin.marketing.deals.templates.${formState.dealType}`, formState.dealType)}
            </Badge>
            <span>
              {t("admin.marketing.deals.form.statusSummary", {
                status: statusLabel(formState.status),
              })}
            </span>
            {typeof formState.dealPrice === "number" && (
              <span>
                {t("admin.marketing.deals.form.dealPriceSummary", {
                  price: formState.dealPrice.toFixed(2),
                })}
              </span>
            )}
            {typeof formState.originalPrice === "number" && (
              <span>
                {t("admin.marketing.deals.form.originalPriceSummary", {
                  price: formState.originalPrice.toFixed(2),
                })}
              </span>
            )}
            {discountPercent !== null && (
              <span className="text-emerald-700">
                {t("admin.marketing.deals.form.discountSummary", {
                  percent: discountPercent,
                })}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="badge">{t("admin.marketing.deals.form.badgeLabel")}</Label>
          <Input
            id="badge"
            value={formState.badge ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, badge: event.target.value }))}
            placeholder={t("admin.marketing.deals.form.badgePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="badgeColor">
            {t("admin.marketing.deals.form.badgeColorLabel")}
          </Label>
          <Input
            id="badgeColor"
            value={formState.badgeColor ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, badgeColor: event.target.value }))}
            placeholder={t("admin.marketing.deals.form.badgeColorPlaceholder")}
          />
        </div>
      </div>
    );

    const limitsSection = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">
            {t("admin.marketing.deals.form.startDateLabel")}
          </Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formState.startDate ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">
            {t("admin.marketing.deals.form.endDateLabel")}
          </Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formState.endDate ?? ""}
            onChange={(event) => setFormState((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantityLimit">
            {t("admin.marketing.deals.form.quantityLimitLabel")}
          </Label>
          <Input
            id="quantityLimit"
            type="number"
            min={1}
            value={typeof formState.quantityLimit === "number" ? formState.quantityLimit : ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                quantityLimit: parseIntOrUndefined(event.target.value),
              }))
            }
            placeholder={t("admin.marketing.deals.form.quantityLimitPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perCustomerLimit">
            {t("admin.marketing.deals.form.perCustomerLimitLabel")}
          </Label>
          <Input
            id="perCustomerLimit"
            type="number"
            min={1}
            value={typeof formState.perCustomerLimit === "number" ? formState.perCustomerLimit : ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                perCustomerLimit: parseIntOrUndefined(event.target.value),
              }))
            }
            placeholder={t("admin.marketing.deals.form.perCustomerLimitPlaceholder")}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="soldCount">
              {t("admin.marketing.deals.form.soldCountLabel")}
            </Label>
            {!formState.allowSoldCountOverride && (
              <ConfirmDialog
                trigger={
                  <Button type="button" size="sm" variant="outline">
                    {t("admin.marketing.deals.form.soldCountOverride")}
                  </Button>
                }
                title={t("admin.marketing.deals.form.soldCountOverrideTitle")}
                description={t(
                  "admin.marketing.deals.form.soldCountOverrideDescription"
                )}
                variant="danger"
                onConfirm={() =>
                  setFormState((prev) => ({
                    ...prev,
                    allowSoldCountOverride: true,
                  }))
                }
              />
            )}
            {formState.allowSoldCountOverride && (
              <Badge variant="secondary">
                {t("admin.marketing.deals.form.soldCountOverrideEnabled")}
              </Badge>
            )}
          </div>
          <Input
            id="soldCount"
            type="number"
            min={0}
            value={typeof formState.soldCount === "number" ? formState.soldCount : ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                soldCount: parseIntOrUndefined(event.target.value),
              }))
            }
            disabled={!formState.allowSoldCountOverride}
          />
          <p className="text-xs text-slate-500">
            {formState.allowSoldCountOverride
              ? t("admin.marketing.deals.form.soldCountHelperEnabled")
              : t("admin.marketing.deals.form.soldCountHelper")}
          </p>
        </div>
      </div>
    );

    return [
      {
        id: "setup",
        label: t("admin.marketing.deals.form.sections.setup.label"),
        description: t("admin.marketing.deals.form.sections.setup.description"),
        content: setupSection,
      },
      {
        id: "pricing",
        label: t("admin.marketing.deals.form.sections.pricing.label"),
        description: t("admin.marketing.deals.form.sections.pricing.description"),
        content: pricingSection,
      },
      {
        id: "limits",
        label: t("admin.marketing.deals.form.sections.limits.label"),
        description: t("admin.marketing.deals.form.sections.limits.description"),
        content: limitsSection,
      },
    ];
  }, [dealIdDirty, discountPercent, formState, onSearchProduct, selectedProduct, t]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("admin.marketing.deals.form.title")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.marketing.deals.form.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={formState.status} />
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t("admin.marketing.deals.form.saving")
              : t("admin.marketing.deals.form.save")}
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <FormTabs sections={sections} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? t("admin.marketing.deals.form.saving")
            : t("admin.marketing.deals.form.save")}
        </Button>
      </div>
    </form>
  );
}

export default DealForm;
