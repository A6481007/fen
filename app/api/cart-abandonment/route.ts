import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  adminDb,
  FieldValue,
  Timestamp,
  firebaseAdminAvailable,
} from "@/lib/firebaseAdmin";
import { withRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AbandonmentStatus = "open" | "recovered" | "cleared" | "contacted";

type AbandonmentItem = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
};

type ServerTimestamp = ReturnType<typeof FieldValue.serverTimestamp>;

type CartAbandonmentDoc = {
  id: string;
  userId: string | null;
  sessionId: string;
  cartId: string;
  cartValue: number;
  items: AbandonmentItem[];
  checkoutStep: string;
  status: AbandonmentStatus;
  lastUpdatedAt: Timestamp | ServerTimestamp;
  createdAt: Timestamp | ServerTimestamp;
  updatedAt: Timestamp | ServerTimestamp;
  recoveryEmailSent: boolean;
  recoveryEmailSentAt: Timestamp | null | ServerTimestamp;
  recoverySMSSent: boolean;
  recoveryPromotionApplied: string | null;
  recovered: boolean;
  recoveredAt: Timestamp | null | ServerTimestamp;
  recoveryOrderId: string | null;
};

/**
 * Firestore indexes (add via console if prompted):
 * - cartAbandonments: where userId == {userId} orderBy createdAt desc
 * - cartAbandonments: where userId == {userId} and status == {status} orderBy createdAt desc
 * - cartAbandonments: where sessionId == {sessionId} and status == {status} orderBy createdAt desc
 */
const createAbandonmentSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string(),
  cartId: z.string(),
  cartValue: z.number().min(0),
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number(),
      price: z.number(),
      imageUrl: z.string().optional(),
    }),
  ),
  checkoutStep: z.string().optional(),
  lastUpdatedAt: z.string().datetime(),
});

const updateAbandonmentSchema = z.object({
  abandonmentId: z.string(),
  status: z.enum(["recovered", "cleared", "contacted"]),
  recoveryPromotionApplied: z.string().optional(),
  orderId: z.string().optional(),
});

const toTimestamp = (value: string) => Timestamp.fromDate(new Date(value));

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: unknown }).toDate === "function"
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return null;
};

// POST - Create new abandonment record
async function handleCreateAbandonment(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createAbandonmentSchema.parse(body);

    const abandonmentId = `abandon_${validated.sessionId}_${Date.now()}`;

    if (!adminDb || !firebaseAdminAvailable) {
      console.warn(
        "[cart-abandonment] Firestore unavailable; returning noop response (admin SDK not configured)"
      );
      return NextResponse.json(
        {
          success: true,
          abandonmentId,
          action: "noop",
          disabled: true,
          message: "Cart abandonment tracking is disabled in this environment.",
        },
        { status: 200 }
      );
    }

    const existingQuery = await adminDb
      .collection("cartAbandonments")
      .where("sessionId", "==", validated.sessionId)
      .where("status", "==", "open")
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      await existingDoc.ref.update({
        cartValue: validated.cartValue,
        items: validated.items,
        lastUpdatedAt: toTimestamp(validated.lastUpdatedAt),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        abandonmentId: existingDoc.id,
        action: "updated",
      });
    }

    const abandonmentData: CartAbandonmentDoc = {
      id: abandonmentId,
      userId: validated.userId ?? null,
      sessionId: validated.sessionId,
      cartId: validated.cartId,
      cartValue: validated.cartValue,
      items: validated.items,
      checkoutStep: validated.checkoutStep ?? "cart",
      status: "open",
      lastUpdatedAt: toTimestamp(validated.lastUpdatedAt),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      recoveryEmailSent: false,
      recoveryEmailSentAt: null,
      recoverySMSSent: false,
      recoveryPromotionApplied: null,
      recovered: false,
      recoveredAt: null,
      recoveryOrderId: null,
    };

    await adminDb
      .collection("cartAbandonments")
      .doc(abandonmentId)
      .set(abandonmentData);

    if (validated.userId) {
      await adminDb
        .collection("users")
        .doc(validated.userId)
        .update({
          lastCartAbandonedAt: FieldValue.serverTimestamp(),
          abandonedCarts: FieldValue.increment(1),
        });
    }

    return NextResponse.json({
      success: true,
      abandonmentId,
      action: "created",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Error creating abandonment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH - Update abandonment status
async function handleUpdateAbandonment(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = updateAbandonmentSchema.parse(body);

    if (!adminDb || !firebaseAdminAvailable) {
      console.warn(
        "[cart-abandonment] Firestore unavailable; skipping update (admin SDK not configured)"
      );
      return NextResponse.json(
        {
          success: true,
          abandonmentId: validated.abandonmentId,
          status: validated.status,
          disabled: true,
          message: "Cart abandonment tracking is disabled in this environment.",
        },
        { status: 200 }
      );
    }

    const abandonmentRef = adminDb
      .collection("cartAbandonments")
      .doc(validated.abandonmentId);
    const abandonmentDoc = await abandonmentRef.get();

    if (!abandonmentDoc.exists) {
      return NextResponse.json(
        { error: "Abandonment not found" },
        { status: 404 },
      );
    }

    const updateData: Partial<CartAbandonmentDoc> & {
      status: AbandonmentStatus;
      updatedAt: ServerTimestamp;
    } = {
      status: validated.status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (validated.status === "recovered") {
      updateData.recovered = true;
      updateData.recoveredAt = FieldValue.serverTimestamp();
      updateData.recoveryOrderId = validated.orderId ?? null;
      updateData.recoveryPromotionApplied = validated.recoveryPromotionApplied ?? null;
    }

    await abandonmentRef.update(updateData);

    return NextResponse.json({
      success: true,
      abandonmentId: validated.abandonmentId,
      status: validated.status,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Error updating abandonment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export const POST = withRateLimit(handleCreateAbandonment, "cartAbandonment");
export const PATCH = withRateLimit(handleUpdateAbandonment, "cartAbandonment");

// GET - Get abandonment history for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");
    const statusParam = searchParams.get("status");

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: "userId or sessionId required" },
        { status: 400 },
      );
    }

    if (
      statusParam &&
      !["open", "recovered", "cleared", "contacted"].includes(statusParam)
    ) {
      return NextResponse.json(
        { error: "Invalid status filter" },
        { status: 400 },
      );
    }

    if (!adminDb || !firebaseAdminAvailable) {
      console.warn(
        "[cart-abandonment] Firestore unavailable; returning empty history (admin SDK not configured)"
      );
      return NextResponse.json(
        {
          abandonments: [],
          count: 0,
          disabled: true,
          message: "Cart abandonment tracking is disabled in this environment.",
        },
        { status: 200 }
      );
    }

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
      adminDb.collection("cartAbandonments");

    if (userId) {
      query = query.where("userId", "==", userId);
    } else if (sessionId) {
      query = query.where("sessionId", "==", sessionId);
    }

    if (statusParam) {
      query = query.where("status", "==", statusParam);
    }

    query = query.orderBy("createdAt", "desc").limit(20);

    const snapshot = await query.get();

    const abandonments = snapshot.docs.map((doc) => {
      const data = doc.data() as CartAbandonmentDoc;
      const { id: dataId, ...rest } = (data || {}) as CartAbandonmentDoc & { id?: string };

      return {
        id: doc.id || dataId,
        ...rest,
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
        lastUpdatedAt: toIsoString(data.lastUpdatedAt),
        recoveredAt: toIsoString(data.recoveredAt),
      };
    });

    return NextResponse.json({
      abandonments,
      count: abandonments.length,
    });
  } catch (error) {
    console.error("Error fetching abandonments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
