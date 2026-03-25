"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Loader2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type PDFViewerProps = {
  fileUrl?: string | null;
  title?: string;
};

const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.1;

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
}

const PDFViewer = ({ fileUrl, title = "Document" }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!fileUrl);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    setLoadError(null);
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

  const pageWidth = useMemo(() => {
    if (!containerWidth) return undefined;
    return Math.min(containerWidth - 24, 1200);
  }, [containerWidth]);

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
          className={cn(
            "relative overflow-auto rounded-xl border border-slate-200 bg-slate-50",
            isFullscreen ? "flex-1 p-3" : "max-h-[70vh] p-3"
          )}
        >
          {isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-shop_dark_green" />
                Loading PDF...
              </div>
            </div>
          )}

          <Document
            key={fileUrl || "pdf-document"}
            file={fileUrl || ""}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            renderMode="canvas"
            className="flex justify-center"
            error={
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="h-4 w-4" />
                Unable to load the PDF preview.
              </div>
            }
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

          {loadError ? (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4" />
              {loadError}
            </div>
          ) : null}
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
