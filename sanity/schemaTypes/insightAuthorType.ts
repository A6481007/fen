import { UserIcon } from "@sanity/icons";
import { defineArrayMember, defineField, defineType } from "sanity";

export const insightAuthorType = defineType({
  name: "insightAuthor",
  title: "Insight Author",
  type: "document",
  icon: UserIcon,
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        isUnique: (value, context) => context?.defaultIsUnique?.(value, context) ?? true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "title",
      title: "Job Title",
      type: "string",
      description: 'e.g., "Senior Network Architect"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Profile Image",
      type: "image",
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: "alt",
          title: "Alt Text",
          type: "string",
          validation: (Rule) => Rule.required(),
        }),
      ],
    }),
    defineField({
      name: "bio",
      title: "Short Bio",
      type: "text",
      rows: 4,
      description: "Concise biography for cards and teasers",
    }),
    defineField({
      name: "extendedBio",
      title: "Full Biography",
      type: "blockContent",
      description: "Long-form biography for the author page",
    }),
    defineField({
      name: "credentials",
      title: "Credentials",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      description: 'Certifications like ["CCNP", "JNCIE-SP"]',
    }),
    defineField({
      name: "credentialVerified",
      title: "Credentials Verified",
      type: "boolean",
      initialValue: false,
      description: "Set true when certifications have been verified",
    }),
    defineField({
      name: "expertise",
      title: "Areas of Expertise",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      description: "Key expertise topics that support E-E-A-T",
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "object",
      fields: [
        defineField({
          name: "linkedin",
          title: "LinkedIn",
          type: "url",
        }),
        defineField({
          name: "twitter",
          title: "Twitter / X",
          type: "url",
        }),
        defineField({
          name: "website",
          title: "Website",
          type: "url",
        }),
      ],
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: "isActive",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "title",
      media: "image",
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || "Untitled Insight Author",
        subtitle: subtitle || "Role missing",
        media,
      };
    },
  },
});
