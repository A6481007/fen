import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { writeClient } from "@/sanity/lib/client";
import stripe from "@/lib/stripe";

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

    // Get the order from Sanity
    const order = await writeClient.fetch(
      `*[_type == "order" && _id == $orderId && clerkUserId == $clerkUserId][0]{
        _id,
        orderNumber,
        clerkUserId,
        customerName,
        email,
        products[]{
          product->{
            _id,
            name,
            price,
            currency
          },
          quantity
        },
        subtotal,
        tax,
        shipping,
        totalPrice,
        currency,
        status,
        paymentStatus,
        stripeCustomerId,
        stripePaymentIntentId,
        invoice
      }`,
      { orderId, clerkUserId: user.id }
    );

    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is paid and doesn't already have an invoice
    if (order.paymentStatus !== "paid" && order.status !== "paid") {
      return NextResponse.json(
        { error: "Cannot generate invoice for unpaid order" },
        { status: 400 }
      );
    }

    // Check if invoice already exists
    if (order.invoice?.hosted_invoice_url) {
      return NextResponse.json(
        {
          success: true,
          invoice: order.invoice,
          message: "Invoice already exists",
        },
        { status: 200 }
      );
    }

    // Validate required fields
    if (!order.products || order.products.length === 0) {
      console.error(`No products found for order: ${orderId}`);
      return NextResponse.json(
        { error: "No products found in order" },
        { status: 400 }
      );
    }

    // Validate currency
    const currency = (order.currency || "THB").toLowerCase();
    const supportedCurrencies = ["thb", "usd", "eur", "gbp", "cad", "aud"];
    const normalizedCurrency = supportedCurrencies.includes(currency)
      ? currency
      : "thb";
    if (normalizedCurrency !== currency) {
      console.warn(
        `Unsupported currency: ${currency}, defaulting to THB`
      );
    }

    // Handle Stripe customer - create or find existing customer
    let stripeCustomerId = order.stripeCustomerId;

    // If we don't have a valid Stripe customer ID, create one
    if (
      !stripeCustomerId ||
      stripeCustomerId.includes("@") ||
      !stripeCustomerId.startsWith("cus_")
    ) {
      try {
        // First, try to find existing customer by email
        const existingCustomers = await stripe.customers.list({
          email: order.email,
          limit: 1,
        });

        if (existingCustomers.data.length > 0) {
          stripeCustomerId = existingCustomers.data[0].id;
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            email: order.email,
            name: order.customerName,
            metadata: {
              clerkUserId: order.clerkUserId,
              orderId: order._id,
            },
          });
          stripeCustomerId = customer.id;
        }

        // Update order with correct Stripe customer ID
        await writeClient.patch(order._id).set({ stripeCustomerId }).commit();
      } catch (customerError) {
        console.error(`Failed to create/find Stripe customer:`, customerError);
        return NextResponse.json(
          { error: "Failed to create or find Stripe customer" },
          { status: 500 }
        );
      }
    }

    // Create Stripe invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      description: `Invoice for Order ${order.orderNumber}`,
      metadata: {
        orderId: order._id,
        orderNumber: order.orderNumber || "",
        customerName: order.customerName || "",
      },
      auto_advance: false,
      collection_method: "charge_automatically",
    });

    // Add invoice items for products
    for (const item of order.products) {
      if (!item.product || !item.product.name || !item.product.price) {
        console.warn(`Skipping invalid product in order ${orderId}:`, item);
        continue;
      }

      try {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(item.product.price * item.quantity * 100), // Convert to cents
          currency: normalizedCurrency,
          description: `${item.product.name} x ${item.quantity}`,
          metadata: {
            productId: item.product._id,
            quantity: item.quantity.toString(),
          },
        });
      } catch (error) {
        console.error(
          `Failed to add invoice item for product ${item.product._id}:`,
          error
        );
        throw error;
      }
    }

    // Add tax if any
    if (order.tax && order.tax > 0) {
      try {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(order.tax * 100),
          currency: normalizedCurrency,
          description: "Tax",
          metadata: {
            type: "tax",
          },
        });
      } catch (error) {
        console.error(`Failed to add tax:`, error);
        throw error;
      }
    }

    // Add shipping if any
    if (order.shipping && order.shipping > 0) {
      try {
        await stripe.invoiceItems.create({
          customer: stripeCustomerId,
          invoice: invoice.id,
          amount: Math.round(order.shipping * 100),
          currency: normalizedCurrency,
          description: "Shipping",
          metadata: {
            type: "shipping",
          },
        });
      } catch (error) {
        console.error(`Failed to add shipping:`, error);
        throw error;
      }
    }

    // Finalize the invoice
    if (!invoice.id) {
      throw new Error("Failed to create invoice - no invoice ID");
    }

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    // Update the order in Sanity with the invoice information
    try {
      await writeClient
        .patch(order._id)
        .set({
          invoice: {
            id: finalizedInvoice.id,
            number: finalizedInvoice.number,
            hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
          },
        })
        .commit();
    } catch (error) {
      console.error(`Failed to update order with invoice:`, error);
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        invoice: {
          id: finalizedInvoice.id,
          number: finalizedInvoice.number,
          hosted_invoice_url: finalizedInvoice.hosted_invoice_url,
        },
        message: "Invoice generated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Invoice generation error:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to generate invoice";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("No such customer")) {
        errorMessage = "Customer not found in Stripe. Please contact support.";
        statusCode = 400;
      } else if (error.message.includes("currency")) {
        errorMessage = "Invalid currency specified";
        statusCode = 400;
      } else if (error.message.includes("amount")) {
        errorMessage = "Invalid amount specified";
        statusCode = 400;
      } else if (error.message.includes("invoice_id")) {
        errorMessage = "Invoice creation failed. Please try again.";
        statusCode = 500;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      },
      { status: statusCode }
    );
  }
}
