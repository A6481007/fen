"use client";

import NewsForm from "./NewsForm.legacy";
import type { NewsAttachment, NewsFormState, NewsReferenceOption } from "./types";
import {
  addNewsAttachmentAction,
  removeNewsAttachmentAction,
  saveNews,
  searchNewsEvents,
} from "@/app/(admin)/admin/content/news/actions";
import { useCallback } from "react";

type NewsFormContainerProps = {
  initialValues?: Partial<NewsFormState>;
  initialLinkedEvent?: NewsReferenceOption | null;
  initialAttachments?: NewsAttachment[];
  newsId?: string;
  basePath?: string;
};

const NewsFormContainer = ({
  initialValues,
  initialLinkedEvent,
  initialAttachments,
  newsId,
  basePath,
}: NewsFormContainerProps) => {
  const handleAddAttachment = newsId
    ? useCallback(
        (payload: Parameters<typeof addNewsAttachmentAction>[1]) =>
          addNewsAttachmentAction(newsId, payload),
        [newsId],
      )
    : undefined;

  const handleRemoveAttachment = newsId
    ? useCallback(
        (attachmentKey: Parameters<typeof removeNewsAttachmentAction>[1]) =>
          removeNewsAttachmentAction(newsId, attachmentKey),
        [newsId],
      )
    : undefined;

  return (
    <NewsForm
      initialValues={initialValues}
      initialLinkedEvent={initialLinkedEvent}
      initialAttachments={initialAttachments}
      basePath={basePath}
      onSubmit={saveNews}
      searchEvents={searchNewsEvents}
      onAddAttachment={handleAddAttachment}
      onRemoveAttachment={handleRemoveAttachment}
    />
  );
};

export default NewsFormContainer;
