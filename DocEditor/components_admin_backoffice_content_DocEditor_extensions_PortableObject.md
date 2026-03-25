import { Node, mergeAttributes } from "@tiptap/core";

export const PortableObject = Node.create({
  name: "portableObject",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      raw: {
        default: null,
      },
      label: {
        default: "Block",
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
            raw: el.dataset.ptRaw ? JSON.parse(el.dataset.ptRaw) : null,
            label: el.dataset.ptLabel || "Block",
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { raw, ...rest } = HTMLAttributes;
    return [
      "div",
      mergeAttributes(rest, {
        "data-pt-object": "true",
        "data-pt-label": HTMLAttributes.label,
        "data-pt-raw": raw ? JSON.stringify(raw) : undefined,
        contenteditable: "false",
        class:
          "my-4 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600",
      }),
      `${HTMLAttributes.label || "Embedded block"} (read-only)`,
    ];
  },
});

export default PortableObject;
