"use client";

import React, { useEffect, useState } from "react";
import { ImageUploader } from "@/components/admin/backoffice/ImageUploader";

export type ImageInsertModalProps = {
  open: boolean;
  onClose: () => void;
  onInsert: (src: string, alt: string, caption: string, assetId?: string | null) => void;
};

export function ImageInsertModal({ open, onClose, onInsert }: ImageInsertModalProps) {
  const [tab, setTab] = useState<"upload" | "url">("upload");
  const [src, setSrc] = useState("");
  const [assetId, setAssetId] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    if (!open) {
      setTab("upload");
      setSrc("");
      setAssetId(null);
      setAlt("");
      setCaption("");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex gap-2 text-sm font-medium text-slate-700">
            <button
              type="button"
              className={`rounded px-3 py-1.5 ${tab === "upload" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              onClick={() => {
                setTab("upload");
                setAssetId(null);
              }}
            >
              Upload
            </button>
            <button
              type="button"
              className={`rounded px-3 py-1.5 ${tab === "url" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
              onClick={() => {
                setTab("url");
                setAssetId(null);
              }}
            >
              URL
            </button>
          </div>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-3">
          {tab === "upload" ? (
            <div className="space-y-2">
              <ImageUploader
                label="Upload image"
                description="Recommended 1200x630px"
                onChange={(value) => {
                  if (value?.url) setSrc(value.url);
                  setAssetId(value?.assetId ?? null);
                }}
              />
              {src ? (
                <div className="overflow-hidden rounded border border-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Preview" className="h-40 w-full object-cover" />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Image URL</label>
              <input
                type="url"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="https://example.com/image.jpg"
                value={src}
                onChange={(e) => {
                  setSrc(e.target.value);
                  setAssetId(null);
                }}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Alt text for screen readers</label>
            <input
              type="text"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Describe what’s in the image"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Caption — shown below the image on the page</label>
            <input
              type="text"
              className="w-full rounded border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Optional caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 py-2">
            <button
              type="button"
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
              disabled={!src}
              onClick={() => {
                if (!src) return;
                onInsert(src, alt, caption, assetId);
                onClose();
              }}
            >
              Insert image
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageInsertModal;
