import { describe, it, expect } from "vitest";
import { EditorState, SelectionState, convertFromRaw } from "draft-js";
import { splitHeadingBlockOnEnter } from "@/lib/editor/headingSplit";

const toEditorState = (blocks: Array<{ key: string; text: string; type: string }>) =>
  EditorState.createWithContent(
    convertFromRaw({
      blocks: blocks.map((block) => ({
        key: block.key,
        text: block.text,
        type: block.type,
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {},
      })),
      entityMap: {},
    }),
  );

const setCursor = (state: EditorState, key: string, offset: number) => {
  const sel = SelectionState.createEmpty(key).merge({
    anchorOffset: offset,
    focusOffset: offset,
    hasFocus: true,
  }) as SelectionState;
  return EditorState.forceSelection(state, sel);
};

describe("splitHeadingBlockOnEnter", () => {
  it("moves heading tail into a new paragraph block without touching the next block", () => {
    const initial = toEditorState([
      { key: "a", text: "HelloWorld", type: "header-two" },
      { key: "b", text: "Existing block", type: "unstyled" },
    ]);
    const withCursor = setCursor(initial, "a", 5);

    const result = splitHeadingBlockOnEnter(withCursor);
    expect(result).not.toBeNull();
    const blocks = result!.getCurrentContent().getBlockMap().toArray();

    expect(blocks.map((b) => b.getText())).toEqual(["Hello", "World", "Existing block"]);
    expect(blocks[0].getType()).toBe("header-two");
    expect(blocks[1].getType()).toBe("unstyled");
    expect(blocks[2].getText()).toBe("Existing block");
  });

  it("creates an empty paragraph when splitting at the end of a heading", () => {
    const initial = toEditorState([{ key: "a", text: "Title", type: "header-one" }]);
    const withCursor = setCursor(initial, "a", 5);

    const result = splitHeadingBlockOnEnter(withCursor);
    expect(result).not.toBeNull();
    const blocks = result!.getCurrentContent().getBlockMap().toArray();

    expect(blocks.map((b) => b.getText())).toEqual(["Title", ""]);
    expect(blocks[1].getType()).toBe("unstyled");
  });
});
