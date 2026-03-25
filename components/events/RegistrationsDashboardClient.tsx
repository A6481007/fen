"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Loader2,
  UserRoundMinus,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RegistrationCard, { type RegistrationCardProps } from "@/components/events/RegistrationCard";
import CancellationDialog from "@/components/events/CancellationDialog";
import { useTranslation } from "react-i18next";

type RegistrationEvent = {
  _id?: string;
  title?: string | null;
  slug?: string | null;
  date?: string | null;
  location?: string | null;
  registrationOpen?: boolean | null;
  maxAttendees?: number | null;
  registrationDeadline?: string | null;
  teamRegistrationEnabled?: boolean | null;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  status?: string | null;
  statusOverride?: string | null;
  image?: unknown;
};

type RegistrationTeamMember = {
  name?: string;
  email?: string;
  jobTitle?: string;
};

type Registration = {
  _id?: string;
  name?: string;
  email?: string;
  organization?: string;
  jobTitle?: string;
  registrationType?: string;
  registrationStatus?: string;
  status?: string;
  event?: RegistrationEvent | null;
  eventSlug?: string | null;
  eventStatus?: string;
  isRegistrationClosed?: boolean;
  isTeamLead?: boolean;
  teamMembers?: RegistrationTeamMember[];
  guestsCount?: number;
  teamId?: string | null;
  submittedAt?: string | null;
  cancelledAt?: string | null;
};

type RegistrationsDashboardClientProps = {
  registrations: Registration[];
};

type TabKey = "upcoming" | "past" | "cancelled";

type TeamMemberDraft = {
  id: string;
  email: string;
  name: string;
  jobTitle: string;
  isNew?: boolean;
  remove?: boolean;
};


const normalizeEmail = (value?: string | null) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const buildDrafts = (registrations: Registration[]) => {
  const drafts: Record<string, TeamMemberDraft[]> = {};
  registrations.forEach((registration) => {
    if (!registration._id) return;
    drafts[registration._id] = (registration.teamMembers || []).map(
      (member, index) => ({
        id: member.email || `member-${index}`,
        email: member.email || "",
        name: member.name || "",
        jobTitle: member.jobTitle || "",
      })
    );
  });
  return drafts;
};

const RegistrationsDashboardClient = ({
  registrations: initialRegistrations,
}: RegistrationsDashboardClientProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>("upcoming");
  const [registrations, setRegistrations] = useState<Registration[]>(
    () => initialRegistrations || []
  );
  const [teamDrafts, setTeamDrafts] = useState<Record<string, TeamMemberDraft[]>>(() =>
    buildDrafts(initialRegistrations || [])
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellationTarget, setCancellationTarget] = useState<Registration | null>(null);
  const { t } = useTranslation();

  const statusStyles = useMemo(
    () => ({
      confirmed: {
        label: t("client.registrations.status.confirmed"),
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      },
      waitlisted: {
        label: t("client.registrations.status.waitlisted"),
        className: "bg-amber-100 text-amber-900 border border-amber-200",
      },
      cancelled: {
        label: t("client.registrations.status.cancelled"),
        className: "bg-rose-100 text-rose-800 border border-rose-200",
      },
      pending: {
        label: t("client.registrations.status.pending"),
        className: "bg-blue-100 text-blue-800 border border-blue-200",
      },
      completed: {
        label: t("client.registrations.status.completed"),
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      },
      attended: {
        label: t("client.registrations.status.attended"),
        className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
      },
      ended: {
        label: t("client.registrations.status.ended"),
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      },
      closed: {
        label: t("client.registrations.status.closed"),
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      },
      archived: {
        label: t("client.registrations.status.cancelled"),
        className: "bg-rose-100 text-rose-800 border border-rose-200",
      },
    }),
    [t]
  );

  const tabs = useMemo(
    () => [
      { value: "upcoming" as const, label: t("client.registrations.tabs.upcoming") },
      { value: "past" as const, label: t("client.registrations.tabs.past") },
      { value: "cancelled" as const, label: t("client.registrations.tabs.cancelled") },
    ],
    [t]
  );

  const resolveStatus = (registration: Registration) => {
    const status =
      registration.registrationStatus || registration.status || "pending";
    const normalized = status.toLowerCase();
    const fallback =
      statusStyles[normalized as keyof typeof statusStyles]?.label ||
      status ||
      t("client.registrations.status.pending");
    return {
      label:
        statusStyles[normalized as keyof typeof statusStyles]?.label ||
        fallback,
      className:
        statusStyles[normalized as keyof typeof statusStyles]?.className,
      value: normalized,
    };
  };

  const getTabForRegistration = (registration: Registration): TabKey => {
    const status = resolveStatus(registration).value;
    if (status === "cancelled" || status === "archived") return "cancelled";

    const eventStatus = (registration.eventStatus || "").toLowerCase();
    if (eventStatus === "ended") return "past";
    if (status === "completed" || status === "attended" || status === "ended") {
      return "past";
    }

    return "upcoming";
  };

  const counts = useMemo(
    () =>
      registrations.reduce(
        (acc, registration) => {
          const tab = getTabForRegistration(registration);
          acc[tab] += 1;
          return acc;
        },
        { upcoming: 0, past: 0, cancelled: 0 } as Record<TabKey, number>
      ),
    [registrations]
  );

  const updateTeamDraft = (
    registrationId: string,
    draftId: string,
    field: keyof TeamMemberDraft,
    value: string | boolean
  ) => {
    setTeamDrafts((prev) => {
      const drafts = prev[registrationId] || [];
      return {
        ...prev,
        [registrationId]: drafts.map((draft) =>
          draft.id === draftId ? { ...draft, [field]: value } : draft
        ),
      };
    });
  };

  const addDraft = (registrationId: string, maxTeamSize?: number | null) => {
    setTeamDrafts((prev) => {
      const drafts = prev[registrationId] || [];
      const activeDrafts = drafts.filter((draft) => !draft.remove);
      const teamSize = 1 + activeDrafts.length;
      const cap = maxTeamSize && maxTeamSize > 0 ? maxTeamSize : 20;
      if (teamSize >= cap) {
        toast.error(
          t("client.registrations.team.limit", {
            count: cap,
          })
        );
        return prev;
      }

      const newDraft: TeamMemberDraft = {
        id: `new-${Date.now()}`,
        email: "",
        name: "",
        jobTitle: "",
        isNew: true,
      };

      return {
        ...prev,
        [registrationId]: [...drafts, newDraft],
      };
    });
  };

  const removeDraft = (registrationId: string, draftId: string) => {
    setTeamDrafts((prev) => {
      const drafts = prev[registrationId] || [];
      return {
        ...prev,
        [registrationId]: drafts.map((draft) =>
          draft.id === draftId
            ? draft.isNew
              ? { ...draft, remove: true, email: "", name: "", jobTitle: "" }
              : { ...draft, remove: true }
            : draft
        ),
      };
    });
  };

  const handleConfirmCancellation = async (
    reason: string,
    cancelTeamMembers?: boolean
  ) => {
    if (!cancellationTarget?._id) {
      const message = t("client.registrations.errors.missingId");
      toast.error(message);
      throw new Error(message);
    }

    const registrationId = cancellationTarget._id;
    const shouldCancelTeam =
      Boolean(cancelTeamMembers) && Boolean(cancellationTarget.isTeamLead);

    setCancelling((prev) => ({ ...prev, [registrationId]: true }));
    try {
      const response = await fetch("/api/events/registrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          cancelTeamMembers: shouldCancelTeam,
          cancellationReason: reason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error || t("client.registrations.errors.cancelFailed")
        );
      }

      toast.success(
        data?.message || t("client.registrations.messages.cancelled")
      );
      setRegistrations((prev) =>
        prev.map((entry) =>
          entry._id === registrationId
            ? {
                ...entry,
                registrationStatus: "cancelled",
                status: "cancelled",
                cancelledAt: new Date().toISOString(),
                ...(reason ? { cancellationReason: reason } : {}),
              }
            : entry
        )
      );
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : t("client.registrations.errors.cancelFailedGeneric");
      toast.error(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setCancelling((prev) => ({ ...prev, [registrationId]: false }));
    }
  };

  const openCancellationDialog = (registration: Registration) => {
    setCancellationTarget(registration);
    setCancellationDialogOpen(true);
  };

  const handleCancellationDialogChange = (open: boolean) => {
    setCancellationDialogOpen(open);
    if (!open) {
      setCancellationTarget(null);
    }
  };

  const handleSaveTeam = async (registration: Registration) => {
    if (!registration._id) {
      toast.error(t("client.registrations.errors.missingId"));
      return;
    }

    const drafts = (teamDrafts[registration._id] || []).filter(
      (draft) => !draft.remove
    );
    const cleaned = drafts.map((draft) => ({
      ...draft,
      email: draft.email.trim(),
      name: draft.name.trim(),
      jobTitle: draft.jobTitle.trim(),
    }));

    const existingMembers = registration.teamMembers || [];
    const existingByEmail = new Map(
      existingMembers.map((member) => [normalizeEmail(member.email), member])
    );

    const additions = cleaned.filter((draft) => draft.isNew && draft.email);
    const updates = cleaned.filter(
      (draft) =>
        !draft.isNew &&
        !draft.remove &&
        existingByEmail.has(normalizeEmail(draft.email))
    );
    const removals = (teamDrafts[registration._id] || []).filter(
      (draft) => draft.remove && !draft.isNew
    );

    const uniqueEmails = new Set<string>();
    const emailPattern = /\S+@\S+\.\S+/;
    for (const draft of cleaned) {
      const email = normalizeEmail(draft.email);
      if (!email) {
        toast.error(t("client.registrations.team.errors.emailRequired"));
        return;
      }
      if (!emailPattern.test(email)) {
        toast.error(t("client.registrations.team.errors.emailInvalid"));
        return;
      }
      if (uniqueEmails.has(email)) {
        toast.error(t("client.registrations.team.errors.emailUnique"));
        return;
      }
      uniqueEmails.add(email);
    }

    const minTeamSize =
      registration.event?.minTeamSize && registration.event.minTeamSize > 0
        ? registration.event.minTeamSize
        : 2;
    const maxTeamSize =
      registration.event?.maxTeamSize && registration.event.maxTeamSize > 0
        ? registration.event.maxTeamSize
        : Math.max(minTeamSize, 20);
    const teamSizeAfter = 1 + cleaned.filter((draft) => !draft.remove).length;

    if (teamSizeAfter < minTeamSize) {
      toast.error(
        t("client.registrations.team.errors.minSize", {
          count: minTeamSize,
        })
      );
      return;
    }

    if (teamSizeAfter > maxTeamSize) {
      toast.error(
        t("client.registrations.team.errors.maxSize", {
          count: maxTeamSize,
        })
      );
      return;
    }

    const hasUpdates =
      additions.length > 0 ||
      removals.length > 0 ||
      updates.some((draft) => {
        const original = existingByEmail.get(normalizeEmail(draft.email));
        return (
          draft.name !== (original?.name || "") ||
          draft.jobTitle !== (original?.jobTitle || "")
        );
      });

    if (!hasUpdates) {
      toast.info(t("client.registrations.team.messages.noChanges"));
      return;
    }

    setSaving((prev) => ({ ...prev, [registration._id!]: true }));
    try {
      const payload = {
        registrationId: registration._id,
        teamMembers: [
          ...updates.map((draft) => ({
            email: draft.email,
            name: draft.name || undefined,
            jobTitle: draft.jobTitle || undefined,
          })),
          ...removals.map((draft) => ({
            email: draft.email,
            action: "remove" as const,
          })),
          ...additions.map((draft) => ({
            email: draft.email,
            name: draft.name || undefined,
            jobTitle: draft.jobTitle || undefined,
            action: "add" as const,
          })),
        ],
      };

      const response = await fetch("/api/events/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error || t("client.registrations.team.errors.updateFailed")
        );
      }

      const updatedRegistration: Registration =
        data?.registration || registration;

      setRegistrations((prev) =>
        prev.map((entry) =>
          entry._id === registration._id ? updatedRegistration : entry
        )
      );
      setTeamDrafts((prev) => ({
        ...prev,
        [registration._id!]: buildDrafts([updatedRegistration])[
          registration._id!
        ] || [],
      }));

      toast.success(data?.message || t("client.registrations.team.messages.updated"));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("client.registrations.team.errors.updateFailedGeneric")
      );
    } finally {
      setSaving((prev) => ({ ...prev, [registration._id!]: false }));
    }
  };

  const renderEmptyState = (tab: TabKey) => {
    if (tab === "upcoming") {
      return (
        <Card className="border-dashed border-shop_light_green/40 bg-white shadow-none">
          <CardContent className="py-8 text-center space-y-3">
            <CalendarClock className="h-8 w-8 mx-auto text-shop_dark_green" />
            <div className="space-y-1">
              <p className="font-semibold">
                {t("client.registrations.empty.upcoming.title")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("client.registrations.empty.upcoming.subtitle")}
              </p>
            </div>
            <Button asChild className="bg-shop_dark_green hover:bg-shop_light_green">
              <Link href="/news/events">
                {t("client.registrations.empty.upcoming.cta")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (tab === "past") {
      return (
        <Card className="border-dashed bg-white shadow-none">
          <CardContent className="py-6 text-center text-muted-foreground">
            {t("client.registrations.empty.past")}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-dashed bg-white shadow-none">
        <CardContent className="py-6 text-center text-muted-foreground">
          {t("client.registrations.empty.cancelled")}
        </CardContent>
      </Card>
    );
  };

  const renderTeamManager = (registration: Registration) => {
    if (!registration._id) return null;
    if (!registration.isTeamLead) return null;

    const drafts = teamDrafts[registration._id] || [];
    const visibleDrafts = drafts.filter((draft) => !draft.remove);

    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-emerald-900">
              {t("client.registrations.team.title")}
            </p>
            <p className="text-xs text-emerald-800">
              {t("client.registrations.team.subtitle")}
            </p>
          </div>
          <Badge className="bg-white text-emerald-800 hover:bg-white">
            <Users className="h-4 w-4 mr-1" />
            {t("client.registrations.team.count", {
              count: visibleDrafts.length,
            })}
          </Badge>
        </div>

        <div className="space-y-3">
          {visibleDrafts.map((draft) => (
            <div
              key={draft.id}
              className="grid gap-3 rounded-lg bg-white/80 p-3 shadow-sm md:grid-cols-[1fr_1fr_120px]"
            >
              <div className="space-y-1">
                <Label className="text-xs text-emerald-800">
                  {t("client.registrations.team.fields.name")}
                </Label>
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    updateTeamDraft(registration._id!, draft.id, "name", event.target.value)
                  }
                  placeholder={t("client.registrations.team.placeholders.name")}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-emerald-800">
                  {t("client.registrations.team.fields.email")}
                </Label>
                <Input
                  value={draft.email}
                  onChange={(event) =>
                    updateTeamDraft(registration._id!, draft.id, "email", event.target.value)
                  }
                  placeholder={t("client.registrations.team.placeholders.email")}
                  type="email"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-emerald-800">
                  {t("client.registrations.team.fields.jobTitle")}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={draft.jobTitle}
                    onChange={(event) =>
                      updateTeamDraft(
                        registration._id!,
                        draft.id,
                        "jobTitle",
                        event.target.value
                      )
                    }
                    placeholder={t("client.registrations.team.placeholders.jobTitle")}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => removeDraft(registration._id!, draft.id)}
                    aria-label={t("client.registrations.team.actions.remove")}
                  >
                    <UserRoundMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-800">
            <Users className="h-4 w-4" />
            <span>
              {t("client.registrations.team.sizeLimit", {
                min: registration.event?.minTeamSize || 2,
                max:
                  registration.event?.maxTeamSize ||
                  Math.max(registration.event?.minTeamSize || 2, 20),
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                addDraft(registration._id!, registration.event?.maxTeamSize)
              }
              className="border-emerald-200 text-emerald-900 hover:bg-emerald-50"
            >
              <UserRoundPlus className="h-4 w-4 mr-2" />
              {t("client.registrations.team.actions.addMember")}
            </Button>
            <Button
              type="button"
              onClick={() => handleSaveTeam(registration)}
              disabled={saving[registration._id!] === true}
              className="bg-shop_dark_green text-white hover:bg-shop_light_green"
            >
              {saving[registration._id!] ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("client.registrations.team.actions.saving")}
                </>
              ) : (
                t("client.registrations.team.actions.save")
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderCard = (registration: Registration) => {
    const status = resolveStatus(registration);
    const registrationId =
      registration._id || registration.eventSlug || registration.event?.slug || "registration";
    const expandedState = expanded[registrationId];
    const canCancel =
      status.value !== "cancelled" &&
      status.value !== "archived" &&
      cancelling[registration._id || registrationId] !== true;
    const cardRegistration: RegistrationCardProps["registration"] = {
      id: registrationId,
      status: status.value,
      registrationType: registration.registrationType,
      createdAt: registration.submittedAt,
      event: {
        title: registration.event?.title,
        date: registration.event?.date,
        location: registration.event?.location,
        slug: registration.event?.slug || registration.eventSlug || undefined,
        image: registration.event?.image || null,
      },
      teamMembers: registration.teamMembers,
      teamId: registration.teamId || undefined,
    };
    const visibleTeamMembers =
      (teamDrafts[registration._id || registrationId] || []).filter(
        (draft) => !draft.remove
      ).length || registration.teamMembers?.length || 0;

    return (
      <div key={registrationId} className="space-y-3">
        <RegistrationCard
          registration={cardRegistration}
          onCancel={canCancel ? () => openCancellationDialog(registration) : undefined}
          onViewTeam={
            registration.isTeamLead && registration.teamId
              ? () =>
                  setExpanded((prev) => ({
                    ...prev,
                    [registrationId]: true,
                  }))
              : undefined
          }
        />
        {registration.isTeamLead ? (
          <Card className="border border-emerald-100 bg-white shadow-none">
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t("client.registrations.team.detailsTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("client.registrations.team.detailsSubtitle")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-800">
                    <Users className="h-4 w-4 mr-1" />
                    {t("client.registrations.team.membersCount", {
                      count: visibleTeamMembers,
                    })}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [registrationId]: !expandedState,
                      }))
                    }
                  >
                    {expandedState
                      ? t("client.registrations.team.actions.hide")
                      : t("client.registrations.team.actions.manage")}
                  </Button>
                </div>
              </div>
              {expandedState ? renderTeamManager(registration) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)}>
          <TabsList className="bg-white shadow-sm border border-slate-100">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                {tab.label}
                <Badge variant="secondary" className="text-xs bg-slate-100">
                  {counts[tab.value]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="space-y-3">
              {(() => {
                const registrationsForTab = registrations.filter(
                  (registration) => getTabForRegistration(registration) === tab.value
                );
                if (registrationsForTab.length === 0) {
                  return renderEmptyState(tab.value);
                }
                return registrationsForTab.map((registration) => renderCard(registration));
              })()}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <CancellationDialog
        open={cancellationDialogOpen}
        onOpenChange={handleCancellationDialogChange}
        registration={{
          id:
            cancellationTarget?._id ||
            cancellationTarget?.eventSlug ||
            "registration",
          eventTitle:
            cancellationTarget?.event?.title ||
            cancellationTarget?.eventSlug ||
            undefined,
          registrationType: cancellationTarget?.registrationType,
          teamMembers: cancellationTarget?.teamMembers,
        }}
        onConfirm={handleConfirmCancellation}
      />
    </>
  );
};

export default RegistrationsDashboardClient;
