type UploadOptions = {
  assetType?: "file" | "image";
  uploadUrl?: string;
};

/**
 * Uploads a file to the backoffice asset route with credentials included.
 * Returns the Sanity asset id and optional URL.
 */
export const uploadAssetViaRoute = async (
  file: File,
  { assetType = "file", uploadUrl = "/api/admin/assets/upload" }: UploadOptions = {},
): Promise<{ assetId: string; url?: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("assetType", assetType);

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.message || "Upload failed");
  }

  return (await response.json()) as { assetId: string; url?: string };
};
