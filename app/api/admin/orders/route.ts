import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isUserAdmin } from "@/lib/adminUtils";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/client";
import { revalidatePath } from "next/cache";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderReference = {
  _id: string;
  _type: string;
};

const deleteOrderWithReferences = async (orderId: string) => {
  const references = await writeClient.fetch<OrderReference[]>(
    `*[_type != "order" && references($orderId)]{ _id, _type }`,
    { orderId }
  );

  const transaction = writeClient.transaction();
  const unknownReferences: OrderReference[] = [];

  references.forEach((reference) => {
    switch (reference._type) {
      case "quotation":
        transaction.delete(reference._id);
        transaction.delete(`drafts.${reference._id}`);
        break;
      case "review":
        transaction.patch(reference._id, (patch) =>
          patch.unset(["order"]).set({ isVerifiedPurchase: false })
        );
        break;
      case "contact":
        transaction.patch(reference._id, (patch) =>
          patch.unset(["relatedOrder"])
        );
        break;
      case "user":
        transaction.patch(reference._id, (patch) =>
          patch.unset([`orders[_ref == "${orderId}"]`])
        );
        break;
      default:
        unknownReferences.push(reference);
    }
  });

  if (unknownReferences.length > 0) {
    const detail = unknownReferences
      .map((ref) => `${ref._type}:${ref._id}`)
      .join(", ");
    throw new Error(
      `Order has references that must be resolved before deletion: ${detail}`
    );
  }

  transaction.delete(orderId);
  transaction.delete(`drafts.${orderId}`);

  await transaction.commit();
};

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const sortBy = searchParams.get("sortBy") || "orderDate";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build filter conditions
    const filterConditions = [];
    if (status) {
      filterConditions.push(`status == "${status}"`);
    }
    if (paymentMethod) {
      filterConditions.push(`paymentMethod == "${paymentMethod}"`);
    }

    // Build GROQ query
    const query = `
      *[_type == "order"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }] | order(${sortBy} ${sortOrder}) [${offset}...${offset + limit}] {
        _id,
        _createdAt,
        orderNumber,
        customerName,
        email,
        totalPrice,
        currency,
        status,
        paymentMethod,
        paymentStatus,
        orderDate,
        address,
        salesContact->{
          _id,
          name
        },
        products[] {
          _key,
          quantity,
          product-> {
            _id,
            name,
            price,
            image
          }
        },
        subtotal,
        tax,
        shipping,
        amountDiscount,
        cancellationRequested,
        cancellationRequestedAt,
        cancellationRequestReason
      }
    `;

    // Get count query
    const countQuery = `
      count(*[_type == "order"${
        filterConditions.length > 0
          ? ` && (${filterConditions.join(" && ")})`
          : ""
      }])
    `;

    // Execute queries with perspective 'published' to avoid draft content
    const [orders, totalCount] = await Promise.all([
      client.fetch(query, {}, { cache: "no-store", next: { revalidate: 0 } }),
      client.fetch(
        countQuery,
        {},
        { cache: "no-store", next: { revalidate: 0 } }
      ),
    ]);

    return NextResponse.json(
      {
        orders,
        totalCount,
        hasNextPage: offset + limit < totalCount,
        pagination: {
          limit,
          offset,
          total: totalCount,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete orders (single or bulk)
export async function DELETE(req: NextRequest) {
  try {
    // Get authenticated user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Not logged in" },
        { status: 401 }
      );
    }

    // Get current user details to check admin status
    const clerk = await clerkClient();
    const currentUser = await clerk.users.getUser(userId);
    const userEmail = currentUser.primaryEmailAddress?.emailAddress;

    // Check if current user is admin
    if (!userEmail || !isUserAdmin(userEmail)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderIds } = body; // Array of order IDs to delete

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Order IDs array is required" },
        { status: 400 }
      );
    }

    // Delete orders from Sanity
    const deleteResults = [];
    for (const orderIdToDelete of orderIds) {
      try {
        await deleteOrderWithReferences(orderIdToDelete);
        deleteResults.push({ orderId: orderIdToDelete, success: true });
      } catch (error) {
        console.error(`Failed to delete order ${orderIdToDelete}:`, error);
        deleteResults.push({
          orderId: orderIdToDelete,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = deleteResults.filter((r) => r.success).length;
    const failureCount = deleteResults.filter((r) => !r.success).length;

    // Revalidate admin orders page to clear cache
    if (successCount > 0) {
      try {
        revalidatePath("/admin/orders", "page");
        revalidatePath("/api/admin/orders", "page");
      } catch (revalidateError) {
        console.error("Error revalidating paths:", revalidateError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully deleted ${successCount} order(s)${
          failureCount > 0 ? `, failed to delete ${failureCount}` : ""
        }`,
        results: deleteResults,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error deleting orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
