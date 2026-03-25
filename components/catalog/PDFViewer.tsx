"use client";

import type { ReactNode, WheelEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

/**
 * Prefetching PDF viewer that exposes download/open/fullscreen/zoom controls with accessible fallbacks.
 * Falls back to alert-style messaging when no URL is provided or preview loading fails.
 */
type PDFViewerProps = {
  fileUrl?: string | null;
  title?: string;
  fallback?: ReactNode;
};

const WORKER_SRC = "/pdf.worker.min.js";
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.1;

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
}

const PDFViewer = ({ fileUrl, title = "Document", fallback }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!fileUrl);
  const [isPrefetching, setIsPrefetching] = useState<boolean>(false);
  const [resolvedFile, setResolvedFile] = useState<string | null>(fileUrl ?? null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [prefetchFailed, setPrefetchFailed] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    setLoadError(null);
    setDownloadError(null);
    setPrefetchFailed(false);
    setResolvedFile(fileUrl ?? null);
    setIsLoading(!!fileUrl);
  }, [fileUrl]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry?.contentRect?.width) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    if (numPages > 0 && pageNumber > numPages) {
      setPageNumber(numPages);
    }
  }, [numPages, pageNumber]);

  useEffect(() => {
    if (!isFullscreen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullscreen]);

  const cleanupBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const fetchBlobUrl = useCallback(
    async (signal?: AbortSignal) => {
      if (!fileUrl) {
        throw new Error("No PDF URL provided");
      }

      const response = await fetch(fileUrl, {
        mode: "cors",
        credentials: "include",
        signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF (${response.status})`);
      }

      const blob = await response.blob();
      const nextUrl = URL.createObjectURL(blob);

      if (blobUrlRef.current && blobUrlRef.current !== nextUrl) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      blobUrlRef.current = nextUrl;
      return nextUrl;
    },
    [fileUrl]
  );

  useEffect(() => {
    if (!fileUrl) {
      cleanupBlobUrl();
      setIsPrefetching(false);
      return undefined;
    }

    const controller = new AbortController();

    const prefetch = async () => {
      setIsPrefetching(true);
      try {
        const blobUrl = await fetchBlobUrl(controller.signal);
        setResolvedFile(blobUrl);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn("PDF prefetch failed, using direct URL", error);
        setPrefetchFailed(true);
        setResolvedFile(fileUrl);
      } finally {
        if (!controller.signal.aborted) {
          setIsPrefetching(false);
        }
      }
    };

    prefetch();

    return () => {
      controller.abort();
      cleanupBlobUrl();
    };
  }, [fileUrl, fetchBlobUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setLoadError(null);
    setIsLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Failed to load PDF preview", error);
    setLoadError("We could not load the preview. Please use the download button instead.");
    setIsLoading(false);
  };

  const canGoPrev = pageNumber > 1;
  const canGoNext = numPages > 0 && pageNumber < numPages;
  const zoomPercent = Math.round(scale * 100);
  const isBusy = isLoading || isPrefetching;

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    return Math.min(containerWidth - 24, 1200);
  }, [containerWidth]);

  const derivedFilename = useMemo(() => {
    if (!fileUrl) return "document.pdf";

    try {
      const base = typeof window !== "undefined" ? window.location.href : "http://localhost";
      const urlPath = new URL(fileUrl, base).pathname;
      const fromUrl = urlPath.split("/").pop() || "";
      const cleaned = fromUrl.split("?")[0];

      if (cleaned) return cleaned;
    } catch {
      // noop
    }

    const safeTitle = title?.trim().replace(/\s+/g, "-").toLowerCase() || "document";
    return `${safeTitle}.pdf`;
  }, [fileUrl, title]);

  const handleDownload = async () => {
    if (!fileUrl) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const url = blobUrlRef.current ?? (await fetchBlobUrl());
      setResolvedFile((current) => current || url);
      const link = document.createElement("a");
      link.href = url;
      link.download = derivedFilename;
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("PDF download failed", error);
      setDownloadError("Download failed. Try \"Open in browser\" or check your connection.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleWheelZoom = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;

    event.preventDefault();
    const delta = -event.deltaY / 600;

    setScale((value) => {
      const next = Number((value + delta).toFixed(2));
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    });
  };

  const renderFallback = (message?: string) => (
    <div
      className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>{message || "Unable to display this PDF preview."}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleDownload}
          disabled={!fileUrl || isDownloading}
          className="gap-1"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? "Downloading…" : "Download PDF"}
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-1">
          <a href={fileUrl || "#"} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Open in browser
          </a>
        </Button>
      </div>
      {downloadError ? (
        <p className="text-xs font-medium text-red-700">{downloadError}</p>
      ) : null}
      {fallback}
    </div>
  );

  const viewerShell = (
    <Card
      className={cn(
        "relative z-10 h-full shadow-xl",
        isFullscreen ? "mx-auto max-w-6xl" : ""
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-shop_dark_green">
              Preview
            </p>
            <p className="text-lg font-semibold leading-tight text-slate-900">
              {title}
            </p>
            {numPages > 0 && (
              <p className="text-xs text-slate-600">
                {numPages} {numPages === 1 ? "page" : "pages"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale((value) => Math.max(MIN_SCALE, Number((value - 0.1).toFixed(2))))}
              disabled={scale <= MIN_SCALE}
              className="gap-1"
            >
              <ZoomOut className="h-4 w-4" />
              Zoom out
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale(1)}
              className="gap-1"
            >
              100%
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale((value) => Math.min(MAX_SCALE, Number((value + 0.1).toFixed(2))))}
              disabled={scale >= MAX_SCALE}
              className="gap-1"
            >
              <ZoomIn className="h-4 w-4" />
              Zoom in
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen((current) => !current)}
              className="gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  Exit full screen
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  Full screen
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!fileUrl || isDownloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <a href={fileUrl || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open in browser
              </a>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPageNumber((value) => Math.max(1, value - 1))}
              disabled={!canGoPrev}
              className="gap-1 bg-white text-slate-900 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </Button>
            <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold text-slate-800">
              Page {pageNumber} {numPages > 0 ? `of ${numPages}` : ""}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                setPageNumber((value) =>
                  numPages > 0 ? Math.min(numPages, value + 1) : value + 1
                )
              }
              disabled={!canGoNext}
              className="gap-1 bg-white text-slate-900 hover:bg-slate-100"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {numPages > 1 ? (
            <div className="flex min-w-[200px] flex-1 items-center gap-2">
              <span className="text-xs uppercase tracking-[0.08em] text-slate-500">
                Navigate
              </span>
              <Slider
                min={1}
                max={numPages}
                step={1}
                value={[pageNumber]}
                onValueChange={(value) => {
                  const next = value?.[0] ?? 1;
                  setPageNumber(Math.max(1, Math.min(numPages, next)));
                }}
              />
              <span className="w-10 text-xs font-semibold text-slate-700">
                {pageNumber}/{numPages}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.08em] text-slate-500">
              Zoom
            </span>
            <div className="flex w-40 items-center gap-2">
              <Slider
                min={Math.round(MIN_SCALE * 100)}
                max={Math.round(MAX_SCALE * 100)}
                step={5}
                value={[zoomPercent]}
                onValueChange={(value) => {
                  const next = (value?.[0] ?? 100) / 100;
                  setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, next)));
                }}
              />
              <span className="w-12 text-right text-xs font-semibold text-slate-700">
                {zoomPercent}%
              </span>
            </div>
          </div>
        </div>

        <div
          ref={containerRef}
          onWheel={handleWheelZoom}
          className={cn(
            "relative overflow-auto rounded-xl border border-slate-200 bg-slate-50",
            isFullscreen ? "flex-1 p-3" : "max-h-[70vh] p-3"
          )}
          style={{ touchAction: "pan-y pinch-zoom" }}
          aria-busy={isBusy}
          aria-live="polite"
        >
          {isBusy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70" role="status">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-shop_dark_green" />
                {isPrefetching ? "Preparing PDF..." : "Loading PDF..."}
              </div>
            </div>
          )}

          {loadError ? (
            renderFallback(loadError)
          ) : (
            <Document
              key={resolvedFile || fileUrl || "pdf-document"}
              file={resolvedFile || fileUrl || ""}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              renderMode="canvas"
              className="flex justify-center"
              error={renderFallback("Unable to load the PDF preview.")}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                scale={scale}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="mx-auto"
              />
            </Document>
          )}

          {prefetchFailed ? (
            <p className="mt-3 text-xs text-amber-700">
              Preview is loading from the source directly because caching failed. Downloads may take longer.
            </p>
          ) : null}

          {downloadError && !loadError ? (
            <p className="mt-3 text-xs text-red-700" role="status">
              {downloadError}
            </p>
          ) : null}
        </div>

        <div className="sr-only" aria-live="polite">
          {isBusy
            ? "Loading PDF..."
            : loadError
              ? "PDF failed to load."
              : `Showing page ${pageNumber} ${numPages ? `of ${numPages}` : ""}. Zoom ${zoomPercent} percent.`}
        </div>
      </CardContent>
    </Card>
  );

  if (!fileUrl) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-slate-700">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <span>No PDF file available for preview.</span>
        </CardContent>
      </Card>
    );
  }

  if (isFullscreen) {
    return (
      <>
        <div className="relative min-h-[400px]">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
            Full screen preview is active.
          </div>
        </div>
        {createPortal(
          <div className="fixed inset-0 z-50 bg-black/70 p-4 sm:p-6">
            {viewerShell}
          </div>,
          document.body
        )}
      </>
    );
  }

  return <div className="relative">{viewerShell}</div>;
};

export default PDFViewer;
