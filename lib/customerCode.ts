import { writeClient } from "@/sanity/lib/client";

const CUSTOMER_CODE_PREFIX = "NCS";
const CUSTOMER_CODE_TIMEZONE = "Asia/Bangkok";
const CUSTOMER_CODE_PADDING = 2;

type SanityUserDoc = {
  _id: string;
  clerkUserId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  customerCode?: string;
  createdAt?: string;
  _createdAt?: string;
};

type EnsureCustomerCodeInput = {
  clerkUserId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt?: string;
};

const normalizeString = (value?: string | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const formatCustomerCodeDate = (date: Date) => {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: CUSTOMER_CODE_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    if (year && month && day) {
      return `${year}${month}${day}`;
    }
  } catch (error) {
    console.error("Failed to format customer code date:", error);
  }

  return date.toISOString().slice(0, 10).replace(/-/g, "");
};

const buildCustomerCodePrefix = (date: Date) =>
  `${CUSTOMER_CODE_PREFIX}-${formatCustomerCodeDate(date)}-`;

const parseCustomerCodeSequence = (code: string, prefix: string) => {
  if (!code.startsWith(prefix)) return null;
  const suffix = code.slice(prefix.length).trim();
  if (!suffix) return null;
  const value = Number.parseInt(suffix, 10);
  if (!Number.isFinite(value)) return null;
  return value;
};

const buildCustomerCode = (prefix: string, sequence: number) =>
  `${prefix}${String(sequence).padStart(CUSTOMER_CODE_PADDING, "0")}`;

const fetchExistingCustomerCodes = async (prefix: string) => {
  const rows = await writeClient.fetch<Array<{ customerCode?: string }>>(
    `*[_type == "user" && defined(customerCode) && customerCode match $prefix + "*"]{
      customerCode
    }`,
    { prefix }
  );

  return rows
    .map((row) => normalizeString(row.customerCode))
    .filter(Boolean);
};

export const generateCustomerCodeForDate = async (date: Date) => {
  const prefix = buildCustomerCodePrefix(date);
  const existingCodes = await fetchExistingCustomerCodes(prefix);
  const existingUpper = new Set(existingCodes.map((code) => code.toUpperCase()));
  const maxSequence = existingCodes.reduce((max, code) => {
    const next = parseCustomerCodeSequence(code, prefix);
    if (!next) return max;
    return Math.max(max, next);
  }, 0);

  let sequence = maxSequence + 1;
  let candidate = buildCustomerCode(prefix, sequence);
  while (existingUpper.has(candidate.toUpperCase())) {
    sequence += 1;
    candidate = buildCustomerCode(prefix, sequence);
  }

  return candidate;
};

const fetchUserByClerkOrEmail = async (
  clerkUserId?: string,
  email?: string
) => {
  const trimmedClerkId = normalizeString(clerkUserId);
  const trimmedEmail = normalizeString(email);

  if (trimmedClerkId) {
    const user = await writeClient.fetch<SanityUserDoc | null>(
      `*[_type == "user" && clerkUserId == $clerkUserId][0]{
        _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        phone,
        customerCode,
        createdAt,
        _createdAt
      }`,
      { clerkUserId: trimmedClerkId }
    );
    if (user) return user;
  }

  if (trimmedEmail) {
    return writeClient.fetch<SanityUserDoc | null>(
      `*[_type == "user" && email == $email][0]{
        _id,
        clerkUserId,
        email,
        firstName,
        lastName,
        phone,
        customerCode,
        createdAt,
        _createdAt
      }`,
      { email: trimmedEmail }
    );
  }

  return null;
};

const resolveCustomerCodeDate = (
  user: SanityUserDoc | null,
  fallback?: string
) => {
  const createdAt =
    normalizeString(fallback) ||
    normalizeString(user?.createdAt) ||
    normalizeString(user?._createdAt) ||
    new Date().toISOString();
  return new Date(createdAt);
};

export const ensureCustomerCodeForUser = async (
  input: EnsureCustomerCodeInput
) => {
  const clerkUserId = normalizeString(input.clerkUserId);
  const email = normalizeString(input.email);
  const firstName = normalizeString(input.firstName);
  const lastName = normalizeString(input.lastName);
  const phone = normalizeString(input.phone);

  if (!clerkUserId && !email) {
    throw new Error("Customer code lookup requires a clerkUserId or email.");
  }

  let user = await fetchUserByClerkOrEmail(clerkUserId, email);

  if (user) {
    const updates: Record<string, string> = {};
    if (clerkUserId && user.clerkUserId !== clerkUserId) {
      updates.clerkUserId = clerkUserId;
    }
    if (email && user.email !== email) {
      updates.email = email;
    }
    if (firstName && user.firstName !== firstName) {
      updates.firstName = firstName;
    }
    if (lastName && user.lastName !== lastName) {
      updates.lastName = lastName;
    }
    if (phone && user.phone !== phone) {
      updates.phone = phone;
    }

    let customerCode = normalizeString(user.customerCode);
    if (!customerCode) {
      const date = resolveCustomerCodeDate(user, input.createdAt);
      customerCode = await generateCustomerCodeForDate(date);
      updates.customerCode = customerCode;
    }

    if (Object.keys(updates).length > 0) {
      user = await writeClient
        .patch(user._id)
        .set({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .commit();
    }

    return {
      userId: user._id,
      customerCode,
    };
  }

  if (!email) {
    throw new Error("Customer code creation requires an email address.");
  }

  const date = resolveCustomerCodeDate(null, input.createdAt);
  const customerCode = await generateCustomerCodeForDate(date);
  const newUser = await writeClient.create({
    _type: "user",
    ...(clerkUserId ? { clerkUserId } : {}),
    email,
    firstName,
    lastName,
    ...(phone ? { phone } : {}),
    customerCode,
    createdAt: date.toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    userId: newUser._id,
    customerCode,
  };
};
