"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface DownloadQuotationButtonProps {
  orderId: string;
  className?: string;
}

export function DownloadQuotationButton({
  orderId,
  className,
}: DownloadQuotationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    if (!orderId || isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/purchase-order`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create quotation");
      }

      const pdfUrl = data?.pdfDownloadUrl ?? data?.pdfUrl;
      if (!pdfUrl) {
        throw new Error("Quotation PDF is not available yet");
      }

      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Quotation download failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to download quotation"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      className={className}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Download Quotation
        </>
      )}
    </Button>
  );
}
