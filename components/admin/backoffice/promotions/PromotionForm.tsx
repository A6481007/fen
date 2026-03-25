"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormTabs, type FormSection } from "@/components/admin/backoffice/FormTabs";
import { StatusBadge } from "@/components/admin/promotions/StatusBadge";
import type { ReferenceOption } from "@/components/admin/backoffice/ReferencePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PromotionTargetProductTree } from "./PromotionTargetProductTree";
import type { PromotionFormState, PromotionTargetCategoryNode } from "./types";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/admin/backoffice/ConfirmDialog";

const statusOptions = [
  { value: "draft", labelKey: "admin.promotions.form.status.draft", defaultLabel: "Draft" },
  { value: "scheduled", labelKey: "admin.promotions.form.status.scheduled", defaultLabel: "Scheduled" },
  { value: "active", labelKey: "admin.promotions.form.status.active", defaultLabel: "Active" },
  { value: "paused", labelKey: "admin.promotions.form.status.paused", defaultLabel: "Paused" },
  { value: "ended", labelKey: "admin.promotions.form.status.ended", defaultLabel: "Ended" },
] as const;

const templateOptions = [
  { value: "flashSale", labelKey: "admin.promotions.form.template.flashSale", defaultLabel: "Flash Sale" },
  { value: "seasonal", labelKey: "admin.promotions.form.template.seasonal", defaultLabel: "Seasonal" },
  { value: "bundle", labelKey: "admin.promotions.form.template.bundle", defaultLabel: "Bundle / BXGY" },
  { value: "loyalty", labelKey: "admin.promotions.form.template.loyalty", defaultLabel: "Loyalty" },
  { value: "clearance", labelKey: "admin.promotions.form.template.clearance", defaultLabel: "Clearance" },
  { value: "winBack", labelKey: "admin.promotions.form.template.winBack", defaultLabel: "Win-Back" },
  { value: "firstPurchase", labelKey: "admin.promotions.form.template.firstPurchase", defaultLabel: "First Purchase" },
  { value: "freeShipping", labelKey: "admin.promotions.form.template.freeShipping", defaultLabel: "Free Shipping" },
] as const;

const discountTypeOptions = [
  { value: "percentage", labelKey: "admin.promotions.form.discountType.percentage", defaultLabel: "Percentage" },
  { value: "fixed", labelKey: "admin.promotions.form.discountType.fixed", defaultLabel: "Fixed Amount" },
  { value: "bxgy", labelKey: "admin.promotions.form.discountType.bxgy", defaultLabel: "Buy X Get Y" },
  { value: "freeShipping", labelKey: "admin.promotions.form.discountType.freeShipping", defaultLabel: "Free Shipping" },
  { value: "points", labelKey: "admin.promotions.form.discountType.points", defaultLabel: "Bonus Points" },
] as const;

const segmentOptions = [
  { value: "allCustomers", labelKey: "admin.promotions.form.segment.allCustomers", defaultLabel: "All Customers" },
  { value: "firstTime", labelKey: "admin.promotions.form.segment.firstTime", defaultLabel: "First-Time Buyers" },
  { value: "returning", labelKey: "admin.promotions.form.segment.returning", defaultLabel: "Returning Customers" },
  { value: "vip", labelKey: "admin.promotions.form.segment.vip", defaultLabel: "VIP Members" },
  { value: "cartAbandoner", labelKey: "admin.promotions.form.segment.cartAbandoner", defaultLabel: "Cart Abandoners" },
  { value: "inactive", labelKey: "admin.promotions.form.segment.inactive", defaultLabel: "Inactive Users" },
] as const;

const timezoneOptions = [
  { value: "UTC", labelKey: "admin.promotions.form.timezone.utc", defaultLabel: "UTC" },
  { value: "America/Los_Angeles", labelKey: "admin.promotions.form.timezone.pacific", defaultLabel: "Pacific Time (LA)" },
  { value: "America/New_York", labelKey: "admin.promotions.form.timezone.eastern", defaultLabel: "Eastern Time (NY)" },
  { value: "Asia/Bangkok", labelKey: "admin.promotions.form.timezone.bangkok", defaultLabel: "Bangkok" },
  { value: "Europe/London", labelKey: "admin.promotions.form.timezone.london", defaultLabel: "London" },
] as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);

const buildCampaignId = (value: string) => {
  const base = slugify(value) || "promo";
  const suffix = Math.random().toString(36).slice(-4);
  return `${base}-${suffix}`;
};

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (input: number) => `${input}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildInitialState = (values?: Partial<PromotionFormState>): PromotionFormState => {
  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    _id: values?._id,
    name: values?.name ?? "",
    campaignId: values?.campaignId ?? "",
    slug: values?.slug ?? "",
    locale: values?.locale ?? "en",
    status: values?.status ?? "draft",
    type: values?.type ?? "flashSale",
    priority: typeof values?.priority === "number" ? values.priority : 50,
    discountType: values?.discountType ?? "percentage",
    discountValue: values?.discountValue,
    buyQuantity: values?.buyQuantity,
    getQuantity: values?.getQuantity,
    minimumOrderValue: values?.minimumOrderValue,
    startDate: toDateTimeInputValue(values?.startDate ?? now.toISOString()),
    endDate: toDateTimeInputValue(values?.endDate ?? defaultEnd.toISOString()),
    timezone: values?.timezone ?? "UTC",
    segmentType: values?.segmentType ?? "allCustomers",
    heroMessage: values?.heroMessage ?? "",
    shortDescription: values?.shortDescription ?? "",
    badgeLabel: values?.badgeLabel ?? "",
    badgeColor: values?.badgeColor ?? "",
    ctaText: values?.ctaText ?? "",
    ctaLink: values?.ctaLink ?? "",
    budgetCap: values?.budgetCap,
    usageLimit: values?.usageLimit,
    perCustomerLimit: values?.perCustomerLimit,
    utmSource: values?.utmSource ?? "",
    utmMedium: values?.utmMedium ?? "",
    utmCampaign: values?.utmCampaign ?? "",
    trackingPixelId: values?.trackingPixelId ?? "",
    internalNotes: values?.internalNotes ?? "",
    targetProducts: values?.targetProducts ?? [],
    targetCategories: values?.targetCategories ?? [],
    defaultProducts: values?.defaultProducts ?? [],
    defaultBundleItems: values?.defaultBundleItems ?? [],
  };
};

const normalizePositiveQuantity = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
};

type PromotionFormProps = {
  initialValues?: Partial<PromotionFormState>;
  analyticsHref?: string;
  onSearchProducts?: (query: string) => Promise<ReferenceOption[]>;
  onSearchCategories?: (query: string) => Promise<ReferenceOption[]>;
  onLoadTargetProductTree?: () => Promise<PromotionTargetCategoryNode[]>;
  onSubmit: (values: PromotionFormState) => Promise<{
    success: boolean;
    id?: string;
    status?: string;
    message?: string;
  }>;
  onDelete?: (id: string) => Promise<{ success: boolean; message?: string }>;
  canDelete?: boolean;
};

export function PromotionForm({
  initialValues,
  analyticsHref,
  onSearchProducts,
  onSearchCategories,
  onLoadTargetProductTree,
  onSubmit,
  onDelete,
  canDelete = false,
}: PromotionFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const resolveMessage = (message: string | undefined, fallbackKey: string) => {
    if (!message) return t(fallbackKey);
    return message.startsWith("admin.") ? t(message) : message;
  };
  const [formState, setFormState] = useState<PromotionFormState>(buildInitialState(initialValues));
  const [slugDirty, setSlugDirty] = useState(Boolean(initialValues?.slug));
  const [campaignDirty, setCampaignDirty] = useState(Boolean(initialValues?.campaignId));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [targetProductQuery, setTargetProductQuery] = useState("");
  const [targetCategoryQuery, setTargetCategoryQuery] = useState("");
  const [bxgyGetProductQuery, setBxgyGetProductQuery] = useState("");
  const [targetProductOptions, setTargetProductOptions] = useState<ReferenceOption[]>([]);
  const [targetCategoryOptions, setTargetCategoryOptions] = useState<ReferenceOption[]>([]);
  const [bxgyGetProductOptions, setBxgyGetProductOptions] = useState<ReferenceOption[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [isSearchingCategories, setIsSearchingCategories] = useState(false);
  const [isSearchingBxgyGetProducts, setIsSearchingBxgyGetProducts] = useState(false);
  const bxgyGetSelections = useMemo(
    () =>
      formState.defaultBundleItems
        .filter((item) => item.isFree)
        .map((item) => ({
          id: item.productId,
          label: item.productLabel || item.productId,
        })),
    [formState.defaultBundleItems],
  );
  const bxgyBuySelections = useMemo(
    () =>
      formState.targetProducts.map((item) => ({
        id: item.id,
        label: item.label || item.id,
      })),
    [formState.targetProducts],
  );

  const handleNameChange = (value: string) => {
    setFormState((prev) => ({
      ...prev,
      name: value,
      slug: slugDirty ? prev.slug : slugify(value),
      campaignId: campaignDirty ? prev.campaignId : slugify(value),
    }));
  };

  const handleSlugChange = (value: string) => {
    setSlugDirty(true);
    setFormState((prev) => ({ ...prev, slug: value }));
  };

  const handleCampaignIdChange = (value: string) => {
    setCampaignDirty(true);
    setFormState((prev) => ({ ...prev, campaignId: value }));
  };

  const parseNumberInput = (value: string) => {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const addUniqueReference = (
    items: PromotionFormState["targetProducts"],
    option: ReferenceOption
  ): PromotionFormState["targetProducts"] => {
    if (items.some((item) => item.id === option.id)) return items;
    return [...items, { id: option.id, label: option.label, quantity: 1 }];
  };

  const removeReference = (
    items: PromotionFormState["targetProducts"],
    id: string
  ): PromotionFormState["targetProducts"] => items.filter((item) => item.id !== id);

  const syncBxgyBuySelections = (
    next: Array<{ id: string; label?: string }>,
    current: PromotionFormState["targetProducts"],
  ): PromotionFormState["targetProducts"] =>
    next.map((item) => {
      const existing = current.find((entry) => entry.id === item.id);
      return {
        id: item.id,
        label: item.label ?? existing?.label ?? item.id,
        quantity: normalizePositiveQuantity(existing?.quantity),
      };
    });

  const syncBxgyGetSelections = (
    next: Array<{ id: string; label?: string }>,
    current: PromotionFormState["defaultBundleItems"],
  ): PromotionFormState["defaultBundleItems"] => {
    const buyItems = current.filter((item) => !item.isFree);
    const existingGetItems = current.filter((item) => item.isFree);

    return [
      ...buyItems,
      ...next.map((item) => {
        const existing = existingGetItems.find((entry) => entry.productId === item.id);
        return {
          productId: item.id,
          productLabel: item.label ?? existing?.productLabel ?? item.id,
          quantity: normalizePositiveQuantity(existing?.quantity),
          isFree: true,
        };
      }),
    ];
  };

  const hasInvalidBxgyBuyQuantities = formState.targetProducts.some(
    (item) => normalizePositiveQuantity(item.quantity) < 1,
  );
  const hasInvalidBxgyGetQuantities = formState.defaultBundleItems
    .filter((item) => item.isFree)
    .some((item) => normalizePositiveQuantity(item.quantity) < 1);

  useEffect(() => {
    if (!onSearchProducts) return;
    let active = true;
    setIsSearchingProducts(true);
    const timer = setTimeout(() => {
      onSearchProducts(targetProductQuery)
        .then((results) => {
          if (!active) return;
          setTargetProductOptions(Array.isArray(results) ? results : []);
        })
        .catch((error) => {
          console.error("search products failed", error);
          if (active) setTargetProductOptions([]);
        })
        .finally(() => {
          if (active) setIsSearchingProducts(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [onSearchProducts, targetProductQuery]);

  useEffect(() => {
    if (!onSearchProducts) return;
    let active = true;
    setIsSearchingBxgyGetProducts(true);
    const timer = setTimeout(() => {
      onSearchProducts(bxgyGetProductQuery)
        .then((results) => {
          if (!active) return;
          setBxgyGetProductOptions(Array.isArray(results) ? results : []);
        })
        .catch((error) => {
          console.error("search bxgy get products failed", error);
          if (active) setBxgyGetProductOptions([]);
        })
        .finally(() => {
          if (active) setIsSearchingBxgyGetProducts(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [onSearchProducts, bxgyGetProductQuery]);

  useEffect(() => {
    if (!onSearchCategories) return;
    let active = true;
    setIsSearchingCategories(true);
    const timer = setTimeout(() => {
      onSearchCategories(targetCategoryQuery)
        .then((results) => {
          if (!active) return;
          setTargetCategoryOptions(Array.isArray(results) ? results : []);
        })
        .catch((error) => {
          console.error("search categories failed", error);
          if (active) setTargetCategoryOptions([]);
        })
        .finally(() => {
          if (active) setIsSearchingCategories(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [onSearchCategories, targetCategoryQuery]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const slugValue = (formState.slug || slugify(formState.name)).trim();
    if (!slugValue) {
      setSubmitError(t("admin.promotions.form.errors.slugRequired"));
      return;
    }

    const campaignValue = (formState.campaignId || slugValue).trim();
    if (!/^[a-z0-9-]+$/.test(campaignValue)) {
      setSubmitError(t("admin.promotions.form.errors.campaignIdInvalid"));
      return;
    }

    if (!formState.startDate || !formState.endDate) {
      setSubmitError(t("admin.promotions.form.errors.dateRequired"));
      return;
    }

    if (
      formState.discountType === "bxgy" &&
      (
        formState.targetProducts.length === 0 ||
        formState.defaultBundleItems.filter((item) => item.isFree).length === 0 ||
        hasInvalidBxgyBuyQuantities ||
        hasInvalidBxgyGetQuantities
      )
    ) {
      setSubmitError(
        t(
          "admin.promotions.form.errors.bxgyQuantityRequired",
          "Buy X Get Y promotions require buy and get products with quantities greater than 0."
        ),
      );
      return;
    }

    setSubmitError(null);

    const payload: PromotionFormState = {
      ...formState,
      slug: slugValue,
      campaignId: campaignValue,
    };

    startTransition(() => {
      onSubmit(payload)
        .then((result) => {
          if (!result.success) {
            setSubmitError(resolveMessage(result.message, "admin.promotions.form.errors.saveFailed"));
            toast({ description: resolveMessage(result.message, "admin.promotions.form.errors.saveFailedNow") });
            return;
          }

          toast({ description: t("admin.promotions.form.toast.saved") });

          if (!payload._id && result.id) {
            router.replace(`/admin/marketing/promotions/${result.id}`);
          } else if (result.id) {
            setFormState((prev) => ({ ...prev, _id: result.id }));
          }
        })
        .catch((error) => {
          console.error("Failed to save promotion", error);
          setSubmitError(t("admin.promotions.form.errors.saveFailed"));
          toast({ description: t("admin.promotions.form.errors.saveFailedNow") });
        });
    });
  };

  const handleDelete = () => {
    if (!formState._id || !onDelete) return;
    startDeleteTransition(() => {
      onDelete(formState._id as string)
        .then((result) => {
          if (!result.success) {
            toast({
              variant: "destructive",
              description: resolveMessage(result.message, "admin.promotions.form.errors.saveFailed"),
            });
            return;
          }
          toast({ description: t("admin.promotions.form.toast.deleted", "Promotion deleted") });
          router.replace("/admin/marketing/promotions");
        })
        .catch((error) => {
          console.error("Failed to delete promotion", error);
          toast({
            variant: "destructive",
            description: t("admin.promotions.form.errors.saveFailed"),
          });
        });
    });
  };

  const sections: FormSection[] = useMemo(() => {
    const template = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">{t("admin.promotions.form.template.label")}</Label>
          <Select
            value={formState.type}
            onValueChange={(value) => setFormState((prev) => ({ ...prev, type: value }))}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder={t("admin.promotions.form.template.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {templateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">{t("admin.promotions.form.priority.label")}</Label>
          <Input
            id="priority"
            type="number"
            value={formState.priority ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                priority: parseNumberInput(event.target.value),
              }))
            }
            placeholder={t("admin.promotions.form.priority.placeholder")}
          />
        </div>

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {t("admin.promotions.form.template.hint")}
        </div>
      </div>
    );

    const basics = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">{t("admin.promotions.form.basics.name")}</Label>
          <Input
            id="name"
            value={formState.name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder={t("admin.promotions.form.basics.namePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="slug">{t("admin.promotions.form.basics.slug")}</Label>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => handleSlugChange(slugify(formState.name))}
            >
              {t("admin.promotions.form.basics.regenerate")}
            </Button>
          </div>
          <Input
            id="slug"
            value={formState.slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            placeholder={t("admin.promotions.form.basics.slugPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="campaignId">{t("admin.promotions.form.basics.campaignId")}</Label>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => handleCampaignIdChange(buildCampaignId(formState.name || "promo"))}
            >
              {t("admin.promotions.form.basics.generateId")}
            </Button>
          </div>
          <Input
            id="campaignId"
            value={formState.campaignId}
            onChange={(event) => handleCampaignIdChange(event.target.value)}
            placeholder={t("admin.promotions.form.basics.campaignIdPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("admin.promotions.form.basics.status")}</Label>
          <Select
            value={formState.status}
            onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder={t("admin.promotions.form.basics.statusPlaceholder")} />
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
    );

    const discount = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="discountType">{t("admin.promotions.form.discount.type")}</Label>
          <Select
            value={formState.discountType}
            onValueChange={(value) =>
              setFormState((prev) => ({
                ...prev,
                discountType: value,
                ...(value === "bxgy" ? { targetCategories: [] } : {}),
              }))
            }
          >
            <SelectTrigger id="discountType">
              <SelectValue placeholder={t("admin.promotions.form.discount.typePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {discountTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formState.discountType !== "freeShipping" && formState.discountType !== "bxgy" && (
          <div className="space-y-2">
            <Label htmlFor="discountValue">{t("admin.promotions.form.discount.value")}</Label>
            <Input
              id="discountValue"
              type="number"
              value={formState.discountValue ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  discountValue: parseNumberInput(event.target.value),
                }))
              }
              placeholder={t("admin.promotions.form.discount.valuePlaceholder")}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="minimumOrderValue">{t("admin.promotions.form.discount.minimumOrderValue")}</Label>
          <Input
            id="minimumOrderValue"
            type="number"
            value={formState.minimumOrderValue ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                minimumOrderValue: parseNumberInput(event.target.value),
              }))
            }
            placeholder={t("admin.promotions.form.discount.minimumOrderPlaceholder")}
          />
        </div>

        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {t("admin.promotions.form.discount.hint")}
        </div>
      </div>
    );

    const targeting = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="segmentType">{t("admin.promotions.form.targeting.segment")}</Label>
          <Select
            value={formState.segmentType}
            onValueChange={(value) => setFormState((prev) => ({ ...prev, segmentType: value }))}
          >
            <SelectTrigger id="segmentType">
              <SelectValue placeholder={t("admin.promotions.form.targeting.segmentPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {segmentOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formState.discountType === "bxgy" ? (
          <div className="space-y-2 md:col-span-2">
            <PromotionTargetProductTree
              inputId="bxgy-buy-products"
              value={bxgyBuySelections}
              onChange={(next) =>
                setFormState((prev) => ({
                  ...prev,
                  targetProducts: syncBxgyBuySelections(next, prev.targetProducts),
                }))
              }
              onLoadTree={onLoadTargetProductTree}
              label={t("admin.promotions.form.targeting.bxgyBuyProducts", "Customer buys from (specific products)")}
              placeholder={t(
                "admin.promotions.form.targeting.bxgyBuyProductsPlaceholder",
                "Search buy categories or products"
              )}
              loadingLabel={t("admin.referencePicker.searching", "Searching...")}
              emptyLabel={t("admin.referencePicker.noResults", "No results found")}
              clearLabel={t("admin.promotions.form.targeting.clearProducts", "Clear")}
              selectedLabel={t("admin.promotions.form.targeting.selectedBuyProducts", "Selected buy products")}
              removeLabel={t("admin.promotions.form.targeting.removeProduct", "Remove product")}
            />
            {formState.targetProducts.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {formState.targetProducts.map((item) => (
                  <div
                    key={`bxgy-buy-qty-${item.id}`}
                    className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.label || item.id}</p>
                      <p className="truncate text-xs text-slate-500">{item.id}</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`bxgy-buy-quantity-${item.id}`}>
                        {t("admin.promotions.form.targeting.buyProductQuantity", "Buy quantity")}
                      </Label>
                      <Input
                        id={`bxgy-buy-quantity-${item.id}`}
                        type="number"
                        min={1}
                        value={item.quantity ?? 1}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            targetProducts: prev.targetProducts.map((entry) =>
                              entry.id === item.id
                                ? {
                                    ...entry,
                                    quantity: normalizePositiveQuantity(parseNumberInput(event.target.value)),
                                  }
                                : entry,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            targetProducts: removeReference(prev.targetProducts, item.id),
                          }))
                        }
                      >
                        {t("admin.promotions.form.targeting.removeProduct", "Remove product")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {onSearchProducts && formState.discountType === "__disabled__" ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bxgy-buy-products">
              {t("admin.promotions.form.targeting.bxgyBuyProducts", "Customer buys from (specific products)")}
            </Label>
            <Input
              id="bxgy-buy-products"
              value={targetProductQuery}
              onChange={(event) => setTargetProductQuery(event.target.value)}
              placeholder={t(
                "admin.promotions.form.targeting.bxgyBuyProductsPlaceholder",
                "Search buy products"
              )}
            />
            <div className="max-h-40 overflow-auto rounded-md border border-slate-200 bg-white">
              {isSearchingProducts ? (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.searching", "Searching...")}
                </p>
              ) : targetProductOptions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {targetProductOptions.map((option) => (
                    <button
                      key={`bxgy-buy-${option.id}`}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          targetProducts: addUniqueReference(prev.targetProducts, option),
                        }))
                      }
                    >
                      <span className="block font-medium text-slate-800">{option.label}</span>
                      {option.description ? (
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.noResults", "No results found")}
                </p>
              )}
            </div>
            {formState.targetProducts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formState.targetProducts.map((item) => (
                  <Badge key={`bxgy-buy-badge-${item.id}`} variant="secondary" className="inline-flex items-center gap-2">
                    <span>{item.label || item.id}</span>
                    <button
                      type="button"
                      className="text-slate-600 hover:text-slate-900"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          targetProducts: removeReference(prev.targetProducts, item.id),
                        }))
                      }
                      aria-label={t("admin.promotions.form.targeting.removeProduct", "Remove product")}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {formState.discountType === "bxgy" ? (
          <div className="space-y-2 md:col-span-2">
            <PromotionTargetProductTree
              inputId="bxgy-get-products"
              value={bxgyGetSelections}
              onChange={(next) =>
                setFormState((prev) => ({
                  ...prev,
                  defaultBundleItems: syncBxgyGetSelections(next, prev.defaultBundleItems),
                }))
              }
              onLoadTree={onLoadTargetProductTree}
              label={t("admin.promotions.form.targeting.bxgyGetProducts", "Customer gets from (specific products)")}
              placeholder={t(
                "admin.promotions.form.targeting.bxgyGetProductsPlaceholder",
                "Search free categories or products"
              )}
              loadingLabel={t("admin.referencePicker.searching", "Searching...")}
              emptyLabel={t("admin.referencePicker.noResults", "No results found")}
              clearLabel={t("admin.promotions.form.targeting.clearProducts", "Clear")}
              selectedLabel={t("admin.promotions.form.targeting.selectedGetProducts", "Selected free products")}
              removeLabel={t("admin.promotions.form.targeting.removeProduct", "Remove product")}
            />
            {formState.defaultBundleItems.filter((item) => item.isFree).length > 0 ? (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                {formState.defaultBundleItems
                  .filter((item) => item.isFree)
                  .map((item) => (
                    <div
                      key={`bxgy-get-qty-${item.productId}`}
                      className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.productLabel || item.productId}
                        </p>
                        <p className="truncate text-xs text-slate-500">{item.productId}</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`bxgy-get-quantity-${item.productId}`}>
                          {t("admin.promotions.form.targeting.getProductQuantity", "Get quantity")}
                        </Label>
                        <Input
                          id={`bxgy-get-quantity-${item.productId}`}
                          type="number"
                          min={1}
                          value={item.quantity ?? 1}
                          onChange={(event) =>
                            setFormState((prev) => ({
                              ...prev,
                              defaultBundleItems: prev.defaultBundleItems.map((entry) =>
                                entry.productId === item.productId && entry.isFree
                                  ? {
                                      ...entry,
                                      quantity: normalizePositiveQuantity(parseNumberInput(event.target.value)),
                                    }
                                  : entry,
                              ),
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              defaultBundleItems: prev.defaultBundleItems.filter(
                                (entry) => !(entry.productId === item.productId && entry.isFree),
                              ),
                            }))
                          }
                        >
                          {t("admin.promotions.form.targeting.removeProduct", "Remove product")}
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {onSearchProducts && formState.discountType === "__disabled__" ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bxgy-get-products">
              {t("admin.promotions.form.targeting.bxgyGetProducts", "Customer gets from (specific products)")}
            </Label>
            <Input
              id="bxgy-get-products"
              value={bxgyGetProductQuery}
              onChange={(event) => setBxgyGetProductQuery(event.target.value)}
              placeholder={t(
                "admin.promotions.form.targeting.bxgyGetProductsPlaceholder",
                "Search free products"
              )}
            />
            <div className="max-h-40 overflow-auto rounded-md border border-slate-200 bg-white">
              {isSearchingBxgyGetProducts ? (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.searching", "Searching...")}
                </p>
              ) : bxgyGetProductOptions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {bxgyGetProductOptions.map((option) => (
                    <button
                      key={`bxgy-get-${option.id}`}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() =>
                        setFormState((prev) => {
                          const exists = prev.defaultBundleItems.some(
                            (item) => item.productId === option.id && item.isFree
                          );
                          if (exists) return prev;
                          return {
                            ...prev,
                            defaultBundleItems: [
                              ...prev.defaultBundleItems,
                              {
                                productId: option.id,
                                productLabel: option.label,
                                quantity: 1,
                                isFree: true,
                              },
                            ],
                          };
                        })
                      }
                    >
                      <span className="block font-medium text-slate-800">{option.label}</span>
                      {option.description ? (
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.noResults", "No results found")}
                </p>
              )}
            </div>
            {formState.defaultBundleItems.filter((item) => item.isFree).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formState.defaultBundleItems
                  .filter((item) => item.isFree)
                  .map((item) => (
                    <Badge
                      key={`bxgy-get-badge-${item.productId}`}
                      variant="secondary"
                      className="inline-flex items-center gap-2"
                    >
                      <span>{item.productLabel || item.productId}</span>
                      <button
                        type="button"
                        className="text-slate-600 hover:text-slate-900"
                        onClick={() =>
                          setFormState((prev) => ({
                            ...prev,
                            defaultBundleItems: prev.defaultBundleItems.filter(
                              (entry) => !(entry.productId === item.productId && entry.isFree)
                            ),
                          }))
                        }
                        aria-label={t("admin.promotions.form.targeting.removeProduct", "Remove product")}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {formState.discountType !== "bxgy" ? (
          <div className="space-y-2 md:col-span-2">
            <PromotionTargetProductTree
              value={formState.targetProducts}
              onChange={(next) => setFormState((prev) => ({ ...prev, targetProducts: next }))}
              onLoadTree={onLoadTargetProductTree}
              label={t("admin.promotions.form.targeting.products", "Target products")}
              placeholder={t(
                "admin.promotions.form.targeting.productsPlaceholder",
                "Search categories or products"
              )}
              loadingLabel={t("admin.referencePicker.searching", "Searching...")}
              emptyLabel={t("admin.referencePicker.noResults", "No results found")}
              clearLabel={t("admin.promotions.form.targeting.clearProducts", "Clear")}
              selectedLabel={t("admin.promotions.form.targeting.selectedProducts", "Selected products")}
              removeLabel={t("admin.promotions.form.targeting.removeProduct", "Remove product")}
            />
          </div>
        ) : null}

        {onSearchProducts && formState.discountType === "__disabled__" ? (
          <div className="space-y-2">
            <Label htmlFor="target-product-search">
              {t("admin.promotions.form.targeting.products", "Target products")}
            </Label>
            <Input
              id="target-product-search"
              value={targetProductQuery}
              onChange={(event) => setTargetProductQuery(event.target.value)}
              placeholder={t(
                "admin.promotions.form.targeting.productsPlaceholder",
                "Search product name or slug"
              )}
            />
            <div className="max-h-44 overflow-auto rounded-md border border-slate-200 bg-white">
              {isSearchingProducts ? (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.searching", "Searching...")}
                </p>
              ) : targetProductOptions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {targetProductOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          targetProducts: addUniqueReference(prev.targetProducts, option),
                        }))
                      }
                    >
                      <span className="block font-medium text-slate-800">{option.label}</span>
                      {option.description ? (
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.noResults", "No results found")}
                </p>
              )}
            </div>
            {formState.targetProducts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formState.targetProducts.map((item) => (
                  <Badge key={item.id} variant="secondary" className="inline-flex items-center gap-2">
                    <span>{item.label || item.id}</span>
                    <button
                      type="button"
                      className="text-slate-600 hover:text-slate-900"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          targetProducts: removeReference(prev.targetProducts, item.id),
                        }))
                      }
                      aria-label={t("admin.promotions.form.targeting.removeProduct", "Remove product")}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {formState.discountType !== "bxgy" && onSearchCategories ? (
          <div className="space-y-2">
            <Label htmlFor="target-category-search">
              {t("admin.promotions.form.targeting.categories", "Target categories")}
            </Label>
            <Input
              id="target-category-search"
              value={targetCategoryQuery}
              onChange={(event) => setTargetCategoryQuery(event.target.value)}
              placeholder={t(
                "admin.promotions.form.targeting.categoriesPlaceholder",
                "Search category title"
              )}
            />
            <div className="max-h-44 overflow-auto rounded-md border border-slate-200 bg-white">
              {isSearchingCategories ? (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.searching", "Searching...")}
                </p>
              ) : targetCategoryOptions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {targetCategoryOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          targetCategories: addUniqueReference(prev.targetCategories, option),
                        }))
                      }
                    >
                      <span className="block font-medium text-slate-800">{option.label}</span>
                      {option.description ? (
                        <span className="block text-xs text-slate-500">{option.description}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 py-2 text-sm text-slate-500">
                  {t("admin.referencePicker.noResults", "No results found")}
                </p>
              )}
            </div>
            {formState.targetCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formState.targetCategories.map((item) => (
                  <Badge key={item.id} variant="secondary" className="inline-flex items-center gap-2">
                    <span>{item.label || item.id}</span>
                    <button
                      type="button"
                      className="text-slate-600 hover:text-slate-900"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          targetCategories: removeReference(prev.targetCategories, item.id),
                        }))
                      }
                      aria-label={t("admin.promotions.form.targeting.removeCategory", "Remove category")}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <div className="md:col-span-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {t("admin.promotions.form.targeting.hint")}
        </div>
      </div>
    );

    const creative = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="badgeLabel">{t("admin.promotions.form.creative.badgeLabel")}</Label>
          <Input
            id="badgeLabel"
            value={formState.badgeLabel}
            onChange={(event) => setFormState((prev) => ({ ...prev, badgeLabel: event.target.value }))}
            placeholder={t("admin.promotions.form.creative.badgeLabelPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="badgeColor">{t("admin.promotions.form.creative.badgeColor")}</Label>
          <Input
            id="badgeColor"
            value={formState.badgeColor}
            onChange={(event) => setFormState((prev) => ({ ...prev, badgeColor: event.target.value }))}
            placeholder={t("admin.promotions.form.creative.badgeColorPlaceholder")}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="heroMessage">{t("admin.promotions.form.creative.heroMessage")}</Label>
          <Textarea
            id="heroMessage"
            value={formState.heroMessage}
            onChange={(event) => setFormState((prev) => ({ ...prev, heroMessage: event.target.value }))}
            rows={2}
            placeholder={t("admin.promotions.form.creative.heroMessagePlaceholder")}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="shortDescription">{t("admin.promotions.form.creative.shortDescription")}</Label>
          <Input
            id="shortDescription"
            value={formState.shortDescription}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, shortDescription: event.target.value }))
            }
            placeholder={t("admin.promotions.form.creative.shortDescriptionPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaText">{t("admin.promotions.form.creative.ctaText")}</Label>
          <Input
            id="ctaText"
            value={formState.ctaText}
            onChange={(event) => setFormState((prev) => ({ ...prev, ctaText: event.target.value }))}
            placeholder={t("admin.promotions.form.creative.ctaTextPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctaLink">{t("admin.promotions.form.creative.ctaLink")}</Label>
          <Input
            id="ctaLink"
            value={formState.ctaLink}
            onChange={(event) => setFormState((prev) => ({ ...prev, ctaLink: event.target.value }))}
            placeholder={t("admin.promotions.form.creative.ctaLinkPlaceholder")}
          />
        </div>
      </div>
    );

    const schedule = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("admin.promotions.form.schedule.startDate")}</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={formState.startDate}
            onChange={(event) => setFormState((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">{t("admin.promotions.form.schedule.endDate")}</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={formState.endDate}
            onChange={(event) => setFormState((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timezone">{t("admin.promotions.form.schedule.timezone")}</Label>
          <Select
            value={formState.timezone}
            onValueChange={(value) => setFormState((prev) => ({ ...prev, timezone: value }))}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder={t("admin.promotions.form.schedule.timezonePlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {timezoneOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(option.labelKey, option.defaultLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );

    const limits = (
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="budgetCap">{t("admin.promotions.form.limits.budgetCap")}</Label>
          <Input
            id="budgetCap"
            type="number"
            value={formState.budgetCap ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, budgetCap: parseNumberInput(event.target.value) }))
            }
            placeholder={t("admin.promotions.form.limits.unlimitedPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="usageLimit">{t("admin.promotions.form.limits.usageLimit")}</Label>
          <Input
            id="usageLimit"
            type="number"
            value={formState.usageLimit ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, usageLimit: parseNumberInput(event.target.value) }))
            }
            placeholder={t("admin.promotions.form.limits.unlimitedPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="perCustomerLimit">{t("admin.promotions.form.limits.perCustomerLimit")}</Label>
          <Input
            id="perCustomerLimit"
            type="number"
            value={formState.perCustomerLimit ?? ""}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                perCustomerLimit: parseNumberInput(event.target.value),
              }))
            }
            placeholder={t("admin.promotions.form.limits.perCustomerPlaceholder")}
          />
        </div>
      </div>
    );

    const advanced = (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="utmSource">{t("admin.promotions.form.advanced.utmSource")}</Label>
          <Input
            id="utmSource"
            value={formState.utmSource}
            onChange={(event) => setFormState((prev) => ({ ...prev, utmSource: event.target.value }))}
            placeholder={t("admin.promotions.form.advanced.utmSourcePlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmMedium">{t("admin.promotions.form.advanced.utmMedium")}</Label>
          <Input
            id="utmMedium"
            value={formState.utmMedium}
            onChange={(event) => setFormState((prev) => ({ ...prev, utmMedium: event.target.value }))}
            placeholder={t("admin.promotions.form.advanced.utmMediumPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utmCampaign">{t("admin.promotions.form.advanced.utmCampaign")}</Label>
          <Input
            id="utmCampaign"
            value={formState.utmCampaign}
            onChange={(event) => setFormState((prev) => ({ ...prev, utmCampaign: event.target.value }))}
            placeholder={t("admin.promotions.form.advanced.utmCampaignPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trackingPixelId">{t("admin.promotions.form.advanced.trackingPixelId")}</Label>
          <Input
            id="trackingPixelId"
            value={formState.trackingPixelId}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, trackingPixelId: event.target.value }))
            }
            placeholder={t("admin.promotions.form.advanced.trackingPixelPlaceholder")}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="internalNotes">{t("admin.promotions.form.advanced.internalNotes")}</Label>
          <Textarea
            id="internalNotes"
            value={formState.internalNotes}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, internalNotes: event.target.value }))
            }
            rows={3}
            placeholder={t("admin.promotions.form.advanced.internalNotesPlaceholder")}
          />
        </div>
      </div>
    );

    return [
      {
        id: "template",
        label: t("admin.promotions.form.sections.template"),
        description: t("admin.promotions.form.sections.templateDesc"),
        content: template,
      },
      {
        id: "basics",
        label: t("admin.promotions.form.sections.basics"),
        description: t("admin.promotions.form.sections.basicsDesc"),
        content: basics,
      },
      {
        id: "discount",
        label: t("admin.promotions.form.sections.discount"),
        description: t("admin.promotions.form.sections.discountDesc"),
        content: discount,
      },
      {
        id: "targeting",
        label: t("admin.promotions.form.sections.targeting"),
        description: t("admin.promotions.form.sections.targetingDesc"),
        content: targeting,
      },
      {
        id: "creative",
        label: t("admin.promotions.form.sections.creative"),
        description: t("admin.promotions.form.sections.creativeDesc"),
        content: creative,
      },
      {
        id: "schedule",
        label: t("admin.promotions.form.sections.schedule"),
        description: t("admin.promotions.form.sections.scheduleDesc"),
        content: schedule,
      },
      {
        id: "limits",
        label: t("admin.promotions.form.sections.limits"),
        description: t("admin.promotions.form.sections.limitsDesc"),
        content: limits,
      },
      {
        id: "advanced",
        label: t("admin.promotions.form.sections.advanced"),
        description: t("admin.promotions.form.sections.advancedDesc"),
        content: advanced,
      },
    ];
  }, [
    formState,
    isSearchingCategories,
    isSearchingProducts,
    onLoadTargetProductTree,
    onSearchCategories,
    onSearchProducts,
    targetCategoryOptions,
    targetCategoryQuery,
    targetProductOptions,
    targetProductQuery,
    t,
  ]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">
            {formState.name || t("admin.promotions.form.header.newDraft")}
          </p>
          <p className="text-xs text-slate-600">
            {t("admin.promotions.form.header.hint")}
          </p>
          {formState.campaignId && (
            <Badge variant="outline" className="text-xs font-medium">
              {t("admin.promotions.form.header.campaignId", { id: formState.campaignId })}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analyticsHref && (
            <Button variant="outline" size="sm" type="button" asChild>
              <Link href={analyticsHref}>{t("admin.promotions.form.actions.viewAnalytics")}</Link>
            </Button>
          )}
          {formState.status && <StatusBadge status={formState.status} />}
          {canDelete && formState._id && onDelete && (
            <ConfirmDialog
              title={t("admin.promotions.form.actions.deleteTitle", "Delete promotion?")}
              description={t("admin.promotions.form.actions.deleteDescription", "This action cannot be undone.")}
              confirmLabel={t("admin.confirmDialog.confirm")}
              cancelLabel={t("admin.confirmDialog.cancel")}
              variant="danger"
              onConfirm={handleDelete}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="text-red-600 hover:text-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? t("admin.confirmDialog.working") : t("admin.content.events.list.actions.delete")}
                </Button>
              }
            />
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("admin.promotions.form.actions.saving") : formState._id ? t("admin.promotions.form.actions.save") : t("admin.promotions.form.actions.create")}
          </Button>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <FormTabs sections={sections} defaultSection="template" />
    </form>
  );
}
