import { EditorState, Modifier, SelectionState } from "draft-js";

const HEADING_TYPES = new Set(["header-one", "header-two", "header-three"]);

const isHeading = (blockType?: string | null) => Boolean(blockType && HEADING_TYPES.has(blockType));

/**
 * Splits a heading block at the current caret position.
 * The text before the caret stays in the original heading.
 * The text after the caret becomes a brand-new unstyled block inserted directly after.
 */
export function splitHeadingBlockOnEnter(editorState: EditorState): EditorState | null {
  const selection = editorState.getSelection();
  if (!selection.isCollapsed()) return null;

  const content = editorState.getCurrentContent();
  const currentKey = selection.getStartKey();
  const currentBlock = content.getBlockForKey(currentKey);
  if (!isHeading(currentBlock?.getType())) return null;

  // Split the block at the cursor; Draft moves the tail text into the new block.
  const withSplit = Modifier.splitBlock(content, selection);
  const insertedKey = withSplit.getKeyAfter(currentKey) ?? withSplit.getSelectionAfter().getStartKey();

  const targetSelection = insertedKey ? SelectionState.createEmpty(insertedKey) : withSplit.getSelectionAfter();
  // Ensure the new block starts as a clean paragraph instead of inheriting heading formatting.
  const normalized = insertedKey ? Modifier.setBlockType(withSplit, targetSelection, "unstyled") : withSplit;

  const nextState = EditorState.push(editorState, normalized, "split-block");
  return EditorState.forceSelection(nextState, targetSelection);
}

export default splitHeadingBlockOnEnter;
