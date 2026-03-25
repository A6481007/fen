import { sanityFetch } from "../lib/live";

// Email-based User Queries
export const USER_ADDRESSES_BY_EMAIL_QUERY = `
  *[_type == "address" && email == $email] | order(default desc, createdAt desc) {
    _id,
    name,
    email,
    phone,
    fax,
    contactEmail,
    lineId,
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

export const USER_ORDERS_BY_EMAIL_QUERY = `
  *[_type == "order" && email == $email] | order(orderDate desc) {
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
    status,
    orderDate,
    invoice,
    customerName,
    email
  }
`;

export const DEFAULT_ADDRESS_BY_EMAIL_QUERY = `
  *[_type == "address" && email == $email && default == true][0] {
    _id,
    name,
    email,
    phone,
    fax,
    contactEmail,
    lineId,
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

// Email-based User Functions
export const getUserAddressesByEmail = async (email: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_ADDRESSES_BY_EMAIL_QUERY,
      params: { email },
    });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching user addresses by email:", error);
    return [];
  }
};

export const getUserOrdersByEmail = async (email: string) => {
  try {
    const { data } = await sanityFetch({
      query: USER_ORDERS_BY_EMAIL_QUERY,
      params: { email },
    });
    return data ?? [];
  } catch (error) {
    console.error("Error fetching user orders by email:", error);
    return [];
  }
};

export const getDefaultAddressByEmail = async (email: string) => {
  try {
    const { data } = await sanityFetch({
      query: DEFAULT_ADDRESS_BY_EMAIL_QUERY,
      params: { email },
    });
    return data;
  } catch (error) {
    console.error("Error fetching default address by email:", error);
    return null;
  }
};
