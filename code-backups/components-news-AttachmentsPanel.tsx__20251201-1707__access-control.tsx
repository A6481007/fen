import LockBadge from "@/components/shared/LockBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Image as ImageIcon, Link2, Shield, File as FileIcon } from "lucide-react";
import Link from "next/link";

type AttachmentAccess = {
  isVisible?: boolean;
  lockReason?: string | null;
  unlockDate?: string | null;
};

export type NewsAttachment = {
  _key?: string;
  title?: string | null;
  description?: string | null;
  status?: "public" | "event_locked" | string | null;
  fileType?: "PDF" | "image" | "document" | "link" | string | null;
  file?: {
    asset?: {
      _id?: string | null;
      url?: string | null;
      originalFilename?: string | null;
      size?: number | null;
      mimeType?: string | null;
      extension?: string | null;
    } | null;
  } | null;
  access?: AttachmentAccess;
};

type AttachmentsPanelProps = {
  attachments?: NewsAttachment[] | null;
  linkedEventSlug?: string | null;
  linkedEventTitle?: string | null;
};

const formatFileSize = (value?: number | null) => {
  if (!value || value <= 0) return null;
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** exponent;
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const fileTypeLabel = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "pdf") return "PDF";
  if (normalized === "image") return "Image";
  if (normalized === "document") return "Document";
  if (normalized === "link") return "Link";
  return value.toUpperCase();
};

const getFileIcon = (value?: string | null) => {
  const normalized = (value || "").toLowerCase();
  if (normalized === "pdf" || normalized === "document") {
    return <FileText className="h-5 w-5" aria-hidden="true" />;
  }

  if (normalized === "image") {
    return <ImageIcon className="h-5 w-5" aria-hidden="true" />;
  }

  if (normalized === "link") {
    return <Link2 className="h-5 w-5" aria-hidden="true" />;
  }

  return <FileIcon className="h-5 w-5" aria-hidden="true" />;
};

const AttachmentsPanel = ({
  attachments = [],
  linkedEventSlug,
  linkedEventTitle,
}: AttachmentsPanelProps) => {
  const items = Array.isArray(attachments)
    ? attachments.filter(Boolean)
    : [];

  if (!items.length) {
    return (
      <Card className="border border-gray-100 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
            <Shield className="h-5 w-5" aria-hidden="true" />
            Attachments
          </CardTitle>
          <p className="text-sm text-gray-600">
            Supporting files for this article will appear here once published.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-100 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-shop_dark_green">
          <Shield className="h-5 w-5" aria-hidden="true" />
          Attachments
        </CardTitle>
        <p className="text-sm text-gray-600">
          Download supporting files. Event-locked items will unlock after the linked event.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((attachment, index) => {
          const access = attachment.access ?? { isVisible: true, lockReason: null, unlockDate: null };
          const isLocked = !access.isVisible;
          const downloadUrl = attachment.file?.asset?.url || null;
          const fileName = attachment.title || attachment.file?.asset?.originalFilename || "Attachment";
          const sizeLabel = formatFileSize(attachment.file?.asset?.size);
          const typeLabel = fileTypeLabel(attachment.fileType || attachment.file?.asset?.extension);
          const eventHref = linkedEventSlug ? `/news/events/${linkedEventSlug}` : null;

          return (
            <div
              key={attachment._key || fileName || index}
              className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-white/70 p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-shop_light_bg text-shop_dark_green">
                  {getFileIcon(attachment.fileType || attachment.file?.asset?.extension)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-gray-900">{fileName}</p>
                    {isLocked ? <LockBadge reason={access.lockReason} /> : null}
                  </div>
                  {attachment.description ? (
                    <p className="text-sm text-gray-600">{attachment.description}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    {typeLabel ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1">{typeLabel}</span>
                    ) : null}
                    {sizeLabel ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1">{sizeLabel}</span>
                    ) : null}
                    {attachment.status ? (
                      <span className="rounded-full bg-gray-100 px-2 py-1 capitalize">
                        {attachment.status.replace("_", " ")}
                      </span>
                    ) : null}
                  </div>
                  {isLocked && access.lockReason ? (
                    <p className="text-xs text-amber-700">{access.lockReason}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {downloadUrl && !isLocked ? (
                  <Button
                    asChild
                    className="w-full sm:w-auto bg-shop_dark_green hover:bg-shop_light_green"
                  >
                    <Link href={downloadUrl} target="_blank" rel="noopener noreferrer" download>
                      <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                      Download
                    </Link>
                  </Button>
                ) : (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full sm:w-auto border-dashed text-gray-500"
                  >
                    <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                    {isLocked ? "Locked" : "Unavailable"}
                  </Button>
                )}

                {isLocked && attachment.status === "event_locked" && eventHref ? (
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto border-shop_dark_green text-shop_dark_green hover:bg-shop_light_bg"
                  >
                    <Link
                      href={eventHref}
                      aria-label={
                        linkedEventTitle
                          ? `Register for ${linkedEventTitle}`
                          : "Register for event to unlock attachments"
                      }
                    >
                      Register for Event
                    </Link>
                  </Button>
                ) : null}

                {!isLocked && !downloadUrl ? (
                  <p className="text-xs text-gray-500 sm:text-right">
                    File will be added soon.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AttachmentsPanel;
