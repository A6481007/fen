"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

type EventsRsvpFormProps = {
  eventId?: string;
  eventSlug?: string;
  eventTitle?: string;
  defaultGuests?: number;
  showEventInput?: boolean;
};

type StatusMessage =
  | {
      type: "success" | "error" | "info";
      text: string;
    }
  | null;

interface FormFields {
  name: string;
  email: string;
  event: string;
  guestsCount: string;
  message: string;
  newsletterOptIn: boolean;
}

const defaultFormState: FormFields = {
  name: "",
  email: "",
  event: "",
  guestsCount: "1",
  message: "",
  newsletterOptIn: false,
};

const EventsRsvpForm = ({
  eventId,
  eventSlug,
  eventTitle,
  defaultGuests = 1,
  showEventInput,
}: EventsRsvpFormProps) => {
  const normalizedGuests =
    Number.isFinite(defaultGuests) && defaultGuests > 0
      ? Math.min(Math.floor(defaultGuests), 20)
      : 1;
  const prefilledReference =
    (typeof eventSlug === "string" && eventSlug.trim()) ||
    (typeof eventTitle === "string" && eventTitle.trim()) ||
    "";
  const shouldShowEventInput = showEventInput ?? (!eventId && !eventSlug);
  const initialState: FormFields = {
    ...defaultFormState,
    event: prefilledReference,
    guestsCount: String(normalizedGuests),
  };

  const [formData, setFormData] = useState<FormFields>(initialState);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

  const handleInputChange = (
    field: keyof FormFields,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (statusMessage) {
      setStatusMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    try {
      const trimmedEventId = typeof eventId === "string" ? eventId.trim() : undefined;
      const trimmedEventSlug =
        typeof eventSlug === "string" && eventSlug.trim() ? eventSlug.trim() : undefined;
      const eventFromInput = formData.event.trim();
      const resolvedEventSlug =
        trimmedEventSlug || (!shouldShowEventInput ? prefilledReference : eventFromInput) || undefined;
      const eventReference = trimmedEventId || resolvedEventSlug || (shouldShowEventInput ? eventFromInput : "");

      if (!eventReference) {
        setStatusMessage({
          type: "error",
          text: "We couldn't identify the event. Please reload and try again.",
        });
        setLoading(false);
        return;
      }

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        eventId: trimmedEventId,
        eventSlug: resolvedEventSlug || eventFromInput || eventReference,
        guestsCount: parseInt(formData.guestsCount, 10) || 1,
        message: formData.message.trim(),
        newsletterOptIn: formData.newsletterOptIn,
      };

      const response = await fetch("/api/news/rsvp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const extraNote = data.newsletterMessage
          ? ` ${data.newsletterMessage}`
          : "";
        const baseMessage =
          data.message ||
          "Thanks for RSVPing! Check your inbox for a confirmation email.";
        setStatusMessage({
          type: "success",
          text: `${baseMessage}${extraNote}`,
        });
        setFormData(initialState);
      } else {
        setStatusMessage({
          type: data.newsletterMessage ? "info" : "error",
          text:
            data.error ||
            data.newsletterMessage ||
            "We couldn't send your RSVP just yet. Please try again.",
        });
      }
    } catch (error) {
      console.error("RSVP form error:", error);
      setStatusMessage({
        type: "error",
        text: "Something went wrong. Please try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Jane Doe"
            value={formData.name}
            onChange={(event) => handleInputChange("name", event.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            name="email"
            placeholder="jane@example.com"
            value={formData.email}
            onChange={(event) => handleInputChange("email", event.target.value)}
            required
            disabled={loading}
          />
        </div>
      </div>

      {shouldShowEventInput ? (
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="event">Event name or link</Label>
            <Input
              id="event"
              name="event"
              placeholder="Q1 Product Briefing"
              value={formData.event}
              onChange={(event) => handleInputChange("event", event.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestsCount">Guests</Label>
            <Input
              id="guestsCount"
              type="number"
              name="guestsCount"
              min={1}
              max={20}
              value={formData.guestsCount}
              onChange={(event) =>
                handleInputChange("guestsCount", event.target.value)
              }
              required
              disabled={loading}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-dashed border-shop_light_green/40 bg-shop_light_bg/60 p-4 text-sm text-gray-700">
            <p className="font-semibold text-shop_dark_green">
              You&apos;re RSVPing for {eventTitle || prefilledReference || "this event"}.
            </p>
            <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
              {eventTitle ? (
                <div className="font-medium text-shop_dark_green">
                  Event: <span className="font-semibold text-gray-700">{eventTitle}</span>
                </div>
              ) : null}
              {prefilledReference ? (
                <div>
                  Slug / reference:{" "}
                  <span className="font-semibold text-gray-700 break-all">{prefilledReference}</span>
                </div>
              ) : null}
              {eventId ? (
                <div className="sm:col-span-2">
                  Internal ID: <span className="font-semibold text-gray-700 break-all">{eventId}</span>
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestsCount">Guests</Label>
            <Input
              id="guestsCount"
              type="number"
              name="guestsCount"
              min={1}
              max={20}
              value={formData.guestsCount}
              onChange={(event) =>
                handleInputChange("guestsCount", event.target.value)
              }
              required
              disabled={loading}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="message">Notes (optional)</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="Let us know about dietary needs or accessibility requests."
          value={formData.message}
          onChange={(event) => handleInputChange("message", event.target.value)}
          rows={4}
          disabled={loading}
        />
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4">
        <Checkbox
          id="newsletterOptIn"
          checked={formData.newsletterOptIn}
          onCheckedChange={(checked) =>
            handleInputChange("newsletterOptIn", checked === true)
          }
          disabled={loading}
        />
        <div className="space-y-1">
          <Label
            htmlFor="newsletterOptIn"
            className="text-base font-medium text-shop_dark_green"
          >
            Keep me updated with News Hub announcements
          </Label>
          <p className="text-sm text-gray-500">
            Receive event reminders, community invites, and quarterly recaps. You
            can unsubscribe anytime.
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
            statusMessage.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : statusMessage.type === "info"
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.type === "success" && (
            <CheckCircle2 className="h-4 w-4 mt-0.5" />
          )}
          {statusMessage.type === "error" && (
            <AlertCircle className="h-4 w-4 mt-0.5" />
          )}
          {statusMessage.type === "info" && (
            <Info className="h-4 w-4 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <Button
        type="submit"
        className="w-full bg-shop_dark_green text-white hover:bg-shop_light_green"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting RSVP...
          </>
        ) : (
          "Submit RSVP"
        )}
      </Button>
    </form>
  );
};

export default EventsRsvpForm;
