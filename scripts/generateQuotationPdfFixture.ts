import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  generatePdfFromHtml,
  renderQuotation,
  type LanguageMode,
  type OrderData,
  type OrderProduct,
  type QuotationSettings,
} from "../lib/quotationService.ts";

const buildFixtureItems = (): OrderProduct[] => {
  const items: OrderProduct[] = [];
  for (let i = 1; i <= 25; i += 1) {
    const unitPrice = 100 + i * 10;
    const quantity = i % 5 === 0 ? 2 : 1;
    const description =
      i === 5
        ? "This product has an extremely long description that will likely overflow onto the next page, to test page splitting behavior."
        : `Sample product ${i}`;

    items.push({
      quantity,
      unitPrice,
      product: {
        _id: `prod-${i}`,
        name: `Sample product ${i}`,
        description,
        price: unitPrice,
        sku: `SKU-${String(i).padStart(3, "0")}`,
        unit: "pcs",
        brand: { title: "Fixture" },
      },
    });
  }

  return items;
};

const buildFixtureSettings = (): QuotationSettings => ({
  company: {
    nameEn: "NCS Company Ltd.",
    nameTh: "NCS Company Ltd.",
    addressEn: "123 Example Rd., Bangkok 10110",
    phoneEn: "02-000-0000",
    faxEn: "02-000-0001",
    email: "info@example.com",
    lineId: "@ncs",
    addressTh: "123 Example Rd., Bangkok 10110",
    phoneTh: "02-000-0000",
    faxTh: "02-000-0001",
    taxId: "0105555555555",
    logoUrl: "",
    headOfficeLabel: "Head Office",
  },
  languageDefault: "both",
  certBlockHtml: "",
  certBoxImageUrl: "",
  qrLabel: "PromptPay",
  qrPayload: "",
  qrImageUrl: "",
  paymentLogoImageUrl: "",
  customerDefaults: {
    taxId: "",
    branch: "Head Office",
    code: "CUST-001",
    company: "Fixture Customer Co., Ltd.",
    fax: "",
  },
  sales: {
    name: "Fixture Sales",
    phone: "02-000-0000",
    ext: "123",
    fax: "02-000-0001",
    mobile: "0800000000",
    lineId: "@ncs-sales",
    lineExt: "01",
    email: "sales@example.com",
    web: "https://example.com",
  },
  signatures: {
    saleUrl: "",
    managerUrl: "",
    purchaserUrl: "",
  },
  terms: {
    paymentCondition: "30 days after invoice",
    deliveryCondition: "Within 14 days",
    validityCondition: "15 days",
    warrantyCondition: "1 year",
  },
  vatPercent: 7,
  remark: "Fixture data for pagination testing.",
});

const buildFixtureOrder = (): OrderData => {
  const items = buildFixtureItems();

  return {
    _id: "order-fixture",
    orderNumber: "TEST-001",
    clerkUserId: "fixture-user",
    customerName: "Fixture Customer",
    email: "customer@example.com",
    phone: "02-000-0000",
    orderDate: new Date().toISOString(),
    products: items,
    amountDiscount: 1000,
    shipping: 100,
    currency: "THB",
  };
};

const run = async () => {
  const outputDir = path.join(process.cwd(), "tmp");
  await mkdir(outputDir, { recursive: true });

  const order = buildFixtureOrder();
  const settings = buildFixtureSettings();
  const languageMode: LanguageMode = "both";

  const htmlContent = await renderQuotation(
    order,
    null,
    settings,
    languageMode,
    { fallbackPhone: order.phone }
  );
  const htmlPath = path.join(outputDir, "quotation_fixture.html");
  const pdfPath = path.join(outputDir, "quotation_fixture.pdf");

  await writeFile(htmlPath, htmlContent);
  const pdfBuffer = await generatePdfFromHtml(htmlContent);
  await writeFile(pdfPath, pdfBuffer);

  console.log(`Generated ${htmlPath} and ${pdfPath}`);
};

run().catch((error) => {
  console.error("Error generating quotation PDF fixture:", error);
  process.exit(1);
});
