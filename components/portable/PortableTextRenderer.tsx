import type {
  PortableTextBlock,
  PortableTextBlockImage,
  PortableTextContent,
  PortableTextFigure,
  PortableTextMarkDef,
  PortableTextSpan,
  PortableTextStepList,
  PortableTextVideoBlock,
  PortableTextVideoEmbed,
} from "@/types/portableText";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { urlFor } from "@/sanity/lib/image";
import { cn } from "@/lib/utils";

type PortableTextRendererProps = {
  value?: PortableTextContent | null;
  options?: {
    accentCtaStrategy?: string;
    headingIdMap?: Record<string, string>;
    blockIdMap?: Map<string, string> | Record<string, string>;
  };
};

type PortableTextTocItem = {
  id: string;
  text: string;
  level: "h2" | "h3" | "h4";
};

type PortableTextToc = {
  items: PortableTextTocItem[];
  idByKey: Record<string, string>;
};

const getBlockText = (block: PortableTextBlock) => {
  const children = Array.isArray(block.children) ? block.children : [];
  return children
    .map((child) => child?.text || "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
};

const slugifyHeading = (value: string) => {
  const slug = value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
};

const createUniqueId = (base: string, counts: Map<string, number>) => {
  const next = (counts.get(base) || 0) + 1;
  counts.set(base, next);
  return next === 1 ? base : `${base}-${next}`;
};

const getBlockAnchorId = (
  blockIdMap?: Map<string, string> | Record<string, string>,
  key?: string
) => {
  if (!blockIdMap || !key) return undefined;
  if (blockIdMap instanceof Map) {
    return blockIdMap.get(key);
  }
  return (blockIdMap as Record<string, string>)[key];
};

const resolveBlockAnchorId = (
  block: PortableTextBlock,
  index: number,
  blockIdMap?: Map<string, string> | Record<string, string>
) => {
  const fallbackKeys = [
    block._key,
    block._type ? `${block._type}-${index}` : undefined,
    `quiz-${index}`,
    `references-${index}`,
  ].filter(Boolean) as string[];

  for (const key of fallbackKeys) {
    const resolved = getBlockAnchorId(blockIdMap, key);
    if (resolved) return resolved;
  }

  return undefined;
};

export const getPortableTextPlainText = (value?: PortableTextContent | null) => {
  const blocks = Array.isArray(value) ? value : [];
  const chunks = blocks
    .filter((block): block is PortableTextBlock => block?._type === "block")
    .map((block) => getBlockText(block))
    .filter((text) => text.length > 0);
  return chunks.join("\n\n").trim();
};

export const estimateReadingTime = (value?: PortableTextContent | null) => {
  const text = getPortableTextPlainText(value);
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!words) return 0;
  return Math.max(1, Math.ceil(words / 200));
};

export const buildPortableTextToc = (value?: PortableTextContent | null): PortableTextToc => {
  const blocks = Array.isArray(value) ? value : [];
  const items: PortableTextTocItem[] = [];
  const idByKey: Record<string, string> = {};
  const counts = new Map<string, number>();

  blocks.forEach((block) => {
    if (!block || block._type !== "block") return;
    const style = block.style || "normal";
    if (style !== "h2" && style !== "h3" && style !== "h4") return;
    const text = getBlockText(block);
    if (!text) return;
    const base = slugifyHeading(text);
    const id = createUniqueId(base, counts);
    const key = (block as { _key?: string })._key;
    if (key) {
      idByKey[key] = id;
    }
    items.push({
      id,
      text,
      level: style,
    });
  });

  return { items, idByKey };
};

const resolveLink = (href?: string) => {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  return trimmed;
};

const wrapWithMark = (
  mark: string,
  content: ReactNode,
  markDefs?: PortableTextMarkDef[]
) => {
  if (mark === "strong") return <strong>{content}</strong>;
  if (mark === "em") return <em>{content}</em>;
  if (mark === "code") return <code>{content}</code>;
  if (mark === "underline") return <span className="underline">{content}</span>;
  if (mark === "strike-through" || mark === "strike") {
    return <span className="line-through">{content}</span>;
  }
  if (mark === "highlight") {
    return <mark className="bg-amber-200/60 px-0.5 rounded-sm">{content}</mark>;
  }

  const def = markDefs?.find((item) => item?._key === mark);
  if (def?._type === "link") {
    const href = resolveLink(def.href);
    if (!href) return content;
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      return (
        <a href={href} target={def.openInNewTab ? "_blank" : undefined} rel="noopener noreferrer">
          {content}
        </a>
      );
    }
    return (
      <Link href={href} target={def.openInNewTab ? "_blank" : undefined}>
        {content}
      </Link>
    );
  }

  if (def?._type === "recommendedKitLink") {
    const href = resolveLink((def as any)?.href);
    const label = (def as any)?.label;
    const isExternal = href ? /^https?:\/\//i.test(href) : false;
    const node = href ? (
      <Link href={href} target={def?.openInNewTab ? "_blank" : undefined}>
        {label || content}
      </Link>
    ) : (
      content
    );
    return isExternal ? (
      <a href={href || "#"} target="_blank" rel="noopener noreferrer">
        {label || content}
      </a>
    ) : (
      node
    );
  }

  return content;
};

const renderSpan = (
  span: PortableTextSpan,
  index: number,
  markDefs?: PortableTextMarkDef[]
) => {
  const text = span.text ?? "";
  const marks = Array.isArray(span.marks) ? span.marks : [];
  const rendered = marks.reduce<ReactNode>(
    (content, mark) => wrapWithMark(mark, content, markDefs),
    text
  );

  return (
    <span key={span._key || `span-${index}`}>
      {rendered}
    </span>
  );
};

const renderBlockContent = (block: PortableTextBlock) => {
  const children = Array.isArray(block.children) ? block.children : [];
  const markDefs = Array.isArray(block.markDefs) ? block.markDefs : [];
  return children.map((child, childIndex) => renderSpan(child, childIndex, markDefs));
};

const renderBlock = (
  block: PortableTextBlock,
  index: number,
  options: PortableTextRendererProps["options"],
  headingCounts: Map<string, number>
) => {
  if (!block || block._type !== "block") return null;

  const style = block.style || "normal";
  const content = renderBlockContent(block);
  const key = block._key || `block-${index}`;

  if (!content || content.length === 0) return null;

  const headingId = (() => {
    if (style !== "h1" && style !== "h2" && style !== "h3" && style !== "h4") {
      return undefined;
    }
    if (block._key && options?.headingIdMap?.[block._key]) {
      return options.headingIdMap[block._key];
    }
    const text = getBlockText(block);
    if (!text) return undefined;
    return createUniqueId(slugifyHeading(text), headingCounts);
  })();

  const headingProps = headingId
    ? { id: headingId, "data-outline-id": headingId }
    : undefined;

  switch (style) {
    case "code":
      return (
        <pre
          key={key}
          className="my-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm leading-relaxed text-slate-100"
        >
          <code className="whitespace-pre-wrap break-words">{content}</code>
        </pre>
      );
    case "h1":
      return (
        <h1 key={key} className="scroll-mt-24" {...headingProps}>
          {content}
        </h1>
      );
    case "h2":
      return (
        <h2 key={key} className="scroll-mt-24" {...headingProps}>
          {content}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="scroll-mt-24" {...headingProps}>
          {content}
        </h3>
      );
    case "h4":
      return (
        <h4 key={key} className="scroll-mt-24" {...headingProps}>
          {content}
        </h4>
      );
    case "blockquote":
      return <blockquote key={key}>{content}</blockquote>;
    default:
      return <p key={key}>{content}</p>;
  }
};

const renderBlocks = (
  blocks: PortableTextContent,
  options?: PortableTextRendererProps["options"]
) => {
  const elements: ReactNode[] = [];
  let listType: "bullet" | "number" | null = null;
  let listItems: ReactNode[] = [];
  const headingCounts = new Map<string, number>();
  if (options?.headingIdMap) {
    Object.values(options.headingIdMap).forEach((id) => {
      if (!id) return;
      const match = id.match(/^(.*?)(?:-(\d+))?$/);
      const base = match?.[1] || id;
      const suffix = match?.[2] ? Number.parseInt(match[2], 10) : 1;
      const current = headingCounts.get(base) || 0;
      headingCounts.set(base, Math.max(current, Number.isNaN(suffix) ? 1 : suffix));
    });
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    const listKey = `list-${elements.length}-${listType}`;
    const list = listType === "number" ? (
      <ol key={listKey}>{listItems}</ol>
    ) : (
      <ul key={listKey}>{listItems}</ul>
    );
    elements.push(list);
    listType = null;
    listItems = [];
  };

  blocks.forEach((block, index) => {
    if (!block) return;
    const blockType = (block as { _type?: string })._type;

    if (blockType !== "block") {
      // Custom object types
      if (blockType === "blockImage") {
        flushList();
        elements.push(
          <BlockImageRenderer
            key={String((block as { _key?: string })._key ?? `block-image-${index}`)}
            value={block as PortableTextBlockImage}
          />
        );
        return;
      }
      if (blockType === "inlineImage" || blockType === "image") {
        flushList();
        elements.push(
          <InlineImageRenderer
            key={String((block as { _key?: string })._key ?? `inline-image-${index}`)}
            value={block as any}
          />
        );
        return;
      }
      if (blockType === "figure") {
        flushList();
        elements.push(
          <FigureRenderer
            key={String((block as { _key?: string })._key ?? `figure-${index}`)}
            value={block as PortableTextFigure}
          />
        );
        return;
      }
      if (blockType === "callout") {
        flushList();
        elements.push(
          <CalloutRenderer
            key={String((block as { _key?: string })._key ?? `callout-${index}`)}
            value={block as any}
            options={options}
          />
        );
        return;
      }
      if (blockType === "videoEmbed") {
        flushList();
        elements.push(
          <VideoEmbedRenderer
            key={String((block as { _key?: string })._key ?? `video-${index}`)}
            value={block as PortableTextVideoEmbed}
          />
        );
        return;
      }
      if (blockType === "videoBlock") {
        flushList();
        elements.push(
          <VideoBlockRenderer
            key={String((block as { _key?: string })._key ?? `video-block-${index}`)}
            value={block as PortableTextVideoBlock}
          />
        );
        return;
      }
      if (blockType === "stepList") {
        flushList();
        elements.push(
          <StepListRenderer
            key={String((block as { _key?: string })._key ?? `step-list-${index}`)}
            value={block as PortableTextStepList}
          />
        );
        return;
      }
      if (blockType === "break") {
        flushList();
        elements.push(
          <hr
            key={(block as PortableTextBlock)?._key || `hr-${index}`}
            className="my-10 border-t border-border/60"
          />,
        );
        return;
      }

      const anchorId = resolveBlockAnchorId(block, index, options?.blockIdMap);
      if (anchorId) {
        flushList();
        elements.push(
          <div
            key={(block as PortableTextBlock)?._key || `anchor-${index}`}
            id={anchorId}
            data-outline-id={anchorId}
            className="scroll-mt-24"
          />
        );
      }
      return;
    }

    const typedBlock = block as PortableTextBlock;

    if (typedBlock.listItem) {
      const itemType = typedBlock.listItem === "number" ? "number" : "bullet";
      if (listType && listType !== itemType) {
        flushList();
      }
      listType = itemType;
      listItems.push(
        <li key={typedBlock._key || `li-${index}`}>{renderBlockContent(typedBlock)}</li>
      );
      return;
    }

    flushList();
    const rendered = renderBlock(typedBlock, index, options, headingCounts);
    if (rendered) {
      elements.push(rendered);
    }
  });

  flushList();

  return elements;
};

const PortableTextRenderer = ({ value, options }: PortableTextRendererProps) => {
  const blocks = Array.isArray(value) ? value : [];
  if (!blocks.length) {
    return null;
  }

  return <>{renderBlocks(blocks, options)}</>;
};

type BlockImageRendererProps = {
  value: PortableTextBlockImage;
};

type InlineImageRendererProps = {
  value: { asset?: { _ref?: string }; alt?: string; caption?: string; credit?: string };
};

type FigureRendererProps = {
  value: PortableTextFigure;
};

type StepListRendererProps = {
  value: PortableTextStepList;
};

const alignmentClassMap: Record<NonNullable<PortableTextBlockImage["alignment"]>, string> = {
  full: "mx-[-5vw] sm:mx-0 sm:w-full lg:mx-[-10vw] xl:mx-[-15vw] max-w-none",
  wide: "w-full max-w-5xl mx-auto",
  center: "mx-auto",
  left: "lg:float-left lg:mr-6 lg:max-w-md",
  right: "lg:float-right lg:ml-6 lg:max-w-md",
};

const widthClassMap: Record<NonNullable<PortableTextBlockImage["width"]>, string> = {
  small: "max-w-md",
  medium: "max-w-3xl",
  large: "max-w-5xl",
};

const BlockImageRenderer = ({ value }: BlockImageRendererProps) => {
  const { image, alt, isDecorative, caption, alignment = "center", width = "large" } = value;
  if (!image) return null;

  const urlBuilder = urlFor(image).auto("format");
  const src = urlBuilder.width(1600).url();
  const sizes = "(min-width: 1280px) 1100px, (min-width: 1024px) 900px, (min-width: 768px) 720px, 100vw";
  const figureClass = cn(
    "my-8 clear-both",
    alignmentClassMap[alignment] || alignmentClassMap.center,
    widthClassMap[width] || widthClassMap.large
  );

  const imageAlt = isDecorative ? "" : alt || "";
  const role = isDecorative ? "presentation" : undefined;

  const figcaptionText = [caption, (value as any).credit].filter(Boolean).join(" · ");

  return (
    <figure className={figureClass}>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-0 shadow-sm">
        <Image
          src={src}
          alt={imageAlt}
          role={role}
          width={1600}
          height={900}
          className="h-auto w-full object-cover"
          sizes={sizes}
        />
      </div>
      {figcaptionText ? (
        <figcaption className="mt-2 text-sm text-ink-muted">{figcaptionText}</figcaption>
      ) : null}
    </figure>
  );
};

const InlineImageRenderer = ({ value }: InlineImageRendererProps) => {
  const { asset, alt, caption, credit } = value || {};
  const image = asset ? { asset } : (value as any);
  if (!image?.asset?._ref) return null;
  const src = urlFor(image).auto("format").width(1200).url();
  const sizes = "(min-width: 1024px) 720px, 100vw";
  const figcaptionText = [caption, credit].filter(Boolean).join(" · ");
  return (
    <figure className="my-6 space-y-2">
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Image
          src={src}
          alt={alt || ""}
          width={1200}
          height={800}
          className="h-auto w-full object-cover"
          sizes={sizes}
        />
      </div>
      {figcaptionText ? (
        <figcaption className="text-xs text-ink-muted">{figcaptionText}</figcaption>
      ) : null}
    </figure>
  );
};

const FigureRenderer = ({ value }: FigureRendererProps) => {
  const image = value?.image;
  if (!image?.asset?._ref) return null;
  const src = urlFor(image).auto("format").width(1600).url();
  const zoomUrl = value?.enableZoom ? urlFor(image).auto("format").width(2400).url() : null;
  const sizes = "(min-width: 1024px) 900px, 100vw";
  const figcaptionText = [image.caption, image.credit].filter(Boolean).join(" · ");

  const imageNode = (
    <Image
      src={src}
      alt={image.alt || ""}
      width={1600}
      height={1000}
      className="h-auto w-full rounded-2xl border border-border object-cover"
      sizes={sizes}
    />
  );

  return (
    <figure className="my-8 space-y-2">
      {zoomUrl ? (
        <Link href={zoomUrl} target="_blank" rel="noopener noreferrer">
          {imageNode}
        </Link>
      ) : (
        imageNode
      )}
      {figcaptionText ? (
        <figcaption className="text-xs text-ink-muted">{figcaptionText}</figcaption>
      ) : null}
    </figure>
  );
};

const CalloutRenderer = ({
  value,
  options,
}: {
  value: any;
  options?: PortableTextRendererProps["options"];
}) => {
  const variant = value?.variant || "note";
  const variantClasses: Record<string, string> = {
    note: "border-l-4 border-blue-300 bg-blue-50/70 text-blue-950",
    tip: "border-l-4 border-emerald-300 bg-emerald-50/70 text-emerald-950",
    warning: "border-l-4 border-amber-300 bg-amber-50/70 text-amber-950",
    example: "border-l-4 border-purple-300 bg-purple-50/70 text-purple-950",
    definition: "border-l-4 border-slate-300 bg-slate-50 text-slate-900",
  };
  const body = Array.isArray(value?.body) ? (value.body as PortableTextContent) : [];
  return (
    <aside className={cn("my-6 rounded-2xl border p-5 text-sm", variantClasses[variant] || variantClasses.note)}>
      {value?.title ? (
        <p className="text-xs font-semibold uppercase tracking-[0.12em]">{value.title}</p>
      ) : null}
      {body.length ? (
        <div className="prose prose-sm max-w-none text-current space-y-2">
          {renderBlocks(body, options)}
        </div>
      ) : null}
    </aside>
  );
};

const toEmbedUrl = (url?: string | null) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    const id = trimmed.includes("youtu.be/")
      ? trimmed.split("youtu.be/")[1]?.split(/[?&]/)[0]
      : (() => {
          try {
            return new URL(trimmed).searchParams.get("v");
          } catch {
            return null;
          }
        })();
    return id ? `https://www.youtube.com/embed/${id}` : trimmed;
  }

  if (trimmed.includes("vimeo.com")) {
    const id = trimmed.split("vimeo.com/")[1]?.split(/[?&]/)[0];
    return id ? `https://player.vimeo.com/video/${id}` : trimmed;
  }

  return trimmed;
};

const VideoEmbedRenderer = ({ value }: { value: PortableTextVideoEmbed }) => {
  const url = toEmbedUrl(value?.url);
  if (!url) return null;
  const isMp4 = url.endsWith(".mp4") || url.endsWith(".webm");
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border bg-black">
      {value?.title ? (
        <div className="bg-surface-0 px-4 py-3 text-sm font-semibold text-ink-strong border-b border-border">
          {value.title}
        </div>
      ) : null}
      {isMp4 ? (
        <video controls preload="none" poster={value?.poster ? urlFor(value.poster).width(1280).url() : undefined} className="h-full w-full">
          <source src={url} />
        </video>
      ) : (
        <iframe
          src={url}
          title={value?.title || "Embedded video"}
          className="h-[360px] w-full md:h-[420px]"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {value?.transcript ? (
        <details className="bg-surface-0 p-3 text-sm text-ink">
          <summary className="cursor-pointer font-semibold">Transcript</summary>
          <p className="mt-2 whitespace-pre-line text-ink-muted">{value.transcript}</p>
        </details>
      ) : null}
    </div>
  );
};

const VideoBlockRenderer = ({ value }: { value: PortableTextVideoBlock }) => {
  const url = toEmbedUrl(value?.url);
  if (!url) return null;
  return (
    <div className="my-6 overflow-hidden rounded-2xl border border-border bg-black">
      {value?.title ? (
        <div className="bg-surface-0 px-4 py-3 text-sm font-semibold text-ink-strong border-b border-border">
          {value.title}
        </div>
      ) : null}
      <iframe
        src={url}
        title={value?.title || "Video"}
        className="h-[360px] w-full md:h-[420px]"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      <div className="bg-surface-0 p-4 text-sm text-ink space-y-3">
        {value?.transcriptUrl ? (
          <div>
            <Link href={value.transcriptUrl} target="_blank" rel="noopener noreferrer" className="text-ink-strong underline">
              View transcript
            </Link>
          </div>
        ) : null}
        {Array.isArray(value?.keyMoments) && value.keyMoments.length ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.1em] text-ink-muted">Key moments</p>
            <ol className="space-y-1 text-sm text-ink">
              {value.keyMoments.map((km, idx) => (
                <li key={km?._key || idx} className="flex gap-2">
                  <span className="font-semibold">{km?.timestamp || "--:--"}</span>
                  <div>
                    <p className="font-semibold">{km?.label || `Moment ${idx + 1}`}</p>
                    {km?.description ? <p className="text-ink-muted">{km.description}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const StepListRenderer = ({ value }: StepListRendererProps) => {
  const steps = Array.isArray(value?.steps) ? value.steps : [];
  if (!steps.length) return null;
  return (
    <section className="my-6 space-y-3 rounded-2xl border border-border bg-surface-0 p-5">
      {value?.title ? <h3 className="text-lg font-semibold text-ink-strong">{value.title}</h3> : null}
      <ol className="space-y-3 text-sm text-ink">
        {steps.map((step, idx) => (
          <li key={step?._key || idx} className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-ink-strong">
                {idx + 1}. {step?.title || "Step"}
              </p>
              {step?.duration ? (
                <span className="text-xs rounded-full bg-surface-1 px-2 py-1 text-ink-muted">{step.duration}</span>
              ) : null}
            </div>
            {step?.description ? <p className="mt-2 text-ink-muted">{step.description}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
};

export default PortableTextRenderer;
