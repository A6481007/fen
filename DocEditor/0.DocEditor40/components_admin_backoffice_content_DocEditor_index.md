"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { PortableTextBlock } from "@/types/portableText";
import { docEditorExtensions } from "./extensions";
import { portableTextToTiptap, tiptapToPortableText } from "./portableText";
import { Toolbar } from "./Toolbar";
import { BubbleBar } from "./BubbleBar";
import SlashMenu from "./SlashMenu";
import { ImageInsertModal } from "./ImageInsertModal";
import { urlFor } from "@/sanity/lib/image";
import { Textarea } from "@/components/ui/textarea";

export type DocEditorProps = {
  value: PortableTextBlock[];
  onChange: (blocks: PortableTextBlock[]) => void;
  error?: string;
  placeholder?: string;
  minHeight?: number;
};

export function DocEditor({
  value,
  onChange,
  error,
  placeholder,
  minHeight = 320,
}: DocEditorProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false); // reserved for future inline link popover
  const lastDocJsonRef = useRef<string | null>(null);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const resolveImageUrl = useCallback((ref: string, width = 1200) => urlFor({ _ref: ref }).width(width).url(), []);

  const buildSourceText = useCallback(() => {
    if (editor) {
      return JSON.stringify(tiptapToPortableText(editor.getJSON()), null, 2);
    }
    return JSON.stringify(value ?? [], null, 2);
  }, [editor, value]);

  const extensions = useMemo(
    () =>
      docEditorExtensions.map((ext: any) => {
        if (ext?.name === "placeholder" && placeholder) {
          return ext.configure ? ext.configure({ placeholder }) : ext;
        }
        if (ext?.name === "slash-command") {
          return ext.configure ? ext.configure({ onImage: () => setImageModalOpen(true) }) : ext;
        }
        return ext;
      }),
    [placeholder],
  );

  const editor = useEditor({
    extensions,
    content: portableTextToTiptap(value, resolveImageUrl),
    // Avoid server-side rendering the editor DOM to prevent hydration mismatches in Next.js.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: [
          "prose prose-slate max-w-none",
          "focus:outline-none",
          "min-h-[320px] px-6 py-5",
          "text-slate-900 text-[15px] leading-relaxed",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2",
          "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2",
          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1",
          "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1",
          "[&_ul]:list-disc [&_ul]:pl-6",
          "[&_ol]:list-decimal [&_ol]:pl-6",
          "[&_li]:my-0.5",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300",
          "[&_blockquote]:pl-4 [&_blockquote]:text-slate-600 [&_blockquote]:italic",
          "[&_code]:bg-slate-100 [&_code]:rounded [&_code]:px-1 [&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto",
          "[&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-4",
          "[&_.is-editor-empty:before]:text-slate-300 [&_.is-editor-empty:before]:content-[attr(data-placeholder)] [&_.is-editor-empty:before]:float-left [&_.is-editor-empty:before]:pointer-events-none",
          "[&_a]:text-indigo-600 [&_a]:underline [&_a]:cursor-pointer",
        ].join(" "),
      },
    },
    onUpdate: ({ editor }) => {
      const nextJson = editor.getJSON();
      const serialized = JSON.stringify(nextJson);
      if (serialized === lastDocJsonRef.current) return;
      lastDocJsonRef.current = serialized;
      debouncedOnChange(tiptapToPortableText(nextJson));
    },
    onCreate: ({ editor }) => {
      lastDocJsonRef.current = JSON.stringify(editor.getJSON());
    },
  });

  // Sync external value (e.g., form reset)
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(portableTextToTiptap(value, resolveImageUrl));
    if (current !== next) {
      editor.commands.setContent(portableTextToTiptap(value, resolveImageUrl));
      lastDocJsonRef.current = next;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, resolveImageUrl]);

  const enterSourceMode = useCallback(() => {
    setSourceText(buildSourceText());
    setSourceError(null);
    setIsSourceMode(true);
  }, [buildSourceText]);

  const exitSourceMode = useCallback(() => {
    if (!editor) return;
    try {
      const parsed = sourceText.trim() ? JSON.parse(sourceText) : [];
      if (!Array.isArray(parsed)) {
        throw new Error("Source must be a JSON array of Portable Text blocks.");
      }
      const blocks = parsed as PortableTextBlock[];
      editor.commands.setContent(portableTextToTiptap(blocks, resolveImageUrl));
      setIsSourceMode(false);
      setSourceError(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Invalid JSON. Ensure the source is an array of Portable Text blocks.";
      setSourceError(message);
    }
  }, [editor, resolveImageUrl, sourceText]);

  const toggleSourceMode = useCallback(() => {
    if (isSourceMode) {
      exitSourceMode();
      return;
    }
    enterSourceMode();
  }, [enterSourceMode, exitSourceMode, isSourceMode]);

  const handleInsertImage = (src: string, alt: string, caption: string, assetId?: string | null) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src, alt, title: caption, assetId: assetId ?? undefined } as any).run();
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <Toolbar
        editor={editor}
        onInsertImage={() => setImageModalOpen(true)}
        isSourceMode={isSourceMode}
        onToggleSourceMode={toggleSourceMode}
      />
      {!isSourceMode ? <BubbleBar editor={editor} /> : null}
      {!isSourceMode ? <SlashMenu editor={editor} onInsertImage={() => setImageModalOpen(true)} /> : null}

      <div className="flex-1">
        <div className={isSourceMode ? "hidden" : undefined}>
          <EditorContent editor={editor} style={{ minHeight }} />
        </div>
        {isSourceMode ? (
          <div className="flex flex-col gap-2 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Source view (Portable Text JSON)</span>
              <button
                type="button"
                className="text-indigo-600 hover:text-indigo-700"
                onClick={() => setSourceText(buildSourceText())}
              >
                Reset to current content
              </button>
            </div>
            <Textarea
              spellCheck={false}
              value={sourceText}
              onChange={(e) => {
                setSourceText(e.target.value);
                setSourceError(null);
              }}
              className="font-mono text-xs leading-5"
              style={{ minHeight }}
            />
            {sourceError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {sourceError}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                Edit the JSON safely here. Click &lt;/&gt; again to return to the editor and apply changes.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-1.5 text-xs text-slate-400 flex justify-end gap-4">
        <span>{editor?.storage.characterCount?.words() ?? 0} words</span>
        <span>{editor?.storage.characterCount?.characters() ?? 0} characters</span>
      </div>

      {error ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <ImageInsertModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={(src, alt, caption, assetId) => {
          handleInsertImage(src, alt, caption, assetId);
          setImageModalOpen(false);
        }}
      />
    </div>
  );
}

export default DocEditor;
