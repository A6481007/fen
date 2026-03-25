"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ContentState, EditorState, Modifier, RichUtils, convertFromHTML, convertToRaw } from "draft-js";
import type { DraftHandleValue } from "draft-js";
import draftToHtml from "draftjs-to-html";
import CustomColorPicker from "./CustomColorPicker";
import { splitHeadingBlockOnEnter } from "@/lib/editor/headingSplit";

type WysiwygEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
};

const DraftEditor = dynamic(() => import("react-draft-wysiwyg").then((mod) => mod.Editor), {
  ssr: false,
});

const createStateFromHtml = (html?: string) => {
  const safeHtml = html && html.trim().length > 0 ? html : "<p></p>";
  const parsed = convertFromHTML(safeHtml);
  if (!parsed.contentBlocks) return EditorState.createEmpty();
  const contentState = ContentState.createFromBlockArray(parsed.contentBlocks, parsed.entityMap);
  return EditorState.createWithContent(contentState);
};

export default function WysiwygEditor({ value, onChange }: WysiwygEditorProps) {
  const [editorState, setEditorState] = useState<EditorState>(() => createStateFromHtml(value));
  const [mounted, setMounted] = useState(false);
  const isMountedRef = useRef(false);
  const lastHtmlRef = useRef<string>(value ?? "");
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (value === undefined) return;
    const normalized = value.trim();
    if (normalized === lastHtmlRef.current.trim()) return;
    const nextState = createStateFromHtml(value);
    setEditorState(nextState);
    lastHtmlRef.current = normalized;
  }, [value]);

  const editorStyle = useMemo(
    () => ({
      minHeight: "var(--wysiwyg-min-height, 320px)",
      padding: "12px",
    }),
    [],
  );

  const handleEditorChange = (state: EditorState) => {
    if (!isMountedRef.current) return;
    setEditorState(state);
    const html = draftToHtml(convertToRaw(state.getCurrentContent()), undefined, undefined, (entity, text) => {
      if (entity.type === "LINK") {
        const href = entity.data?.url || entity.data?.href || "";
        const target = entity.data?.targetOption || "_self";
        const title = entity.data?.title;
        const escape = (value: string) =>
          value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const titleAttr = title ? ` title="${escape(title)}"` : "";
        const safeHref = escape(href);
        return `<a href="${safeHref}" target="${target}"${titleAttr}>${text}</a>`;
      }
      return undefined;
    });
    lastHtmlRef.current = html;
    onChange?.(html);
  };

  const handleReturn = (event: React.KeyboardEvent, state: EditorState): DraftHandleValue => {
    const next = splitHeadingBlockOnEnter(state);
    if (!next) return "not-handled";
    event.preventDefault();
    handleEditorChange(next);
    return "handled";
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white" ref={wrapperRef} style={{ overflow: "visible" }}>
      {mounted ? (
        <DraftEditor
          wrapperClassName="wysiwyg-wrapper"
          toolbarClassName="wysiwyg-toolbar"
          editorClassName="wysiwyg-editor"
          editorState={editorState}
          onEditorStateChange={handleEditorChange}
          handleReturn={handleReturn}
          toolbarOnFocus={false}
          toolbar={{
            options: [
              "inline",
              "blockType",
              "fontSize",
              "fontFamily",
              "list",
              "textAlign",
              "colorPicker",
              "embedded",
              "emoji",
              "image",
              "remove",
              "history",
            ],
            inline: {
              options: ["bold", "italic", "underline", "strikethrough", "monospace"],
              bold: { title: "Bold (Ctrl/Cmd + B)" },
              italic: { title: "Italic (Ctrl/Cmd + I)" },
              underline: { title: "Underline (Ctrl/Cmd + U)" },
              strikethrough: { title: "Strikethrough" },
              monospace: { title: "Monospace" },
            },
            blockType: {
              title: "Headings & blocks",
              options: ["Normal", "H1", "H2", "H3", "H4", "Blockquote", "Code"],
            },
            fontSize: {
              title: "Font size",
              options: [12, 14, 16, 18, 20, 24, 28, 32],
            },
            fontFamily: {
              title: "Font family",
              options: ["Poppins", "Raleway", "Open Sans", "Georgia", "Times New Roman", "Monospace"],
            },
            list: {
              title: "Lists",
              options: ["unordered", "ordered", "indent", "outdent"],
              unordered: { title: "Bullet list" },
              ordered: { title: "Numbered list" },
              indent: { title: "Increase indent" },
              outdent: { title: "Decrease indent" },
            },
            textAlign: {
              title: "Align",
              options: ["left", "center", "right", "justify"],
              left: { title: "Align left" },
              center: { title: "Align center" },
              right: { title: "Align right" },
              justify: { title: "Justify" },
            },
            colorPicker: {
              title: "Text & highlight color",
              component: CustomColorPicker,
              popupClassName: "wysiwyg-colorpicker-modal",
              colors: [
                "#000000",
                "#111827",
                "#374151",
                "#6B7280",
                "#9CA3AF",
                "#D1D5DB",
                "#FFFFFF",
                "#EF4444",
                "#F97316",
                "#F59E0B",
                "#FACC15",
                "#10B981",
                "#22D3EE",
                "#0EA5E9",
                "#6366F1",
                "#8B5CF6",
                "#EC4899",
                "#14B8A6",
                "#0F172A",
                "#F8FAFC",
              ],
            },
            link: {
              title: "Insert link",
              showOpenOptionOnHover: true,
              link: { title: "Add link" },
              unlink: { title: "Remove link" },
            },
            embedded: { title: "Embed media" },
            emoji: { title: "Insert emoji" },
            image: {
              title: "Insert image",
              urlEnabled: true,
              uploadEnabled: true,
              alignmentEnabled: true,
              previewImage: true,
              inputAccept: "image/gif,image/jpeg,image/jpg,image/png,image/svg+xml",
              alt: { present: false, mandatory: false },
              defaultSize: { height: "auto", width: "auto" },
            },
            remove: { title: "Clear formatting" },
            history: {
              undo: { title: "Undo" },
              redo: { title: "Redo" },
            },
          }}
          toolbarCustomButtons={[
            <MoreFormatting key="more-formatting" />,
            <LinkControls key="link-controls" getEditorState={() => editorState} setEditorState={handleEditorChange} />,
          ]}
          editorStyle={editorStyle}
        />
      ) : (
        <div style={editorStyle} />
      )}
    </div>
  );
}

function MoreFormatting(props: {
  getEditorState?: () => EditorState;
  setEditorState?: (state: EditorState) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleStyle = (style: "SUPERSCRIPT" | "SUBSCRIPT") => {
    const getState = props.getEditorState;
    const setState = props.setEditorState;
    if (!getState || !setState) return;
    const next = RichUtils.toggleInlineStyle(getState(), style);
    setState(next);
    setOpen(false);
  };

  return (
    <div className="rdw-option-wrapper rdw-more-option" title="More formatting">
      <button
        type="button"
        aria-label="More formatting"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="more-trigger"
      >
        ⋯
      </button>
      {open ? (
        <div className="rdw-more-dropdown">
          <button type="button" onClick={() => toggleStyle("SUPERSCRIPT")} title="Superscript">
            X<sup>2</sup> Superscript
          </button>
          <button type="button" onClick={() => toggleStyle("SUBSCRIPT")} title="Subscript">
            X<sub>2</sub> Subscript
          </button>
        </div>
      ) : null}
    </div>
  );
}

function LinkControls(props: {
  getEditorState?: () => EditorState;
  setEditorState?: (state: EditorState) => void;
}) {
  const applyLink = () => {
    const getState = props.getEditorState;
    const setState = props.setEditorState;
    if (!getState || !setState) return;
    const state = getState();
    const selection = state.getSelection();
    const contentState = state.getCurrentContent();

    const existing = (() => {
      const anchorKey = selection.getAnchorKey();
      const block = contentState.getBlockForKey(anchorKey);
      const offset = Math.max(selection.getAnchorOffset() - 1, 0);
      return block.getEntityAt(offset);
    })();
    const prevUrl =
      (existing && contentState.getEntity(existing).getData()?.url) ||
      (existing && contentState.getEntity(existing).getData()?.href) ||
      "";
    const href = window.prompt("Enter URL", prevUrl || "https://")?.trim();
    if (!href) return;
    const title = window.prompt("Link title (tooltip, optional)", "")?.trim();

    const contentWithEntity = contentState.createEntity("LINK", "MUTABLE", {
      url: href,
      title: title || undefined,
      targetOption: "_self",
    });
    const entityKey = contentWithEntity.getLastCreatedEntityKey();
    let nextState = EditorState.set(state, { currentContent: contentWithEntity });

    if (selection.isCollapsed()) {
      const text = title || href;
      const withText = Modifier.insertText(
        contentWithEntity,
        selection,
        text,
        state.getCurrentInlineStyle(),
        entityKey,
      );
      nextState = EditorState.push(nextState, withText, "insert-characters");
      const newSelection = nextState.getSelection().merge({
        anchorOffset: selection.getAnchorOffset(),
        focusOffset: selection.getAnchorOffset() + text.length,
      });
      nextState = EditorState.forceSelection(nextState, newSelection as any);
    } else {
      nextState = RichUtils.toggleLink(nextState, selection, entityKey);
    }

    setState(nextState);
  };

  const removeLink = () => {
    const getState = props.getEditorState;
    const setState = props.setEditorState;
    if (!getState || !setState) return;
    let state = getState();
    const selection = state.getSelection();
    const contentState = state.getCurrentContent();
    const anchorKey = selection.getAnchorKey();
    const block = contentState.getBlockForKey(anchorKey);
    const offset = Math.max(selection.getAnchorOffset() - 1, 0);
    const entityKey = block.getEntityAt(offset);
    if (!entityKey) return;

    let start = 0;
    let end = 0;
    block.findEntityRanges(
      (character) => character.getEntity() === entityKey,
      (rangeStart, rangeEnd) => {
        if (offset >= rangeStart && offset <= rangeEnd) {
          start = rangeStart;
          end = rangeEnd;
        }
      },
    );
    const expanded = selection.merge({ anchorOffset: start, focusOffset: end });
    state = EditorState.forceSelection(state, expanded as any);
    const nextState = RichUtils.toggleLink(state, state.getSelection(), null);
    setState(nextState);
  };

  const hasLink = (() => {
    const getState = props.getEditorState;
    if (!getState) return false;
    const state = getState();
    const selection = state.getSelection();
    const contentState = state.getCurrentContent();
    const anchorKey = selection.getAnchorKey();
    const block = contentState.getBlockForKey(anchorKey);
    const offset = Math.max(selection.getAnchorOffset() - 1, 0);
    return Boolean(block.getEntityAt(offset));
  })();

  return (
    <div className="rdw-link-wrapper" aria-label="Link controls">
      <button type="button" className="rdw-option-wrapper" onClick={applyLink} title="Insert link">
        🔗
      </button>
      <button
        type="button"
        className="rdw-option-wrapper"
        onClick={removeLink}
        title="Remove link"
        disabled={!hasLink}
        aria-disabled={!hasLink}
      >
        ✕
      </button>
    </div>
  );
}
