"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadAssetViaRoute } from "@/lib/backoffice/uploadClient";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
  getAcceptedFormatsLabel,
  getMaxSizeLabel,
} from "@/lib/uploadConfig";

type AssetUploaderProps = {
  label?: string;
  description?: string;
  accept?: string;
  assetType?: "file" | "image";
  uploadUrl?: string;
  onUpload?: (file: File) => Promise<{ assetId: string; url?: string } | void>;
  onChange?: (value: { assetId: string; url?: string } | null) => void;
  className?: string;
  actionLabel?: string;
  onPickerReady?: (open: () => void) => void;
  helperText?: string;
};

export function AssetUploader({
  label,
  description,
  accept,
  assetType = "file",
  uploadUrl = "/api/admin/assets/upload",
  onUpload,
  onChange,
  className,
  actionLabel,
  onPickerReady,
  helperText,
}: AssetUploaderProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("backoffice.assetUploader.label");
  const resolvedActionLabel = actionLabel ?? t("backoffice.assetUploader.chooseFile");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<{ assetId: string; url?: string } | null>(null);
  const dragCounter = useRef(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const imageAccept = ALLOWED_IMAGE_MIME_TYPES.join(",");
  const acceptedFormatsLabel = getAcceptedFormatsLabel(ALLOWED_IMAGE_MIME_TYPES);
  const maxSizeLabel = getMaxSizeLabel(MAX_IMAGE_FILE_SIZE_BYTES);
  const imageHelperDefault = `Accepted: ${acceptedFormatsLabel} · Max ${maxSizeLabel} · Recommended: 1200×630 px`;
  const imageErrorMessage = `Invalid file. Accepted formats: ${acceptedFormatsLabel}. Max size: ${maxSizeLabel}.`;

  const normalizedAccept =
    assetType === "image"
      ? accept && accept !== "image/*"
        ? accept
        : imageAccept
      : accept;

  const resolvedHelperText =
    helperText ??
    (assetType === "image" ? imageHelperDefault : t("backoffice.assetUploader.helper"));

  const uploadFile = async (file: File) => {
    if (onUpload) return onUpload(file);

    return uploadAssetViaRoute(file, { assetType, uploadUrl });
  };

  const processFile = async (file: File, onReset?: () => void) => {
    setError(null);

    if (assetType === "image") {
      const isAllowedType = ALLOWED_IMAGE_MIME_TYPES.includes(file.type);
      const withinSizeLimit = file.size <= MAX_IMAGE_FILE_SIZE_BYTES;

      if (!isAllowedType || !withinSizeLimit) {
        setError(imageErrorMessage);
        onChange?.(null);
        onReset?.();
        return;
      }
    }

    setProgress(10);
    setUploading(true);

    try {
      setProgress(30);
      const result = await uploadFile(file);
      setProgress(90);
      const value = result ?? null;
      setUploaded(value);
      setProgress(100);
      onChange?.(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("backoffice.assetUploader.error"));
      onChange?.(null);
    } finally {
      setTimeout(() => setUploading(false), 200);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await processFile(file, () => {
      event.target.value = "";
    });
  };

  const handleClick = () => inputRef.current?.click();

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounter.current = 0;
    setIsDraggingOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // expose picker to parent
  useEffect(() => {
    if (onPickerReady) onPickerReady(handleClick);
  }, [onPickerReady]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {resolvedLabel}
        {description && <span className="text-xs font-normal text-slate-500">{description}</span>}
      </Label>
      <div
        className={cn(
          "relative flex flex-col gap-2 rounded-lg p-4 transition-all duration-200",
          isDraggingOver ? "border-2 border-dashed border-blue-500 bg-blue-50" : "border border-dashed border-slate-300 bg-slate-50",
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={normalizedAccept}
          className="hidden"
          onChange={handleFileChange}
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center text-base font-semibold text-blue-600 transition-opacity duration-200",
            isDraggingOver ? "opacity-100" : "opacity-0",
          )}
        >
          Drop your image here
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleClick} disabled={uploading} type="button">
            {uploading ? t("backoffice.assetUploader.uploading") : resolvedActionLabel}
          </Button>
          {uploaded?.assetId && (
            <span className="text-sm text-slate-600">
              {t("backoffice.assetUploader.ready")}{" "}
              <code className="rounded bg-slate-200 px-1 py-0.5">{uploaded.assetId}</code>
            </span>
          )}
        </div>
        {uploading && (
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-slate-500">
          {resolvedHelperText}
        </p>
      </div>
    </div>
  );
}
