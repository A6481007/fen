import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { NEW_QUOTE_FEATURE } from "@/lib/featureFlags";
import {
  fetchOrder,
  fetchLatestQuotation,
  fetchQuotationById,
  fetchQuotationSettings,
  generatePdfFromHtml,
  generateLegacyQuotation,
  generateQuotation,
  injectPrintScript,
  renderQuotation,
  resolveLanguageMode,
  type OrderData,
  type QuotationDocument,
  type SalesContactInfo,
} from "@/lib/quotationService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = (await fetchOrder(orderId, user.id)) as OrderData | null;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const settings = await fetchQuotationSettings();
    const fallbackPhone = user.phoneNumbers?.[0]?.phoneNumber || "";
    const languageMode = resolveLanguageMode(
      request.nextUrl.searchParams.get("lang") ??
        request.nextUrl.searchParams.get("language"),
      settings
    );
    const quoteId = request.nextUrl.searchParams.get("quoteId");
    let quotationNumber = "";
    let quotationMeta: {
      number: string;
      createdAt?: string | null;
      salesContact?: SalesContactInfo | null;
    };
    let quotationDoc: QuotationDocument | null = null;

    if (!NEW_QUOTE_FEATURE) {
      quotationNumber =
        order.purchaseOrder?.number || `QT-${order.orderNumber}`;
      quotationMeta = {
        number: quotationNumber,
        createdAt:
          order.purchaseOrder?.createdAt ||
          order.quotationRequestedAt ||
          order.orderDate,
        salesContact: order.salesContact ?? undefined,
      };
    } else {
      const quotation = quoteId
        ? await fetchQuotationById(orderId, quoteId)
        : await fetchLatestQuotation(orderId);

      if (quoteId && !quotation) {
        return NextResponse.json(
          { error: "Quotation not found" },
          { status: 404 }
        );
      }

      quotationNumber =
        quotation?.number?.trim() ||
        order.purchaseOrder?.number ||
        `QT-${order.orderNumber}`;
      quotationMeta = {
        number: quotationNumber,
        createdAt:
          quotation?.createdAt ||
          order.purchaseOrder?.createdAt ||
          order.quotationRequestedAt ||
          order.orderDate,
        salesContact:
          quotation?.salesContact ?? order.salesContact ?? undefined,
      };
      quotationDoc = quotation ?? null;
    }

    const htmlContent = await renderQuotation(
      order,
      quotationMeta,
      settings,
      languageMode,
      { fallbackPhone, quotationDoc }
    );

    const format = request.nextUrl.searchParams.get("format");
    const downloadParam = request.nextUrl.searchParams.get("download");
    const wantsPdf =
      request.nextUrl.searchParams.get("pdf") === "1" ||
      format === "pdf" ||
      downloadParam === "pdf";

    if (wantsPdf) {
      const pdfBuffer = await generatePdfFromHtml(htmlContent);
      const response = new NextResponse(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
        },
      });
      const shouldDownload =
        downloadParam === "1" || downloadParam === "pdf" || downloadParam === "true";
      response.headers.set(
        "Content-Disposition",
        `${shouldDownload ? "attachment" : "inline"}; filename="${quotationNumber}.pdf"`
      );
      return response;
    }

    const print = request.nextUrl.searchParams.get("print");
    const html = print
      ? injectPrintScript(htmlContent, quotationNumber)
      : htmlContent;

    const response = new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });

    if (downloadParam && downloadParam !== "pdf") {
      response.headers.set(
        "Content-Disposition",
        `attachment; filename="${quotationNumber}.html"`
      );
    }

    return response;
  } catch (error) {
    console.error("Quotation render failed:", error);
    return NextResponse.json(
      { error: "Failed to generate quotation" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    const order = (await fetchOrder(orderId, user.id)) as OrderData | null;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let forceNewVersion: boolean | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === "object" && "forceNewVersion" in body) {
        forceNewVersion = body.forceNewVersion === true;
      }
    } catch {}

    if (forceNewVersion === undefined) {
      const forceNewParam =
        request.nextUrl.searchParams.get("forceNewVersion") ??
        request.nextUrl.searchParams.get("forceNew");
      forceNewVersion = forceNewParam === "1" || forceNewParam === "true";
    }

    const language =
      request.nextUrl.searchParams.get("lang") ??
      request.nextUrl.searchParams.get("language");
    const fallbackPhone = user.phoneNumbers?.[0]?.phoneNumber || "";

    if (!NEW_QUOTE_FEATURE) {
      const result = await generateLegacyQuotation(orderId, user.id, {
        baseUrl: request.nextUrl.origin,
        language,
        fallbackPhone,
        order,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    const result = await generateQuotation(orderId, user.id, {
      baseUrl: request.nextUrl.origin,
      forceNewVersion,
      language,
      fallbackPhone,
      order,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate quotation";
    console.error("Quotation generation failed:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
