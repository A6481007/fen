import { defineQuery } from "next-sanity";
import { sanityFetch } from "../lib/live";
import { writeClient } from "../lib/client";

export const getProductsByCategory = async (categorySlug: string) => {
  const PRODUCT_BY_CATEGORY_QUERY = defineQuery(
    `*[_type == 'product' && references(*[_type == "category" && slug.current == $categorySlug]._id)] | order(name asc)`
  );
  try {
    const products = await sanityFetch({
      query: PRODUCT_BY_CATEGORY_QUERY,
      params: {
        categorySlug,
      },
    });
    return products?.data || [];
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
};

export const getSale = async () => {
  const SALE_QUERY = defineQuery(`*[_type == 'sale'] | order(name asc)`);
  try {
    const products = await sanityFetch({
      query: SALE_QUERY,
    });
    return products?.data || [];
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
};

// Contact message functions
export const saveContactMessage = async (contactData: {
  name: string;
  email: string;
  subject: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  try {
    const doc = {
      _type: "contact",
      name: contactData.name,
      email: contactData.email,
      subject: contactData.subject,
      message: contactData.message,
      status: "new",
      priority: "medium",
      submittedAt: new Date().toISOString(),
      ipAddress: contactData.ipAddress || "",
      userAgent: contactData.userAgent || "",
    };

    const result = await writeClient.create(doc);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving contact message:", error);
    return { success: false, error: "Failed to save contact message" };
  }
};

type EventRsvpPayload = {
  name: string;
  email: string;
  eventId?: string;
  eventSlug?: string;
  guestsCount: number;
  message?: string;
  newsletterOptIn: boolean;
  ipAddress?: string;
  userAgent?: string;
};

export const saveEventRSVP = async (payload: EventRsvpPayload) => {
  try {
    const doc = {
      _type: "eventRsvp",
      name: payload.name,
      email: payload.email,
      eventId: payload.eventId || "",
      eventSlug: payload.eventSlug || "",
      guestsCount: Math.max(1, payload.guestsCount || 1),
      message: payload.message || "",
      newsletterOptIn: payload.newsletterOptIn ?? false,
      status: "new",
      priority: payload.guestsCount > 4 ? "high" : "normal",
      submittedAt: new Date().toISOString(),
      ipAddress: payload.ipAddress || "",
      userAgent: payload.userAgent || "",
    };

    const result = await writeClient.create(doc);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error saving event RSVP:", error);
    return { success: false, error: "Failed to save RSVP" };
  }
};

export const getMyOrders = async (
  userId: string,
  page: number = 1,
  limit: number = 5
) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const offset = (page - 1) * limit;

  // Query for paginated orders
  const MY_ORDERS_QUERY =
    defineQuery(`*[_type == 'order' && clerkUserId == $userId] | order(orderDate desc)[$start...$end]{
    ...,
    paymentStatus,
    paymentMethod,
    products[]{
      ...,
      product->{
        _id,
        name,
        slug,
        image,
        images,
        price,
        currency
      }
    }
  }`);

  // Query for total count
  const COUNT_QUERY = defineQuery(
    `count(*[_type == 'order' && clerkUserId == $userId])`
  );

  try {
    const [orders, totalCount] = await Promise.all([
      sanityFetch({
        query: MY_ORDERS_QUERY,
        params: {
          userId,
          start: offset,
          end: offset + limit - 1,
        },
      }),
      sanityFetch({
        query: COUNT_QUERY,
        params: { userId },
      }),
    ]);

    return {
      orders: orders?.data || [],
      totalCount: totalCount?.data || 0,
      totalPages: Math.ceil((totalCount?.data || 0) / limit),
      currentPage: page,
      hasNextPage: page < Math.ceil((totalCount?.data || 0) / limit),
      hasPrevPage: page > 1,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      orders: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }
};

export { checkResourceAccess, isUserEventAttendee } from "./accessControl";
export type { ResourceAccessResult } from "./accessControl";
export { computeEventStatus, isEventStatus } from "./eventStatus";
export type { EventStatus } from "./eventStatus";
