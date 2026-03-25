"use client";

import { Product } from "@/sanity.types";
import { useTranslation } from "react-i18next";

const formatDimensions = (product: Product) => {
  const dims = (product as any)?.dimensions;
  if (!dims) return "";
  const unit = dims.unit || "cm";
  const parts = ["length", "width", "height"]
    .map((key) => dims?.[key])
    .filter((val) => typeof val === "number");
  if (!parts.length) return "";
  return `${parts.join(" x ")} ${unit}`;
};

const ProductsDetails = ({ product }: { product: Product }) => {
  const { i18n, t } = useTranslation();
  const isThai = i18n.language?.toLowerCase().startsWith("th");

  const toText = (value: unknown) =>
    typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";

  const resolveLocalized = (en?: unknown, th?: unknown) => {
    const primary = isThai ? toText(th) : toText(en);
    if (primary) return primary;
    return isThai ? toText(en) : toText(th);
  };

  const description =
    product?.description ||
    t("client.products.details.description.empty", {
      defaultValue: "No description available.",
    });
  const weight = (product as any)?.weight;
  const dimensions = formatDimensions(product);
  const additionalInfo = (product as any)?.additionalInfo;

  const featureHighlightsRaw = (product as any)?.featureHighlights;
  const featureHighlights = Array.isArray(featureHighlightsRaw)
    ? featureHighlightsRaw
        .map((feature: any) => ({
          title: resolveLocalized(feature?.title, feature?.titleTh),
          description: resolveLocalized(feature?.description, feature?.descriptionTh),
        }))
        .filter((feature: { title?: string; description?: string }) => Boolean(feature.title || feature.description))
    : [];

  const specsRaw = (product as any)?.specifications;
  const specs = Array.isArray(specsRaw)
    ? specsRaw
        .map((spec: any) => ({
          label: resolveLocalized(spec?.label, spec?.labelTh),
          value: resolveLocalized(spec?.value, spec?.valueTh),
          unit: toText(spec?.unit),
        }))
        .filter((spec: { label?: string; value?: string }) => Boolean(spec.label || spec.value))
    : [];

  const specRows = specs
    .map((spec) => {
      if (!spec.label && !spec.value) return null;
      const value = [spec.value, spec.unit].filter(Boolean).join(" ");
      if (!spec.label) return null;
      return { label: spec.label, value: value || "-" };
    })
    .filter(Boolean) as Array<{ label: string; value: string }>;

  const infoRows = [
    weight !== undefined && weight !== null
      ? {
          label: t("client.products.details.specs.weight", {
            defaultValue: "Weight",
          }),
          value: `${weight} kg`,
        }
      : null,
    dimensions
      ? {
          label: t("client.products.details.specs.dimensions", {
            defaultValue: "Dimensions",
          }),
          value: dimensions,
        }
      : null,
    ...specRows,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="w-full space-y-8 mb-10">
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-brand-black-strong mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-brand-red-accent rounded-full"></span>
          {t("client.products.details.description.title", {
            defaultValue: "Description",
          })}
        </h2>
        <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line">{description}</div>
      </div>

      {featureHighlights.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-brand-black-strong mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-brand-red-accent rounded-full"></span>
            {t("client.products.details.features.title", {
              defaultValue: "Key Features",
            })}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {featureHighlights.map((feature: { title?: string; description?: string }, index: number) => (
              <li
                key={`${feature.title || "feature"}-${index}`}
                className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4"
              >
                <span className="mt-2 h-2 w-2 rounded-full bg-brand-red-accent flex-shrink-0" />
                <div>
                  {feature.title && <p className="text-sm font-semibold text-brand-black-strong">{feature.title}</p>}
                  {feature.description && <p className="text-sm text-gray-600 leading-relaxed">{feature.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {infoRows.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-brand-black-strong mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-brand-red-accent rounded-full"></span>
            {t("client.products.details.specs.title", {
              defaultValue: "Specifications",
            })}
          </h2>
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                {infoRows.map((row) => (
                  <tr className="hover:bg-gray-50 transition-colors" key={row.label}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 w-1/3">{row.label}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {additionalInfo ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-brand-black-strong mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-brand-red-accent rounded-full"></span>
            {t("client.products.details.notes.title", {
              defaultValue: "Additional Notes",
            })}
          </h2>
          <div className="prose prose-sm max-w-none text-gray-600 whitespace-pre-line">{additionalInfo}</div>
        </div>
      ) : null}
    </div>
  );
};

export default ProductsDetails;
