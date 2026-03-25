"use client";

import EventForm from "@/components/admin/backoffice/events/EventForm";
import { saveEvent } from "@/app/(admin)/admin/content/events/actions";

type EventNewClientProps = {
  canPublish?: boolean;
};

const EventNewClient = ({ canPublish }: EventNewClientProps) => {
  return (
    <EventForm
      onSubmit={saveEvent}
      basePath="/employee/content/events"
      canPublish={canPublish}
      initialValues={{ publishStatus: "draft" }}
    />
  );
};

export default EventNewClient;
