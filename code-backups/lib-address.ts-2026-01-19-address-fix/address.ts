export interface Address {
  _id?: string; // for addresses stored in Sanity
  name: string;
  email: string; // primary email (user or contact email)
  contactEmail?: string; // alternate contact email (if different from primary)
  lineId?: string;
  phone?: string;
  fax?: string;
  company?: string;
  customerCode?: string;
  winCode?: string;
  taxId?: string;
  branch?: string;
  address: string; // street address
  houseNumber?: string;
  moo?: string;
  soi?: string;
  road?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
  subArea?: string;
  subDistrict?: string;
  district?: string;
  province?: string;
  type?: "home" | "office" | "other";
  default?: boolean;
  createdAt?: string;
  lastUsedAt?: string;
}

const normalizeThaiValue = (
  value: string | number | null | undefined
): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const withThaiPrefix = (
  value: string | number | null | undefined,
  prefix: string,
  matchPrefixes: string[]
): string => {
  const normalized = normalizeThaiValue(value);
  if (!normalized) return "";
  if (matchPrefixes.some((match) => normalized.startsWith(match))) {
    return normalized;
  }
  return `${prefix}${normalized}`;
};

export const formatThaiAddress = (
  address?: Partial<Address> | null
): string => {
  if (!address) return "";

  const streetParts: string[] = [];
  const houseNumber = normalizeThaiValue(address.houseNumber);
  if (houseNumber) streetParts.push(houseNumber);

  const mooPart = withThaiPrefix(address.moo, "หมู่", ["หมู่", "หมู่ที่"]);
  if (mooPart) streetParts.push(mooPart);

  const soiPart = withThaiPrefix(address.soi, "ซอย", ["ซอย", "ซ."]);
  if (soiPart) streetParts.push(soiPart);

  const roadPart = withThaiPrefix(address.road, "ถนน", ["ถนน", "ถ."]);
  if (roadPart) streetParts.push(roadPart);

  if (streetParts.length === 0) {
    const fallbackStreet = normalizeThaiValue(address.address);
    if (fallbackStreet) streetParts.push(fallbackStreet);
  }

  const subDistrictValue =
    normalizeThaiValue(address.subDistrict) ||
    normalizeThaiValue(address.subArea);
  const districtValue =
    normalizeThaiValue(address.district) || normalizeThaiValue(address.city);
  const provinceValue =
    normalizeThaiValue(address.province) || normalizeThaiValue(address.state);

  const localityParts: string[] = [];
  const subDistrictPart = withThaiPrefix(subDistrictValue, "ต.", [
    "ต.",
    "ตำบล",
  ]);
  if (subDistrictPart) localityParts.push(subDistrictPart);

  const districtPart = withThaiPrefix(districtValue, "อ.", ["อ.", "อำเภอ"]);
  if (districtPart) localityParts.push(districtPart);

  const provincePart = withThaiPrefix(provinceValue, "จ.", ["จ.", "จังหวัด"]);
  if (provincePart) localityParts.push(provincePart);

  const zip = normalizeThaiValue(address.zip);
  if (zip) {
    if (localityParts.length > 0) {
      const lastIndex = localityParts.length - 1;
      localityParts[lastIndex] = `${localityParts[lastIndex]} ${zip}`;
    } else if (streetParts.length > 0) {
      const lastIndex = streetParts.length - 1;
      streetParts[lastIndex] = `${streetParts[lastIndex]} ${zip}`;
    } else {
      localityParts.push(zip);
    }
  }

  const street = streetParts.join(" ").trim();
  const locality = localityParts.join(", ").trim();
  return [street, locality].filter(Boolean).join(", ");
};
