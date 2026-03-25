import { NextRequest, NextResponse } from "next/server";

import {
  handleStatusCallback,
  validateTwilioSignature,
} from "@/lib/promotions/smsAdapter";

const TWILIO_SIGNATURE_HEADER = "x-twilio-signature";

export async function POST(req: NextRequest) {
  const signature = req.headers.get(TWILIO_SIGNATURE_HEADER);

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Twilio signature." },
      { status: 400 },
    );
  }

  const rawBody = await req.text();
  const params = parseFormBody(rawBody);

  const isValid = validateTwilioSignature(signature, req.url, params);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid Twilio signature." },
      { status: 401 },
    );
  }

  const messageId = params.MessageSid || params.SmsMessageSid;
  const status = params.MessageStatus || params.SmsStatus;
  const errorCode = params.ErrorCode;

  if (!messageId || !status) {
    return NextResponse.json(
      { error: "Missing required Twilio parameters." },
      { status: 400 },
    );
  }

  try {
    await handleStatusCallback(messageId, status, errorCode);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      `[sms][${messageId}] Failed to handle Twilio status callback`,
      error,
    );
    return NextResponse.json(
      { error: "Failed to process status callback." },
      { status: 500 },
    );
  }
}

function parseFormBody(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const entries: Record<string, string> = {};

  for (const [key, value] of params.entries()) {
    entries[key] = value;
  }

  return entries;
}
