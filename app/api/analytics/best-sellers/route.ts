// Analytics API for tracking best-selling products and comprehensive analytics
import { NextRequest, NextResponse } from "next/server";
import { backendClient } from "@/sanity/lib/backendClient";

interface OrderProduct {
  product: {
    _id: string;
    name: string;
    category: string;
    price?: number;
    images?: Array<{
      asset?: {
        url?: string;
      };
    }>;
  };
  quantity: number;
  price: number;
}

interface Order {
  status: string;
  products?: OrderProduct[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "monthly"; // weekly, monthly, yearly
    const limit = parseInt(searchParams.get("limit") || "10");

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "yearly":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // monthly
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Query to get best-selling products
    const bestSellingQuery = `
      *[_type == "order" && orderDate >= $startDate] {
        products[] {
          product->,
          quantity
        },
        totalPrice,
        status
      }
    `;

    const orders = await backendClient.fetch(bestSellingQuery, {
      startDate: startDate.toISOString(),
    });

    // Process data to get product sales statistics
    const productStats = new Map();

    orders.forEach((order: Order) => {
      if (order.status === "delivered" || order.status === "paid") {
        order.products?.forEach((item: OrderProduct) => {
          if (item.product) {
            const productId = item.product._id;
            const existing = productStats.get(productId) || {
              productId,
              name: item.product.name,
              category: item.product.category,
              salesCount: 0,
              revenue: 0,
              imageUrl: item.product.images?.[0]?.asset?.url || null,
            };

            existing.salesCount += item.quantity;
            existing.revenue += (item.product.price || 0) * item.quantity;
            productStats.set(productId, existing);
          }
        });
      }
    });

    // Convert to array and sort by sales count
    const bestSellers = Array.from(productStats.values())
      .sort((a, b) => b.salesCount - a.salesCount)
      .slice(0, limit);

    // Track this analytics data
    try {
      await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
        }/api/analytics/track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "best_selling_products",
            eventParams: {
              products: bestSellers,
              timeframe,
              totalProducts: bestSellers.length,
              totalRevenue: bestSellers.reduce((sum, p) => sum + p.revenue, 0),
              totalSales: bestSellers.reduce((sum, p) => sum + p.salesCount, 0),
            },
          }),
        }
      );
    } catch (analyticsError) {
      console.error(
        "Failed to track best selling products analytics:",
        analyticsError
      );
    }

    // Get overall analytics
    const totalOrdersQuery = `count(*[_type == "order" && orderDate >= $startDate])`;
    const revenueOrdersQuery = `
      *[_type == "order" && orderDate >= $startDate && (status == "delivered" || status == "paid")].totalPrice
    `;

    const [totalOrders, revenuePrices] = await Promise.all([
      backendClient.fetch(totalOrdersQuery, {
        startDate: startDate.toISOString(),
      }),
      backendClient.fetch(revenueOrdersQuery, {
        startDate: startDate.toISOString(),
      }),
    ]);

    // Calculate total revenue manually
    const totalRevenue = Array.isArray(revenuePrices)
      ? revenuePrices.reduce((sum, price) => sum + (price || 0), 0)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        bestSellers,
        analytics: {
          timeframe,
          totalOrders: totalOrders || 0,
          totalRevenue,
          totalProducts: bestSellers.length,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
      },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}
