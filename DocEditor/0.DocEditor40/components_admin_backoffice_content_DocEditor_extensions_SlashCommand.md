import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import SlashMenu from "../SlashMenu";

export type SlashItem = {
  title: string;
  subtitle?: string;
  icon: string;
  shortcut?: string;
  keywords: string[];
  command: (props: { editor: any; range: { from: number; to: number } }) => void;
};

export const SlashCommand = Extension.create({
  name: "slash-command",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: true,
        allowSpaces: false,
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
      onImage: undefined as undefined | (() => void),
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    const slashItems: SlashItem[] = [
      {
        title: "Heading 1",
        icon: "🔠",
        shortcut: "Ctrl+Alt+1",
        keywords: ["h1", "heading1"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run(),
      },
      {
        title: "Heading 2",
        icon: "🔡",
        shortcut: "Ctrl+Alt+2",
        keywords: ["h2", "heading2"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run(),
      },
      {
        title: "Heading 3",
        icon: "🅷",
        shortcut: "Ctrl+Alt+3",
        keywords: ["h3", "heading3"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run(),
      },
      {
        title: "Heading 4",
        icon: "🄷",
        shortcut: "Ctrl+Alt+4",
        keywords: ["h4", "heading4"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setHeading({ level: 4 }).run(),
      },
      {
        title: "Bullet list",
        icon: "•",
        shortcut: "Ctrl+Shift+8",
        keywords: ["bullet", "list", "ul"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).toggleBulletList().run(),
      },
      {
        title: "Numbered list",
        icon: "1.",
        shortcut: "Ctrl+Shift+7",
        keywords: ["number", "numbered", "ordered", "ol"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
      },
      {
        title: "Quote",
        icon: "❝",
        shortcut: "Ctrl+Shift+>",
        keywords: ["quote", "blockquote"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
      },
      {
        title: "Code block",
        icon: "</>",
        shortcut: "Ctrl+Alt+C",
        keywords: ["code"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
      },
      {
        title: "Divider",
        icon: "—",
        shortcut: "---",
        keywords: ["divider", "hr", "line"],
        command: ({ editor, range }) =>
          editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
      },
      {
        title: "Image",
        icon: "🖼️",
        shortcut: "",
        keywords: ["image", "img"],
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
          if (typeof extension.options.onImage === "function") {
            extension.options.onImage();
            return;
          }
          const url = window.prompt("Image URL");
          if (url) editor.chain().focus().setImage({ src: url }).run();
        },
      },
      {
        title: "Callout",
        icon: "💬",
        shortcut: "",
        keywords: ["callout", "note"],
        command: ({ editor, range }) =>
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: "blockquote",
              content: [{ type: "paragraph", content: [{ type: "text", text: "💬 " }] }],
            })
            .run(),
      },
    ];

    return [
      Suggestion({
        editor: extension.editor,
        ...extension.options.suggestion,
        items: ({ query }: { query: string }) => {
          if (!query) return slashItems;
          const q = query.toLowerCase();
          return slashItems.filter((item) =>
            item.title.toLowerCase().includes(q) || item.keywords.some((kw) => kw.includes(q))
          );
        },
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] = [];

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenu, {
                props: {
                  items: props.items,
                  command: (item: SlashItem) => props.command(item),
                  editor: props.editor,
                },
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                theme: "light-border",
              });
            },
            onUpdate(props) {
              component?.updateProps({
                items: props.items,
                command: (item: SlashItem) => props.command(item),
                editor: props.editor,
              });
              if (!props.clientRect) return;
              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect as any,
              });
            },
            onKeyDown(props) {
              if (props.event.key === "Escape") {
                popup[0]?.hide();
                return true;
              }
              return (component as any)?.ref?.onKeyDown?.(props.event) ?? false;
            },
            onExit() {
              popup.forEach((p) => p.destroy());
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

export default SlashCommand;
