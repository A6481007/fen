import { Node, mergeAttributes } from "@tiptap/core";

/**
 * PassthroughBlock keeps unsupported PortableText objects intact while editing.
 * It renders a non-editable placeholder with a label and stores the raw block JSON.
 */
export const PassthroughBlock = Node.create({
  name: "passthroughBlock",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      blockType: {
        default: "object",
      },
      blockData: {
        default: null,
      },
      label: {
        default: "Embedded block",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-pt-object]",
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            blockType: el.dataset.ptType || "object",
            blockData: el.dataset.ptRaw ? JSON.parse(el.dataset.ptRaw) : null,
            label: el.dataset.ptLabel || "Embedded block",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { blockData, blockType, label, ...rest } = HTMLAttributes;
    return [
      "div",
      mergeAttributes(rest, {
        "data-pt-object": "true",
        "data-pt-type": blockType,
        "data-pt-label": label,
        "data-pt-raw": blockData ? JSON.stringify(blockData) : undefined,
        contenteditable: "false",
        class:
          "my-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600",
      }),
      `${label || "Embedded block"} (${blockType || "object"})`,
    ];
  },
});

export default PassthroughBlock;
