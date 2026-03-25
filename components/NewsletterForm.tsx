"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { validateEmail } from "@/helpers/ctaValidation";

type NewsletterFormProps = {
  placeholder?: string;
  buttonLabel?: string;
  loadingLabel?: string;
};

const NewsletterForm = ({
  placeholder,
  buttonLabel,
  loadingLabel,
}: NewsletterFormProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset message
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage({
        type: "error",
        text: t("client.footer.newsletter.validation.required"),
      });
      return;
    }

    const validation = validateEmail(trimmedEmail);
    if (!validation.isValid) {
      setMessage({
        type: "error",
        text: t("client.footer.newsletter.validation.invalid"),
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: trimmedEmail.toLowerCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text:
            data.message ||
            t("client.footer.newsletter.success"),
        });
        setEmail(""); // Clear input on success
      } else {
        // Check if already subscribed
        if (data.alreadySubscribed) {
          setMessage({
            type: "info",
            text:
              data.error ||
              t("client.footer.newsletter.alreadySubscribed"),
          });
        } else {
          setMessage({
            type: "error",
            text: data.error || t("client.footer.newsletter.error"),
          });
        }
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setMessage({
        type: "error",
        text: t("client.footer.newsletter.errorGeneric"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolvedPlaceholder =
    placeholder || t("client.footer.newsletter.placeholder");
  const resolvedButtonLabel =
    buttonLabel || t("client.footer.newsletter.subscribe");
  const resolvedLoadingLabel =
    loadingLabel || t("client.footer.newsletter.subscribing");

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          placeholder={resolvedPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-black-strong focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {resolvedLoadingLabel}
            </>
          ) : (
            resolvedButtonLabel
          )}
        </button>
      </form>

      {/* Message Display */}
      {message && (
        <div
          className={`p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300 ${
            message.type === "success"
              ? "bg-green-50 text-success-base border border-success-highlight"
              : message.type === "info"
              ? "bg-blue-50 text-blue-800 border border-blue-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.type === "success" && (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          {message.type === "error" && (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          {message.type === "info" && (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{message.text}</span>
        </div>
      )}
    </div>
  );
};

export default NewsletterForm;
