export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const MIME_LABEL_OVERRIDES: Record<string, string> = {
  jpeg: "JPG",
};

export const getAcceptedFormatsLabel = (mimes: readonly string[]): string => {
  const labels: string[] = [];

  mimes.forEach((mime) => {
    const subtype = mime.split("/").pop()?.toLowerCase();
    if (!subtype) return;

    const label = (MIME_LABEL_OVERRIDES[subtype] ?? subtype).toUpperCase();
    if (!labels.includes(label)) {
      labels.push(label);
    }
  });

  return labels.join(", ");
};

export const getMaxSizeLabel = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 1) {
    const value = Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1);
    return `${value} MB`;
  }

  const kilobytes = bytes / 1024;
  const value = Number.isInteger(kilobytes) ? kilobytes : kilobytes.toFixed(1);
  return `${value} KB`;
};
