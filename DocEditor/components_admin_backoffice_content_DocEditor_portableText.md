import type { JSONContent } from "@tiptap/core";
import type {
  PortableTextBlock,
  PortableTextBlockImage,
  PortableTextLinkDef,
  PortableTextMarkDef,
  PortableTextRecommendedKitDef,
  PortableTextSpan,
} from "@/types/portableText";

export type ImageUrlResolver = (assetRef: string, width?: number) => string | undefined;

const randomKey = () => Math.random().toString(16).slice(2, 10);
const clampHeadingLevel = (level?: number) => Math.min(4, Math.max(1, Number(level) || 1));

const resolveImageSrc = (assetId?: string | null, width = 1600, resolver?: ImageUrlResolver) => {
  if (!assetId || typeof resolver !== "function") return undefined;
  try {
    return resolver(assetId, width) || undefined;
  } catch (err) {
    console.warn("Failed to resolve image url", assetId, err);
    return undefined;
  }
};

const coerceObject = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Tiptap JSON → PortableText
// ─────────────────────────────────────────────────────────────────────────────
export function tiptapToPortableText(json?: JSONContent | null): PortableTextBlock[] {
  if (!json || json.type !== "doc" || !Array.isArray(json.content)) return [];

  const blocks: PortableTextBlock[] = [];

  const walk = (node: JSONContent, listContext?: { type: "bullet" | "number"; level: number }) => {
    if (!node) return;

    switch (node.type) {
      case "passthroughBlock":
      case "portableObject": {
        const raw = coerceObject(node.attrs?.blockData) || coerceObject(node.attrs?.raw);
        if (raw && typeof raw === "object") {
          blocks.push(raw as PortableTextBlock);
        } else {
          blocks.push({
            _key: randomKey(),
            _type: "block",
            style: "normal",
            children: [{ _key: randomKey(), _type: "span", text: "[embedded block]" }],
            markDefs: [],
          });
        }
        break;
      }
      case "paragraph":
      case "heading":
      case "blockquote":
      case "codeBlock": {
        const { children, markDefs } = extractSpans(node);
        let style: string | undefined = "normal";
        if (node.type === "heading") {
          const level = clampHeadingLevel(node.attrs?.level as number | undefined);
          style = `h${level}`;
        } else if (node.type === "blockquote") {
          style = "blockquote";
        } else if (node.type === "codeBlock") {
          style = "code";
        }
        blocks.push({
          _key: randomKey(),
          _type: "block",
          style,
          listItem: listContext?.type,
          level: listContext?.level,
          children,
          markDefs,
        });
        break;
      }
      case "bulletList":
      case "orderedList": {
        const listType = node.type === "orderedList" ? "number" : "bullet";
        (node.content ?? []).forEach((child) => {
          if (child.type === "listItem") {
            walk(child, { type: listType, level: listContext ? listContext.level + 1 : 1 });
          }
        });
        break;
      }
      case "listItem": {
        (node.content ?? []).forEach((child) => walk(child, listContext));
        break;
      }
      case "image": {
        const assetId = node.attrs?.assetId ? String(node.attrs.assetId) : undefined;
        const alt = node.attrs?.alt ? String(node.attrs.alt) : "";
        const caption = node.attrs?.title ? String(node.attrs.title) : "";
        const credit = node.attrs?.credit ? String(node.attrs.credit) : "";
        const alignment = (node.attrs?.alignment as PortableTextBlockImage["alignment"]) || "center";
        const width = (node.attrs?.width as PortableTextBlockImage["width"]) || "large";
        const isDecorative = Boolean(node.attrs?.isDecorative);
        const blockKey = node.attrs?.blockKey ? String(node.attrs.blockKey) : undefined;
        const originalType = (node.attrs?.originalType as string) || "blockImage";

        if (originalType === "image") {
          blocks.push({
            _key: blockKey || randomKey(),
            _type: "image",
            asset: assetId ? { _ref: assetId } : undefined,
            alt: isDecorative ? "" : alt,
            caption,
            credit,
          } as PortableTextBlock);
          break;
        }

        const imageBlock: PortableTextBlockImage = {
          _key: blockKey || randomKey(),
          _type: "blockImage",
          image: assetId ? { _type: "image", asset: { _ref: assetId } } : undefined,
          alt: isDecorative ? "" : alt,
          caption,
          credit,
          alignment,
          width,
          isDecorative,
        };

        blocks.push(imageBlock as unknown as PortableTextBlock);
        break;
      }
      case "horizontalRule": {
        blocks.push({ _key: randomKey(), _type: "break" });
        break;
      }
      default: {
        // Unknown node → plain paragraph with notice
        const raw = coerceObject((node as any)?.attrs?.raw);
        if (raw) {
          blocks.push(raw as PortableTextBlock);
        } else {
          blocks.push({
            _key: randomKey(),
            _type: "block",
            style: "normal",
            children: [{ _key: randomKey(), _type: "span", text: "[unsupported block]" }],
            markDefs: [],
          });
        }
      }
    }
  };

  json.content.forEach((child) => walk(child));
  return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// PortableText → Tiptap JSON
// ─────────────────────────────────────────────────────────────────────────────
export function portableTextToTiptap(
  blocks: PortableTextBlock[] = [],
  imageUrlResolver?: ImageUrlResolver,
): JSONContent {
  if (!blocks.length) return minimalDoc();

  const content: JSONContent[] = [];

  // Maintain a stack of open lists so we can group consecutive list items
  // into a single list node (and nest correctly by level).
  type ListStackItem = {
    type: "bulletList" | "orderedList";
    node: JSONContent; // the list node
    lastItem?: JSONContent; // last listItem added at this level
  };

  const listStack: ListStackItem[] = [];

  const popToLevel = (level: number) => {
    while (listStack.length > level) listStack.pop();
  };

  const ensureList = (level: number, type: "bulletList" | "orderedList") => {
    // Clamp level to at least 1 and at most one deeper than the current stack
    const targetLevel = Math.max(1, level);
    const normalizedLevel = Math.min(targetLevel, listStack.length + 1);

    popToLevel(normalizedLevel);

    const existing = listStack[normalizedLevel - 1];
    if (existing && existing.type === type) return existing;

    const listNode: JSONContent = { type, content: [] };

    if (normalizedLevel === 1) {
      content.push(listNode);
    } else {
      const parent = listStack[normalizedLevel - 2];
      // Nested list attaches to the most recent list item of its parent level.
      if (parent?.lastItem) {
        parent.lastItem.content = parent.lastItem.content ?? [];
        parent.lastItem.content.push(listNode);
      } else {
        // Fallback: still append to parent list to avoid losing content.
        parent?.node.content?.push({ type: "listItem", content: [listNode] });
      }
    }

    const created: ListStackItem = { type, node: listNode, lastItem: undefined };
    // Replace/append at the correct level index
    listStack[normalizedLevel - 1] = created;
    // Trim any deeper lists that might linger
    listStack.length = normalizedLevel;
    return created;
  };

  blocks.forEach((block) => {
    const node = portableBlockToNode(block, imageUrlResolver);
    if (!node) return;

    const isList = block.listItem === "bullet" || block.listItem === "number";
    if (isList) {
      const listType = block.listItem === "number" ? "orderedList" : "bulletList";
      const level = Math.max(1, block.level ?? 1);
      const listContext = ensureList(level, listType);

      const listItem: JSONContent = { type: "listItem", content: [] };
      listItem.content!.push(node);

      listContext.node.content = listContext.node.content ?? [];
      listContext.node.content.push(listItem);
      listContext.lastItem = listItem;
    } else {
      // Close any open lists when we hit a normal block
      listStack.length = 0;
      content.push(node);
    }
  });

  return { type: "doc", content };
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

function extractSpans(node: JSONContent): { children: PortableTextSpan[]; markDefs: PortableTextMarkDef[] } {
  const spans: PortableTextSpan[] = [];
  const markDefs: PortableTextMarkDef[] = [];
  const linkKeyByHref = new Map<string, { key: string; openInNewTab?: boolean }>();
  const kitKeyByRef = new Map<string, { key: string }>();

  const visit = (n?: JSONContent) => {
    if (!n) return;
    if (n.type === "text") {
      const marks: string[] = [];
      (n.marks ?? []).forEach((mark) => {
        switch (mark.type) {
          case "bold":
            marks.push("strong");
            break;
          case "italic":
            marks.push("em");
            break;
          case "underline":
            marks.push("underline");
            break;
          case "strike":
            marks.push("strike");
            break;
          case "code":
            marks.push("code");
            break;
          case "highlight":
            marks.push("highlight");
            break;
          case "link": {
            const href = mark.attrs?.href;
            const openInNewTab = mark.attrs?.target === "_blank";
            const kitRef = typeof mark.attrs?.["data-kit-ref"] === "string" ? mark.attrs["data-kit-ref"] : undefined;
            const kitLabel = typeof mark.attrs?.["data-kit-label"] === "string" ? mark.attrs["data-kit-label"] : undefined;

            if (kitRef) {
              const mapKey = [kitRef, kitLabel ?? "", href ?? "", openInNewTab ? "1" : "0"].join("|");
              let entry = kitKeyByRef.get(mapKey);
              if (!entry) {
                const key = randomKey();
                entry = { key };
                kitKeyByRef.set(mapKey, entry);
                markDefs.push({
                  _key: key,
                  _type: "recommendedKitLink",
                  kit: { _ref: kitRef },
                  label: kitLabel,
                  href: typeof href === "string" ? href : undefined,
                  openInNewTab,
                });
              }
              marks.push(entry.key);
              break;
            }

            if (href && typeof href === "string") {
              let entry = linkKeyByHref.get(href);
              if (!entry) {
                const key = randomKey();
                entry = { key, openInNewTab };
                linkKeyByHref.set(href, entry);
                markDefs.push({ _key: key, _type: "link", href, openInNewTab });
              }
              marks.push(entry.key);
            }
            break;
          }
          default:
            break;
        }
      });
      spans.push({ _key: randomKey(), _type: "span", text: n.text ?? "", marks });
      return;
    }
    (n.content ?? []).forEach((child) => visit(child));
  };

  visit(node);
  if (!spans.length) spans.push({ _key: randomKey(), _type: "span", text: "" });
  return { children: spans, markDefs };
}

function portableBlockToNode(
  block: PortableTextBlock,
  imageUrlResolver?: ImageUrlResolver,
): JSONContent | null {
  const blockType = block?._type;

  if (blockType === "blockImage") {
    const img = block as unknown as PortableTextBlockImage;
    const assetId = (img.image as any)?.asset?._ref ?? undefined;
    const resolvedSrc = resolveImageSrc(assetId, 1600, imageUrlResolver);
    return {
      type: "image",
      attrs: {
        src: resolvedSrc ?? assetId,
        assetId,
        alt: img.isDecorative ? "" : img.alt ?? "",
        title: img.caption ?? "",
        credit: (img as any).credit ?? "",
        alignment: img.alignment ?? "center",
        width: img.width ?? "large",
        isDecorative: Boolean(img.isDecorative),
        originalType: "blockImage",
        blockKey: block._key ?? null,
      },
    };
  }
  if (blockType === "image") {
    const assetId = (block as any).asset?._ref ?? undefined;
    const resolvedSrc = resolveImageSrc(assetId, 1200, imageUrlResolver);
    return {
      type: "image",
      attrs: {
        src: resolvedSrc ?? assetId,
        assetId,
        alt: (block as any).alt ?? "",
        title: (block as any).caption ?? "",
        credit: (block as any).credit ?? "",
        originalType: "image",
        blockKey: block._key ?? null,
      },
    };
  }
  if (blockType === "break") {
    return { type: "horizontalRule" };
  }
  if (blockType !== "block") {
    return {
      type: "passthroughBlock",
      attrs: {
        blockType: blockType || "object",
        blockData: block,
        label: (block as any)?.title || blockType || "Block",
      },
    };
  }

  const spanContent = buildSpanNodes(block.children ?? [], block.markDefs ?? []);
  const base: JSONContent = { type: "paragraph", content: spanContent };

  const style = block.style ?? "normal";
  if (style === "normal") return base;
  if (style.startsWith("h")) {
    const level = clampHeadingLevel(Number(style.replace("h", "")));
    return { type: "heading", attrs: { level }, content: spanContent };
  }
  if (style === "blockquote") return { type: "blockquote", content: [base] };
  if (style === "code") return { type: "codeBlock", content: spanContent };

  return base;
}

function buildSpanNodes(children: PortableTextSpan[], markDefs: PortableTextMarkDef[]): JSONContent[] {
  if (!children?.length) return [{ type: "text", text: "" }];

  const findHref = (markKey?: string) => markDefs.find((def) => def._key === markKey)?.href;
  const findOpenInNewTab = (markKey?: string) =>
    markDefs.find((def): def is PortableTextLinkDef => def?._key === markKey && def._type === "link")
      ?.openInNewTab;
  const findRecommended = (markKey?: string) =>
    markDefs.find((def): def is PortableTextRecommendedKitDef => def?._key === markKey && def._type === "recommendedKitLink");

  return children.map((span) => {
    const marks: JSONContent["marks"] = [];
    (span.marks ?? []).forEach((mark) => {
      switch (mark) {
        case "strong":
          marks!.push({ type: "bold" });
          break;
        case "em":
          marks!.push({ type: "italic" });
          break;
        case "underline":
          marks!.push({ type: "underline" });
          break;
        case "strike":
          marks!.push({ type: "strike" });
          break;
        case "code":
          marks!.push({ type: "code" });
          break;
        case "highlight":
          marks!.push({ type: "highlight" });
          break;
        default: {
          const href = findHref(mark);
          if (href) {
            marks!.push({
              type: "link",
              attrs: {
                href,
                target: findOpenInNewTab(mark) ? "_blank" : undefined,
              },
            });
            break;
          }
          const recommended = findRecommended(mark);
          if (recommended) {
            marks!.push({
              type: "link",
              attrs: {
                href: recommended.href || undefined,
                target: recommended.openInNewTab ? "_blank" : undefined,
                "data-kit-ref": recommended.kit?._ref,
                "data-kit-label": recommended.label,
              },
            });
          }
        }
      }
    });
    return { type: "text", text: span.text ?? "", marks: marks!.length ? marks : undefined };
  });
}

const minimalDoc = (): JSONContent => ({
  type: "doc",
  content: [{ type: "paragraph", content: [] }],
});
