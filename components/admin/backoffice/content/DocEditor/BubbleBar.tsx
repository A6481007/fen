"use client";

import React from "react";
import { type Editor } from "@tiptap/core";
import { BubbleMenu, type BubbleMenuProps } from "@tiptap/react/menus";
import { TextSelection } from "prosemirror-state";
import {
  Bold,
  Code,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Strikethrough,
  Underline,
} from "lucide-react";

type BubbleBarProps = { editor: Editor | null };

const BTN = "rounded p-1.5 text-slate-400 hover:text-white transition-colors";
const ACTIVE = "text-white";

export function BubbleBar({ editor }: BubbleBarProps) {
  if (!editor) return null;

  const shouldShow: BubbleMenuProps["shouldShow"] = ({ state }) => {
    const { selection } = state;
    if (!selection || selection.empty) return false;
    if (!(selection instanceof TextSelection)) return false;
    const parent = selection.$from.parent;
    // Only show for text selections (avoid images / horizontal rules)
    return Boolean(parent?.isTextblock) && selection.from !== selection.to;
  };

  const promptLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", prev ?? "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: trimmed }).run();
  };

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top" }}
      shouldShow={shouldShow}
      className="flex items-center gap-0.5 rounded-lg bg-slate-900 px-1.5 py-1 shadow-xl border border-slate-700"
    >
      <IconButton label="Bold" icon={Bold} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
      <IconButton label="Italic" icon={Italic} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <IconButton label="Underline" icon={Underline} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <IconButton label="Strikethrough" icon={Strikethrough} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <IconButton label="Code" icon={Code} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} />
      <IconButton label="Link" icon={LinkIcon} active={editor.isActive("link")} onClick={promptLink} />
      <IconButton label="Highlight" icon={Highlighter} active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
    </BubbleMenu>
  );
}

type IconButtonProps = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  active?: boolean;
};

const IconButton = ({ label, icon: Icon, onClick, active }: IconButtonProps) => (
  <button
    type="button"
    className={`${BTN} ${active ? ACTIVE : ""}`}
    onClick={onClick}
    aria-label={label}
    title={label}
  >
    <Icon className="h-4 w-4" strokeWidth={2.5} />
  </button>
);

export default BubbleBar;
