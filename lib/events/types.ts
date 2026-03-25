export type EventAgendaItemInput = {
  _key?: string;
  time?: string;
  title?: string;
  description?: string;
  speaker?: string;
};

export type EventPublishStatus = "draft" | "review" | "published" | "archived";

export type EventSpeakerInput = {
  _key?: string;
  name?: string;
  title?: string;
  company?: string;
  bio?: string;
  image?: {
    _type?: "image";
    asset?: { _ref?: string };
    alt?: string;
  };
};

export type EventResourceInput = {
  _key?: string;
  fileType?: string;
  title?: string;
  description?: string;
  linkUrl?: string;
  offlineInstructions?: string;
  file?: { _type?: "file"; asset?: { _ref?: string } };
  requiresRegistration?: boolean;
  availableFrom?: string;
  availableTo?: string;
  status?: string;
  url?: string;
};
