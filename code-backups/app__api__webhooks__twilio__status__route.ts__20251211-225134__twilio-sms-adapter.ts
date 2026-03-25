import { NextRequest, NextResponse } from "next/server";

import {
  handleStatusCallback,
  validateTwilioSignature,
} from "@/lib/promotions/smsAdapter";

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature validation
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Get Twilio signature from headers
    const signature = request.headers.get("x-twilio-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 401 },
      );
    }

    // Validate signature
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`;
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

    // Handle the status update
    await handleStatusCallback(messageId, status, errorCode);

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
