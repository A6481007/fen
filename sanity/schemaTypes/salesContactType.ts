import { UserIcon } from "@sanity/icons";
import { defineField, defineType } from "sanity";

export const salesContactType = defineType({
  name: "salesContact",
  title: "Sales Contact",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required().min(2).max(120),
    }),
    defineField({
      name: "user",
      title: "Employee User",
      type: "reference",
      to: [{ type: "user" }],
      description: "Linked employee user account for this sales contact.",
    }),
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
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) =>
        Rule.email().warning("Use a valid email address."),
    }),
    defineField({ name: "web", title: "Website", type: "url" }),
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
  ],
  preview: {
    select: {
      title: "name",
      phone: "phone",
      mobile: "mobile",
      email: "email",
    },
    prepare({ title, phone, mobile, email }) {
      const contact = [phone, mobile, email].filter(Boolean).join(" | ");
      return {
        title: title || "Sales Contact",
        subtitle: contact || "No contact details",
      };
    },
  },
});
