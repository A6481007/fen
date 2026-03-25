"use client";

import RegistrationsDashboardClient from "@/components/events/RegistrationsDashboardClient";
import RegistrationsHeaderClient from "@/components/events/RegistrationsHeaderClient";

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

type RegistrationsPageClientProps = {
  registrations: Registration[];
};

const RegistrationsPageClient = ({
  registrations,
}: RegistrationsPageClientProps) => {
  return (
    <div className="space-y-6">
      <RegistrationsHeaderClient />
      <RegistrationsDashboardClient registrations={registrations || []} />
    </div>
  );
};

export default RegistrationsPageClient;
