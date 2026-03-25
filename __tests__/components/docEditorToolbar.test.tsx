import React from "react";
import { act } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Toolbar from "@/components/admin/backoffice/content/DocEditor/Toolbar";

const fakeRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  toJSON() {
    return this;
  },
};

if (!Range.prototype.getClientRects) {
  // jsdom lacks full layout APIs; stub to satisfy ProseMirror measurements.
  Range.prototype.getClientRects = () => [fakeRect] as any;
}
if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => fakeRect as any;
}
if (!Element.prototype.getClientRects) {
  Element.prototype.getClientRects = () => [fakeRect] as any;
}

const createEditor = () => {
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: [StarterKit],
    content: "<p></p>",
  });

  return {
    editor,
    cleanup: () => {
      editor.destroy();
      element.remove();
    },
  };
};

const renderToolbar = (editor: Editor | null) =>
  render(
    <Toolbar
      editor={editor}
      onInsertImage={() => {}}
      isSourceMode={false}
      onToggleSourceMode={() => {}}
    />,
  );

const getUndoButton = () => screen.getByRole("button", { name: "Undo last action (Cmd+Z)" });
const getRedoButton = () => screen.getByRole("button", { name: "Redo last action (Cmd+Shift+Z)" });

describe("DocEditor Toolbar history controls", () => {
  it("shows undo tooltip even when disabled initially", () => {
    const { editor, cleanup } = createEditor();
    try {
      renderToolbar(editor);
      expect(screen.getAllByTitle("Undo last action (Cmd+Z)").length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it("shows redo tooltip even when disabled initially", () => {
    const { editor, cleanup } = createEditor();
    try {
      renderToolbar(editor);
      expect(screen.getAllByTitle("Redo last action (Cmd+Shift+Z)").length).toBeGreaterThan(0);
    } finally {
      cleanup();
    }
  });

  it("enables undo after typing content", async () => {
    const { editor, cleanup } = createEditor();
    try {
      renderToolbar(editor);
      act(() => {
        editor.chain().focus().insertContent("Hello").run();
      });

      await waitFor(() => expect(getUndoButton()).not.toHaveAttribute("aria-disabled", "true"));
    } finally {
      cleanup();
    }
  });

  it("keeps undo enabled after blur when history exists", async () => {
    const { editor, cleanup } = createEditor();
    try {
      renderToolbar(editor);

      act(() => {
        editor.chain().focus().insertContent("Hello").run();
      });
      await waitFor(() => expect(getUndoButton()).not.toHaveAttribute("aria-disabled", "true"));

      act(() => {
        editor.commands.blur();
      });

      await waitFor(() => expect(getUndoButton()).not.toHaveAttribute("aria-disabled", "true"));
    } finally {
      cleanup();
    }
  });

  it("disables undo after history is exhausted", async () => {
    const { editor, cleanup } = createEditor();
    try {
      renderToolbar(editor);

      act(() => {
        editor.chain().focus().insertContent("Hello").run();
      });
      await waitFor(() => expect(getUndoButton()).not.toHaveAttribute("aria-disabled", "true"));

      act(() => {
        editor.commands.undo();
      });

      await waitFor(() => expect(getUndoButton()).toHaveAttribute("aria-disabled", "true"));
    } finally {
      cleanup();
    }
  });
});
