import { defineField, defineType } from "sanity";
import { TagIcon } from "@sanity/icons";

export const contactSettingsType = defineType({
  name: "contactSettings",
  title: "Contact Settings",
  type: "document",
  icon: TagIcon,
  fields: [
    defineField({
      name: "company",
      title: "Company",
      type: "object",
      fields: [
        defineField({ name: "name", title: "Name", type: "string" }),
        defineField({ name: "description", title: "Description", type: "text" }),
        defineField({ name: "address", title: "Address", type: "string" }),
        defineField({ name: "city", title: "City", type: "string" }),
        defineField({ name: "phone", title: "Phone", type: "string" }),
      ],
    }),
    defineField({
      name: "businessHours",
      title: "Business Hours",
      type: "object",
      fields: [
        defineField({ name: "weekday", title: "Weekday hours", type: "string" }),
        defineField({ name: "weekend", title: "Weekend hours", type: "string" }),
      ],
    }),
    defineField({
      name: "emails",
      title: "Emails",
      type: "object",
      fields: [
        defineField({ name: "support", title: "Support", type: "string" }),
        defineField({ name: "sales", title: "Sales", type: "string" }),
      ],
    }),
  ],
  preview: {
    select: {
      title: "company.name",
      subtitle: "company.phone",
    },
    prepare({ title, subtitle }) {
      return {
        title: title || "Contact settings",
        subtitle: subtitle || "Not configured",
      };
    },
  },
});
