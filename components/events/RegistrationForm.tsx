"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegistrationFormProps = {
  eventId: string;
  eventSlug: string;
  maxAttendees?: number | null;
  attendeeCount?: number | null;
  onRegistered?: (attendee: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    registrationDate?: string;
    organization?: string;
    jobTitle?: string;
    dietaryRequirements?: string;
    accessibilityNeeds?: string;
  }) => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  organization: string;
  jobTitle: string;
  dietaryRequirements: string;
  accessibilityNeeds: string;
};

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

const defaultState: FormState = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  jobTitle: "",
  dietaryRequirements: "",
  accessibilityNeeds: "",
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const RegistrationForm = ({
  eventId,
  eventSlug,
  maxAttendees,
  attendeeCount,
  onRegistered,
}: RegistrationFormProps) => {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(defaultState);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [submitting, setSubmitting] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);

  const remainingSpots =
    typeof maxAttendees === "number" && typeof attendeeCount === "number"
      ? Math.max(0, maxAttendees - attendeeCount)
      : null;

  const handleChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (status) {
      setStatus(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);

    const name = formState.name.trim();
    const email = formState.email.trim().toLowerCase();
    const phone = formState.phone.trim();
    const organization = formState.organization.trim();
    const jobTitle = formState.jobTitle.trim();
    const dietaryRequirements = formState.dietaryRequirements.trim();
    const accessibilityNeeds = formState.accessibilityNeeds.trim();
    const companyName = organization;
    const slugForApi = eventSlug?.trim();

    if (!slugForApi) {
      setStatus({
        type: "error",
        text: "Event details are missing. Please refresh the page and try again.",
      });
      return;
    }

    if (!name || !email) {
      setStatus({
        type: "error",
        text: "Name and email are required to reserve a seat.",
      });
      return;
    }

    if (!isValidEmail(email)) {
      setStatus({
        type: "error",
        text: "Enter a valid email so we can confirm your registration.",
      });
      return;
    }

    if (!organization) {
      setStatus({
        type: "error",
        text: "Organization name is required for business registration.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slugForApi)}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          slug: slugForApi,
          name,
          email,
          phone,
          companyName,
          organization,
          jobTitle,
          dietaryRequirements,
          accessibilityNeeds,
          // TODO: Add reCAPTCHA token when available.
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data?.reason) {
          console.error("Event registration blocked:", data.reason);
        }
        throw new Error(data?.error || "Unable to save your registration right now.");
      }

      setStatus({
        type: "success",
        text: data?.message || "You’re registered! Check your email for the calendar invite.",
      });
      setFormState(defaultState);
      setAdditionalInfoOpen(false);
      if (data?.attendee || name || email) {
        onRegistered?.({
          name: data?.attendee?.name || name,
          email: data?.attendee?.email || email,
          phone: data?.attendee?.phone || phone,
          companyName: data?.attendee?.companyName || companyName,
          organization: data?.attendee?.organization || organization,
          jobTitle: data?.attendee?.jobTitle || jobTitle,
          dietaryRequirements: data?.attendee?.dietaryRequirements || dietaryRequirements,
          accessibilityNeeds: data?.attendee?.accessibilityNeeds || accessibilityNeeds,
          registrationDate: data?.attendee?.registrationDate,
        });
      }
      router.refresh();
    } catch (error) {
      console.error("Event registration error:", error);
      setStatus({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while saving your registration.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status ? (
        <div
          className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4" aria-hidden="true" />
          )}
          <span>{status.text}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Alex Johnson"
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="alex@example.com"
            value={formState.email}
            onChange={(event) => handleChange("email", event.target.value)}
            required
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (for day-of reminders)</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formState.phone}
            onChange={(event) => handleChange("phone", event.target.value)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job title (optional)</Label>
          <Input
            id="jobTitle"
            name="jobTitle"
            placeholder="Director of Operations"
            value={formState.jobTitle}
            onChange={(event) => handleChange("jobTitle", event.target.value)}
            disabled={submitting}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="organization">Organization</Label>
        <Input
          id="organization"
          name="organization"
          placeholder="Your company or organization name"
          value={formState.organization}
          onChange={(event) => handleChange("organization", event.target.value)}
          required
          disabled={submitting}
        />
        <p className="text-xs text-gray-500">Required for B2B registration</p>
      </div>

      <Collapsible
        open={additionalInfoOpen}
        onOpenChange={setAdditionalInfoOpen}
        className="space-y-3"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-shop_dark_green transition hover:border-shop_dark_green"
          >
            <span>Additional Information (optional)</span>
            {additionalInfoOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
          <p className="text-sm text-gray-600">
            Share any preferences that help us tailor your experience.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dietaryRequirements">Dietary requirements</Label>
              <Input
                id="dietaryRequirements"
                name="dietaryRequirements"
                placeholder="Vegetarian, halal, allergies"
                value={formState.dietaryRequirements}
                onChange={(event) => handleChange("dietaryRequirements", event.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessibilityNeeds">Accessibility needs</Label>
              <Input
                id="accessibilityNeeds"
                name="accessibilityNeeds"
                placeholder="Wheelchair access, assistive tech, seating"
                value={formState.accessibilityNeeds}
                onChange={(event) => handleChange("accessibilityNeeds", event.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-shop_light_bg/70 p-3 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-shop_dark_green" aria-hidden="true" />
          <span>We use this info to confirm your registration and event updates.</span>
        </div>
        {remainingSpots !== null ? (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-shop_dark_green">
            {remainingSpots} spot{remainingSpots === 1 ? "" : "s"} left
          </span>
        ) : null}
      </div>

      <Button
        type="submit"
        className="w-full bg-shop_dark_green text-white hover:bg-shop_light_green"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Saving your seat...
          </>
        ) : (
          "Register for this event"
        )}
      </Button>
    </form>
  );
};

export default RegistrationForm;
