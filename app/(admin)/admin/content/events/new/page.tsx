import { Metadata } from "next";
import { getMetadataForLocale } from "@/lib/metadataLocale";
import EventForm from "@/components/admin/backoffice/events/EventForm";
import { saveEvent } from "../actions";

const METADATA_BY_LOCALE = {
  en: {
    title: "New event",
    description: "Create a new event and open RSVPs.",
  },
  th: {
    title: "สร้างอีเวนต์ใหม่",
    description: "สร้างอีเวนต์ใหม่และเปิดรับ RSVP",
  },
} satisfies Record<string, Metadata>;

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataForLocale(METADATA_BY_LOCALE);
}

const NewEventPage = () => {
  return (
    <div className="p-6">
      <EventForm
        onSubmit={saveEvent}
        initialValues={{
          registrationOpen: true,
          teamRegistrationEnabled: true,
          currency: "THB",
          status: "upcoming",
        }}
      />
    </div>
  );
};

export default NewEventPage;
