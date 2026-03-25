"use client";

import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
  getAcceptedFormatsLabel,
  getMaxSizeLabel,
} from "@/lib/uploadConfig";
import { AssetUploader } from "./AssetUploader";

type ImageUploaderProps = Omit<React.ComponentProps<typeof AssetUploader>, "assetType">;

export const ImageUploader = (props: ImageUploaderProps) => {
  const accept = ALLOWED_IMAGE_MIME_TYPES.join(",");
  const helperText =
    props.helperText ??
    `Accepted: ${getAcceptedFormatsLabel(ALLOWED_IMAGE_MIME_TYPES)} · Max ${getMaxSizeLabel(MAX_IMAGE_FILE_SIZE_BYTES)} · Recommended: 1200×630 px`;

  return <AssetUploader {...props} assetType="image" accept={props.accept ?? accept} helperText={helperText} />;
};
