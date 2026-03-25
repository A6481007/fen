"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Extension } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/html";
import { useTranslation } from "react-i18next";
import type { PortableTextBlock } from "@/types/portableText";
import { docEditorExtensions } from "./content/DocEditor/extensions";
import { portableTextToTiptap, tiptapToPortableText } from "./content/DocEditor/portableText";
import { urlFor } from "@/sanity/lib/image";
import WysiwygEditor from "@/components/WysiwygEditor";
import { sanitizeFromPortableText } from "@/lib/tiptap/sanitizeFromPortableText";

type PortableTextEditorProps = {
  label?: string;
  description?: string;
  value?: PortableTextBlock[] | null;
  onChange?: (value: PortableTextBlock[]) => void;
  minRows?: number;
  placeholder?: string;
};

type ConfigurableExtension = Extension & { configure?: (options: Record<string, unknown>) => Extension };

export function PortableTextEditor({
  label,
  description,
  value,
  onChange,
  minRows = 8,
  placeholder,
}: PortableTextEditorProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("admin.portableText.label");
  const resolvedDescription = description ?? t("admin.portableText.description");
  const minHeight = Math.max(minRows, 3) * 24;

  const resolveImageUrl = useCallback((ref: string, width = 1200) => urlFor({ _ref: ref }).width(width).url(), []);

  const extensions = useMemo<Extension[]>(
    () =>
      (docEditorExtensions as Extension[]).map((ext) => {
        if (ext.name === "placeholder" && placeholder && typeof (ext as ConfigurableExtension).configure === "function") {
          return (ext as ConfigurableExtension).configure!({ placeholder });
        }
        return ext;
      }),
    [placeholder],
  );

  const blocksToHtml = useCallback(
    (blocks: PortableTextBlock[] = []) => {
      const normalized = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
      const json = portableTextToTiptap(normalized, resolveImageUrl);
      const sanitized = sanitizeFromPortableText(json, extensions);
      return generateHTML(sanitized, extensions);
    },
    [extensions, resolveImageUrl],
  );

  const htmlToBlocks = useCallback(
    (html: string) => {
      const json = generateJSON(html && html.trim().length > 0 ? html : "<p></p>", extensions);
      return tiptapToPortableText(json);
    },
    [extensions],
  );

  const [htmlValue, setHtmlValue] = useState<string>(() => blocksToHtml(value ?? []));

  useEffect(() => {
    setHtmlValue(blocksToHtml(value ?? []));
  }, [blocksToHtml, value]);

  const handleChange = (html: string) => {
    setHtmlValue(html);
    onChange?.(htmlToBlocks(html));
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-sm font-medium text-slate-700">{resolvedLabel}</p>
        {resolvedDescription ? <p className="text-xs text-slate-500">{resolvedDescription}</p> : null}
      </div>
      <div style={{ ["--wysiwyg-min-height" as const]: `${minHeight}px` }}>
        <WysiwygEditor value={htmlValue} onChange={handleChange} />
      </div>
    </div>
  );
}
