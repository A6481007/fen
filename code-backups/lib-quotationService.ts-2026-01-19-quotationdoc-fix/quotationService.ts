import { client, writeClient } from "@/sanity/lib/client";
import { sendMail } from "@/lib/emailService";
import { formatThaiAddress, type Address } from "@/lib/address";
import { ORDER_STATUSES } from "@/lib/orderStatus";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

export type QuotationTerms = {
  paymentCondition?: string;
  deliveryCondition?: string;
  validityCondition?: string;
  warrantyCondition?: string;
};

export type QuotationTotals = {
  subtotal?: number;
  tax?: number;
  shipping?: number;
  totalPrice?: number;
  amountDiscount?: number;
  currency?: string;
};

export type SalesContactInfo = {
  _id?: string;
  name?: string;
  phone?: string;
  ext?: string;
  fax?: string;
  mobile?: string;
  lineId?: string;
  lineExt?: string;
  email?: string;
  web?: string;
  terms?: QuotationTerms;
};

export type QuotationSettings = {
  company: {
    nameEn: string;
    nameTh: string;
    addressEn: string;
    phoneEn: string;
    faxEn: string;
    email: string;
    lineId: string;
    addressTh: string;
    phoneTh: string;
    faxTh: string;
    taxId: string;
    logoUrl: string;
    headOfficeLabel: string;
  };
  languageDefault?: string;
  certBlockHtml: string;
  certBoxImageUrl?: string;
  qrLabel: string;
  qrPayload?: string;
  qrImageUrl?: string;
  paymentLogoImageUrl?: string;
  customerDefaults: {
    taxId: string;
    branch: string;
    code: string;
    company: string;
    fax: string;
  };
  sales: SalesContactInfo;
  signatures: {
    saleUrl: string;
    managerUrl: string;
    purchaserUrl: string;
  };
  terms: QuotationTerms;
  vatPercent: number;
  remark: string;
};

export type OrderProduct = {
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  discountAmount?: number;
  discountType?: "percentage" | "fixed_amount" | "fixed";
  discountValue?: number;
  promotionName?: string;
  promotionType?: "promotion" | "deal";
  promotionId?: string;
  product?: {
    _id: string;
    name?: string;
    description?: string;
    price?: number;
    sku?: string;
    unit?: string;
    discount?: number;
    collection?: string;
    warranty?: string;
    returnPolicy?: string;
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
      unit?: string;
    };
    slug?: { current?: string };
    brand?: { title?: string };
    categories?: Array<{ title?: string }>;
    variant?: { title?: string };
  };
};

export type OrderData = {
  _id: string;
  orderNumber: string;
  clerkUserId: string;
  customerName: string;
  email: string;
  phone?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
  totalPrice?: number;
  amountDiscount?: number;
  currency?: string;
  orderDate?: string;
  status?: string;
  quotationRequestedAt?: string;
  quotationValidUntil?: string;
  salesContact?: SalesContactInfo | null;
  address?: Address;
  quotationDetails?: Address;
  purchaseOrder?: {
    number?: string;
    createdAt?: string;
    emailSentAt?: string;
  };
  products?: OrderProduct[];
};

export type QuotationDocument = {
  _id: string;
  version?: number | null;
  number?: string | null;
  createdAt?: string | null;
  emailSentAt?: string | null;
  pdfUrl?: string | null;
  isLatestVersion?: boolean | null;
  salesContact?: SalesContactInfo | null;
  quotationDetails?: Address | null;
  products?: OrderProduct[] | null;
  items?: OrderProduct[] | null;
  subtotal?: number | null;
  tax?: number | null;
  shipping?: number | null;
  totalPrice?: number | null;
  amountDiscount?: number | null;
  currency?: string | null;
  customerName?: string | null;
  email?: string | null;
  phone?: string | null;
  terms?: QuotationTerms | null;
  totals?: QuotationTotals | null;
};

type QuotationRenderMeta = Pick<
  QuotationDocument,
  "number" | "createdAt" | "salesContact"
>;

type PromotionDoc = {
  _id?: string;
  campaignId?: string;
  name?: string | null;
  type?: string | null;
  discountType?: string | null;
  discountValue?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  badgeLabel?: string | null;
  shortDescription?: string | null;
  minimumOrderValue?: number | null;
  maximumDiscount?: number | null;
  perCustomerLimit?: number | null;
};

type DealDoc = {
  _id?: string;
  dealId?: string;
  title?: string | null;
  dealType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  badge?: string | null;
  dealPrice?: number | null;
  originalPrice?: number | null;
  quantityLimit?: number | null;
  perCustomerLimit?: number | null;
};

type PromotionLookup = {
  promotionsById: Map<string, PromotionDoc>;
  dealsById: Map<string, DealDoc>;
};

type PromotionSummary = {
  id: string;
  type: "promotion" | "deal";
  name?: string;
  discountType?: "percentage" | "fixed_amount" | "fixed";
  discountValue?: number;
  discountAmount: number;
};

const TEMPLATE_PATH = path.join(process.cwd(), "quotation_base_template.html");
const MAX_EMAIL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

const DEFAULT_SETTINGS: QuotationSettings = {
  company: {
    nameEn: "",
    nameTh: "",
    addressEn: "",
    phoneEn: "",
    faxEn: "",
    email: "",
    lineId: "",
    addressTh: "",
    phoneTh: "",
    faxTh: "",
    taxId: "",
    logoUrl: "",
    headOfficeLabel: "",
  },
  languageDefault: "both",
  certBlockHtml: "",
  certBoxImageUrl: "",
  qrLabel: "",
  qrPayload: "",
  qrImageUrl: "",
  paymentLogoImageUrl: "",
  customerDefaults: {
    taxId: "",
    branch: "",
    code: "",
    company: "",
    fax: "",
  },
  sales: {
    name: "",
    phone: "",
    ext: "",
    fax: "",
    mobile: "",
    lineId: "",
    lineExt: "",
    email: "",
    web: "",
  },
  signatures: {
    saleUrl: "",
    managerUrl: "",
    purchaserUrl: "",
  },
  terms: {
    paymentCondition: "",
    deliveryCondition: "",
    validityCondition: "",
    warrantyCondition: "",
  },
  vatPercent: 7,
  remark: "",
};

let cachedTemplate: string | null = null;
// Use createRequire to keep optional puppeteer out of the build graph.
const nodeRequire = createRequire(import.meta.url);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toHtmlWithLineBreaks = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, "<br/>");

const normalizeText = (value: string | undefined | null) => {
  if (!value) return "";
  return value.trim();
};

export type LanguageMode = "en" | "th" | "both";

const normalizeLanguageMode = (value?: string | null): LanguageMode | null => {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === "en" || normalized === "eng" || normalized === "english") {
    return "en";
  }
  if (normalized === "th" || normalized === "thai") {
    return "th";
  }
  if (
    normalized === "both" ||
    normalized === "bi" ||
    normalized === "bilingual"
  ) {
    return "both";
  }
  return null;
};

export const resolveLanguageMode = (
  requested: string | null | undefined,
  settings?: QuotationSettings
): LanguageMode => {
  const fromRequest = normalizeLanguageMode(requested);
  if (fromRequest) return fromRequest;
  const fromSettings = normalizeLanguageMode(settings?.languageDefault);
  return fromSettings ?? "both";
};

const getDocumentLanguage = (mode: LanguageMode) => {
  if (mode === "en") {
    return { lang: "en", className: "lang-en" };
  }
  if (mode === "th") {
    return { lang: "th", className: "lang-th" };
  }
  return { lang: "th", className: "lang-both" };
};

const formatDate = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.valueOf())) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const resolveQuotationDateSource = (
  order: OrderData,
  quotation?: QuotationRenderMeta | null
) => {
  const candidates = [
    normalizeText(quotation?.createdAt),
    normalizeText(order.purchaseOrder?.createdAt),
    normalizeText(order.quotationRequestedAt),
    normalizeText(order.orderDate),
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate;
  }
  return new Date().toISOString();
};

const buildQuotationNumber = (orderNumber: string, version: number) => {
  const base = `QT-${orderNumber}`;
  return version > 1 ? `${base}-v${version}` : base;
};

const buildQuotationDetailsSnapshot = (source?: Address | null) => {
  if (!source) return undefined;
  return {
    name: source.name,
    email: source.email,
    contactEmail: source.contactEmail,
    lineId: source.lineId,
    phone: source.phone,
    fax: source.fax,
    company: source.company,
    customerCode: source.customerCode,
    winCode: source.winCode,
    taxId: source.taxId,
    branch: source.branch,
    address: source.address,
    city: source.city,
    state: source.state,
    zip: source.zip,
    country: source.country,
    countryCode: source.countryCode,
    stateCode: source.stateCode,
    subArea: source.subArea,
    type: source.type,
    default: source.default,
    createdAt: source.createdAt,
    lastUsedAt: source.lastUsedAt,
  };
};

const resolveSalesContact = (
  selected?: SalesContactInfo | null,
  fallback?: SalesContactInfo
) => (selected ? selected : fallback);

const resolveTermValue = (override?: string, fallback?: string) => {
  const resolved = normalizeText(override);
  if (resolved) return resolved;
  return normalizeText(fallback);
};

const resolveQuotationTerms = (
  override?: QuotationTerms | null,
  fallback?: QuotationTerms
) => ({
  paymentCondition: resolveTermValue(
    override?.paymentCondition,
    fallback?.paymentCondition
  ),
  deliveryCondition: resolveTermValue(
    override?.deliveryCondition,
    fallback?.deliveryCondition
  ),
  validityCondition: resolveTermValue(
    override?.validityCondition,
    fallback?.validityCondition
  ),
  warrantyCondition: resolveTermValue(
    override?.warrantyCondition,
    fallback?.warrantyCondition
  ),
});

const resolveNumberValue = (
  ...values: Array<number | null | undefined>
) => values.find((value) => typeof value === "number" && Number.isFinite(value));

const formatNumber = (amount: number) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};

const THAI_DIGITS = [
  "ศูนย์",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
] as const;
const THAI_UNITS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"] as const;

const formatThaiGroup = (value: number) => {
  if (value <= 0) {
    return "";
  }

  const digits = value.toString().padStart(6, "0").split("").map(Number);
  let result = "";

  digits.forEach((digit, index) => {
    if (!digit) return;

    const position = 5 - index;
    if (position === 0) {
      result += digit === 1 && value > 1 ? "เอ็ด" : THAI_DIGITS[digit];
      return;
    }

    if (position === 1) {
      if (digit === 1) {
        result += "สิบ";
        return;
      }
      if (digit === 2) {
        result += "ยี่สิบ";
        return;
      }
      result += `${THAI_DIGITS[digit]}สิบ`;
      return;
    }

    result += `${THAI_DIGITS[digit]}${THAI_UNITS[position]}`;
  });

  return result;
};

const formatThaiNumber = (value: number) => {
  if (value <= 0) {
    return THAI_DIGITS[0];
  }

  const groups: number[] = [];
  let remaining = Math.floor(value);

  while (remaining > 0) {
    groups.push(remaining % 1_000_000);
    remaining = Math.floor(remaining / 1_000_000);
  }

  let result = "";
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const groupText = formatThaiGroup(groups[i]);
    if (groupText) {
      result += groupText;
    }
    if (i > 0) {
      result += "ล้าน";
    }
  }

  return result;
};

const formatThaiBahtText = (amount: number) => {
  if (!Number.isFinite(amount)) {
    return "";
  }

  const totalSatang = Math.round(amount * 100);
  const baht = Math.floor(totalSatang / 100);
  const satang = totalSatang % 100;
  const bahtText = formatThaiNumber(baht);

  if (satang === 0) {
    return `${bahtText}บาทถ้วน`;
  }

  const satangText = formatThaiNumber(satang);
  return `${bahtText}บาท${satangText}สตางค์`;
};

const normalizeCurrencyCode = (currency?: string | null) =>
  normalizeText(currency ?? "THB").toUpperCase();

const formatCurrencyDisplay = (
  currency?: string | null,
  amount?: number,
  languageMode?: LanguageMode
) => {
  const code = normalizeCurrencyCode(currency);
  if (!code) return "";
  if (code === "THB") {
    if (languageMode === "en") {
      return code;
    }
    const thaiText = formatThaiBahtText(amount ?? 0);
    return thaiText ? `${code} (${thaiText})` : code;
  }
  return code;
};

const formatPercent = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safeValue * 100) / 100;
  if (Number.isInteger(rounded)) {
    return `${rounded}%`;
  }
  return `${rounded.toFixed(2)}%`;
};

const buildSignatureImageHtml = (url?: string) => {
  const resolved = normalizeText(url);
  if (!resolved) return "";
  return `<img src="${escapeHtml(resolved)}" class="signature-image" alt="Signature" />`;
};

const buildQrImageUrl = async (settings: QuotationSettings) => {
  const qrPayload = normalizeText(settings.qrPayload);
  const qrImageUrl = normalizeText(settings.qrImageUrl);

  if (qrPayload) {
    try {
      const qrModule = await import("qrcode");
      const QRCode =
        "default" in qrModule ? qrModule.default : (qrModule as typeof import("qrcode"));
      const dataUrl = await QRCode.toDataURL(qrPayload, {
        margin: 0,
        width: 160,
      });
      return dataUrl;
    } catch (error) {
      console.error("Failed to generate QR code:", error);
    }
  }

  return qrImageUrl;
};

const truncateText = (value: string, maxLength = 140) => {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  if (maxLength <= 3) {
    return normalized.slice(0, maxLength);
  }
  return `${normalized.slice(0, maxLength - 3)}...`;
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  const startLabel = start ? formatDate(start) : "";
  const endLabel = end ? formatDate(end) : "";
  if (startLabel && endLabel) {
    return `${startLabel} - ${endLabel}`;
  }
  return startLabel || endLabel || "";
};

const mergeSettings = (raw?: Partial<QuotationSettings>) => ({
  ...DEFAULT_SETTINGS,
  ...raw,
  company: { ...DEFAULT_SETTINGS.company, ...raw?.company },
  customerDefaults: {
    ...DEFAULT_SETTINGS.customerDefaults,
    ...raw?.customerDefaults,
  },
  sales: { ...DEFAULT_SETTINGS.sales, ...raw?.sales },
  signatures: { ...DEFAULT_SETTINGS.signatures, ...raw?.signatures },
  terms: { ...DEFAULT_SETTINGS.terms, ...raw?.terms },
});

const loadTemplate = async () => {
  if (cachedTemplate) return cachedTemplate;
  cachedTemplate = await fs.readFile(TEMPLATE_PATH, "utf8");
  return cachedTemplate;
};

export const injectPrintScript = (html: string, quotationNumber: string) => {
  const title = JSON.stringify(`Quotation ${quotationNumber}`);
  const script = `
<script>
window.addEventListener("load", () => {
  document.title = ${title};
  (async () => {
    if (window.__paginateQuotation) {
      try {
        await window.__paginateQuotation();
      } catch {
        // Ignore pagination errors and continue to print.
      }
    }
    setTimeout(() => {
      window.print();
    }, 250);
  })();
});
</script>
`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${script}\n</body>`);
  }

  return `${html}\n${script}`;
};

const loadPuppeteer = () => {
  try {
    const puppeteerModule = nodeRequire("puppeteer") as any;
    return puppeteerModule.default ?? puppeteerModule;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Puppeteer is required for PDF generation but is not available. Install it with "pnpm add puppeteer". (${message})`
    );
  }
};

export const generatePdfFromHtml = async (html: string) => {
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    await page.evaluate(async () => {
      // Wait for all fonts and images to load before paginating.
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
      const images = Array.from(document.images ?? []);
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = img.onerror = () => resolve();
          });
        })
      );
      const paginator = (window as { __paginateQuotation?: () => Promise<void> })
        .__paginateQuotation;
      if (paginator) {
        await paginator();
      }
    });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
};

const buildProductDescriptionLine = (product?: OrderProduct["product"]) => {
  if (!product) return "";
  const description = normalizeText(product.description);
  if (!description) {
    return "";
  }
  return truncateText(description, 120);
};

const buildProductMetaLine = (_product?: OrderProduct["product"]) => "";

const buildDescription = (
  product?: OrderProduct["product"],
  descriptionLine?: string,
  promoLine?: string,
  metaLine?: string
) => {
  if (!product) return "Item";
  const lines: string[] = [];
  const name = normalizeText(product.name);
  const normalizedDescription = normalizeText(descriptionLine);
  const normalizedMeta = normalizeText(metaLine);

  if (name) {
    lines.push(escapeHtml(name));
  }
  if (promoLine) {
    lines.push(`<span class="promo-line">${escapeHtml(promoLine)}</span>`);
  }
  if (normalizedDescription && normalizedDescription !== name) {
    lines.push(escapeHtml(normalizedDescription));
  }
  if (normalizedMeta) {
    lines.push(escapeHtml(normalizedMeta));
  }
  if (!lines.length) {
    return "Item";
  }

  return lines.join("<br>");
};

const resolveLineDiscount = (item: OrderProduct) => {
  const quantity = Number(item.quantity ?? 0);
  const unitPrice =
    typeof item.unitPrice === "number"
      ? item.unitPrice
      : item.product?.price ?? 0;
  const baseTotal = unitPrice * quantity;
  const lineTotal =
    typeof item.lineTotal === "number" ? item.lineTotal : baseTotal;

  if (typeof item.discountAmount === "number") {
    return item.discountAmount;
  }

  return Math.max(0, baseTotal - lineTotal);
};

const resolveLineTotal = (
  item: OrderProduct,
  unitPrice: number,
  quantity: number
) => {
  const baseTotal = unitPrice * quantity;
  if (typeof item.lineTotal === "number") {
    return item.lineTotal;
  }
  if (typeof item.discountAmount === "number") {
    return Math.max(0, baseTotal - item.discountAmount);
  }
  return baseTotal;
};

const resolveDiscountDisplay = (
  item: OrderProduct,
  discountAmount: number,
  productDiscount: number | undefined
) => {
  if (item.discountType === "percentage" && item.discountValue) {
    return formatPercent(item.discountValue);
  }

  if (
    (item.discountType === "fixed_amount" || item.discountType === "fixed") &&
    discountAmount > 0
  ) {
    return formatNumber(discountAmount);
  }

  if (!item.discountType && productDiscount && productDiscount > 0) {
    return formatPercent(productDiscount);
  }

  if (discountAmount > 0) {
    return formatNumber(discountAmount);
  }

  return "";
};

const buildPromotionLine = (
  item: OrderProduct,
  discountDisplay: string,
  lookup?: PromotionLookup
) => {
  if (!item.promotionId && !item.promotionName) {
    return "";
  }

  const promotionType = item.promotionType ?? "promotion";
  const typeLabel = "Promo";
  const lookupId = item.promotionId ?? "";
  const doc =
    promotionType === "deal"
      ? lookup?.dealsById.get(lookupId)
      : lookup?.promotionsById.get(lookupId);
  const resolvedName =
    normalizeText(item.promotionName) ||
    normalizeText(promotionType === "deal" ? doc?.title : doc?.name) ||
    normalizeText(item.promotionId);

  if (!resolvedName) {
    return "";
  }

  const detailParts: string[] = [];
  if (discountDisplay) {
    detailParts.push(discountDisplay);
  }

  if (promotionType === "promotion") {
    const badge = normalizeText(doc?.badgeLabel);
    const shortDesc = truncateText(normalizeText(doc?.shortDescription ?? ""), 80);
    if (badge) {
      detailParts.push(badge);
    }
    if (shortDesc) {
      detailParts.push(shortDesc);
    }
  } else if (promotionType === "deal") {
    const badge = normalizeText(doc?.badge);
    if (badge) {
      detailParts.push(badge);
    }
  }

  const detailText = detailParts.filter(Boolean).join(" · ");
  return detailText
    ? `${typeLabel}: ${resolvedName} (${detailText})`
    : `${typeLabel}: ${resolvedName}`;
};

const buildItemRows = (items: OrderProduct[] | undefined, lookup?: PromotionLookup) => {
  if (!items?.length) {
    return `<tr><td colspan="8" class="td-center"><span class="lang-en-only" lang="en">No items found</span><span class="lang-th-mode" lang="th">ไม่พบรายการสินค้า</span></td></tr>`;
  }

  return items
    .map((item, index) => {
      const product = item.product;
      const quantity = Number(item.quantity ?? 0);
      const unitPrice =
        typeof item.unitPrice === "number"
          ? item.unitPrice
          : product?.price ?? 0;
      const lineTotal = resolveLineTotal(item, unitPrice, quantity);
      const discountAmount = resolveLineDiscount(item);
      const discountDisplay = resolveDiscountDisplay(
        item,
        discountAmount,
        product?.discount
      );
      const descriptionLine = buildProductDescriptionLine(product);
      const metaLine = buildProductMetaLine(product);
      const promoLine = buildPromotionLine(item, discountDisplay, lookup);
      const description = buildDescription(
        product,
        descriptionLine,
        promoLine,
        metaLine
      );
      const unitLabel = normalizeText(product?.unit) || "-";
      const codeValue =
        normalizeText(product?.sku) ||
        normalizeText(product?.name) ||
        normalizeText(product?._id) ||
        "-";

      const cells = [
        `<td class="td-center">${index + 1}</td>`,
        `<td class="td-left">${escapeHtml(codeValue)}</td>`,
        `<td class="td-left td-desc">${description}</td>`,
        `<td class="td-right">${formatNumber(quantity)}</td>`,
        `<td class="td-center">${escapeHtml(unitLabel)}</td>`,
        `<td class="td-right">${formatNumber(unitPrice)}</td>`,
        `<td class="td-right">${escapeHtml(discountDisplay)}</td>`,
        `<td class="td-right">${formatNumber(lineTotal)}</td>`,
      ];

      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");
};

const collectPromotionSummaries = (items?: OrderProduct[]) => {
  if (!items?.length) {
    return [];
  }

  const summaries = new Map<string, PromotionSummary>();

  items.forEach((item) => {
    if (!item.promotionId) {
      return;
    }

    const promotionType = item.promotionType ?? "promotion";
    const key = `${promotionType}:${item.promotionId}`;
    const discountAmount = resolveLineDiscount(item);
    const existing = summaries.get(key);

    if (existing) {
      existing.discountAmount += discountAmount;
      if (!existing.name && item.promotionName) {
        existing.name = item.promotionName;
      }
      if (!existing.discountType && item.discountType) {
        existing.discountType = item.discountType;
      }
      if (
        typeof existing.discountValue !== "number" &&
        typeof item.discountValue === "number"
      ) {
        existing.discountValue = item.discountValue;
      }
      return;
    }

    summaries.set(key, {
      id: item.promotionId,
      type: promotionType,
      name: item.promotionName,
      discountType: item.discountType,
      discountValue: item.discountValue,
      discountAmount,
    });
  });

  return Array.from(summaries.values());
};

const fetchPromotionLookup = async (
  summaries: PromotionSummary[]
): Promise<PromotionLookup> => {
  const promotionIds = new Set<string>();
  const dealIds = new Set<string>();

  summaries.forEach((summary) => {
    if (summary.type === "deal") {
      dealIds.add(summary.id);
    } else {
      promotionIds.add(summary.id);
    }
  });

  const [promotions, deals] = await Promise.all([
    promotionIds.size
      ? client.fetch<PromotionDoc[]>(
          `*[_type == "promotion" && (campaignId in $ids || _id in $ids)]{
            _id,
            campaignId,
            name,
            type,
            discountType,
            discountValue,
            startDate,
            endDate,
            badgeLabel,
            shortDescription,
            minimumOrderValue,
            maximumDiscount,
            perCustomerLimit
          }`,
          { ids: Array.from(promotionIds) }
        )
      : Promise.resolve([]),
    dealIds.size
      ? client.fetch<DealDoc[]>(
          `*[_type == "deal" && (dealId in $ids || _id in $ids)]{
            _id,
            dealId,
            title,
            dealType,
            startDate,
            endDate,
            badge,
            dealPrice,
            originalPrice,
            quantityLimit,
            perCustomerLimit
          }`,
          { ids: Array.from(dealIds) }
        )
      : Promise.resolve([]),
  ]);

  const promotionsById = new Map<string, PromotionDoc>();
  promotions.forEach((promotion) => {
    if (promotion._id) {
      promotionsById.set(promotion._id, promotion);
    }
    if (promotion.campaignId) {
      promotionsById.set(promotion.campaignId, promotion);
    }
  });

  const dealsById = new Map<string, DealDoc>();
  deals.forEach((deal) => {
    if (deal._id) {
      dealsById.set(deal._id, deal);
    }
    if (deal.dealId) {
      dealsById.set(deal.dealId, deal);
    }
  });

  return { promotionsById, dealsById };
};

const formatPromotionSummaryDiscount = (summary: PromotionSummary) => {
  const amount =
    summary.discountAmount > 0 ? formatNumber(summary.discountAmount) : "";

  if (summary.discountType === "percentage" && summary.discountValue) {
    const percent = formatPercent(summary.discountValue);
    return amount ? `${percent} (${amount})` : percent;
  }

  if (
    (summary.discountType === "fixed_amount" || summary.discountType === "fixed") &&
    amount
  ) {
    return amount;
  }

  return amount;
};

const buildPromotionSummaryBlock = (
  summaries: PromotionSummary[],
  lookup: PromotionLookup
) => {
  if (!summaries.length) {
    return "";
  }

  const rows = summaries
    .map((summary) => {
      const doc =
        summary.type === "deal"
          ? lookup.dealsById.get(summary.id)
          : lookup.promotionsById.get(summary.id);
      const name =
        normalizeText(summary.name) ||
        normalizeText(summary.type === "deal" ? doc?.title : doc?.name) ||
        summary.id;
      const typeLabel = summary.type === "deal" ? "Deal" : "Promotion";
      const discountLabel =
        formatPromotionSummaryDiscount(summary) || "-";
      const validity = formatDateRange(doc?.startDate, doc?.endDate) || "-";

      const noteParts: string[] = [];
      if (summary.type === "promotion") {
        const badge = normalizeText(doc?.badgeLabel);
        const shortDesc = truncateText(normalizeText(doc?.shortDescription ?? ""), 90);
        if (badge) {
          noteParts.push(badge);
        }
        if (shortDesc) {
          noteParts.push(shortDesc);
        }
        if (typeof doc?.minimumOrderValue === "number" && doc.minimumOrderValue > 0) {
          noteParts.push(`Min order ${formatNumber(doc.minimumOrderValue)}`);
        }
        if (typeof doc?.maximumDiscount === "number" && doc.maximumDiscount > 0) {
          noteParts.push(`Max discount ${formatNumber(doc.maximumDiscount)}`);
        }
        if (typeof doc?.perCustomerLimit === "number" && doc.perCustomerLimit > 0) {
          noteParts.push(`Limit ${doc.perCustomerLimit}/customer`);
        }
      } else {
        const badge = normalizeText(doc?.badge);
        if (badge) {
          noteParts.push(badge);
        }
        if (doc?.dealType) {
          noteParts.push(doc.dealType);
        }
        if (typeof doc?.dealPrice === "number") {
          noteParts.push(`Deal ${formatNumber(doc.dealPrice)}`);
        }
        if (typeof doc?.originalPrice === "number") {
          noteParts.push(`Was ${formatNumber(doc.originalPrice)}`);
        }
        if (typeof doc?.quantityLimit === "number" && doc.quantityLimit > 0) {
          noteParts.push(`Qty limit ${doc.quantityLimit}`);
        }
        if (typeof doc?.perCustomerLimit === "number" && doc.perCustomerLimit > 0) {
          noteParts.push(`Limit ${doc.perCustomerLimit}/customer`);
        }
      }

      const notes = noteParts.length ? noteParts.join(" · ") : "-";

      return `
        <tr>
          <td>${escapeHtml(typeLabel)}</td>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(discountLabel)}</td>
          <td>${escapeHtml(validity)}</td>
          <td>${escapeHtml(notes)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="promo-summary">
      <div class="remark-title">
        <span class="lang-en-only" lang="en">Promotions & Deals :</span>
        <span class="lang-th-mode" lang="th">โปรโมชันและดีล :</span>
      </div>
      <table class="promo-table">
        <thead>
          <tr>
            <th><span class="lang-en-only" lang="en">Type</span><span class="lang-th-mode" lang="th">ประเภท</span></th>
            <th><span class="lang-en-only" lang="en">Name</span><span class="lang-th-mode" lang="th">ชื่อ</span></th>
            <th><span class="lang-en-only" lang="en">Discount</span><span class="lang-th-mode" lang="th">ส่วนลด</span></th>
            <th><span class="lang-en-only" lang="en">Validity</span><span class="lang-th-mode" lang="th">ระยะเวลา</span></th>
            <th><span class="lang-en-only" lang="en">Notes</span><span class="lang-th-mode" lang="th">หมายเหตุ</span></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};

const buildPromotionDiscountRows = (
  summaries: PromotionSummary[],
  lookup: PromotionLookup | null,
  fallbackAmount: number
) => {
  if (!summaries.length) {
    if (!Number.isFinite(fallbackAmount) || fallbackAmount <= 0) {
      return "";
    }
    return `
      <tr class="promo-discount-row">
        <td class="label">Discount</td>
        <td class="value only-last-value">${formatNumber(fallbackAmount)}</td>
      </tr>
    `;
  }

  return summaries
    .map((summary) => {
      const doc =
        summary.type === "deal"
          ? lookup?.dealsById.get(summary.id)
          : lookup?.promotionsById.get(summary.id);
      const rawName =
        normalizeText(summary.name) ||
        normalizeText(summary.type === "deal" ? doc?.title : doc?.name) ||
        normalizeText(summary.id);
      const name = truncateText(rawName || "", 60);
      const labelPrefix =
        summary.type === "deal" ? "Deal Discount" : "Promotion Discount";
      const label = name ? `${labelPrefix} - ${name}` : labelPrefix;
      const amount = Number.isFinite(summary.discountAmount)
        ? Math.max(0, summary.discountAmount)
        : 0;

      return `
        <tr class="promo-discount-row">
          <td class="label">${escapeHtml(label)}</td>
          <td class="value only-last-value">${formatNumber(amount)}</td>
        </tr>
      `;
    })
    .join("");
};

const isThaiAddress = (address?: Address | null) => {
  if (!address) return false;
  const countryCode = normalizeText(address.countryCode).toLowerCase();
  const country = normalizeText(address.country).toLowerCase();
  const stateCode = normalizeText(address.stateCode).toUpperCase();
  return (
    countryCode === "th" ||
    country === "thailand" ||
    stateCode.startsWith("TH-")
  );
};

const formatAddress = (address?: Address | null) => {
  if (!address) return "";
  if (isThaiAddress(address)) {
    return formatThaiAddress(address);
  }
  const parts = [
    address.address,
    address.subArea,
    address.city,
    address.state,
    address.zip,
    address.country,
  ]
    .map((part) => normalizeText(part))
    .filter(Boolean)
    .join(" ");
  return parts || "";
};

const PLACEHOLDER_PATTERN = /\{([a-zA-Z0-9_.]+)\}/g;

type PlaceholderValue = {
  value: string;
  raw?: boolean;
};

type PlaceholderMap = Record<string, string | PlaceholderValue>;

const asRaw = (value: string): PlaceholderValue => ({ value, raw: true });

const extractPlaceholders = (template: string) => {
  const pattern = new RegExp(PLACEHOLDER_PATTERN);
  const placeholders = new Set<string>();
  for (const match of template.matchAll(pattern)) {
    placeholders.add(match[1]);
  }
  return placeholders;
};

const resolvePlaceholder = (entry: string | PlaceholderValue) => {
  if (typeof entry === "string") {
    return { value: entry, raw: false };
  }
  return { value: entry.value, raw: Boolean(entry.raw) };
};

const applyTemplate = (template: string, placeholders: PlaceholderMap) => {
  let output = template;
  const rawTokens = new Map<string, string>();
  let tokenIndex = 0;

  const templateKeys = extractPlaceholders(template);
  const missingKeys = Array.from(templateKeys).filter(
    (key) => !(key in placeholders)
  );
  if (missingKeys.length) {
    console.warn(
      "Missing quotation placeholders:",
      missingKeys.sort().join(", ")
    );
  }

  Object.entries(placeholders).forEach(([key, entry]) => {
    if (!templateKeys.has(key)) return;
    const { value, raw } = resolvePlaceholder(entry);
    const safeValue = value ?? "";

    if (raw) {
      const token = `__RAW_VALUE_${tokenIndex}_${key}__`;
      tokenIndex += 1;
      rawTokens.set(token, safeValue);
      output = output.replaceAll(`{${key}}`, token);
      return;
    }

    output = output.replaceAll(`{${key}}`, escapeHtml(safeValue));
  });

  const unresolvedPattern = new RegExp(PLACEHOLDER_PATTERN);
  const unresolved = output.match(unresolvedPattern);
  if (unresolved) {
    const unique = Array.from(new Set(unresolved));
    console.warn("Unresolved quotation placeholders:", unique.join(", "));
    output = output.replace(unresolvedPattern, "-");
  }

  rawTokens.forEach((value, token) => {
    output = output.replaceAll(token, value);
  });

  return output;
};

export const renderQuotation = async (
  order: OrderData,
  quotation: QuotationRenderMeta | null,
  settings: QuotationSettings,
  languageMode: LanguageMode,
  options: {
    fallbackPhone?: string;
    quotationDoc?: QuotationDocument | null;
  } = {}
) => {
  const template = await loadTemplate();
  const fallbackPhone = normalizeText(options.fallbackPhone);
  const quotationDoc = options.quotationDoc ?? null;
  const fallbackOrderNumber = normalizeText(order.orderNumber);
  const resolvedQuotationNumber =
    normalizeText(quotation?.number) ||
    normalizeText(order.purchaseOrder?.number) ||
    (fallbackOrderNumber ? `QT-${fallbackOrderNumber}` : "");
  const quotationDateSource = resolveQuotationDateSource(order, quotation);
  const quotationDate = formatDate(quotationDateSource);
  const pageNumber = "1";
  const totalPages = "1";
  const items =
    quotationDoc?.products ?? quotationDoc?.items ?? order.products ?? [];
  const promotionSummaries = collectPromotionSummaries(items);
  const promotionLookup = await fetchPromotionLookup(promotionSummaries);

  const computedTotals = items.reduce(
    (acc, item) => {
      const unitPrice =
        typeof item.unitPrice === "number"
          ? item.unitPrice
          : item.product?.price ?? 0;
      const quantity = Number(item.quantity ?? 0);
      const baseTotal = unitPrice * quantity;
      const lineTotal = resolveLineTotal(item, unitPrice, quantity);
      const lineDiscount = resolveLineDiscount(item);

      acc.subtotal += baseTotal;
      acc.discount += lineDiscount;
      acc.afterDiscount += lineTotal;
      return acc;
    },
    { subtotal: 0, discount: 0, afterDiscount: 0 }
  );

  const grossSubtotalRaw = computedTotals.subtotal;
  const lineSubtotal = computedTotals.afterDiscount;
  const quotationTotals = quotationDoc?.totals ?? null;
  const subtotalOverride = resolveNumberValue(
    quotationDoc?.subtotal,
    quotationTotals?.subtotal,
    order.subtotal
  );
  const amountDiscountOverride = resolveNumberValue(
    quotationDoc?.amountDiscount,
    quotationTotals?.amountDiscount,
    order.amountDiscount
  );
  const shippingOverride = resolveNumberValue(
    quotationDoc?.shipping,
    quotationTotals?.shipping,
    order.shipping
  );
  const taxOverride = resolveNumberValue(
    quotationDoc?.tax,
    quotationTotals?.tax,
    order.tax
  );
  const totalPriceOverride = resolveNumberValue(
    quotationDoc?.totalPrice,
    quotationTotals?.totalPrice,
    order.totalPrice
  );
  const netSubtotal =
    typeof subtotalOverride === "number"
      ? subtotalOverride
      : typeof amountDiscountOverride === "number"
        ? Math.max(0, grossSubtotalRaw - amountDiscountOverride)
        : lineSubtotal;
  const grossSubtotal =
    items.length === 0 && netSubtotal > 0 ? netSubtotal : grossSubtotalRaw;
  const totalDiscount = Math.max(0, grossSubtotal - netSubtotal);
  const promotionDiscountTotalRaw = promotionSummaries.reduce(
    (sum, summary) =>
      sum +
      (Number.isFinite(summary.discountAmount) ? summary.discountAmount : 0),
    0
  );
  const orderDiscount =
    typeof amountDiscountOverride === "number" ? amountDiscountOverride : 0;
  const promotionDiscountTotal =
    promotionDiscountTotalRaw > 0
      ? promotionDiscountTotalRaw
      : orderDiscount > 0
        ? orderDiscount
        : totalDiscount;
  const shippingAmount =
    typeof shippingOverride === "number" ? shippingOverride : 0;
  const vatPercent = Number.isFinite(settings.vatPercent)
    ? settings.vatPercent
    : DEFAULT_SETTINGS.vatPercent;
  const vatAmount = taxOverride ?? netSubtotal * (vatPercent / 100);
  const grandTotal =
    totalPriceOverride ?? netSubtotal + vatAmount + shippingAmount;
  const resolvedCurrency =
    normalizeText(quotationDoc?.currency) ||
    normalizeText(quotationTotals?.currency) ||
    normalizeText(order.currency);
  const currencyDisplay = formatCurrencyDisplay(
    resolvedCurrency || undefined,
    grandTotal,
    languageMode
  );

  if (process.env.DEBUG_QUOTATION_TOTALS) {
    if (netSubtotal + vatAmount + shippingAmount !== grandTotal) {
      console.warn(
        `Quotation totals mismatch: netSubtotal (${netSubtotal}) + vat (${vatAmount}) + shipping (${shippingAmount}) != grandTotal (${grandTotal})`
      );
    }
    if (grossSubtotal - totalDiscount !== netSubtotal) {
      console.warn(
        `Quotation totals mismatch: grossSubtotal (${grossSubtotal}) - discount (${totalDiscount}) != netSubtotal (${netSubtotal})`
      );
    }
  }

  const promotionNames = new Set<string>();
  const dealNames = new Set<string>();

  items.forEach((item) => {
    if (!item.promotionName) return;
    if (item.promotionType === "deal") {
      dealNames.add(item.promotionName);
    } else {
      promotionNames.add(item.promotionName);
    }
  });

  const remarkParts = [normalizeText(settings.remark)].filter(Boolean);
  if (promotionNames.size > 0) {
    remarkParts.push(`Promotions: ${Array.from(promotionNames).join(", ")}.`);
  }
  if (dealNames.size > 0) {
    remarkParts.push(`Deals: ${Array.from(dealNames).join(", ")}.`);
  }
  const remarkText = remarkParts.length ? remarkParts.join("\n") : "-";

  const promotionSummaryBlock = buildPromotionSummaryBlock(
    promotionSummaries,
    promotionLookup
  );
  const promotionDiscountRows = buildPromotionDiscountRows(
    promotionSummaries,
    promotionLookup,
    promotionDiscountTotal
  );
  const { lang: documentLang, className: documentLangClass } =
    getDocumentLanguage(languageMode);
  const qrImageUrl = await buildQrImageUrl(settings);
  const saleSignatureHtml = buildSignatureImageHtml(settings.signatures?.saleUrl);
  const managerSignatureHtml = buildSignatureImageHtml(
    settings.signatures?.managerUrl
  );
  const purchaserSignatureHtml = buildSignatureImageHtml(
    settings.signatures?.purchaserUrl
  );
  const salesContact = resolveSalesContact(
    quotationDoc?.salesContact ?? quotation?.salesContact,
    settings.sales
  );
  const resolvedTerms = resolveQuotationTerms(
    quotationDoc?.terms ?? salesContact?.terms,
    settings.terms
  );

  const customerAddress =
    quotationDoc?.quotationDetails ?? order.quotationDetails ?? order.address;
  const customerContact =
    normalizeText(customerAddress?.name) ||
    normalizeText(quotationDoc?.customerName) ||
    normalizeText(order.customerName);
  const customerCompany =
    normalizeText(customerAddress?.company) ||
    normalizeText(settings.customerDefaults.company) ||
    normalizeText(order.customerName);
  const customerCode =
    normalizeText(customerAddress?.customerCode) ||
    normalizeText(settings.customerDefaults.code);
  const customerWinCode = normalizeText(customerAddress?.winCode);
  const customerTaxId =
    normalizeText(customerAddress?.taxId) ||
    normalizeText(settings.customerDefaults.taxId);
  const customerBranch =
    normalizeText(customerAddress?.branch) ||
    normalizeText(settings.customerDefaults.branch);
  const customerFax =
    normalizeText(customerAddress?.fax) ||
    normalizeText(settings.customerDefaults.fax);
  const customerPhone =
    normalizeText(customerAddress?.phone) ||
    normalizeText(quotationDoc?.phone) ||
    normalizeText(order.phone) ||
    fallbackPhone;
  const customerEmail =
    normalizeText(customerAddress?.contactEmail) ||
    normalizeText(quotationDoc?.email) ||
    normalizeText(order.email);
  const customerLineId = normalizeText(customerAddress?.lineId);
  const productCodeList = Array.from(
    new Set(
      items
        .map((item) =>
          normalizeText(
            item.product?.sku || item.product?._id || item.product?.name
          )
        )
        .filter(Boolean)
    )
  ).join(", ");
  const productBrandList = Array.from(
    new Set(
      items
        .map((item) => normalizeText(item.product?.brand?.title))
        .filter(Boolean)
    )
  ).join(", ");

  const placeholders: PlaceholderMap = {
    acc_company_name: normalizeText(settings.company.nameEn),
    acc_company_name_th: normalizeText(settings.company.nameTh),
    acc_company_address_en: normalizeText(settings.company.addressEn),
    acc_company_phone_en: normalizeText(settings.company.phoneEn),
    acc_company_fax_en: normalizeText(settings.company.faxEn),
    acc_company_email: normalizeText(settings.company.email),
    acc_company_line_id: normalizeText(settings.company.lineId),
    acc_company_address_th: normalizeText(settings.company.addressTh),
    acc_company_phone_th: normalizeText(settings.company.phoneTh),
    acc_company_fax_th: normalizeText(settings.company.faxTh),
    acc_company_tax_id: normalizeText(settings.company.taxId),
    company_logo_url: normalizeText(settings.company.logoUrl),
    acc_company_head_office_label: normalizeText(
      settings.company.headOfficeLabel
    ),
    document_lang: documentLang,
    document_lang_class: documentLangClass,
    page_number: pageNumber,
    total_pages: totalPages,
    qr_label: normalizeText(settings.qrLabel),
    cert_box_image_url: normalizeText(settings.certBoxImageUrl),
    qr_image_url: qrImageUrl,
    payment_logo_image_url: normalizeText(settings.paymentLogoImageUrl),
    customer_tax_id: customerTaxId,
    customer_branch: customerBranch,
    customer_code: customerCode,
    customer_win_code: customerWinCode,
    customer_contact: customerContact,
    customer_company: customerCompany,
    customer_address: formatAddress(customerAddress),
    customer_line_id: customerLineId,
    customer_phone: customerPhone,
    customer_fax: customerFax,
    customer_email: customerEmail,
    quotation_number: normalizeText(resolvedQuotationNumber),
    quotation_date: quotationDate,
    sale_name: normalizeText(salesContact?.name),
    sale_phone: normalizeText(salesContact?.phone),
    sale_ext: normalizeText(salesContact?.ext),
    sale_fax: normalizeText(salesContact?.fax),
    sale_mobile: normalizeText(salesContact?.mobile),
    sale_line_id: normalizeText(salesContact?.lineId),
    sale_line_ext: normalizeText(salesContact?.lineExt),
    sale_email: normalizeText(salesContact?.email),
    sale_web: normalizeText(salesContact?.web),
    product_code_list: productCodeList,
    product_brand_list: productBrandList,
    currency_display: currencyDisplay,
    sub_total: formatNumber(grossSubtotal),
    discount: formatNumber(totalDiscount),
    promotion_discount_total: formatNumber(promotionDiscountTotal),
    after_discount: formatNumber(netSubtotal),
    shipping: formatNumber(shippingAmount),
    vat_label: `VAT ${vatPercent}%`,
    vat_amount: formatNumber(vatAmount),
    grand_total: formatNumber(grandTotal),
    payment_condition: normalizeText(resolvedTerms.paymentCondition),
    delivery_condition: normalizeText(resolvedTerms.deliveryCondition),
    validity_condition: normalizeText(resolvedTerms.validityCondition),
    warranty_condition: normalizeText(resolvedTerms.warrantyCondition),
    "terms.paymentCondition": normalizeText(resolvedTerms.paymentCondition),
    "terms.deliveryCondition": normalizeText(resolvedTerms.deliveryCondition),
    "terms.validityCondition": normalizeText(resolvedTerms.validityCondition),
    "terms.warrantyCondition": normalizeText(resolvedTerms.warrantyCondition),
    sale_date: quotationDate,
    manager_date: "",
    cert_block: asRaw(normalizeText(settings.certBlockHtml)),
    item_rows: asRaw(buildItemRows(items, promotionLookup)),
    promotion_summary_block: asRaw(promotionSummaryBlock),
    promotion_discount_rows: asRaw(promotionDiscountRows),
    sale_signature_img: asRaw(saleSignatureHtml),
    manager_signature_img: asRaw(managerSignatureHtml),
    purchaser_signature_img: asRaw(purchaserSignatureHtml),
    remark: asRaw(toHtmlWithLineBreaks(remarkText)),
  };

  return applyTemplate(template, placeholders);
};

export const fetchQuotationSettings = async (): Promise<QuotationSettings> => {
  try {
    const data = await client.fetch(
      `*[_type == "purchaseOrderSettings"][0]{
        company{
          nameEn,
          nameTh,
          addressEn,
          phoneEn,
          faxEn,
          email,
          lineId,
          addressTh,
          phoneTh,
          faxTh,
          taxId,
          logoUrl,
          headOfficeLabel
        },
        languageDefault,
        certBlockHtml,
        certBoxImageUrl,
        qrLabel,
        qrPayload,
        qrImageUrl,
        paymentLogoImageUrl,
        customerDefaults{
          taxId,
          branch,
          code,
          company,
          fax
        },
        sales{
          name,
          phone,
          ext,
          fax,
          mobile,
          lineId,
          lineExt,
          email,
          web
        },
        signatures{
          saleUrl,
          managerUrl,
          purchaserUrl
        },
        terms{
          paymentCondition,
          deliveryCondition,
          validityCondition,
          warrantyCondition
        },
        vatPercent,
        remark
      }`
    );

    return mergeSettings(data ?? undefined);
  } catch (error) {
    console.error("Failed to load quotation settings:", error);
    return DEFAULT_SETTINGS;
  }
};

export const fetchOrder = async (orderId: string, clerkUserId: string) =>
  writeClient.fetch<OrderData | null>(
    `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
      _id,
      orderNumber,
      clerkUserId,
      customerName,
      email,
      phone,
      subtotal,
      tax,
      shipping,
      totalPrice,
      amountDiscount,
      currency,
      orderDate,
      status,
      quotationRequestedAt,
      address{
        _id,
        name,
        email,
        contactEmail,
        phone,
        fax,
        company,
        customerCode,
        taxId,
        branch,
        address,
        city,
        state,
        zip,
        country,
        countryCode,
        stateCode,
        subArea,
        type,
        default,
        createdAt,
        lastUsedAt
      },
      quotationDetails{
        _id,
        name,
        email,
        contactEmail,
        phone,
        fax,
        company,
        customerCode,
        winCode,
        taxId,
        branch,
        address,
        city,
        state,
        zip,
        country,
        countryCode,
        stateCode,
        subArea,
        type,
        default,
        createdAt,
        lastUsedAt
      },
      purchaseOrder{
        number,
        createdAt,
        emailSentAt
      },
      salesContact->{
        _id,
        name,
        phone,
        ext,
        fax,
        mobile,
        lineId,
        lineExt,
        email,
        web,
        terms{
          paymentCondition,
          deliveryCondition,
          validityCondition,
          warrantyCondition
        }
      },
      products[]{
        quantity,
        unitPrice,
        lineTotal,
        discountAmount,
        discountType,
        discountValue,
        promotionName,
        promotionType,
        promotionId,
        product->{
          _id,
          name,
          description,
          price,
          sku,
          unit,
          discount,
          collection,
          warranty,
          returnPolicy,
          weight,
          dimensions,
          slug,
          brand->{
            title
          },
          categories[]->{
            title
          },
          variant->{
            title
          }
        }
      }
    }`,
    { orderId, clerkUserId }
  );

const QUOTATION_TERMS_FIELDS = `
  paymentCondition,
  deliveryCondition,
  validityCondition,
  warrantyCondition
`;

const QUOTATION_ADDRESS_FIELDS = `
  _id,
  name,
  email,
  contactEmail,
  phone,
  fax,
  company,
  customerCode,
  taxId,
  branch,
  address,
  city,
  state,
  zip,
  country,
  countryCode,
  stateCode,
  subArea,
  type,
  default,
  createdAt,
  lastUsedAt
`;

const QUOTATION_PRODUCT_FIELDS = `
  quantity,
  unitPrice,
  lineTotal,
  discountAmount,
  discountType,
  discountValue,
  promotionName,
  promotionType,
  promotionId,
  "product": coalesce(
    product->{
      _id,
      name,
      description,
      price,
      sku,
      unit,
      discount,
      collection,
      warranty,
      returnPolicy,
      weight,
      dimensions,
      slug,
      brand->{
        title
      },
      categories[]->{
        title
      },
      variant->{
        title
      }
    },
    product{
      _id,
      name,
      description,
      price,
      sku,
      unit,
      discount,
      collection,
      warranty,
      returnPolicy,
      weight,
      dimensions,
      slug,
      brand{
        title
      },
      categories[]{
        title
      },
      variant{
        title
      }
    }
  )
`;

const QUOTATION_TOTAL_FIELDS = `
  subtotal,
  tax,
  shipping,
  totalPrice,
  amountDiscount,
  currency
`;

export const fetchLatestQuotation = async (orderId: string) =>
  writeClient.fetch<QuotationDocument | null>(
    `*[_type == "quotation" && order._ref == $orderId] | order(isLatestVersion desc, version desc, createdAt desc)[0]{
      _id,
      version,
      number,
      createdAt,
      emailSentAt,
      pdfUrl,
      isLatestVersion,
      customerName,
      email,
      phone,
      currency,
      subtotal,
      tax,
      shipping,
      totalPrice,
      amountDiscount,
      totals{
        ${QUOTATION_TOTAL_FIELDS}
      },
      terms{
        ${QUOTATION_TERMS_FIELDS}
      },
      quotationDetails{
        ${QUOTATION_ADDRESS_FIELDS}
      },
      products[]{
        ${QUOTATION_PRODUCT_FIELDS}
      },
      items[]{
        ${QUOTATION_PRODUCT_FIELDS}
      },
      salesContact->{
        _id,
        name,
        phone,
        ext,
        fax,
        mobile,
        lineId,
        lineExt,
        email,
        web,
        terms{
          ${QUOTATION_TERMS_FIELDS}
        }
      }
    }`,
    { orderId }
  );

export const fetchQuotationById = async (
  orderId: string,
  quotationId: string
) =>
  writeClient.fetch<QuotationDocument | null>(
    `*[_type == "quotation" && _id == $quotationId && order._ref == $orderId][0]{
      _id,
      version,
      number,
      createdAt,
      emailSentAt,
      pdfUrl,
      isLatestVersion,
      customerName,
      email,
      phone,
      currency,
      subtotal,
      tax,
      shipping,
      totalPrice,
      amountDiscount,
      totals{
        ${QUOTATION_TOTAL_FIELDS}
      },
      terms{
        ${QUOTATION_TERMS_FIELDS}
      },
      quotationDetails{
        ${QUOTATION_ADDRESS_FIELDS}
      },
      products[]{
        ${QUOTATION_PRODUCT_FIELDS}
      },
      items[]{
        ${QUOTATION_PRODUCT_FIELDS}
      },
      salesContact->{
        _id,
        name,
        phone,
        ext,
        fax,
        mobile,
        lineId,
        lineExt,
        email,
        web,
        terms{
          ${QUOTATION_TERMS_FIELDS}
        }
      }
    }`,
    { orderId, quotationId }
  );

const resolveBaseUrl = (value?: string) => {
  const fallback = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const resolved = normalizeText(value) || fallback;
  return resolved.endsWith("/") ? resolved.slice(0, -1) : resolved;
};

const injectEmailMessage = (html: string, messageHtml: string) => {
  const match = html.match(/<body[^>]*>/i);
  if (!match || typeof match.index !== "number") {
    return `${messageHtml}${html}`;
  }
  const insertionIndex = match.index + match[0].length;
  return `${html.slice(0, insertionIndex)}${messageHtml}${html.slice(
    insertionIndex
  )}`;
};

export type QuotationGenerationOptions = {
  baseUrl?: string;
  language?: string | null;
  fallbackPhone?: string;
  requireEmail?: boolean;
  forceNewVersion?: boolean;
  forceNew?: boolean;
  order?: OrderData | null;
};

export type QuotationGenerationResult = {
  quotationId: string;
  purchaseOrderNumber: string;
  purchaseOrder: {
    number: string;
    createdAt: string;
    emailSentAt?: string;
  };
  printUrl: string;
  downloadUrl: string;
  pdfUrl: string;
  pdfDownloadUrl: string;
  emailSent: boolean;
  emailError?: string;
};

export type LegacyQuotationGenerationResult = Omit<
  QuotationGenerationResult,
  "quotationId"
>;

export const generateQuotation = async (
  orderId: string,
  clerkUserId: string,
  {
    baseUrl,
    language,
    fallbackPhone = "",
    requireEmail = false,
    forceNewVersion,
    forceNew,
    order: orderOverride,
  }: QuotationGenerationOptions = {}
): Promise<QuotationGenerationResult> => {
  const order =
    orderOverride ?? ((await fetchOrder(orderId, clerkUserId)) as OrderData | null);

  if (!order) {
    throw new Error("Order not found");
  }

  const settings = await fetchQuotationSettings();
  const languageMode = resolveLanguageMode(language, settings);
  const latestQuotation = await fetchLatestQuotation(orderId);
  const resolvedForceNew = forceNewVersion ?? forceNew ?? false;
  const shouldCreateNew = resolvedForceNew || !latestQuotation;
  const isFirstQuote = !latestQuotation;

  let activeQuotation: QuotationDocument | null = latestQuotation;

  if (shouldCreateNew) {
    const baseVersion =
      typeof latestQuotation?.version === "number" ? latestQuotation.version : 0;
    const nextVersion = baseVersion + 1;
    const createdAt = new Date().toISOString();
    const quotationNumber = buildQuotationNumber(order.orderNumber, nextVersion);
    const quotationDetailsSnapshot = buildQuotationDetailsSnapshot(
      order.quotationDetails ?? order.address
    );
    const newQuotation = await writeClient.create({
      _type: "quotation",
      order: { _type: "reference", _ref: order._id },
      version: nextVersion,
      number: quotationNumber,
      isLatestVersion: true,
      createdAt,
      ...(quotationDetailsSnapshot
        ? { quotationDetails: quotationDetailsSnapshot }
        : {}),
      ...(order.salesContact?._id
        ? { salesContact: { _type: "reference", _ref: order.salesContact._id } }
        : {}),
    });
    activeQuotation = newQuotation as QuotationDocument;
    if (latestQuotation?._id) {
      try {
        await writeClient
          .patch(latestQuotation._id)
          .set({ isLatestVersion: false })
          .commit();
      } catch (error) {
        console.error("Failed to update latest quotation flag:", error);
      }
    }
  }

  if (!activeQuotation?._id) {
    throw new Error("Quotation not found");
  }

  const quotationSnapshot = await fetchQuotationById(
    order._id,
    activeQuotation._id
  );
  const quotationData = quotationSnapshot ?? activeQuotation;
  const resolvedVersion =
    typeof quotationData.version === "number" ? quotationData.version : 1;
  const quotationNumber =
    normalizeText(quotationData.number) ||
    buildQuotationNumber(order.orderNumber, resolvedVersion);
  const createdAt =
    normalizeText(quotationData.createdAt) || new Date().toISOString();

  const updateFields: Record<string, string> = {};
  if (!order.quotationRequestedAt) {
    updateFields.quotationRequestedAt = createdAt;
  }
  const shouldMarkQuotation =
    order.status !== ORDER_STATUSES.QUOTATION_REQUESTED &&
    (order.status === ORDER_STATUSES.PENDING ||
      order.status === "address_confirmed" ||
      !order.status);
  if (shouldMarkQuotation) {
    updateFields.status = ORDER_STATUSES.QUOTATION_REQUESTED;
  }
  if (Object.keys(updateFields).length > 0) {
    await writeClient.patch(order._id).set(updateFields).commit();
  }

  const langQuery = languageMode === "both" ? "" : `&lang=${languageMode}`;
  const printUrl = `/api/orders/${order._id}/purchase-order?print=1${langQuery}`;
  const downloadUrl = `/api/orders/${order._id}/purchase-order?download=1${langQuery}`;
  const pdfUrl = `/api/orders/${order._id}/purchase-order?pdf=1${langQuery}`;
  const pdfDownloadUrl = `/api/orders/${order._id}/purchase-order?pdf=1&download=1${langQuery}`;
  const quotationMeta = {
    number: quotationNumber,
    createdAt,
    salesContact: quotationData.salesContact ?? order.salesContact ?? undefined,
  };
  const existingPdfUrl = normalizeText(quotationData.pdfUrl);
  let storedPdfUrl = existingPdfUrl || undefined;
  let htmlContent: string | null = null;
  let pdfBuffer: Buffer | null = null;

  const ensureHtmlContent = async () => {
    if (!htmlContent) {
      htmlContent = await renderQuotation(
        order,
        quotationMeta,
        settings,
        languageMode,
        { fallbackPhone, quotationDoc: quotationData }
      );
    }
    return htmlContent;
  };

  const ensurePdfBuffer = async () => {
    if (!pdfBuffer) {
      const resolvedHtml = await ensureHtmlContent();
      pdfBuffer = await generatePdfFromHtml(resolvedHtml);
    }
    return pdfBuffer;
  };

  if (!storedPdfUrl) {
    try {
      const resolvedPdfBuffer = await ensurePdfBuffer();
      const pdfAsset = await writeClient.assets.upload(
        "file",
        resolvedPdfBuffer,
        {
          filename: `${quotationNumber}.pdf`,
          contentType: "application/pdf",
        }
      );
      if (pdfAsset?.url) {
        storedPdfUrl = pdfAsset.url;
        await writeClient
          .patch(activeQuotation._id)
          .set({ pdfUrl: storedPdfUrl })
          .commit();
      }
    } catch (error) {
      console.error("Failed to store quotation PDF:", error);
    }
  }

  const recipientEmail =
    normalizeText(order.quotationDetails?.contactEmail) ||
    normalizeText(order.address?.contactEmail) ||
    normalizeText(order.email);
  let emailSent = false;
  let emailError: string | undefined;
  let emailSentAt = normalizeText(quotationData.emailSentAt) || undefined;

  if (emailSentAt) {
    emailSent = true;
  } else if (!recipientEmail) {
    emailError = "No recipient email available for this order";
    if (requireEmail) {
      throw new Error(emailError);
    }
  } else {
    const resolvedHtmlContent = await ensureHtmlContent();
    const pdfBuffer = await ensurePdfBuffer();
    const base = resolveBaseUrl(baseUrl);
    const fallbackDownloadLink = `${base}${pdfDownloadUrl || pdfUrl || downloadUrl}`;
    const normalizeDownloadLink = (url: string) =>
      /^https?:\/\//i.test(url)
        ? url
        : `${base}${url.startsWith("/") ? "" : "/"}${url}`;
    const downloadLink = storedPdfUrl
      ? normalizeDownloadLink(storedPdfUrl)
      : fallbackDownloadLink;
    const displayName = normalizeText(order.customerName) || "Customer";
    const shouldAttachPdf =
      pdfBuffer.length > 0 && pdfBuffer.length <= MAX_EMAIL_ATTACHMENT_BYTES;
    const linkOnlyNote =
      "We've included a download link in case attachments are blocked by your email provider.";
    const attachmentNote = shouldAttachPdf
      ? "We've attached the PDF for convenience. If you don't see it, use the link below."
      : linkOnlyNote;

    const emailSubject = `Your quotation ${quotationNumber} is ready`;
    const safeDownloadLink = escapeHtml(downloadLink);
    const buildEmailContent = (note: string) => {
      const emailText = `Hi ${displayName},

Thank you for your request. Your quotation ${quotationNumber} is ready.
${note}
Download: ${downloadLink}

If you have any questions, reply to this email.
`;
      const emailIntroHtml = `
<div style="margin: 24px auto; max-width: 680px; font-family: Arial, sans-serif;">
  <p>Hi ${escapeHtml(displayName)},</p>
  <p>Thank you for your request. Your quotation <strong>${escapeHtml(
    quotationNumber
  )}</strong> is ready.</p>
  <p>${escapeHtml(note)}</p>
  <p><a href="${safeDownloadLink}">Download your quotation PDF</a></p>
  <p>If you have any questions, reply to this email.</p>
</div>
`;
      return {
        text: emailText,
        html: injectEmailMessage(resolvedHtmlContent, emailIntroHtml),
      };
    };
    const { text: emailText, html: emailHtml } =
      buildEmailContent(attachmentNote);
    const attachments = shouldAttachPdf
      ? [
          {
            filename: `${quotationNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

    try {
      let result = await sendMail({
        email: recipientEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        ...(attachments ? { attachments } : {}),
      });

      if (!result.success && attachments?.length) {
        const { text: fallbackText, html: fallbackHtml } =
          buildEmailContent(linkOnlyNote);
        const fallbackResult = await sendMail({
          email: recipientEmail,
          subject: emailSubject,
          text: fallbackText,
          html: fallbackHtml,
        });
        if (fallbackResult.success) {
          result = fallbackResult;
        } else if (!fallbackResult.error && result.error) {
          result = { ...fallbackResult, error: result.error };
        } else {
          result = fallbackResult;
        }
      }

      emailSent = result.success;
      if (!result.success) {
        emailError = result.error || "Failed to send quotation email";
        if (requireEmail) {
          throw new Error(emailError);
        }
      } else {
        emailSentAt = new Date().toISOString();
        try {
          await writeClient
            .patch(activeQuotation._id)
            .set({ emailSentAt })
            .commit();
        } catch (error) {
          console.error("Failed to record quotation email status:", error);
          emailError = "Failed to record quotation email status";
          if (requireEmail) {
            throw new Error(emailError);
          }
        }
      }
    } catch (error) {
      console.error("Failed to send quotation email:", error);
      emailSent = false;
      emailError =
        error instanceof Error ? error.message : "Failed to send quotation email";
      if (requireEmail) {
        throw new Error(emailError);
      }
    }
  }

  const resolvedPdfUrl = storedPdfUrl ?? pdfUrl;

  return {
    quotationId: activeQuotation._id,
    purchaseOrderNumber: quotationNumber,
    purchaseOrder: {
      number: quotationNumber,
      createdAt,
      ...(emailSentAt ? { emailSentAt } : {}),
    },
    printUrl,
    downloadUrl,
    pdfUrl: resolvedPdfUrl,
    pdfDownloadUrl,
    emailSent,
    ...(emailError ? { emailError } : {}),
  };
};

export const generateLegacyQuotation = async (
  orderId: string,
  clerkUserId: string,
  {
    baseUrl,
    language,
    fallbackPhone = "",
    requireEmail = false,
    order: orderOverride,
  }: QuotationGenerationOptions = {}
): Promise<LegacyQuotationGenerationResult> => {
  const order =
    orderOverride ?? ((await fetchOrder(orderId, clerkUserId)) as OrderData | null);

  if (!order) {
    throw new Error("Order not found");
  }

  const settings = await fetchQuotationSettings();
  const languageMode = resolveLanguageMode(language, settings);
  const existingNumber = normalizeText(order.purchaseOrder?.number);
  const purchaseOrderNumber =
    existingNumber || buildQuotationNumber(order.orderNumber, 1);
  const createdAt =
    normalizeText(order.purchaseOrder?.createdAt) || new Date().toISOString();

  const langQuery = languageMode === "both" ? "" : `&lang=${languageMode}`;
  const printUrl = `/api/orders/${order._id}/purchase-order?print=1${langQuery}`;
  const downloadUrl = `/api/orders/${order._id}/purchase-order?download=1${langQuery}`;
  const pdfUrl = `/api/orders/${order._id}/purchase-order?pdf=1${langQuery}`;
  const pdfDownloadUrl = `/api/orders/${order._id}/purchase-order?pdf=1&download=1${langQuery}`;

  const recipientEmail =
    normalizeText(order.quotationDetails?.contactEmail) ||
    normalizeText(order.address?.contactEmail) ||
    normalizeText(order.email);
  let emailSent = false;
  let emailError: string | undefined;
  let emailSentAt = normalizeText(order.purchaseOrder?.emailSentAt) || undefined;

  if (emailSentAt) {
    emailSent = true;
  } else if (!recipientEmail) {
    emailError = "No recipient email available for this order";
    if (requireEmail) {
      throw new Error(emailError);
    }
  } else {
    const htmlContent = await renderQuotation(
      order,
      {
        number: purchaseOrderNumber,
        createdAt,
        salesContact: order.salesContact ?? undefined,
      },
      settings,
      languageMode,
      { fallbackPhone }
    );
    const pdfBuffer = await generatePdfFromHtml(htmlContent);
    const base = resolveBaseUrl(baseUrl);
    const downloadLink = `${base}${pdfDownloadUrl || pdfUrl || downloadUrl}`;
    const displayName = normalizeText(order.customerName) || "Customer";
    const shouldAttachPdf =
      pdfBuffer.length > 0 && pdfBuffer.length <= MAX_EMAIL_ATTACHMENT_BYTES;
    const linkOnlyNote =
      "We've included a download link in case attachments are blocked by your email provider.";
    const attachmentNote = shouldAttachPdf
      ? "We've attached the PDF for convenience. If you don't see it, use the link below."
      : linkOnlyNote;

    const emailSubject = `Your quotation ${purchaseOrderNumber} is ready`;
    const safeDownloadLink = escapeHtml(downloadLink);
    const buildEmailContent = (note: string) => {
      const emailText = `Hi ${displayName},

Thank you for your request. Your quotation ${purchaseOrderNumber} is ready.
${note}
Download: ${downloadLink}

If you have any questions, reply to this email.
`;
      const emailIntroHtml = `
<div style="margin: 24px auto; max-width: 680px; font-family: Arial, sans-serif;">
  <p>Hi ${escapeHtml(displayName)},</p>
  <p>Thank you for your request. Your quotation <strong>${escapeHtml(
    purchaseOrderNumber
  )}</strong> is ready.</p>
  <p>${escapeHtml(note)}</p>
  <p><a href="${safeDownloadLink}">Download your quotation PDF</a></p>
  <p>If you have any questions, reply to this email.</p>
</div>
`;
      return {
        text: emailText,
        html: injectEmailMessage(htmlContent, emailIntroHtml),
      };
    };
    const { text: emailText, html: emailHtml } =
      buildEmailContent(attachmentNote);
    const attachments = shouldAttachPdf
      ? [
          {
            filename: `${purchaseOrderNumber}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

    try {
      let result = await sendMail({
        email: recipientEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        ...(attachments ? { attachments } : {}),
      });

      if (!result.success && attachments?.length) {
        const { text: fallbackText, html: fallbackHtml } =
          buildEmailContent(linkOnlyNote);
        const fallbackResult = await sendMail({
          email: recipientEmail,
          subject: emailSubject,
          text: fallbackText,
          html: fallbackHtml,
        });
        if (fallbackResult.success) {
          result = fallbackResult;
        } else if (!fallbackResult.error && result.error) {
          result = { ...fallbackResult, error: result.error };
        } else {
          result = fallbackResult;
        }
      }

      emailSent = result.success;
      if (!result.success) {
        emailError = result.error || "Failed to send quotation email";
        if (requireEmail) {
          throw new Error(emailError);
        }
      } else {
        emailSentAt = new Date().toISOString();
      }
    } catch (error) {
      console.error("Failed to send quotation email:", error);
      emailSent = false;
      emailError =
        error instanceof Error ? error.message : "Failed to send quotation email";
      if (requireEmail) {
        throw new Error(emailError);
      }
    }
  }

  const updateFields: Record<string, unknown> = {};
  const purchaseOrderPayload = {
    number: purchaseOrderNumber,
    createdAt,
    ...(emailSentAt ? { emailSentAt } : {}),
  };
  const shouldUpdatePurchaseOrder =
    !order.purchaseOrder?.number ||
    !order.purchaseOrder?.createdAt ||
    (emailSentAt &&
      normalizeText(order.purchaseOrder?.emailSentAt) !== emailSentAt);

  if (shouldUpdatePurchaseOrder) {
    updateFields.purchaseOrder = purchaseOrderPayload;
  }

  if (!order.quotationRequestedAt) {
    updateFields.quotationRequestedAt = createdAt;
  }
  if (
    order.status !== ORDER_STATUSES.QUOTATION_REQUESTED &&
    (order.status === ORDER_STATUSES.PENDING ||
      order.status === "address_confirmed" ||
      !order.status)
  ) {
    updateFields.status = ORDER_STATUSES.QUOTATION_REQUESTED;
  }

  if (Object.keys(updateFields).length > 0) {
    await writeClient.patch(order._id).set(updateFields).commit();
  }

  return {
    purchaseOrderNumber,
    purchaseOrder: purchaseOrderPayload,
    printUrl,
    downloadUrl,
    pdfUrl,
    pdfDownloadUrl,
    emailSent,
    ...(emailError ? { emailError } : {}),
  };
};
