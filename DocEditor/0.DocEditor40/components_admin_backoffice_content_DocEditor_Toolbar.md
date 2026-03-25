"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ToolbarProps = {
  editor: Editor | null;
  onInsertImage: () => void;
  isSourceMode: boolean;
  onToggleSourceMode: () => void;
};

const BTN_BASE = "rounded p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors";
const BTN_ACTIVE = "bg-slate-900 text-white hover:bg-slate-900 hover:text-white";

const blockOptions = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "h4", label: "Heading 4" },
  { value: "blockquote", label: "Quote" },
  { value: "code", label: "Code block" },
];

export function Toolbar({ editor, onInsertImage, isSourceMode, onToggleSourceMode }: ToolbarProps) {
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [insertOpen, setInsertOpen] = useState(false);
  const linkRef = useRef<HTMLDivElement | null>(null);

  const disabled = !editor || isSourceMode;

  const refreshBlock = () => {
    if (!editor) return;
    if (editor.isActive("heading", { level: 1 })) return setBlockType("h1");
    if (editor.isActive("heading", { level: 2 })) return setBlockType("h2");
    if (editor.isActive("heading", { level: 3 })) return setBlockType("h3");
    if (editor.isActive("heading", { level: 4 })) return setBlockType("h4");
    if (editor.isActive("blockquote")) return setBlockType("blockquote");
    if (editor.isActive("codeBlock")) return setBlockType("code");
    setBlockType("paragraph");
  };

  useEffect(() => {
    if (!editor) return;
    refreshBlock();
    const update = () => refreshBlock();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    if (!linkOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (linkRef.current && !linkRef.current.contains(e.target as Node)) {
        setLinkOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLinkOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [linkOpen]);

  useEffect(() => {
    if (!isSourceMode) return;
    setLinkOpen(false);
    setInsertOpen(false);
  }, [isSourceMode]);

  const applyBlock = (value: string) => {
    if (!editor || isSourceMode) return;
    switch (value) {
      case "h1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "h2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "h3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "h4":
        editor.chain().focus().toggleHeading({ level: 4 }).run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "code":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      default:
        editor.chain().focus().setParagraph().run();
        break;
    }
    refreshBlock();
  };

  const toggleLink = () => {
    if (!editor || isSourceMode) return;
    const href = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(href ?? "https://");
    setLinkOpen((o) => !o);
  };

  const applyLink = () => {
    if (!editor || isSourceMode) return;
    if (!linkUrl) return;
    editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkOpen(false);
  };

  const removeLink = () => {
    if (!editor || isSourceMode) return;
    editor.chain().focus().unsetLink().run();
    setLinkOpen(false);
  };

  const handleInsertImage = () => {
    if (disabled) return;
    onInsertImage();
    setInsertOpen(false);
  };

  const insertCallout = () => {
    if (!editor || isSourceMode) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "blockquote",
        content: [{ type: "paragraph", content: [{ type: "text", text: "💬 " }] }],
      })
      .run();
    setInsertOpen(false);
  };

  const insertDivider = () => {
    if (isSourceMode) return;
    editor?.chain().focus().setHorizontalRule().run();
    setInsertOpen(false);
  };

  const can = (fn: () => boolean) => (!editor || isSourceMode ? false : fn());

  const toggleInsert = () => {
    if (disabled) return;
    // Keep the editor focused so we don't lose the selection/caret when opening the menu
    editor?.chain().focus().run();
    setInsertOpen((o) => !o);
  };

  const Button = ({
    label,
    onClick,
    active,
    disabled: dis,
  }: { label: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) => (
    <button
      type="button"
      className={`${BTN_BASE} ${active ? BTN_ACTIVE : ""}`}
      onClick={onClick}
      disabled={dis}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-white px-2 py-1.5 sticky top-0 z-10">
      {/* Block style */}
      <Select value={blockType} onValueChange={applyBlock} disabled={disabled}>
        <SelectTrigger className="h-9 w-44 border border-slate-200 bg-white px-2 text-sm text-slate-700">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="bottom" align="start" className="w-44">
          {blockOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator />

      {/* Inline marks */}
      <Button
        label={<strong>B</strong>}
        active={editor?.isActive("bold")}
        disabled={!can(() => editor!.can().chain().focus().toggleBold().run())}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <Button
        label={<em>I</em>}
        active={editor?.isActive("italic")}
        disabled={!can(() => editor!.can().chain().focus().toggleItalic().run())}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <Button
        label={<span className="underline">U</span>}
        active={editor?.isActive("underline")}
        disabled={!can(() => editor!.can().chain().focus().toggleUnderline().run())}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <Button
        label={<span className="line-through">S</span>}
        active={editor?.isActive("strike")}
        disabled={!can(() => editor!.can().chain().focus().toggleStrike().run())}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <Button
        label={<code className="text-xs">&lt;/&gt;</code>}
        active={isSourceMode}
        disabled={!editor}
        onClick={onToggleSourceMode}
      />
      <Button
        label="🔗"
        active={editor?.isActive("link")}
        disabled={disabled}
        onClick={toggleLink}
      />

      <Separator />

      {/* Lists & quote */}
      <Button
        label="• List"
        active={editor?.isActive("bulletList")}
        disabled={!can(() => editor!.can().chain().focus().toggleBulletList().run())}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      />
      <Button
        label="1. List"
        active={editor?.isActive("orderedList")}
        disabled={!can(() => editor!.can().chain().focus().toggleOrderedList().run())}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      />
      <Button
        label="❝"
        active={editor?.isActive("blockquote")}
        disabled={!can(() => editor!.can().chain().focus().toggleBlockquote().run())}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      />

      <Separator />

      {/* Insert dropdown */}
      <div className="relative">
        <button
          type="button"
          className={`${BTN_BASE} ${insertOpen ? "bg-slate-100" : ""}`}
          onMouseDown={(e) => {
            e.preventDefault();
            toggleInsert();
          }}
          onClick={(e) => {
            // Keyboard activation still lands on onClick with detail 0.
            if (e.detail === 0) toggleInsert();
          }}
          disabled={disabled}
        >
          Insert +
        </button>
        {insertOpen && (
          <div
            className="absolute left-0 mt-1 w-44 rounded-md border border-slate-200 bg-white shadow"
            onMouseDown={(e) => e.preventDefault()}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={handleInsertImage}
            >
              🖼️ Image
            </button>
            <div className="h-px bg-slate-200" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={insertCallout}
            >
              💬 Callout
            </button>
            <div className="h-px bg-slate-200" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={insertDivider}
            >
              — Divider
            </button>
          </div>
        )}
      </div>

      <Separator />

      {/* History */}
      <Button
        label="↺"
        disabled={!can(() => editor!.can().chain().focus().undo().run())}
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <Button
        label="↻"
        disabled={!can(() => editor!.can().chain().focus().redo().run())}
        onClick={() => editor?.chain().focus().redo().run()}
      />

      {/* Link popover */}
      {linkOpen && (
        <div
          ref={linkRef}
          className="absolute left-2 top-12 z-20 flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 shadow"
        >
          <input
            className="w-56 rounded border border-slate-200 px-2 py-1 text-sm"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
          />
          <button
            type="button"
            className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
            onClick={applyLink}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700"
            onClick={removeLink}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

const Separator = () => <div className="mx-1 h-5 w-px bg-slate-200" />;

export default Toolbar;
