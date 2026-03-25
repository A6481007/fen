"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  { value: "h1", label: "Heading 1", shortcut: "Cmd+Alt+1" },
  { value: "h2", label: "Heading 2", shortcut: "Cmd+Alt+2" },
  { value: "h3", label: "Heading 3", shortcut: "Cmd+Alt+3" },
  { value: "h4", label: "Heading 4", shortcut: "Cmd+Alt+4" },
  { value: "blockquote", label: "Quote", shortcut: "Cmd+Shift+B" },
  { value: "code", label: "Code block", shortcut: "Cmd+Alt+C" },
];

export function Toolbar({ editor, onInsertImage, isSourceMode, onToggleSourceMode }: ToolbarProps) {
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [insertOpen, setInsertOpen] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const linkInputRef = useRef<HTMLInputElement | null>(null);

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
    if (!editor) {
      setHistoryState({ canUndo: false, canRedo: false });
      return;
    }
    const computeHistory = () => ({
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    });
    const update = () => {
      refreshBlock();
      setHistoryState((prev) => {
        const next = computeHistory();
        return prev.canUndo === next.canUndo && prev.canRedo === next.canRedo ? prev : next;
      });
    };
    update();
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);
    editor.on("blur", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
      editor.off("blur", update);
    };
  }, [editor]);

  useEffect(() => {
    if (!isSourceMode) return;
    setLinkOpen(false);
    setInsertOpen(false);
  }, [isSourceMode]);

  useEffect(() => {
    if (!linkOpen) return;
    // Prefill with existing link on the current selection/caret.
    const href = editor?.getAttributes("link").href as string | undefined;
    setLinkUrl(href ?? "https://");
    // Slight delay to allow the popover to render before focusing.
    requestAnimationFrame(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    });
  }, [editor, linkOpen]);

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

  const handleLinkOpenChange = (next: boolean) => {
    if (disabled) return;
    if (next) {
      // Keep the selection in place so applying the link wraps the current text.
      editor?.chain().focus().run();
    }
    setLinkOpen(next);
  };

  const applyLink = () => {
    if (!editor || isSourceMode) return;
    const href = linkUrl.trim();
    if (!href) return;
    editor.chain().focus().setLink({ href }).run();
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
    title,
    ariaLabel,
  }: {
    label: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    title: string;
    ariaLabel?: string;
  }) => (
    <button
      type="button"
      className={`${BTN_BASE} ${active ? BTN_ACTIVE : ""}`}
      onClick={onClick}
      disabled={dis}
      title={title}
      aria-label={ariaLabel ?? title}
    >
      {label}
    </button>
  );

  const HistoryButton = ({
    label,
    title,
    onClick,
    disabled: dis,
  }: { label: React.ReactNode; title: string; onClick: () => void; disabled: boolean }) => (
    <span className="inline-flex" title={title}>
      <button
        type="button"
        className={`${BTN_BASE} ${dis ? "cursor-not-allowed opacity-50" : ""}`}
        onClick={(e) => {
          if (dis) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          onClick();
        }}
        aria-label={title}
        aria-disabled={dis}
        title={title}
      >
        {label}
      </button>
    </span>
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
            <SelectItem
              key={opt.value}
              value={opt.value}
              title={opt.shortcut ? `${opt.label} (${opt.shortcut})` : opt.label}
            >
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
        title="Bold (Cmd+B)"
        ariaLabel="Bold (Cmd+B)"
      />
      <Button
        label={<em>I</em>}
        active={editor?.isActive("italic")}
        disabled={!can(() => editor!.can().chain().focus().toggleItalic().run())}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        title="Italic (Cmd+I)"
        ariaLabel="Italic (Cmd+I)"
      />
      <Button
        label={<span className="underline">U</span>}
        active={editor?.isActive("underline")}
        disabled={!can(() => editor!.can().chain().focus().toggleUnderline().run())}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        title="Underline (Cmd+U)"
        ariaLabel="Underline (Cmd+U)"
      />
      <Button
        label={<span className="line-through">S</span>}
        active={editor?.isActive("strike")}
        disabled={!can(() => editor!.can().chain().focus().toggleStrike().run())}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        title="Strikethrough (Cmd+Shift+X)"
        ariaLabel="Strikethrough (Cmd+Shift+X)"
      />
      <Button
        label={<code className="text-xs">&lt;/&gt;</code>}
        active={isSourceMode}
        disabled={!editor}
        onClick={onToggleSourceMode}
        title="Code (Cmd+E)"
        ariaLabel="Code (Cmd+E)"
      />
      <Popover open={linkOpen} onOpenChange={handleLinkOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`${BTN_BASE} ${editor?.isActive("link") ? BTN_ACTIVE : ""}`}
            disabled={disabled}
            onClick={() => {
              if (!editor || isSourceMode) return;
              const href = editor.getAttributes("link").href as string | undefined;
              setLinkUrl(href ?? "https://");
            }}
            title="Link (Cmd+K)"
            aria-label="Link (Cmd+K)"
          >
            🔗
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-80 border border-slate-200 bg-white p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <input
              ref={linkInputRef}
              className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setLinkOpen(false);
                }
              }}
            />
            <button
              type="button"
              className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
              onClick={applyLink}
              disabled={!linkUrl.trim()}
              title="Apply link"
              aria-label="Apply link"
            >
              Apply
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
              onClick={removeLink}
              title="Remove link"
              aria-label="Remove link"
            >
              Remove
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Separator />

      {/* Lists & quote */}
      <Button
        label="• List"
        active={editor?.isActive("bulletList")}
        disabled={!can(() => editor!.can().chain().focus().toggleBulletList().run())}
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
        title="Bullet List (Cmd+Shift+8)"
        ariaLabel="Bullet List (Cmd+Shift+8)"
      />
      <Button
        label="1. List"
        active={editor?.isActive("orderedList")}
        disabled={!can(() => editor!.can().chain().focus().toggleOrderedList().run())}
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        title="Ordered List (Cmd+Shift+7)"
        ariaLabel="Ordered List (Cmd+Shift+7)"
      />
      <Button
        label="❝"
        active={editor?.isActive("blockquote")}
        disabled={!can(() => editor!.can().chain().focus().toggleBlockquote().run())}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        title="Blockquote (Cmd+Shift+B)"
        ariaLabel="Blockquote (Cmd+Shift+B)"
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
          title="Insert menu"
          aria-label="Insert menu"
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
              title="Insert image"
              aria-label="Insert image"
            >
              🖼️ Image
            </button>
            <div className="h-px bg-slate-200" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={insertCallout}
              title="Insert callout"
              aria-label="Insert callout"
            >
              💬 Callout
            </button>
            <div className="h-px bg-slate-200" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={insertDivider}
              title="Insert divider"
              aria-label="Insert divider"
            >
              — Divider
            </button>
          </div>
        )}
      </div>

      <Separator />

      {/* History */}
      <HistoryButton
        label="↺"
        title="Undo last action (Cmd+Z)"
        disabled={!editor || !historyState.canUndo}
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <HistoryButton
        label="↻"
        title="Redo last action (Cmd+Shift+Z)"
        disabled={!editor || !historyState.canRedo}
        onClick={() => editor?.chain().focus().redo().run()}
      />
    </div>
  );
}

const Separator = () => <div className="mx-1 h-5 w-px bg-slate-200" />;

export default Toolbar;
