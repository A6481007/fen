"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Address } from "@/lib/address";
import { useTranslation } from "react-i18next";

export type AddressFormValues = Address & {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  fax: string;
  contactEmail: string;
  company: string;
  customerCode: string;
  winCode: string;
  lineId: string;
  taxId: string;
  branch: string;
  countryCode: string;
  stateCode: string;
  subArea: string;
  type: "home" | "office" | "other";
  default: boolean;
};

type AddressFormErrorKey =
  | "name"
  | "address"
  | "subArea"
  | "city"
  | "state"
  | "zip"
  | "country"
  | "type"
  | "taxId";

type AddressFormProps = {
  initialValues?: Partial<AddressFormValues>;
  defaultContactEmail?: string;
  onSubmit: (values: AddressFormValues) => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  showDefaultToggle?: boolean;
  showCustomerCodeField?: boolean;
  customerCodeReadOnly?: boolean;
  showWinCodeField?: boolean;
  winCodeReadOnly?: boolean;
  showLineIdField?: boolean;
  lineIdReadOnly?: boolean;
  subAreaRequired?: boolean;
};

const formatPhone = (value: string) => {
  const trimmed = value.replace(/[^\d+]/g, "");
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  const prefix = hasPlus ? "+" : "";

  if (digits.length <= 3) return `${prefix}${digits}`;
  if (digits.length <= 6) {
    return `${prefix}${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  if (digits.length <= 10) {
    return `${prefix}${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${prefix}${digits}`;
};

const buildDefaults = (
  initial?: Partial<AddressFormValues>,
  defaultContactEmail?: string,
  defaultCountry?: string
): AddressFormValues => ({
  _id: initial?._id,
  name: initial?.name ?? "",
  email: initial?.email ?? defaultContactEmail ?? "",
  address: initial?.address ?? "",
  city: initial?.city ?? "",
  state: initial?.state ?? "",
  zip: initial?.zip ?? "",
  country: initial?.country ?? defaultCountry ?? "Thailand",
  countryCode: initial?.countryCode ?? "",
  stateCode: initial?.stateCode ?? "",
  subArea: initial?.subArea ?? "",
  phone: initial?.phone ?? "",
  fax: initial?.fax ?? "",
  contactEmail: initial?.contactEmail ?? defaultContactEmail ?? "",
  company: initial?.company ?? "",
  customerCode: initial?.customerCode ?? "",
  winCode: initial?.winCode ?? "",
  lineId: initial?.lineId ?? "",
  taxId: initial?.taxId ?? "",
  branch: initial?.branch ?? "",
  type: initial?.type ?? "home",
  default: initial?.default ?? false,
  createdAt: initial?.createdAt,
  lastUsedAt: initial?.lastUsedAt,
});

const baseRequiredFields: AddressFormErrorKey[] = [
  "name",
  "address",
  "city",
  "state",
  "zip",
  "country",
  "type",
];

const taxIdPattern = /^\d{13}$/;

const isThailandAddress = (
  values: Pick<AddressFormValues, "country" | "countryCode">,
  thailandLabel?: string
) => {
  const normalizedCode = values.countryCode.trim().toUpperCase();
  if (normalizedCode) return normalizedCode === "TH";
  const normalizedCountry = values.country.trim().toLowerCase();
  if (normalizedCountry === "thailand") return true;
  const normalizedLabel = thailandLabel?.trim().toLowerCase();
  return Boolean(normalizedLabel && normalizedCountry === normalizedLabel);
};

const getRequiredFields = (
  values: AddressFormValues,
  subAreaRequired: boolean,
  thailandLabel?: string
) =>
  isThailandAddress(values, thailandLabel) && subAreaRequired
    ? [...baseRequiredFields, "subArea"]
    : baseRequiredFields;

const getRequiredFieldErrors = (
  values: AddressFormValues,
  subAreaRequired: boolean,
  thailandLabel: string,
  t: (key: string) => string
): Partial<Record<AddressFormErrorKey, string>> => {
  const nextErrors: Partial<Record<AddressFormErrorKey, string>> = {};
  if (!values.name.trim()) nextErrors.name = t("client.addressForm.errors.required");
  if (!values.address.trim()) nextErrors.address = t("client.addressForm.errors.required");
  if (
    isThailandAddress(values, thailandLabel) &&
    subAreaRequired &&
    !values.subArea.trim()
  ) {
    nextErrors.subArea = t("client.addressForm.errors.required");
  }
  if (!values.city.trim()) nextErrors.city = t("client.addressForm.errors.required");
  if (!values.state.trim()) nextErrors.state = t("client.addressForm.errors.required");
  if (!values.zip.trim()) nextErrors.zip = t("client.addressForm.errors.required");
  if (!values.country.trim()) nextErrors.country = t("client.addressForm.errors.required");
  if (!values.type.trim()) nextErrors.type = t("client.addressForm.errors.required");
  const trimmedTaxId = values.taxId.trim();
  if (trimmedTaxId && !taxIdPattern.test(trimmedTaxId)) {
    nextErrors.taxId = t("client.addressForm.errors.taxId");
  }
  return nextErrors;
};

export function AddressForm({
  initialValues,
  defaultContactEmail,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  showDefaultToggle = true,
  showCustomerCodeField = false,
  customerCodeReadOnly = true,
  showWinCodeField = false,
  winCodeReadOnly = false,
  showLineIdField = false,
  lineIdReadOnly = false,
  subAreaRequired = true,
}: AddressFormProps) {
  const { t } = useTranslation();
  const defaultCountry = t("client.addressForm.defaults.country");
  const resolvedSubmitLabel =
    submitLabel ?? t("client.addressForm.actions.save");
  const resolvedCancelLabel =
    cancelLabel ?? t("client.addressForm.actions.cancel");
  const [values, setValues] = useState<AddressFormValues>(() =>
    buildDefaults(initialValues, defaultContactEmail, defaultCountry)
  );
  const [errors, setErrors] = useState<
    Partial<Record<AddressFormErrorKey, string>>
  >({});
  const isThailand = isThailandAddress(values, defaultCountry);

  useEffect(() => {
    setValues(buildDefaults(initialValues, defaultContactEmail, defaultCountry));
    setErrors({});
  }, [initialValues, defaultContactEmail, defaultCountry]);

  useEffect(() => {
    if (isThailand && subAreaRequired) return;
    setErrors((prev) => {
      if (!prev.subArea) return prev;
      const next = { ...prev };
      delete next.subArea;
      return next;
    });
  }, [isThailand, subAreaRequired]);

  const handleChange = (
    field: keyof AddressFormValues,
    value: string | boolean
  ) => {
    if (field === "customerCode" && customerCodeReadOnly) {
      return;
    }
    setValues((prev) => ({ ...prev, [field]: value }));
    if (typeof value === "string") {
      const errorKey = field as AddressFormErrorKey;
      const nextValues = { ...values, [field]: value } as AddressFormValues;
      const requiredFields = getRequiredFields(
        nextValues,
        subAreaRequired,
        defaultCountry
      );
      if (requiredFields.includes(errorKey) && value.trim()) {
        setErrors((prev) => {
          if (!prev[errorKey]) return prev;
          const next = { ...prev };
          delete next[errorKey];
          return next;
        });
      }
      if (errorKey === "taxId") {
        const trimmedValue = value.trim();
        if (!trimmedValue || taxIdPattern.test(trimmedValue)) {
          setErrors((prev) => {
            if (!prev.taxId) return prev;
            const next = { ...prev };
            delete next.taxId;
            return next;
          });
        }
      }
    }
  };

  const handleTaxIdBlur = () => {
    const trimmedTaxId = values.taxId.trim();
    if (trimmedTaxId && !taxIdPattern.test(trimmedTaxId)) {
      setErrors((prev) => ({
        ...prev,
        taxId: t("client.addressForm.errors.taxId"),
      }));
      return;
    }
    setErrors((prev) => {
      if (!prev.taxId) return prev;
      const next = { ...prev };
      delete next.taxId;
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = getRequiredFieldErrors(
      values,
      subAreaRequired,
      defaultCountry,
      t
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address-name">
            {t("client.addressForm.fields.contactName")} *
          </Label>
          <Input
            id="address-name"
            value={values.name}
            onChange={(event) => handleChange("name", event.target.value)}
            placeholder={t("client.addressForm.placeholders.contactName")}
            required
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "address-name-error" : undefined}
            className={errors.name ? "border-destructive" : undefined}
          />
          {errors.name && (
            <p id="address-name-error" className="text-xs text-destructive">
              {errors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-contact-email">
            {t("client.addressForm.fields.contactEmail")}
          </Label>
          <Input
            id="address-contact-email"
            type="email"
            value={values.contactEmail}
            onChange={(event) => handleChange("contactEmail", event.target.value)}
            placeholder={t("client.addressForm.placeholders.contactEmail")}
          />
        </div>
        {showLineIdField && (
          <div className="space-y-2">
            <Label htmlFor="address-line-id">
              {t("client.addressForm.fields.lineId")}
            </Label>
            <Input
              id="address-line-id"
              value={values.lineId}
              onChange={(event) => handleChange("lineId", event.target.value)}
              placeholder={t("client.addressForm.placeholders.lineId")}
              readOnly={lineIdReadOnly}
              aria-readonly={lineIdReadOnly}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="address-phone">
            {t("client.addressForm.fields.phone")}
          </Label>
          <Input
            id="address-phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(event) =>
              handleChange("phone", formatPhone(event.target.value))
            }
            placeholder={t("client.addressForm.placeholders.phone")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-fax">
            {t("client.addressForm.fields.fax")}
          </Label>
          <Input
            id="address-fax"
            type="tel"
            inputMode="tel"
            value={values.fax}
            onChange={(event) =>
              handleChange("fax", formatPhone(event.target.value))
            }
            placeholder={t("client.addressForm.placeholders.fax")}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="address-company">
            {t("client.addressForm.fields.company")}
          </Label>
          <Input
            id="address-company"
            value={values.company}
            onChange={(event) => handleChange("company", event.target.value)}
            placeholder={t("client.addressForm.placeholders.company")}
          />
        </div>
        {showCustomerCodeField && (
          <div className="space-y-2">
            <Label htmlFor="address-customer-code">
              {t("client.addressForm.fields.customerCode")}
            </Label>
            <Input
              id="address-customer-code"
              value={values.customerCode}
              onChange={(event) =>
                handleChange("customerCode", event.target.value)
              }
              placeholder={t("client.addressForm.placeholders.customerCode")}
              readOnly={customerCodeReadOnly}
              aria-readonly={customerCodeReadOnly}
            />
          </div>
        )}
        {showWinCodeField && (
          <div className="space-y-2">
            <Label htmlFor="address-win-code">
              {t("client.addressForm.fields.winCode")}
            </Label>
            <Input
              id="address-win-code"
              value={values.winCode}
              onChange={(event) => handleChange("winCode", event.target.value)}
              placeholder={t("client.addressForm.placeholders.winCode")}
              readOnly={winCodeReadOnly}
              aria-readonly={winCodeReadOnly}
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="address-tax-id">
            {t("client.addressForm.fields.taxId")}
          </Label>
          <Input
            id="address-tax-id"
            value={values.taxId}
            onChange={(event) => handleChange("taxId", event.target.value)}
            onBlur={handleTaxIdBlur}
            placeholder={t("client.addressForm.placeholders.taxId")}
            aria-invalid={Boolean(errors.taxId)}
            aria-describedby={errors.taxId ? "address-tax-id-error" : undefined}
            className={errors.taxId ? "border-destructive" : undefined}
          />
          {errors.taxId && (
            <p id="address-tax-id-error" className="text-xs text-destructive">
              {errors.taxId}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-branch">
            {t("client.addressForm.fields.branch")}
          </Label>
          <Input
            id="address-branch"
            value={values.branch}
            onChange={(event) => handleChange("branch", event.target.value)}
            placeholder={t("client.addressForm.placeholders.branch")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-type">
            {t("client.addressForm.fields.addressType")} *
          </Label>
          <Select
            value={values.type}
            onValueChange={(value) =>
              handleChange("type", value as AddressFormValues["type"])
            }
          >
            <SelectTrigger
              id="address-type"
              aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? "address-type-error" : undefined}
              className={errors.type ? "border-destructive" : undefined}
            >
              <SelectValue
                placeholder={t("client.addressForm.placeholders.addressType")}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">
                {t("client.addressForm.types.home")}
              </SelectItem>
              <SelectItem value="office">
                {t("client.addressForm.types.office")}
              </SelectItem>
              <SelectItem value="other">
                {t("client.addressForm.types.other")}
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p id="address-type-error" className="text-xs text-destructive">
              {errors.type}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address-street">
            {t("client.addressForm.fields.address")} *
          </Label>
          <Input
            id="address-street"
            value={values.address}
            onChange={(event) => handleChange("address", event.target.value)}
            placeholder={
              isThailand
                ? t("client.addressForm.placeholders.addressThailand")
                : t("client.addressForm.placeholders.addressIntl")
            }
            required
            aria-invalid={Boolean(errors.address)}
            aria-describedby={errors.address ? "address-street-error" : undefined}
            className={errors.address ? "border-destructive" : undefined}
          />
          {isThailand && (
            <p className="text-xs text-muted-foreground">
              {t("client.addressForm.help.addressThailand")}
            </p>
          )}
          {errors.address && (
            <p id="address-street-error" className="text-xs text-destructive">
              {errors.address}
            </p>
          )}
        </div>
        {isThailand && (
          <div className="space-y-2">
            <Label htmlFor="address-sub-area">
              {t("client.addressForm.fields.subdistrict")}
              {subAreaRequired ? " *" : ""}
            </Label>
            <Input
              id="address-sub-area"
              value={values.subArea}
              onChange={(event) => handleChange("subArea", event.target.value)}
              placeholder={t("client.addressForm.placeholders.subdistrict")}
              required
              aria-invalid={Boolean(errors.subArea)}
              aria-describedby={
                errors.subArea ? "address-sub-area-error" : undefined
              }
              className={errors.subArea ? "border-destructive" : undefined}
            />
            {errors.subArea && (
              <p
                id="address-sub-area-error"
                className="text-xs text-destructive"
              >
                {errors.subArea}
              </p>
            )}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="address-city">
            {isThailand
              ? t("client.addressForm.fields.district")
              : t("client.addressForm.fields.city")}{" "}
            *
          </Label>
          <Input
            id="address-city"
            value={values.city}
            onChange={(event) => handleChange("city", event.target.value)}
            placeholder={
              isThailand
                ? t("client.addressForm.placeholders.district")
                : t("client.addressForm.placeholders.city")
            }
            required
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "address-city-error" : undefined}
            className={errors.city ? "border-destructive" : undefined}
          />
          {errors.city && (
            <p id="address-city-error" className="text-xs text-destructive">
              {errors.city}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-state">
            {isThailand
              ? t("client.addressForm.fields.province")
              : t("client.addressForm.fields.state")}{" "}
            *
          </Label>
          <Input
            id="address-state"
            value={values.state}
            onChange={(event) => handleChange("state", event.target.value)}
            placeholder={
              isThailand
                ? t("client.addressForm.placeholders.province")
                : t("client.addressForm.placeholders.state")
            }
            required
            aria-invalid={Boolean(errors.state)}
            aria-describedby={errors.state ? "address-state-error" : undefined}
            className={errors.state ? "border-destructive" : undefined}
          />
          {errors.state && (
            <p id="address-state-error" className="text-xs text-destructive">
              {errors.state}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address-zip">
            {t("client.addressForm.fields.postalCode")} *
          </Label>
          <Input
            id="address-zip"
            value={values.zip}
            onChange={(event) => handleChange("zip", event.target.value)}
            placeholder={t("client.addressForm.placeholders.postalCode")}
            required
            aria-invalid={Boolean(errors.zip)}
            aria-describedby={errors.zip ? "address-zip-error" : undefined}
            className={errors.zip ? "border-destructive" : undefined}
          />
          {errors.zip && (
            <p id="address-zip-error" className="text-xs text-destructive">
              {errors.zip}
            </p>
          )}
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address-country">
            {t("client.addressForm.fields.country")} *
          </Label>
          <Input
            id="address-country"
            value={values.country}
            onChange={(event) => handleChange("country", event.target.value)}
            placeholder={t("client.addressForm.placeholders.country")}
            aria-invalid={Boolean(errors.country)}
            aria-describedby={
              errors.country ? "address-country-error" : undefined
            }
            className={errors.country ? "border-destructive" : undefined}
          />
          {errors.country && (
            <p id="address-country-error" className="text-xs text-destructive">
              {errors.country}
            </p>
          )}
        </div>
      </div>

      {showDefaultToggle && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-1">
            <Label htmlFor="address-default">
              {t("client.addressForm.fields.defaultAddress")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("client.addressForm.fields.defaultAddressHelp")}
            </p>
          </div>
          <Switch
            id="address-default"
            checked={values.default}
            onCheckedChange={(checked) => handleChange("default", checked)}
          />
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {resolvedCancelLabel}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t("client.addressForm.actions.saving")
            : resolvedSubmitLabel}
        </Button>
      </div>
    </form>
  );
}
