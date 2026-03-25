"use client";

import { useCallback, useState } from "react";
import { EyeOpenIcon } from "@sanity/icons";
import type { DocumentActionProps } from "sanity";

const resolveBaseUrl = () => {
  if (typeof window !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      window.location.origin
    );
  }

  return process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
};

const resolvePreviewSecret = () =>
  process.env.NEXT_PUBLIC_SANITY_PREVIEW_SECRET ||
  process.env.SANITY_PREVIEW_SECRET ||
  process.env.SANITY_STUDIO_PREVIEW_SECRET;

export function PreviewDocumentAction(props: DocumentActionProps) {
  const { draft, published, type, onComplete } = props;
  const doc = draft || published;
  const slug = (doc as { slug?: { current?: string | null } } | null)?.slug?.current || "";
  const secret = resolvePreviewSecret();
  const [isOpening, setIsOpening] = useState(false);

  const handle = useCallback(() => {
    if (!slug || !secret) return;
    setIsOpening(true);

    try {
      const baseUrl = resolveBaseUrl();
      const url = new URL("/api/preview", baseUrl || "http://localhost:3000");
      url.searchParams.set("secret", secret);
      url.searchParams.set("slug", slug);
      url.searchParams.set("type", type);

      window.open(url.toString(), "_blank", "noopener");
    } finally {
      setIsOpening(false);
      onComplete();
    }
  }, [secret, slug, type, onComplete]);

  if (!slug || !secret) return null;

  return {
    label: isOpening ? "Opening preview..." : "Preview",
    icon: EyeOpenIcon,
    tone: "primary",
    disabled: isOpening,
    onHandle: handle,
  };
}
