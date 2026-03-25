import { sanityFetch } from "@/sanity/lib/live";

export type ContactConfig = {
  company: {
    name: string;
    description: string;
    address: string;
    city: string;
    phone: string;
  };
  businessHours: {
    weekday: string;
    weekend?: string;
  };
  emails: {
    support: string;
    sales?: string;
  };
};

const DEFAULT_CONTACT_CONFIG: ContactConfig = {
  company: {
    name: "NCSSHOP",
    description: "Electronics, appliances, and accessories with human support.",
    address: "123 Market Street",
    city: "San Francisco, CA",
    phone: "+1 (415) 555-0123",
  },
  businessHours: {
    weekday: "Mon–Fri: 9:00 AM – 6:00 PM",
    weekend: "Sat–Sun: 10:00 AM – 4:00 PM",
  },
  emails: {
    support: "support@shopcart.com",
    sales: "sales@shopcart.com",
  },
};

const CONTACT_SETTINGS_QUERY = `
*[_type == "contactSettings"][0]{
  company{
    name,
    description,
    address,
    city,
    phone
  },
  businessHours{
    weekday,
    weekend
  },
  emails{
    support,
    sales
  }
}`;

export async function getContactConfig(): Promise<ContactConfig> {
  try {
    const { data } = await sanityFetch<{ company?: any; businessHours?: any; emails?: any }>({
      query: CONTACT_SETTINGS_QUERY,
      cache: "force-cache",
      next: { revalidate: 600 },
    });

    if (!data) return DEFAULT_CONTACT_CONFIG;

    return {
      company: {
        name: data.company?.name || DEFAULT_CONTACT_CONFIG.company.name,
        description: data.company?.description || DEFAULT_CONTACT_CONFIG.company.description,
        address: data.company?.address || DEFAULT_CONTACT_CONFIG.company.address,
        city: data.company?.city || DEFAULT_CONTACT_CONFIG.company.city,
        phone: data.company?.phone || DEFAULT_CONTACT_CONFIG.company.phone,
      },
      businessHours: {
        weekday: data.businessHours?.weekday || DEFAULT_CONTACT_CONFIG.businessHours.weekday,
        weekend: data.businessHours?.weekend || DEFAULT_CONTACT_CONFIG.businessHours.weekend,
      },
      emails: {
        support: data.emails?.support || DEFAULT_CONTACT_CONFIG.emails.support,
        sales: data.emails?.sales || DEFAULT_CONTACT_CONFIG.emails.sales,
      },
    };
  } catch (error) {
    console.error("Failed to load contact settings, using defaults.", error);
    return DEFAULT_CONTACT_CONFIG;
  }
}
