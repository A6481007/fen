import { DocumentTextIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const purchaseOrderSettingsType = defineType({
  name: "purchaseOrderSettings",
  title: "Quotation Settings",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "company",
      title: "Company Details",
      type: "object",
      fields: [
        defineField({
          name: "nameEn",
          title: "Company Name (EN)",
          type: "string",
        }),
        defineField({
          name: "nameTh",
          title: "Company Name (TH)",
          type: "string",
        }),
        defineField({
          name: "addressEn",
          title: "Address (EN)",
          type: "string",
        }),
        defineField({
          name: "phoneEn",
          title: "Phone (EN)",
          type: "string",
        }),
        defineField({
          name: "faxEn",
          title: "Fax (EN)",
          type: "string",
        }),
        defineField({
          name: "email",
          title: "Email",
          type: "string",
        }),
        defineField({
          name: "addressTh",
          title: "Address (TH)",
          type: "string",
        }),
        defineField({
          name: "phoneTh",
          title: "Phone (TH)",
          type: "string",
        }),
        defineField({
          name: "faxTh",
          title: "Fax (TH)",
          type: "string",
        }),
        defineField({
          name: "taxId",
          title: "Tax ID",
          type: "string",
        }),
        defineField({
          name: "logoUrl",
          title: "Logo URL",
          type: "url",
        }),
        defineField({
          name: "headOfficeLabel",
          title: "Head Office Label",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "languageDefault",
      title: "Default Language",
      type: "string",
      initialValue: "both",
      options: {
        list: [
          { title: "Bilingual", value: "both" },
          { title: "Thai", value: "th" },
          { title: "English", value: "en" },
        ],
        layout: "radio",
      },
    }),
    defineField({
      name: "certBlockHtml",
      title: "Certificate Block (HTML)",
      type: "text",
      description: "Raw HTML injected into the cert block area.",
    }),
    defineField({
      name: "certBoxImageUrl",
      title: "Certificate Image URL",
      type: "url",
      description: "Optional image to replace the certificate HTML block.",
    }),
    defineField({
      name: "qrLabel",
      title: "QR Label",
      type: "string",
    }),
    defineField({
      name: "qrPayload",
      title: "QR Payload",
      type: "text",
      description: "Raw data to encode as a QR code (overrides QR Image URL).",
    }),
    defineField({
      name: "qrImageUrl",
      title: "QR Image URL",
      type: "url",
      description: "Optional QR image URL when not generating from payload.",
    }),
    defineField({
      name: "paymentLogoImageUrl",
      title: "Payment Logo Image URL",
      type: "url",
      description: "Optional image for the payment logos block.",
    }),
    defineField({
      name: "customerDefaults",
      title: "Customer Defaults",
      type: "object",
      description: "Fallback values when customer data is missing.",
      fields: [
        defineField({
          name: "taxId",
          title: "Default Customer Tax ID",
          type: "string",
        }),
        defineField({
          name: "branch",
          title: "Default Customer Branch",
          type: "string",
        }),
        defineField({
          name: "code",
          title: "Default Customer Code",
          type: "string",
        }),
        defineField({
          name: "company",
          title: "Default Customer Company",
          type: "string",
        }),
        defineField({
          name: "fax",
          title: "Default Customer Fax",
          type: "string",
        }),
      ],
    }),
    defineField({
      name: "sales",
      title: "Sales Contact",
      type: "object",
      description:
        "Fallback contact used when a quotation does not select a Sales Contact.",
      fields: [
        defineField({ name: "name", title: "Name", type: "string" }),
        defineField({ name: "phone", title: "Phone", type: "string" }),
        defineField({ name: "ext", title: "Extension", type: "string" }),
        defineField({ name: "fax", title: "Fax", type: "string" }),
        defineField({ name: "mobile", title: "Mobile", type: "string" }),
        defineField({
          name: "lineId",
          title: "Sales Line",
          type: "string",
        }),
        defineField({
          name: "lineExt",
          title: "Line Extension",
          type: "string",
        }),
        defineField({ name: "email", title: "Email", type: "string" }),
        defineField({ name: "web", title: "Website", type: "string" }),
      ],
    }),
    defineField({
      name: "defaultSalesContact",
      title: "Default Sales Contact",
      type: "reference",
      to: [{ type: "salesContact" }],
      description:
        "Default sales contact for orders when no sales contact is assigned.",
    }),
    defineField({
      name: "signatures",
      title: "Signature Images",
      type: "object",
      fields: [
        defineField({
          name: "saleUrl",
          title: "Sale Signature URL",
          type: "url",
        }),
        defineField({
          name: "managerUrl",
          title: "Manager Signature URL",
          type: "url",
        }),
        defineField({
          name: "purchaserUrl",
          title: "Purchaser Signature URL",
          type: "url",
        }),
      ],
    }),
    defineField({
      name: "terms",
      title: "Terms",
      type: "object",
      fields: [
        defineField({
          name: "paymentCondition",
          title: "Payment Condition",
          type: "text",
        }),
        defineField({
          name: "deliveryCondition",
          title: "Delivery Condition",
          type: "text",
        }),
        defineField({
          name: "validityCondition",
          title: "Validity Condition",
          type: "text",
        }),
        defineField({
          name: "warrantyCondition",
          title: "Warranty Condition",
          type: "text",
        }),
      ],
    }),
    defineField({
      name: "vatPercent",
      title: "VAT Percent",
      type: "number",
      initialValue: 7,
    }),
    defineField({
      name: "remark",
      title: "Default Remark",
      type: "text",
    }),
  ],
});
