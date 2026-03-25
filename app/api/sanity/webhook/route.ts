import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_WRITE_TOKEN!,
  apiVersion: "2023-10-01",
  useCdn: false,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { _type, _id, operation } = body;

    // Handle different document types
    switch (_type) {
      case "review":
        if (body.status === "approved") {
          await updateProductRating(body.product._ref);
        }
        break;

      case "order":
        if (body.status === "delivered") {
          await handleOrderDelivered(body);
        }
        if (body.status === "cancelled") {
          await handleOrderCancelled(body);
        }
        break;

      case "product":
        if (body.stock <= 0) {
          await sendLowStockAlert(body);
        }
        break;

      case "promotion":
        if (body.status === "active") {
          await activatePromotion(body);
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function updateProductRating(productId: string) {
  const reviews = await client.fetch(
    `*[_type == "review" && product._ref == $productId && status == "approved"]{rating}`,
    { productId }
  );

  if (reviews.length === 0) return;

  const avgRating =
    reviews.reduce((sum: number, r: any) => sum + r.rating, 0) /
    reviews.length;

  const distribution = {
    fiveStars: reviews.filter((r: any) => r.rating === 5).length,
    fourStars: reviews.filter((r: any) => r.rating === 4).length,
    threeStars: reviews.filter((r: any) => r.rating === 3).length,
    twoStars: reviews.filter((r: any) => r.rating === 2).length,
    oneStar: reviews.filter((r: any) => r.rating === 1).length,
  };

  await client
    .patch(productId)
    .set({
      averageRating: Math.round(avgRating * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution: distribution,
    })
    .commit();
}

async function handleOrderDelivered(order: any) {
  // Update user stats
  if (order.user?._ref) {
    await client
      .patch(order.user._ref)
      .inc({ totalSpent: order.totalPrice })
      .commit();
  }

  // Could send delivery confirmation email here
  console.log(`Order ${order.orderNumber} delivered`);
}

async function handleOrderCancelled(order: any) {
  // Restore stock for cancelled order items
  for (const item of order.products || []) {
    if (item.product?._ref && item.quantity) {
      await client
        .patch(item.product._ref)
        .inc({ stock: item.quantity })
        .commit();
    }
  }

  // Handle refunds if applicable
  if (order.paymentStatus === "paid" && order.user?._ref) {
    await client
      .patch(order.user._ref)
      .inc({ walletBalance: order.totalPrice })
      .append("walletTransactions", [
        {
          _type: "object",
          _key: `refund-${Date.now()}`,
          id: `REFUND-${order.orderNumber}`,
          type: "credit_refund",
          amount: order.totalPrice,
          balanceBefore: 0, // Would need to fetch current balance
          balanceAfter: order.totalPrice,
          description: `Refund for cancelled order ${order.orderNumber}`,
          orderId: order.orderNumber,
          createdAt: new Date().toISOString(),
          status: "completed",
        },
      ])
      .commit();
  }
}

async function sendLowStockAlert(product: any) {
  // Could integrate with Slack, email, or notification system
  console.log(`Low stock alert: ${product.name} has ${product.stock} units`);

  // Create admin notification
  await client.create({
    _type: "sentNotification",
    notificationId: `stock-alert-${product._id}-${Date.now()}`,
    title: "Low Stock Alert",
    message: `${product.name} is low on stock (${product.stock} units remaining)`,
    type: "system",
    priority: "high",
    sentAt: new Date().toISOString(),
    sentBy: "system",
    recipientCount: 0,
    recipients: [],
  });
}

async function activatePromotion(promotion: any) {
  console.log(`Promotion activated: ${promotion.name}`);
  // Could send marketing emails or update banners
}
