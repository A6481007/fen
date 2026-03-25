import { sanityFetch } from "../lib/live";

// User Queries
export const USER_BY_CLERK_ID_QUERY = `
  *[_type == "user" && clerkUserId == $clerkUserId][0] {
    _id,
    _type,
    clerkUserId,
    email,
    firstName,
    lastName,
    phone,
    dateOfBirth,
    profileImage {
      asset -> {
        _id,
        url
      }
    },
    addresses[] -> {
      _id,
      name,
      email,
      contactEmail,
      lineId,
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
    preferences,
    wishlist[] -> {
      _id,
      name,
      slug,
      image {
        asset -> {
          _id,
          url
        }
      },
      price,
      currency
    },
    cart[] {
      product -> {
        _id,
        name,
        slug,
        image {
          asset -> {
            _id,
            url
          }
        },
        price,
        currency,
        inStock,
        stockQuantity
      },
      quantity,
      size,
      color,
      addedAt
    },
    orders[] -> {
      _id,
      orderNumber,
      totalPrice,
      currency,
      status,
      orderDate
    },
    loyaltyPoints,
    rewardPoints,
    totalSpent,
    lastLogin,
    isAdmin,
    isEmployee,
    employeeRole,
    employeeStatus,
    staffRoles,
    staffStatus,
    isActive,
    createdAt,
    updatedAt
  }
`;

export const USER_ADDRESSES_QUERY = `
  *[_type == "address" && user._ref == $userId] | order(default desc, createdAt desc) {
    _id,
    name,
    email,
    contactEmail,
    lineId,
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
  }
`;

export const USER_CART_QUERY = `
  *[_type == "user" && clerkUserId == $clerkUserId][0] {
    cart[] {
      product -> {
        _id,
        name,
        slug,
        image {
          asset -> {
            _id,
            url
          }
        },
        price,
        currency,
        inStock,
        stockQuantity,
        categories[] -> {
          name
        }
      },
      quantity,
      size,
      color,
      addedAt
    }
  }
`;

export const USER_WISHLIST_QUERY = `
  *[_type == "user" && clerkUserId == $clerkUserId][0] {
    wishlist[] -> {
      _id,
      name,
      slug,
      image {
        asset -> {
          _id,
          url
        }
      },
      price,
      currency,
      inStock,
      categories[] -> {
        name
      }
    }
  }
`;

export const USER_ORDERS_QUERY = `
  *[_type == "order" && clerkUserId == $clerkUserId] | order(orderDate desc) {
    _id,
    orderNumber,
    products[] {
      product -> {
        _id,
        name,
        image {
          asset -> {
            _id,
            url
          }
        },
        price,
        currency
      },
      quantity,
      priceOptionId,
      priceOptionLabel
    },
    totalPrice,
    currency,
    amountDiscount,
    address{
      _id,
      name,
      email,
      contactEmail,
      lineId,
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
    quotationDetails{
      _id,
      name,
      email,
      contactEmail,
      lineId,
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
    "salesContact": coalesce(
      salesContact->{
        _id,
        name,
        email,
        phone
      },
      quotationDetails.salesContact->{
        _id,
        name,
        email,
        phone
      },
      *[_type == "quotation" && order._ref == ^._id] | order(version desc, createdAt desc)[0].salesContact->{
        _id,
        name,
        email,
        phone
      },
      *[_type == "purchaseOrderSettings"][0].defaultSalesContact->{
        _id,
        name,
        email,
        phone
      }
    ),
    status,
    cancellationRequested,
    orderDate,
    invoice,
    purchaseOrder
  }
`;

export const ORDER_BY_ID_QUERY = `
  *[_type == "order" && _id == $orderId][0] {
    _id,
    orderNumber,
    orderKind,
    clerkUserId,
    customerName,
    email,
    products[] {
      product -> {
        _id,
        name,
        slug,
        images[] {
          asset -> {
            _id,
            url
          }
        },
        "image": images[0],
        price,
        stock,
        currency,
        categories[] -> {
          title
        }
      },
      quantity,
      priceOptionId,
      priceOptionLabel,
      unitPrice,
      lineTotal,
      discountAmount,
      promotionName,
      promotionType,
      promotionId
    },
    subtotal,
    tax,
    shipping,
    totalPrice,
    currency,
    amountDiscount,
    grossSubtotal,
    businessDiscount,
    address{
      _id,
      name,
      email,
      contactEmail,
      lineId,
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
      lineId,
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
    "salesContact": coalesce(
      salesContact->{
        _id,
        name,
        email,
        phone
      },
      quotationDetails.salesContact->{
        _id,
        name,
        email,
        phone
      },
      *[_type == "quotation" && order._ref == ^._id] | order(version desc, createdAt desc)[0].salesContact->{
        _id,
        name,
        email,
        phone
      },
      *[_type == "purchaseOrderSettings"][0].defaultSalesContact->{
        _id,
        name,
        email,
        phone
      }
    ),
    status,
    quotationRequestedAt,
    paymentStatus,
    clerkPaymentStatus,
    paymentMethod,
    orderDate,
    purchaseOrder,
    selectedQuotation->{
      _id,
      number,
      version,
      createdAt,
      pdfUrl
    },
    selectedQuotationAt,
    invoice,
    stripeCheckoutSessionId,
    stripePaymentIntentId,
    paymentCompletedAt,
    addressConfirmedBy,
    addressConfirmedAt,
    orderConfirmedBy,
    orderConfirmedAt,
    packedBy,
    packedAt,
    assignedDeliverymanName,
    dispatchedAt,
    cashCollectedAt,
    paymentReceivedAt,
    deliveredBy,
    deliveredAt,
    cancellationRequested,
    cancellationRequestedAt,
    cancellationRequestReason,
    cancelledAt,
    cancelledBy
  }
`;

// User Functions
export const getUserByClerkId = async (clerkUserId: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_BY_CLERK_ID_QUERY,
      params: { clerkUserId },
    });
    return data;
  } catch (error) {
    console.error("Error fetching user by Clerk ID:", error);
    return null;
  }
};

export const getUserAddresses = async (userId: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_ADDRESSES_QUERY,
      params: { userId },
    });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching user addresses:", error);
    return [];
  }
};

export const getUserCart = async (clerkUserId: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_CART_QUERY,
      params: { clerkUserId },
    });
    return data?.cart ?? [];
  } catch (error) {
    console.error("Error fetching user cart:", error);
    return [];
  }
};

export const getUserWishlist = async (clerkUserId: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_WISHLIST_QUERY,
      params: { clerkUserId },
    });
    return data?.wishlist ?? [];
  } catch (error) {
    console.error("Error fetching user wishlist:", error);
    return [];
  }
};

export const getUserOrders = async (clerkUserId: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_ORDERS_QUERY,
      params: { clerkUserId },
    });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};

export const getOrderById = async (orderId: string) => {
  try {
    const { data } = await sanityFetch({
      query: ORDER_BY_ID_QUERY,
      params: { orderId },
    });
    return data;
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    return null;
  }
};

// User Notifications Queries
export const USER_NOTIFICATIONS_QUERY = `
  *[_type == "user" && clerkUserId == $clerkUserId][0] {
    notifications[] {
      id,
      title,
      message,
      type,
      read,
      priority,
      sentAt,
      readAt,
      sentBy,
      actionUrl
    }
  }
`;

export const getUserNotifications = async (clerkUserId: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_NOTIFICATIONS_QUERY,
      params: { clerkUserId },
    });
    return data?.notifications || [];
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
};

export const MARK_NOTIFICATION_READ_QUERY = `
  *[_type == "user" && clerkUserId == $clerkUserId][0] {
    _id,
    notifications
  }
`;

export const markNotificationAsRead = async (
  clerkUserId: string,
  notificationId: string
) => {
  try {
    const user = await sanityFetch({
      query: MARK_NOTIFICATION_READ_QUERY,
      params: { clerkUserId },
    });

    if (!user.data) {
      throw new Error("User not found");
    }

    const updatedNotifications = user.data.notifications.map(
      (notification: any) => {
        if (notification.id === notificationId) {
          return {
            ...notification,
            read: true,
            readAt: new Date().toISOString(),
          };
        }
        return notification;
      }
    );

    const { writeClient } = await import("../lib/client");

    await writeClient
      .patch(user.data._id)
      .set({ notifications: updatedNotifications })
      .commit();

    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false, error: "Failed to mark notification as read" };
  }
};

export const deleteUserNotification = async (
  clerkUserId: string,
  notificationId: string
) => {
  try {
    const user = await sanityFetch({
      query: MARK_NOTIFICATION_READ_QUERY,
      params: { clerkUserId },
    });

    if (!user.data) {
      throw new Error("User not found");
    }

    const updatedNotifications = user.data.notifications.filter(
      (notification: any) => notification.id !== notificationId
    );

    const { writeClient } = await import("../lib/client");

    await writeClient
      .patch(user.data._id)
      .set({ notifications: updatedNotifications })
      .commit();

    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    return { success: false, error: "Failed to delete notification" };
  }
};
