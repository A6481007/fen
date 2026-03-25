import { urlFor } from "@/sanity/lib/image";

interface SanityImageAsset {
  _ref: string;
  _type: string;
}

interface SanityImage {
  _type: string;
  asset: SanityImageAsset;
}

/**
 * Generate a proper image URL for email use from Sanity image data
 * @param imageData - Sanity image object or string
 * @param width - Desired width (default: 300)
 * @param height - Desired height (default: 300)
 * @returns Full URL to the image
 */
export function getEmailImageUrl(
  imageData:
    | string
    | SanityImage
    | SanityImage[]
    | { _type?: string; asset?: SanityImageAsset }
    | { asset?: { _ref?: string; url?: string } }
    | undefined,
  width: number = 300,
  height: number = 300
): string {
  try {
    // Handle undefined or null
    if (!imageData) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return `${baseUrl}/images/products/product_1.png`;
    }

    // If imageData is already a string URL, return it
    if (typeof imageData === "string") {
      return imageData;
    }

    // If it's a Sanity image object, generate URL
    if (
      imageData &&
      typeof imageData === "object" &&
      !Array.isArray(imageData) &&
      ("_type" in imageData || "asset" in imageData)
    ) {
      const imageUrl = urlFor(imageData)
        .width(width)
        .height(height)
        .format("jpg")
        .quality(80)
        .url();

      return imageUrl;
    }

    // If it's an array of images, use the first one
    if (Array.isArray(imageData) && imageData.length > 0) {
      return getEmailImageUrl(imageData[0], width, height);
    }

    // Fallback to placeholder image
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return `${baseUrl}/images/products/product_1.png`;
  } catch (error) {
    console.error("Error generating email image URL:", error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return `${baseUrl}/images/products/product_1.png`;
  }
}

/**
 * Get the base URL for the application
 * @returns The base URL with protocol
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
}
