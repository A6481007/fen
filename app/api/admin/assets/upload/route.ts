import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";
import { getBackofficeContext, hasPermission } from "@/lib/authz";
import { type BackofficePermission } from "@/config/authz";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
  getAcceptedFormatsLabel,
  getMaxSizeLabel,
} from "@/lib/uploadConfig";

const IMAGE_ERROR_MESSAGE = `Invalid file. Accepted formats: ${getAcceptedFormatsLabel(ALLOWED_IMAGE_MIME_TYPES)}. Max size: ${getMaxSizeLabel(MAX_IMAGE_FILE_SIZE_BYTES)}.`;

const ALLOWED_PERMISSIONS: BackofficePermission[] = [
  "content.insights.write",
  "content.news.write",
  "content.events.write",
  "content.catalogs.write",
  "content.downloads.write",
  "marketing.promotions.write",
  "marketing.deals.write",
];

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ctx = await getBackofficeContext();

    if (!ctx.clerkUserId || !ctx.clerkUser) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(ctx, ALLOWED_PERMISSIONS)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const assetType = (formData.get("assetType") as string) || "file";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Missing file upload" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type || "application/octet-stream";
    const filename = file.name || "upload";
    const kind = assetType === "image" ? "image" : "file";

    if (kind === "image") {
      const isAllowed = ALLOWED_IMAGE_MIME_TYPES.includes(contentType);
      const withinSize = buffer.byteLength <= MAX_IMAGE_FILE_SIZE_BYTES;

      if (!isAllowed || !withinSize) {
        return NextResponse.json(
          { success: false, message: IMAGE_ERROR_MESSAGE },
          { status: 400 },
        );
      }
    }

    const asset = await backendClient.assets.upload(kind as "image" | "file", buffer, {
      contentType,
      filename,
    });

    return NextResponse.json({
      success: true,
      assetId: asset._id,
      url: asset.url,
    });
  } catch (error) {
    console.error("[admin/assets/upload] error", error);
    return NextResponse.json(
      { success: false, message: "Failed to upload asset" },
      { status: 500 },
    );
  }
}
