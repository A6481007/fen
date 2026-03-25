// Contact configuration defaults using environment variables
export const contactConfigDefaults = {
  company: {
    name: process.env.NEXT_PUBLIC_COMPANY_NAME || "NCS Shop",
    email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || "support@ncs.co.th",
    phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || "+66 (0)2 123-4567",
    address:
      process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
      "99/37 Moo 2, Ramintra Road, Khan Na Yao District",
    city:
      process.env.NEXT_PUBLIC_COMPANY_CITY || "Bangkok 10210, Thailand",
    description:
      process.env.NEXT_PUBLIC_COMPANY_DESCRIPTION ||
      "Discover amazing products at NCS Shop, your trusted online shopping destination for quality items and exceptional customer service. For press releases and product updates, visit our News hub at /news.",
  },
  businessHours: {
    weekday:
      process.env.NEXT_PUBLIC_COMPANY_BUSINESS_HOURS_WEEKDAY ||
      "Monday - Friday: 9AM - 6PM ICT",
    weekend:
      process.env.NEXT_PUBLIC_COMPANY_BUSINESS_HOURS_WEEKEND ||
      "Saturday: 10AM - 4PM ICT | Sunday: Closed",
  },
  emails: {
    support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@ncs.co.th",
    sales: process.env.NEXT_PUBLIC_SALES_EMAIL || "sales@ncs.co.th",
  },
  responseTime: {
    standard:
      process.env.NEXT_PUBLIC_CONTACT_RESPONSE_TIME ||
      "We reply within 24 hours",
    quick:
      process.env.NEXT_PUBLIC_QUICK_RESPONSE_TIME ||
      "2-4 hours during business hours",
  },
  socialMedia: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || "#",
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || "#",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#",
    linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL || "#",
  },
  legal: {
    copyright:
      process.env.NEXT_PUBLIC_COPYRIGHT_TEXT ||
      "© 2024 NCS Shop. All rights reserved.",
    privacyPolicy: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL || "/privacy",
    terms: process.env.NEXT_PUBLIC_TERMS_URL || "/terms",
  },
  support: {
    helpCenter: "/help",
    faq: "/faqs",
    trackOrder: "/track-order",
    returns: "/returns",
    shipping: "/shipping",
    sizeGuide: "/size-guide",
  },
};
export { contactConfigDefaults as contactConfig };
