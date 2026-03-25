"use client";
import React, { useState } from "react";
import { TableBody, TableCell, TableRow } from "./ui/table";
import PriceFormatter from "./PriceFormatter";
import { MY_ORDERS_QUERYResult } from "@/sanity.types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { format } from "date-fns";
import { CreditCard, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/orderStatus";
import Link from "next/link";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";

type OrderListItem = MY_ORDERS_QUERYResult[number] & {
  cancellationRequested?: boolean | null;
};

const OrdersComponent = ({ orders }: { orders: OrderListItem[] }) => {
  const [payingOrderId] = useState<string | null>(null);
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState<string | null>(
    null
  );

  // Helper function to render product images with stacked layout
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderProductImages = (products: any[]) => {
    if (!products || products.length === 0) return null;

    const maxVisible = 3;
    const displayProducts = products.slice(0, maxVisible);
    const remainingCount = products.length - maxVisible;

    return (
      <div className="flex items-center">
        <div className="flex items-center">
          {displayProducts.map((item, index) => {
            const imageUrl = item.product?.images?.[0] || item.product?.image;
            return (
              <div
                key={index}
                className={`relative w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-100 ${
                  index > 0 ? "-ml-2" : ""
                } z-${30 - index * 10}`}
                style={{ zIndex: 30 - index * 10 }}
              >
                {imageUrl ? (
                  <Image
                    src={urlFor(imageUrl).url()}
                    alt={item.product?.name || "Product"}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-500">?</span>
                  </div>
                )}
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="-ml-2 w-8 h-8 rounded-full bg-gray-600 border-2 border-white shadow-sm flex items-center justify-center z-10">
              <span className="text-xs font-semibold text-white">
                +{remainingCount}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handlePayNow = async (orderId: string) => {
    if (!orderId) return;

    // Redirect to checkout page with order ID
    window.location.href = `/checkout?orderId=${orderId}`;
  };

  const handleGenerateInvoice = async (orderId: string) => {
    if (!orderId) return;

    setGeneratingInvoiceId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/generate-invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || "Invoice generated successfully!");
        // Refresh the page to show updated invoice data
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to generate invoice");
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setGeneratingInvoiceId(null);
    }
  };

  const isOrderPayable = (order: OrderListItem) => {
    // Order is payable if payment is not completed and order is not cancelled
    const isPaid = order.paymentStatus === PAYMENT_STATUSES.PAID;
    const isCancelled = order.status === ORDER_STATUSES.CANCELLED;
    const isQuotation = order.status === (ORDER_STATUSES.QUOTATION_REQUESTED as OrderListItem["status"]);
    const isCreditPayment =
      order.paymentMethod === (PAYMENT_METHODS.CREDIT as OrderListItem["paymentMethod"]);
    return !isPaid && !isCancelled && !isQuotation && !isCreditPayment;
  };

  const formatStatusLabel = (status?: string) => {
    if (!status) {
      return "Pending";
    }
    if (status === ORDER_STATUSES.QUOTATION_REQUESTED) {
      return "Quotation";
    }
    return status
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  return (
    <>
      <TableBody>
        <TooltipProvider>
          {orders.map((order) => (
            <Tooltip key={order?.orderNumber}>
              <TooltipTrigger asChild>
                <TableRow className="hover:bg-gray-50 h-16">
                  <TableCell className="font-medium text-sm">
                    <div className="flex flex-col">
                      <span className="truncate max-w-20 sm:max-w-none">
                        {order.orderNumber?.slice(-10) ?? "N/A"}...
                      </span>
                      <span className="text-xs text-gray-500 md:hidden">
                        {order?.orderDate &&
                          format(new Date(order.orderDate), "dd/MM")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {order?.orderDate &&
                      format(new Date(order.orderDate), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[100px] sm:max-w-none">
                        {order.customerName}
                      </span>
                      <span className="text-xs text-gray-500 sm:hidden truncate max-w-[120px]">
                        {order.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-gray-600">
                    <span className="truncate max-w-[150px] inline-block">
                      {order.email}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    {renderProductImages(order.products || [])}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    <PriceFormatter
                      amount={order?.totalPrice}
                      className="text-black font-medium"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {order?.status && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap w-fit ${
                            order.status ===
                            (ORDER_STATUSES.QUOTATION_REQUESTED as OrderListItem["status"])
                              ? "bg-blue-50 text-blue-700"
                              : order.paymentStatus === "paid" ||
                                order.status === "completed" ||
                                order.status === "delivered"
                              ? "bg-success-highlight text-success-base"
                              : order.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {formatStatusLabel(order?.status)}
                        </span>
                      )}
                      {order.cancellationRequested &&
                        order.status !== ORDER_STATUSES.CANCELLED && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-700 w-fit">
                          Cancellation Requested
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="hidden sm:table-cell">
                    {order?.invoice?.hosted_invoice_url ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-600 truncate max-w-16 lg:max-w-20">
                          {order?.invoice?.number ||
                            "INV-" + order.orderNumber?.slice(-6)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 shrink-0"
                          onClick={() => {
                            window.open(
                              order.invoice?.hosted_invoice_url,
                              "_blank"
                            );
                          }}
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : order?.paymentStatus === "paid" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs"
                        disabled={generatingInvoiceId === order._id}
                        onClick={() => handleGenerateInvoice(order._id)}
                      >
                        {generatingInvoiceId === order._id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                            Gen...
                          </>
                        ) : (
                          "Generate"
                        )}
                      </Button>
                    ) : (
                      <span className="text-xs text-gray-400">----</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs"
                      >
                        <Link href={`/user/orders/${order._id}`}>
                          <Eye className="w-3 h-3 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Link>
                      </Button>
                      {isOrderPayable(order) && (
                        <Button
                          onClick={() => handlePayNow(order._id)}
                          disabled={payingOrderId === order._id}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-2 text-xs"
                        >
                          {payingOrderId === order._id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white sm:mr-1"></div>
                              <span className="hidden sm:inline">
                                Paying...
                              </span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3 h-3 sm:mr-1" />
                              <span className="hidden sm:inline">Pay Now</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              </TooltipTrigger>
              <TooltipContent>
                <p>View order details or make payment</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </TableBody>
    </>
  );
};

export default OrdersComponent;
