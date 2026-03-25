"use client";

import { useCallback } from "react";
import { ContentCreationPanel } from "@/components/admin/backoffice/ContentCreationPanel";
import type {
  NewsAttachment,
  NewsFormState,
  NewsReferenceOption,
} from "@/components/admin/backoffice/news/types";
import {
  addNewsAttachmentAction,
  removeNewsAttachmentAction,
  saveNews,
  searchNewsEvents,
} from "../actions";

type NewsEditClientProps = {
  initialValues: Partial<NewsFormState>;
  initialLinkedEvent: NewsReferenceOption | null;
  initialAttachments: NewsAttachment[];
  newsId: string;
};

const NewsEditClient = ({
  initialValues,
  initialLinkedEvent,
  initialAttachments,
  newsId,
}: NewsEditClientProps) => {
  const handleAddAttachment = useCallback(
    (payload: Parameters<typeof addNewsAttachmentAction>[1]) => addNewsAttachmentAction(newsId, payload),
    [newsId],
  );

  const handleRemoveAttachment = useCallback(
    (attachmentKey: string) => removeNewsAttachmentAction(newsId, attachmentKey),
    [newsId],
  );

  return (
    <ContentCreationPanel
      mode="news"
      initialValues={initialValues}
      initialLinkedEvent={initialLinkedEvent}
      initialAttachments={initialAttachments}
      onSubmit={saveNews}
      searchEvents={searchNewsEvents}
      onAddAttachment={handleAddAttachment}
      onRemoveAttachment={handleRemoveAttachment}
      basePath="/admin/content/news"
      newsId={newsId}
    />
  );
};

export default NewsEditClient;
