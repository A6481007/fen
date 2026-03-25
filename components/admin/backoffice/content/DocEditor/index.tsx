"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Extension } from "@tiptap/core";
import { generateHTML, generateJSON } from "@tiptap/html";
import { sanitizeFromPortableText } from "@/lib/tiptap/sanitizeFromPortableText";
import type { PortableTextBlock } from "@/types/portableText";
import { docEditorExtensions } from "./extensions";
import { portableTextToTiptap, tiptapToPortableText } from "./portableText";
import { urlFor } from "@/sanity/lib/image";
import WysiwygEditor from "@/components/WysiwygEditor";
import { getReadingTime } from "@/lib/utils/readingTime";

type ConfigurableExtension = Extension & { configure?: (options: Record<string, unknown>) => Extension };

const getTextStats = (html: string) => {
  const text = html.replace(/<[^>]*>/g, "").trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;
  return { words, chars };
};

const getWordCountHintColor = (wordCount: number) => {
  if (wordCount < 400) return "text-slate-400 opacity-60";
  if (wordCount < 600) return "text-amber-500";
  if (wordCount <= 1200) return "text-emerald-600";
  if (wordCount <= 1400) return "text-orange-500";
  return "text-red-500";
};

const WordCountHint = ({ wordCount }: { wordCount: number }) => {
  const colorClass = getWordCountHintColor(wordCount);

  return (
    <span className={`text-[11px] leading-4 transition-colors duration-200 ${colorClass}`}>
      Recommended: 600-1200 words for SEO
    </span>
  );
};

export type DocEditorProps = {
  value: PortableTextBlock[];
  onChange: (blocks: PortableTextBlock[]) => void;
  error?: string;
  placeholder?: string;
  minHeight?: number;
  locale?: string;
};

export function DocEditor({
  value,
  onChange,
  error,
  placeholder,
  minHeight = 320,
  locale,
}: DocEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBlocksRef = useRef<string | null>(null);
  const lastLocaleRef = useRef<string | null>(locale ?? null);
  const isMounted = useRef(false);
  const [editorReady, setEditorReady] = useState(false);

  const debouncedOnChange = useCallback(
    (blocks: PortableTextBlock[]) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => onChange(blocks), 150);
    },
    [onChange],
  );

  useEffect(
    () => () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    },
    [],
  );

  useEffect(() => {
    isMounted.current = true; // guard against setState on an unmounted editor
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setEditorReady(true);
  }, []);

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

  const initialHtmlValue = useMemo(() => blocksToHtml(value ?? []), [blocksToHtml, value]);

  const [htmlValue, setHtmlValue] = useState<string>(() => {
    lastBlocksRef.current = JSON.stringify(value ?? []);
    lastLocaleRef.current = locale ?? null;
    return initialHtmlValue;
  });

  const textStats = useMemo(() => getTextStats(htmlValue), [htmlValue]);

  useEffect(() => {
    if (!editorReady) return;
    const serialized = JSON.stringify(value ?? []);
    const localeChanged = (locale ?? null) !== lastLocaleRef.current;
    if (!localeChanged && serialized === lastBlocksRef.current) return;
    lastBlocksRef.current = serialized;
    lastLocaleRef.current = locale ?? null;
    const nextHtml = blocksToHtml(value ?? []);
    setHtmlValue(nextHtml);
  }, [blocksToHtml, editorReady, locale, value]);

  const handleHtmlChange = useCallback(
    (nextHtml: string) => {
      if (!isMounted.current) return;
      setHtmlValue(nextHtml);
      const blocks = htmlToBlocks(nextHtml);
      lastBlocksRef.current = JSON.stringify(blocks);
      debouncedOnChange(blocks);
    },
    [debouncedOnChange, htmlToBlocks],
  );

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
      <div className="flex-1">
        <div style={{ ["--wysiwyg-min-height" as const]: `${minHeight}px` }}>
          {editorReady ? (
            <WysiwygEditor value={htmlValue} onChange={handleHtmlChange} />
          ) : (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 animate-pulse"
              style={{ minHeight: `var(--wysiwyg-min-height, ${minHeight}px)`, padding: "12px" }}
            />
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-400 flex justify-end gap-4">
        <div className="flex flex-col items-end gap-0.5">
          <span>
            {textStats.words} words · {getReadingTime(textStats.words)}
          </span>
          <WordCountHint wordCount={textStats.words} />
        </div>
        <span>{textStats.chars} characters</span>
      </div>

      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default DocEditor;
