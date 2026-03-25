import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import CharacterCount from "@tiptap/extension-character-count";
import { SlashCommand } from "./extensions/SlashCommand";
import { HeadingShortcuts } from "./extensions/HeadingShortcuts";
import { PassthroughBlock } from "./extensions/PassthroughBlock";

const lowlight = createLowlight(common);

// Extend the base Image node to carry Sanity asset metadata so we can round-trip
// between Tiptap JSON and PortableText with asset references intact.
const ImageExtended = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      assetId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-asset-id"),
        renderHTML: (attributes) =>
          attributes.assetId ? { "data-asset-id": attributes.assetId } : {},
      },
      alignment: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-alignment") || "center",
        renderHTML: (attributes) =>
          attributes.alignment ? { "data-alignment": attributes.alignment } : {},
      },
      width: {
        default: "large",
        parseHTML: (element) => element.getAttribute("data-width") || "large",
        renderHTML: (attributes) =>
          attributes.width ? { "data-width": attributes.width } : {},
      },
      isDecorative: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-decorative") === "true",
        renderHTML: (attributes) =>
          attributes.isDecorative ? { "data-decorative": "true", "aria-hidden": "true" } : {},
      },
      credit: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-credit"),
        renderHTML: (attributes) =>
          attributes.credit ? { "data-credit": attributes.credit } : {},
      },
      originalType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-original-type"),
        renderHTML: (attributes) =>
          attributes.originalType ? { "data-original-type": attributes.originalType } : {},
      },
      blockKey: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-block-key"),
        renderHTML: (attributes) =>
          attributes.blockKey ? { "data-block-key": attributes.blockKey } : {},
      },
    };
  },
});

export const docEditorExtensions = [
  StarterKit.configure({
    // Keep heading support (h1–h4; disable h5–h6)
    heading: { levels: [1, 2, 3, 4] },
    // We add CodeBlockLowlight separately, so disable the plain one
    codeBlock: false,
    // Horizontal rule is useful as an inline divider
    horizontalRule: {},
    // Markdown shortcuts come from Typography; keep them in StarterKit too
    // so ##<space> and -<space> and 1.<space> work
    dropcursor: { color: "#6366f1", width: 2 },
  }),
  HeadingShortcuts,
  SlashCommand,
  CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
  ImageExtended.configure({
    inline: false,        // block-level image (like Docs)
    allowBase64: false,   // never base64 — always asset refs
    HTMLAttributes: { class: "doc-editor-image" },
  }),
  Link.configure({
    openOnClick: false,   // don't navigate away when clicking inside the editor
    autolink: true,       // auto-linkify pasted URLs
    HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
  }),
  Underline,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Typography,             // smart quotes, em dashes, typographic arrows
  Highlight.configure({ multicolor: false }),
  Placeholder.configure({
    placeholder: "Start writing… (select text to format, or type / for quick insert)",
    emptyEditorClass: "is-editor-empty",
  }),
  PassthroughBlock,
  CharacterCount,
];
