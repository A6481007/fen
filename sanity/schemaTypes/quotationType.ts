import { DocumentTextIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const quotationType = defineType({
  name: "quotation",
  title: "Quotation",
  type: "document",
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: "order",
      title: "Order",
      type: "reference",
      to: [{ type: "order" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "quotationDetails",
      title: "Quotation Details",
      type: "object",
      description: "Contact and address details shown on quotations.",
      fields: [
        defineField({ name: "state", title: "Province", type: "string" }),
        defineField({ name: "zip", title: "Postal Code", type: "string" }),
        defineField({ name: "city", title: "District", type: "string" }),
        defineField({ name: "address", title: "Address", type: "string" }),
        defineField({ name: "name", title: "Name", type: "string" }),
        defineField({ name: "email", title: "Email", type: "string" }),
        defineField({ name: "phone", title: "Phone", type: "string" }),
        defineField({ name: "fax", title: "Fax", type: "string" }),
        defineField({
          name: "contactEmail",
          title: "Contact Email",
          type: "string",
        }),
        defineField({
          name: "lineId",
          title: "Line ID",
          type: "string",
        }),
        defineField({ name: "country", title: "Country", type: "string" }),
        defineField({
          name: "countryCode",
          title: "Country Code",
          type: "string",
        }),
        defineField({
          name: "stateCode",
          title: "State Code",
          type: "string",
        }),
        defineField({
          name: "subArea",
          title: "Subdistrict (ตำบล)",
          type: "string",
          validation: (Rule) => Rule.required().max(100),
        }),
        defineField({
          name: "company",
          title: "Company",
          type: "string",
        }),
        defineField({
          name: "customerCode",
          title: "Customer Code",
          type: "string",
          readOnly: true,
        }),
        defineField({
          name: "winCode",
          title: "WIN Code",
          type: "string",
        }),
        defineField({ name: "taxId", title: "Tax ID", type: "string" }),
        defineField({ name: "branch", title: "Branch", type: "string" }),
        defineField({ name: "type", title: "Type", type: "string" }),
        defineField({ name: "default", title: "Default", type: "boolean" }),
        defineField({ name: "createdAt", title: "Created At", type: "datetime" }),
        defineField({
          name: "lastUsedAt",
          title: "Last Used At",
          type: "datetime",
        }),
      ],
    }),
    defineField({
      name: "salesContact",
      title: "Sales Contact",
      type: "reference",
      to: [{ type: "salesContact" }],
      description:
        "Optional sales contact to show on this quotation (defaults to Quotation Settings).",
    }),
    defineField({
      name: "version",
      title: "Version",
      type: "number",
      description: "Revision number for this quotation.",
      validation: (Rule) => Rule.required().integer().min(1),
    }),
    defineField({
      name: "isLatestVersion",
      title: "Is Latest Version",
      type: "boolean",
      description: "Marks the current active version for this quotation.",
      initialValue: true,
    }),
    defineField({
      name: "number",
      title: "Quotation Number",
      type: "string",
      description: "Shared identifier across versions of the same quotation.",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "emailSentAt",
      title: "Email Sent At",
      type: "datetime",
    }),
    defineField({
      name: "pdfUrl",
      title: "PDF URL",
      type: "url",
      description: "Stored PDF link for this quotation.",
    }),
  ],
  preview: {
    select: {
      title: "number",
      orderNumber: "order.orderNumber",
      version: "version",
      status: "order.status",
      createdAt: "createdAt",
    },
    prepare({ title, orderNumber, version, status, createdAt }) {
      const subtitleParts: string[] = [];
      if (orderNumber) subtitleParts.push(`Order ${orderNumber}`);
      if (typeof version === "number") subtitleParts.push(`v${version}`);
      if (status) {
        const statusLabel = status.replace(/_/g, " ");
        subtitleParts.push(
          `${statusLabel.charAt(0).toUpperCase()}${statusLabel.slice(1)}`
        );
      }
      if (createdAt) {
        const createdDate = new Date(createdAt);
        if (!Number.isNaN(createdDate.getTime())) {
          subtitleParts.push(createdDate.toLocaleDateString());
        }
      }
      return {
        title: title || "Quotation",
        subtitle: subtitleParts.join(" | ") || undefined,
      };
    },
  },
});
