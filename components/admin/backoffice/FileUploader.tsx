"use client";

import { AssetUploader } from "./AssetUploader";

type FileUploaderProps = Omit<React.ComponentProps<typeof AssetUploader>, "assetType">;

export const FileUploader = (props: FileUploaderProps) => (
  <AssetUploader {...props} assetType="file" />
);
