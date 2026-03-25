import type { Extension, JSONContent, Mark } from "@tiptap/core";

const INLINE_TYPES = new Set(["text", "hardBreak"]);

const sanitizeMarks = (marks?: Mark[] | null): Mark[] | undefined => {
  if (!Array.isArray(marks)) return undefined;
  const clean = marks
    .map((mark) => {
      if (!mark || typeof mark !== "object" || typeof mark.type !== "string") return null;
      const filtered: Mark = { type: mark.type };
      if (mark.attrs && typeof mark.attrs === "object") filtered.attrs = mark.attrs;
      return filtered;
    })
    .filter((m): m is Mark => Boolean(m));
  return clean.length ? clean : undefined;
};

const sanitizeTextNode = (node: JSONContent): JSONContent | null => {
  const raw = (node as { text?: unknown }).text;
  if (raw === undefined || raw === null) return null;
  const text = String(raw);
  if (!text.length) return null;
  const marks = sanitizeMarks(node.marks as Mark[] | null);
  return marks ? { type: "text", text, marks } : { type: "text", text };
};

const ensureParagraph = (children: JSONContent[]): JSONContent => ({
  type: "paragraph",
  content: children,
});

const sanitizeInlineChildren = (children: JSONContent[]): JSONContent[] => {
  const inline: JSONContent[] = [];
  children.forEach((child) => {
    if (!child) return;
    if (child.type === "text") {
      const txt = sanitizeTextNode(child);
      if (txt) inline.push(txt);
      return;
    }
    if (INLINE_TYPES.has(child.type || "")) {
      inline.push(child);
    }
  });
  return inline;
};

const sanitizeNode = (node: JSONContent | null | undefined, parentType: string): JSONContent | JSONContent[] | null => {
  if (!node || typeof node !== "object" || typeof node.type !== "string") return null;

  if (node.type === "text") {
    return sanitizeTextNode(node);
  }

  const cleanedChildren: JSONContent[] = [];
  if (Array.isArray(node.content)) {
    node.content.forEach((child) => {
      const cleaned = sanitizeNode(child, node.type);
      if (Array.isArray(cleaned)) {
        cleaned.forEach((c) => c && cleanedChildren.push(c));
      } else if (cleaned) {
        cleanedChildren.push(cleaned);
      }
    });
  }

  if (node.type === "paragraph" || node.type === "heading" || node.type === "codeBlock") {
    const inline = sanitizeInlineChildren(cleanedChildren);
    return { ...node, content: inline };
  }

  if (node.type === "listItem") {
    const blocks: JSONContent[] = [];
    cleanedChildren.forEach((child) => {
      if (child.type === "text" || INLINE_TYPES.has(child.type || "")) {
        blocks.push(ensureParagraph([child]));
        return;
      }
      if (child.type === "paragraph" || child.type === "heading" || child.type === "codeBlock" || child.type === "blockquote") {
        blocks.push(child);
      } else if (child.type === "bulletList" || child.type === "orderedList") {
        blocks.push(child);
      }
    });
    return { ...node, content: blocks };
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const items = cleanedChildren.filter((child) => child.type === "listItem");
    return { ...node, content: items };
  }

  if (parentType === "doc" && (node.type === "text" || INLINE_TYPES.has(node.type))) {
    const para = ensureParagraph([node]);
    return para;
  }

  if (cleanedChildren.length) {
    return { ...node, content: cleanedChildren };
  }
  if (Array.isArray(node.content)) {
    return { ...node, content: [] };
  }
  return { ...node };
};

export function sanitizeFromPortableText(doc: JSONContent, extensions?: Extension[]): JSONContent {
  void extensions?.length;
  const base: JSONContent = doc && doc.type === "doc" ? doc : { type: "doc", content: [] };
  const content: JSONContent[] = [];

  (base.content ?? []).forEach((child) => {
    const cleaned = sanitizeNode(child, "doc");
    if (Array.isArray(cleaned)) {
      cleaned.forEach((n) => n && content.push(n));
    } else if (cleaned) {
      if (cleaned.type === "text" || INLINE_TYPES.has(cleaned.type || "")) {
        content.push(ensureParagraph([cleaned]));
      } else {
        content.push(cleaned);
      }
    }
  });

  const filtered = content.filter(Boolean);
  if (!filtered.length) return { type: "doc", content: [{ type: "paragraph", content: [] }] };

  return { type: "doc", content: filtered };
}
