import { NextRequest, NextResponse } from "next/server";

import {
  handleStatusCallback,
  validateTwilioSignature,
} from "@/lib/promotions/smsAdapter";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string | string[]> = {};

    formData.forEach((value, key) => {
      const stringValue = value.toString();
      if (params[key]) {
        const existing = params[key];
        params[key] = Array.isArray(existing)
          ? [...existing, stringValue]
          : [existing, stringValue];
      } else {
        params[key] = stringValue;
      }
    });

    const signature = request.headers.get("x-twilio-signature");
    const url = request.url;
    const isValid = validateTwilioSignature(signature, url, params);

    if (!isValid) {
      console.error("Invalid Twilio signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 },
      );
    }

    // Extract status information
    const {
      MessageSid: messageId,
      MessageStatus: status,
      ErrorCode: errorCode,
    } = params;

    if (typeof messageId !== "string" || typeof status !== "string") {
      console.warn("Twilio webhook missing messageId or status");
      return new NextResponse("OK", { status: 200 });
    }

    await handleStatusCallback(messageId, status, Array.isArray(errorCode) ? errorCode[0] : errorCode);

    // Twilio expects 200 OK
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Twilio webhook error:", error);
    // Still return 200 to prevent Twilio retries
    return new NextResponse("OK", { status: 200 });
  }
}

// Disable body parsing for webhook
export const config = {
  api: {
    bodyParser: false,
  },
};
