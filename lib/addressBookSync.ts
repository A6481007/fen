import type { Address } from "@/lib/address";
import { writeClient } from "@/sanity/lib/client";

type SyncAddressOptions = {
  userEmail: string;
  sanityUserId?: string;
  customerCode?: string;
  address: Address;
  previousAddress?: Partial<Address> | null;
};

const normalize = (value?: string | null) =>
  (value ?? "").trim().toLowerCase();

const isAddressMatch = (candidate: Partial<Address>, record: Address) =>
  normalize(candidate.address) === normalize(record.address) &&
  normalize(candidate.city) === normalize(record.city) &&
  normalize(candidate.state) === normalize(record.state) &&
  normalize(candidate.zip) === normalize(record.zip) &&
  normalize(candidate.country) === normalize(record.country) &&
  normalize(candidate.name) === normalize(record.name);

const findMatchingAddress = (
  candidate: Partial<Address> | null | undefined,
  addresses: Address[]
) => {
  if (!candidate) return null;
  return addresses.find((record) => isAddressMatch(candidate, record)) ?? null;
};

export const syncAddressToAddressBook = async ({
  userEmail,
  sanityUserId,
  customerCode,
  address,
  previousAddress,
}: SyncAddressOptions) => {
  if (!userEmail) return null;

  const addresses = await writeClient.fetch<Address[]>(
    `*[_type == "address" && email == $email]{
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
    }`,
    { email: userEmail }
  );

  const matched =
    findMatchingAddress(previousAddress, addresses) ||
    findMatchingAddress(address, addresses);

  const resolved = {
    name: address.name || matched?.name || "",
    email: userEmail,
    contactEmail:
      address.contactEmail ||
      address.email ||
      matched?.contactEmail ||
      userEmail,
    lineId: address.lineId || matched?.lineId || null,
    phone: address.phone || matched?.phone || null,
    fax: address.fax || matched?.fax || null,
    company: address.company || matched?.company || null,
    customerCode: customerCode || address.customerCode || matched?.customerCode || null,
    taxId: address.taxId || matched?.taxId || null,
    branch: address.branch || matched?.branch || null,
    address: address.address || matched?.address || "",
    city: address.city || matched?.city || "",
    state: address.state || matched?.state || "",
    zip: address.zip || matched?.zip || "",
    country: address.country || matched?.country || "",
    countryCode: address.countryCode || matched?.countryCode || "",
    stateCode: address.stateCode || matched?.stateCode || "",
    subArea: address.subArea || matched?.subArea || "",
    type: address.type || matched?.type || "home",
    default: matched?.default ?? addresses.length === 0,
  };

  const requiredFields = [
    "name",
    "address",
    "city",
    "state",
    "zip",
    "country",
    "subArea",
  ] as const;
  const missingRequired = requiredFields.filter((field) => !resolved[field]);
  if (missingRequired.length > 0) {
    return null;
  }

  if (matched?._id) {
    return writeClient
      .patch(matched._id)
      .set({
        ...resolved,
        updatedAt: new Date().toISOString(),
      })
      .commit();
  }

  return writeClient.create({
    _type: "address",
    ...resolved,
    ...(sanityUserId
      ? { user: { _type: "reference", _ref: sanityUserId } }
      : {}),
    createdAt: new Date().toISOString(),
  });
};
