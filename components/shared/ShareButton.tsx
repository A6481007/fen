"use client";

import { useMemo } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  url?: string | null;
  title?: string;
  text?: string;
  label?: string;
  ariaLabel?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  iconOnly?: boolean;
};

const normalizeUrl = (url?: string | null) => {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed || trimmed === "#" || trimmed.startsWith("#")) return "";
  return trimmed;
};

const resolveAbsoluteUrl = (url: string) => {
  if (typeof window === "undefined") return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("mailto:") || url.startsWith("tel:")) return url;
  if (url.startsWith("//")) return `${window.location.protocol}${url}`;
  if (url.startsWith("/")) return `${window.location.origin}${url}`;
  return `${window.location.origin}/${url}`;
};

const copyToClipboard = async (value: string) => {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fall through
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
};

const ShareButton = ({
  url,
  title,
  text,
  label = "Share",
  ariaLabel,
  className,
  variant = "ghost",
  size = "sm",
  iconOnly = false,
}: ShareButtonProps) => {
  const normalized = normalizeUrl(url);
  const resolvedUrl = useMemo(
    () => (normalized ? resolveAbsoluteUrl(normalized) : ""),
    [normalized]
  );

  const handleShare = async () => {
    if (!resolvedUrl) return;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text,
          url: resolvedUrl,
        });
        return;
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") {
          return;
        }
      }
    }

    const copied = await copyToClipboard(resolvedUrl);
    if (copied) {
      toast.success("Link copied to clipboard.");
    } else {
      toast.error("Unable to copy the link.");
    }
  };

  const buttonLabel = ariaLabel || (title ? `Share ${title}` : "Share link");

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon" : size}
      className={cn(iconOnly ? "rounded-full min-h-9 min-w-9 h-9 w-9" : "", className)}
      onClick={handleShare}
      aria-label={buttonLabel}
      disabled={!resolvedUrl}
    >
      <Share2 className="h-4 w-4" aria-hidden="true" />
      {iconOnly ? null : <span>{label}</span>}
    </Button>
  );
};

export default ShareButton;
