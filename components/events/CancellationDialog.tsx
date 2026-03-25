"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, AlertTriangle, Loader2, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

type TeamMember = { name?: string | null; email?: string | null };

export type CancellationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registration: {
    id: string;
    eventTitle?: string | null;
    registrationType?: string | null;
    teamMembers?: TeamMember[];
  };
  onConfirm: (reason: string, cancelTeamMembers?: boolean) => Promise<void>;
};

const isTeamLead = (registrationType?: string | null) => {
  const normalized = (registrationType || "")
    .replace(/-/g, "_")
    .trim()
    .toLowerCase();
  return (
    normalized === "team_lead" ||
    normalized === "team lead" ||
    normalized === "teamlead"
  );
};

const CancellationDialog = ({
  open,
  onOpenChange,
  registration,
  onConfirm,
}: CancellationDialogProps) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelTeamMembers, setCancelTeamMembers] = useState(false);
  const { t } = useTranslation();

  const isLead = useMemo(
    () => isTeamLead(registration.registrationType),
    [registration.registrationType]
  );
  const teamCount = registration.teamMembers?.length || 0;

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
      setIsSubmitting(false);
      setCancelTeamMembers(isLead);
    }
  }, [open, isLead, registration.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    if (!nextOpen) {
      setReason("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim(), cancelTeamMembers);
      onOpenChange(false);
      setReason("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("client.registrations.cancel.errors.failed");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t("client.registrations.cancel.title")}
          </DialogTitle>
          <DialogDescription>
            {t("client.registrations.cancel.descriptionPrefix")}{" "}
            <span className="font-semibold text-foreground">
              {registration.eventTitle ||
                t("client.registrations.cancel.eventFallback")}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <div className="space-y-1">
                <p className="font-semibold">
                  {t("client.registrations.cancel.warning.title")}
                </p>
                <p>
                  {t("client.registrations.cancel.warning.body")}
                </p>
              </div>
            </div>
          </div>

          {isLead ? (
            <label className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
              <Checkbox
                checked={cancelTeamMembers}
                onCheckedChange={(checked) =>
                  setCancelTeamMembers(Boolean(checked))
                }
                disabled={isSubmitting}
                aria-label={t("client.registrations.cancel.team.ariaLabel")}
                className="mt-1"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-emerald-900">
                    {t("client.registrations.cancel.team.title")}
                  </p>
                  {teamCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-200 bg-white text-emerald-800"
                    >
                      <Users className="mr-1 h-3.5 w-3.5" />
                      {t("client.registrations.cancel.team.count", {
                        count: teamCount,
                      })}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-emerald-800">
                  {t("client.registrations.cancel.team.note")}
                </p>
              </div>
            </label>
          ) : null}

          <div className="space-y-2">
            <Label
              htmlFor="cancellation-reason"
              className="text-sm font-medium text-foreground"
            >
              {t("client.registrations.cancel.reason.label")}
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder={t("client.registrations.cancel.reason.placeholder")}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={isSubmitting}
              className="min-h-[96px]"
            />
            <p className="text-xs text-muted-foreground">
              {t("client.registrations.cancel.reason.helper")}
            </p>
          </div>

          {error ? (
            <Alert className="border-red-200 bg-red-50 text-red-800" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("client.registrations.cancel.errors.title")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="sm:min-w-[140px]"
            >
              {t("client.registrations.cancel.actions.keep")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="sm:min-w-[170px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("client.registrations.cancel.actions.cancelling")}
                </>
              ) : (
                t("client.registrations.cancel.actions.confirm")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CancellationDialog;
