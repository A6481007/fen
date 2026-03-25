import { subscribeToNewsletter } from "@/actions/subscriptionActions";
import { sendMail } from "@/lib/emailService";
import { saveEventRSVP } from "@/sanity/helpers";
import { NextRequest, NextResponse } from "next/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      eventId,
      eventSlug,
      guestsCount,
      message,
      newsletterOptIn,
    } = body || {};

    const trimmedName = typeof name === "string" ? name.trim() : "";
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const trimmedEventId =
      typeof eventId === "string" ? eventId.trim() : undefined;
    const trimmedEventSlug =
      typeof eventSlug === "string" ? eventSlug.trim() : undefined;
    const eventReference = trimmedEventId || trimmedEventSlug || "";

    if (!trimmedName || !normalizedEmail || !eventReference) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please provide your name, email, and the event you're attending.",
        },
        { status: 400 }
      );
    }

    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid email address.",
        },
        { status: 400 }
      );
    }

    const parsedGuests =
      typeof guestsCount === "number"
        ? guestsCount
        : parseInt(String(guestsCount), 10);
    const safeGuests =
      Number.isFinite(parsedGuests) && parsedGuests > 0
        ? Math.min(Math.floor(parsedGuests), 20)
        : 1;

    const attendeeMessage =
      typeof message === "string" ? message.trim() : undefined;
    const wantsNewsletter = Boolean(newsletterOptIn);
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const saveResult = await saveEventRSVP({
      name: trimmedName,
      email: normalizedEmail,
      eventId: trimmedEventId,
      eventSlug: trimmedEventSlug || eventReference,
      guestsCount: safeGuests,
      message: attendeeMessage,
      newsletterOptIn: wantsNewsletter,
      ipAddress,
      userAgent,
    });

    if (!saveResult.success) {
      console.error("saveEventRSVP failed:", saveResult.error);
      return NextResponse.json(
        {
          success: false,
          error:
            "We couldn't process your RSVP right now. Please try again later.",
        },
        { status: 500 }
      );
    }

    let newsletterSubscribed = false;
    let newsletterMessage: string | undefined;

    if (wantsNewsletter) {
      const newsletterResult = await subscribeToNewsletter({
        email: normalizedEmail,
        source: "news-events",
        ipAddress,
        userAgent,
      });

      if (newsletterResult.success) {
        newsletterSubscribed = true;
      } else if (newsletterResult.alreadySubscribed) {
        newsletterSubscribed = true;
        newsletterMessage =
          newsletterResult.message ||
          "You're already subscribed to our newsletter.";
      } else if (newsletterResult.message) {
        newsletterMessage = newsletterResult.message;
      }
    }

    const eventLabel = trimmedEventSlug || trimmedEventId || "our event";
    const htmlBody = generateConfirmationEmailHtml({
      name: trimmedName,
      eventReference: eventLabel,
      guestsCount: safeGuests,
      message: attendeeMessage,
    });

    const textBody = [
      `Hi ${trimmedName},`,
      "",
      "Thanks for RSVPing to our upcoming event!",
      `Event: ${eventLabel}`,
      `Guests: ${safeGuests}`,
      attendeeMessage ? `Message: ${attendeeMessage}` : undefined,
      "",
      "We'll follow up with the final agenda and reminders soon.",
      "- The News Hub Team",
    ]
      .filter(Boolean)
      .join("\n");

    const emailResult = await sendMail({
      email: normalizedEmail,
      subject: `You're on the list for ${eventLabel}!`,
      text: textBody,
      html: htmlBody,
    });

    if (!emailResult.success) {
      console.error("RSVP confirmation email failed:", emailResult.error);
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Thanks for RSVPing! We've saved your spot and sent a confirmation email.",
        newsletterSubscribed,
        ...(newsletterMessage ? { newsletterMessage } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("RSVP API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "We couldn't process your RSVP right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}

const generateConfirmationEmailHtml = ({
  name,
  eventReference,
  guestsCount,
  message,
}: {
  name: string;
  eventReference: string;
  guestsCount: number;
  message?: string;
}) => {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="color:#065f46;">Hey ${name},</h2>
      <p>Thanks for submitting your RSVP. We can&apos;t wait to see you at <strong>${eventReference}</strong>.</p>
      <div style="margin:24px 0;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;">
        <p style="margin:0;"><strong>Event:</strong> ${eventReference}</p>
        <p style="margin:4px 0 0;"><strong>Guests:</strong> ${guestsCount}</p>
        ${
          message
            ? `<p style="margin:12px 0 0;"><strong>Notes:</strong> ${message}</p>`
            : ""
        }
      </div>
      <p>We'll follow up with final details and reminders soon.</p>
      <p style="margin-top:24px;">Warmly,<br/>The News Hub Team</p>
    </div>
  `;
};
