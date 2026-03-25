"use client";

import { Fragment, useId } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PortableTextBlock, PortableTextSpan } from "@/types/portableText";

type BlockBase<T extends string> = { _key: string; _type: T };

type TextBlock = BlockBase<"block"> & {
  style: "normal" | "h1" | "h2" | "h3";
  listItem?: "bullet" | "number";
  level?: number;
  children: PortableTextSpan[];
  markDefs: PortableTextBlock["markDefs"];
};

type BlockImage = BlockBase<"blockImage"> & {
  url?: string;
  alt?: string;
  caption?: string;
  alignment?: "full" | "wide" | "center" | "left" | "right";
  width?: "small" | "medium" | "large";
  isDecorative?: boolean;
};

type CalloutBlock = BlockBase<"callout"> & {
  variant?: "note" | "tip" | "warning" | "example" | "definition";
  title?: string;
  body?: string;
};

type FigureBlock = BlockBase<"figure"> & {
  url?: string;
  caption?: string;
  credit?: string;
  enableZoom?: boolean;
  alt?: string;
};

type VideoEmbedBlock = BlockBase<"videoEmbed"> & {
  title?: string;
  url?: string;
  posterUrl?: string;
  transcript?: string;
};

type VideoBlock = BlockBase<"videoBlock"> & {
  title?: string;
  url?: string;
  transcriptUrl?: string;
  posterUrl?: string;
};

type StepListBlock = BlockBase<"stepList"> & {
  title?: string;
  steps: { _key: string; title: string; description?: string; duration?: string }[];
};

type StepByStepBlock = BlockBase<"stepByStep"> & {
  title?: string;
  steps: { _key: string; title: string; body?: string; duration?: string }[];
};

type KnowledgeCheckBlock = BlockBase<"knowledgeCheck"> & {
  question: string;
  options: { _key: string; text: string; isCorrect?: boolean }[];
  explanation?: string;
};

type QuizBlock = BlockBase<"quiz"> & {
  question: string;
  answers: string[];
  correctAnswerIndex: number;
  explanation?: string;
};

type ComparisonTableBlock = BlockBase<"comparisonTable"> & {
  title?: string;
  description?: string;
  columns: { _key: string; label: string; align?: "left" | "center" | "right" }[];
  rows: { _key: string; label: string; cells: string[]; highlight?: boolean }[];
  footnote?: string;
};

type ResourcePackBlock = BlockBase<"resourcePackEmbed"> & {
  title?: string;
  ctaLabel?: string;
  resourceUrl?: string;
};

type ProductCtaBlock = BlockBase<"productInlineCta"> & {
  title?: string;
  description?: string;
  buttonLabel?: string;
  url?: string;
  eyebrow?: string;
};

export type RichBlock =
  | TextBlock
  | BlockImage
  | CalloutBlock
  | FigureBlock
  | VideoEmbedBlock
  | VideoBlock
  | StepListBlock
  | StepByStepBlock
  | KnowledgeCheckBlock
  | QuizBlock
  | ComparisonTableBlock
  | ResourcePackBlock
  | ProductCtaBlock;

type BlockKind =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bulletList"
  | "numberList"
  | "inlineImage"
  | "callout"
  | "figure"
  | "videoEmbed"
  | "video"
  | "stepsSimple"
  | "stepsDetailed"
  | "knowledgeCheck"
  | "quiz"
  | "comparisonTable"
  | "resourcePack"
  | "productCta";

const createKey = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const spanFromText = (text: string, marks: PortableTextSpan["marks"] = []): PortableTextSpan => ({
  _key: createKey(),
  _type: "span",
  text,
  marks,
});

const makeBlock = (kind: BlockKind): RichBlock => {
  switch (kind) {
    case "paragraph":
      return {
        _key: createKey(),
        _type: "block",
        style: "normal",
        children: [spanFromText("")],
        markDefs: [],
      };
    case "h1":
      return {
        _key: createKey(),
        _type: "block",
        style: "h1",
        children: [spanFromText("")],
        markDefs: [],
      };
    case "h2":
      return {
        _key: createKey(),
        _type: "block",
        style: "h2",
        children: [spanFromText("")],
        markDefs: [],
      };
    case "h3":
      return {
        _key: createKey(),
        _type: "block",
        style: "h3",
        children: [spanFromText("")],
        markDefs: [],
      };
    case "bulletList":
      return {
        _key: createKey(),
        _type: "block",
        style: "normal",
        listItem: "bullet",
        level: 1,
        children: [spanFromText("")],
        markDefs: [],
      };
    case "numberList":
      return {
        _key: createKey(),
        _type: "block",
        style: "normal",
        listItem: "number",
        level: 1,
        children: [spanFromText("")],
        markDefs: [],
      };
    case "inlineImage":
      return {
        _key: createKey(),
        _type: "blockImage",
        alt: "",
        caption: "",
        url: "",
        alignment: "center",
        width: "large",
        isDecorative: false,
      };
    case "callout":
      return {
        _key: createKey(),
        _type: "callout",
        variant: "note",
        title: "",
        body: "",
      };
    case "figure":
      return {
        _key: createKey(),
        _type: "figure",
        url: "",
        caption: "",
        credit: "",
        enableZoom: false,
        alt: "",
      };
    case "videoEmbed":
      return {
        _key: createKey(),
        _type: "videoEmbed",
        title: "",
        url: "",
        posterUrl: "",
        transcript: "",
      };
    case "video":
      return {
        _key: createKey(),
        _type: "videoBlock",
        title: "",
        url: "",
        posterUrl: "",
        transcriptUrl: "",
      };
    case "stepsSimple":
      return {
        _key: createKey(),
        _type: "stepList",
        title: "",
        steps: [
          { _key: createKey(), title: "Step 1", description: "" },
          { _key: createKey(), title: "Step 2", description: "" },
        ],
      };
    case "stepsDetailed":
      return {
        _key: createKey(),
        _type: "stepByStep",
        title: "",
        steps: [
          { _key: createKey(), title: "Step 1", body: "" },
          { _key: createKey(), title: "Step 2", body: "" },
        ],
      };
    case "knowledgeCheck":
      return {
        _key: createKey(),
        _type: "knowledgeCheck",
        question: "",
        options: [
          { _key: createKey(), text: "Option A", isCorrect: true },
          { _key: createKey(), text: "Option B", isCorrect: false },
        ],
        explanation: "",
      };
    case "quiz":
      return {
        _key: createKey(),
        _type: "quiz",
        question: "",
        answers: ["Option A", "Option B", "Option C"],
        correctAnswerIndex: 0,
        explanation: "",
      };
    case "comparisonTable":
      return {
        _key: createKey(),
        _type: "comparisonTable",
        title: "",
        description: "",
        columns: [
          { _key: createKey(), label: "Column A", align: "left" },
          { _key: createKey(), label: "Column B", align: "left" },
        ],
        rows: [
          { _key: createKey(), label: "Row 1", cells: ["", ""], highlight: false },
          { _key: createKey(), label: "Row 2", cells: ["", ""], highlight: false },
        ],
        footnote: "",
      };
    case "resourcePack":
      return {
        _key: createKey(),
        _type: "resourcePackEmbed",
        title: "",
        ctaLabel: "View resources",
        resourceUrl: "",
      };
    case "productCta":
      return {
        _key: createKey(),
        _type: "productInlineCta",
        title: "",
        description: "",
        buttonLabel: "View details",
        url: "",
        eyebrow: "",
      };
    default:
      return {
        _key: createKey(),
        _type: "block",
        style: "normal",
        children: [spanFromText("")],
        markDefs: [],
      };
  }
};

export type RichContentEditorProps = {
  label: string;
  description?: string;
  value?: PortableTextBlock[];
  onChange: (value: PortableTextBlock[]) => void;
  error?: string | null;
};

const blockPalette: { value: BlockKind; label: string }[] = [
  { value: "paragraph", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
  { value: "bulletList", label: "Bulleted list" },
  { value: "numberList", label: "Numbered list" },
  { value: "inlineImage", label: "Inline image" },
  { value: "callout", label: "Callout" },
  { value: "figure", label: "Figure" },
  { value: "videoEmbed", label: "Video embed" },
  { value: "video", label: "Video" },
  { value: "stepsSimple", label: "Step-by-step (simple)" },
  { value: "stepsDetailed", label: "Step-by-step (detailed)" },
  { value: "knowledgeCheck", label: "Knowledge check" },
  { value: "quiz", label: "Quiz" },
  { value: "comparisonTable", label: "Comparison table" },
  { value: "resourcePack", label: "Resource pack" },
  { value: "productCta", label: "Product CTA" },
];

export function RichContentEditor({
  label,
  description,
  value,
  onChange,
  error,
}: RichContentEditorProps) {
  const fieldId = useId();
  const blocks = (value ?? []) as RichBlock[];

  const updateBlock = (index: number, updated: RichBlock) => {
    const next = [...blocks];
    next[index] = updated;
    onChange(next);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const removeBlock = (index: number) => {
    const next = blocks.filter((_, i) => i !== index);
    onChange(next);
  };

  const addBlock = (kind: BlockKind) => {
    const next = [...blocks, makeBlock(kind)];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor={fieldId} className="text-sm font-semibold text-slate-900">
          {label}
        </Label>
        {description ? <p className="text-xs text-slate-600">{description}</p> : null}
        <div className="flex flex-wrap gap-2">
          {blockPalette.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant="outline"
              className="border-dashed"
              onClick={() => addBlock(option.value)}
            >
              + {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div
        id={fieldId}
        className={`space-y-3 rounded-lg border ${error ? "border-red-400 ring-2 ring-red-100" : "border-slate-200"} bg-white p-3`}
      >
        {blocks.length === 0 ? (
          <p className="text-sm text-slate-500">Add blocks to start building the body.</p>
        ) : (
          blocks.map((block, index) => (
            <BlockCard
              key={block._key}
              block={block}
              index={index}
              total={blocks.length}
              onUpdate={(updated) => updateBlock(index, updated)}
              onMove={moveBlock}
              onRemove={() => removeBlock(index)}
            />
          ))
        )}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

type BlockCardProps = {
  block: RichBlock;
  index: number;
  total: number;
  onUpdate: (block: RichBlock) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: () => void;
};

const BlockCard = ({ block, index, total, onUpdate, onMove, onRemove }: BlockCardProps) => {
  const headerLabel = (() => {
    switch (block._type) {
      case "block":
        return block.style?.toUpperCase() || "Text";
      case "blockImage":
        return "Inline image";
      case "callout":
        return "Callout";
      case "figure":
        return "Figure";
      case "videoEmbed":
        return "Video embed";
      case "videoBlock":
        return "Video";
      case "stepList":
        return "Steps (simple)";
      case "stepByStep":
        return "Steps (detailed)";
      case "knowledgeCheck":
        return "Knowledge check";
      case "quiz":
        return "Quiz";
      case "comparisonTable":
        return "Comparison table";
      case "resourcePackEmbed":
        return "Resource pack";
      case "productInlineCta":
        return "Product CTA";
      default:
        return "Block";
    }
  })();

  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <p className="text-sm font-semibold text-slate-800">
          {index + 1}. {headerLabel}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            aria-label="Move up"
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            aria-label="Move down"
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600"
            onClick={onRemove}
            aria-label="Remove"
          >
            ×
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {renderBlockFields(block, onUpdate)}
      </div>
    </div>
  );
};

const renderBlockFields = (block: RichBlock, onUpdate: (block: RichBlock) => void) => {
  switch (block._type) {
    case "block":
      return renderTextBlock(block, onUpdate);
    case "blockImage":
      return renderInlineImageBlock(block, onUpdate);
    case "callout":
      return renderCalloutBlock(block, onUpdate);
    case "figure":
      return renderFigureBlock(block, onUpdate);
    case "videoEmbed":
      return renderVideoEmbedBlock(block, onUpdate);
    case "videoBlock":
      return renderVideoBlock(block, onUpdate);
    case "stepList":
      return renderStepListBlock(block, onUpdate);
    case "stepByStep":
      return renderStepByStepBlock(block, onUpdate);
    case "knowledgeCheck":
      return renderKnowledgeCheckBlock(block, onUpdate);
    case "quiz":
      return renderQuizBlock(block, onUpdate);
    case "comparisonTable":
      return renderComparisonTableBlock(block, onUpdate);
    case "resourcePackEmbed":
      return renderResourcePackBlock(block, onUpdate);
    case "productInlineCta":
      return renderProductCtaBlock(block, onUpdate);
    default:
      return null;
  }
};

const renderTextBlock = (block: TextBlock, onUpdate: (block: RichBlock) => void) => {
  const text = (block.children?.[0]?.text ?? "") as string;
  return (
    <Fragment>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Style</Label>
          <Select
            value={block.style}
            onValueChange={(value) => onUpdate({ ...block, style: value as TextBlock["style"] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Paragraph</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
              <SelectItem value="h3">Heading 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">List</Label>
          <Select
            value={block.listItem ?? "none"}
            onValueChange={(value) =>
              onUpdate({
                ...block,
                listItem: value === "none" ? undefined : (value as TextBlock["listItem"]),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="List type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bullet">Bulleted</SelectItem>
              <SelectItem value="number">Numbered</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-600">Indent</Label>
          <Input
            type="number"
            min={1}
            max={4}
            value={block.level ?? 1}
            onChange={(event) =>
              onUpdate({ ...block, level: Number(event.target.value) || 1 })
            }
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Text</Label>
        <Textarea
          rows={3}
          value={text}
          onChange={(event) =>
            onUpdate({
              ...block,
              children: [spanFromText(event.target.value, block.children?.[0]?.marks ?? [])],
            })
          }
          placeholder="Write the paragraph or heading text"
        />
      </div>
    </Fragment>
  );
};

const renderInlineImageBlock = (block: BlockImage, onUpdate: (block: RichBlock) => void) => (
  <div className="grid gap-3 md:grid-cols-2">
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Image URL</Label>
      <Input
        value={block.url ?? ""}
        onChange={(event) => onUpdate({ ...block, url: event.target.value })}
        placeholder="https://..."
      />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Alt text</Label>
      <div className="space-y-1">
        <Input
          value={block.alt ?? ""}
          onChange={(event) => onUpdate({ ...block, alt: event.target.value })}
          placeholder="Describe the image (leave blank if decorative)"
        />
        <div className="flex justify-end text-[11px] font-medium text-slate-400">
          <span className={(block.alt?.length ?? 0) > 125 ? "text-amber-500" : "text-slate-400"}>
            {(block.alt?.length ?? 0)} / 125 chars
          </span>
        </div>
        <p className={`text-[11px] transition-opacity duration-150 ${(block.alt?.length ?? 0) > 125 ? "text-amber-500" : "opacity-0"}`}>
          Screen readers recommend alt text under 125 characters
        </p>
      </div>
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Caption</Label>
      <Input
        value={block.caption ?? ""}
        onChange={(event) => onUpdate({ ...block, caption: event.target.value })}
        placeholder="Optional caption"
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Alignment</Label>
        <Select
          value={block.alignment ?? "center"}
          onValueChange={(value) => onUpdate({ ...block, alignment: value as BlockImage["alignment"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="full">Full bleed</SelectItem>
            <SelectItem value="wide">Wide</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Width</Label>
        <Select
          value={block.width ?? "large"}
          onValueChange={(value) => onUpdate({ ...block, width: value as BlockImage["width"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

const renderCalloutBlock = (block: CalloutBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <div className="grid gap-2 md:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Variant</Label>
        <Select
          value={block.variant ?? "note"}
          onValueChange={(value) => onUpdate({ ...block, variant: value as CalloutBlock["variant"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="note">Note</SelectItem>
            <SelectItem value="tip">Tip</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="example">Example</SelectItem>
            <SelectItem value="definition">Definition</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Title</Label>
        <Input
          value={block.title ?? ""}
          onChange={(event) => onUpdate({ ...block, title: event.target.value })}
          placeholder="Optional heading"
        />
      </div>
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Body</Label>
      <Textarea
        rows={3}
        value={block.body ?? ""}
        onChange={(event) => onUpdate({ ...block, body: event.target.value })}
        placeholder="Explain the note or tip"
      />
    </div>
  </div>
);

const renderFigureBlock = (block: FigureBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="grid gap-2 md:grid-cols-2">
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Image URL</Label>
      <Input
        value={block.url ?? ""}
        onChange={(event) => onUpdate({ ...block, url: event.target.value })}
        placeholder="https://..."
      />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Alt text</Label>
      <div className="space-y-1">
        <Input
          value={block.alt ?? ""}
          onChange={(event) => onUpdate({ ...block, alt: event.target.value })}
          placeholder="Describe the image"
        />
        <div className="flex justify-end text-[11px] font-medium text-slate-400">
          <span className={(block.alt?.length ?? 0) > 125 ? "text-amber-500" : "text-slate-400"}>
            {(block.alt?.length ?? 0)} / 125 chars
          </span>
        </div>
        <p className={`text-[11px] transition-opacity duration-150 ${(block.alt?.length ?? 0) > 125 ? "text-amber-500" : "opacity-0"}`}>
          Screen readers recommend alt text under 125 characters
        </p>
      </div>
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Caption</Label>
      <Input
        value={block.caption ?? ""}
        onChange={(event) => onUpdate({ ...block, caption: event.target.value })}
        placeholder="Add a caption"
      />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Credit</Label>
      <Input
        value={block.credit ?? ""}
        onChange={(event) => onUpdate({ ...block, credit: event.target.value })}
        placeholder="Source / photographer"
      />
    </div>
  </div>
);

const renderVideoEmbedBlock = (block: VideoEmbedBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <div className="grid gap-2 md:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Title</Label>
        <Input
          value={block.title ?? ""}
          onChange={(event) => onUpdate({ ...block, title: event.target.value })}
          placeholder="Optional title"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Video URL</Label>
        <Input
          value={block.url ?? ""}
          onChange={(event) => onUpdate({ ...block, url: event.target.value })}
          placeholder="YouTube / Vimeo / mp4"
        />
      </div>
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Transcript</Label>
      <Textarea
        rows={3}
        value={block.transcript ?? ""}
        onChange={(event) => onUpdate({ ...block, transcript: event.target.value })}
        placeholder="Optional transcript or notes"
      />
    </div>
  </div>
);

const renderVideoBlock = (block: VideoBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <div className="grid gap-2 md:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Title</Label>
        <Input
          value={block.title ?? ""}
          onChange={(event) => onUpdate({ ...block, title: event.target.value })}
          placeholder="Optional title"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Video URL</Label>
        <Input
          value={block.url ?? ""}
          onChange={(event) => onUpdate({ ...block, url: event.target.value })}
          placeholder="Upload URL or CDN link"
        />
      </div>
    </div>
    <div className="grid gap-2 md:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Poster image</Label>
        <Input
          value={block.posterUrl ?? ""}
          onChange={(event) => onUpdate({ ...block, posterUrl: event.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Transcript URL</Label>
        <Input
          value={block.transcriptUrl ?? ""}
          onChange={(event) => onUpdate({ ...block, transcriptUrl: event.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  </div>
);

const renderStepListBlock = (block: StepListBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <Input
      value={block.title ?? ""}
      onChange={(event) => onUpdate({ ...block, title: event.target.value })}
      placeholder="Section title (optional)"
    />
    <div className="space-y-2">
      {block.steps.map((step, idx) => (
        <div key={step._key} className="rounded border border-slate-200 bg-white p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Step {idx + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() =>
                onUpdate({
                  ...block,
                  steps: block.steps.filter((item) => item._key !== step._key),
                })
              }
              aria-label="Remove step"
            >
              ×
            </Button>
          </div>
          <div className="space-y-1">
            <Input
              value={step.title}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  steps: block.steps.map((item) =>
                    item._key === step._key ? { ...item, title: event.target.value } : item,
                  ),
                })
              }
              placeholder="Step title"
            />
            <Textarea
              rows={2}
              value={step.description ?? ""}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  steps: block.steps.map((item) =>
                    item._key === step._key ? { ...item, description: event.target.value } : item,
                  ),
                })
              }
              placeholder="Description"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          onUpdate({
            ...block,
            steps: [...block.steps, { _key: createKey(), title: `Step ${block.steps.length + 1}`, description: "" }],
          })
        }
      >
        + Add step
      </Button>
    </div>
  </div>
);

const renderStepByStepBlock = (block: StepByStepBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <Input
      value={block.title ?? ""}
      onChange={(event) => onUpdate({ ...block, title: event.target.value })}
      placeholder="Section title (optional)"
    />
    <div className="space-y-2">
      {block.steps.map((step, idx) => (
        <div key={step._key} className="rounded border border-slate-200 bg-white p-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">Step {idx + 1}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() =>
                onUpdate({
                  ...block,
                  steps: block.steps.filter((item) => item._key !== step._key),
                })
              }
              aria-label="Remove step"
            >
              ×
            </Button>
          </div>
          <div className="space-y-1">
            <Input
              value={step.title}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  steps: block.steps.map((item) =>
                    item._key === step._key ? { ...item, title: event.target.value } : item,
                  ),
                })
              }
              placeholder="Step title"
            />
            <Textarea
              rows={3}
              value={step.body ?? ""}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  steps: block.steps.map((item) =>
                    item._key === step._key ? { ...item, body: event.target.value } : item,
                  ),
                })
              }
              placeholder="Detailed body"
            />
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() =>
          onUpdate({
            ...block,
            steps: [...block.steps, { _key: createKey(), title: `Step ${block.steps.length + 1}`, body: "" }],
          })
        }
      >
        + Add step
      </Button>
    </div>
  </div>
);

const renderKnowledgeCheckBlock = (block: KnowledgeCheckBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <Input
      value={block.question}
      onChange={(event) => onUpdate({ ...block, question: event.target.value })}
      placeholder="Question"
    />
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Options</Label>
      <div className="space-y-2">
        {block.options.map((option, idx) => (
          <div key={option._key} className="flex items-center gap-2">
            <Input
              value={option.text}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  options: block.options.map((item) =>
                    item._key === option._key ? { ...item, text: event.target.value } : item,
                  ),
                })
              }
              className="flex-1"
              placeholder={`Option ${idx + 1}`}
            />
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="radio"
                name={`kc-correct-${block._key}`}
                checked={option.isCorrect === true}
                onChange={() =>
                  onUpdate({
                    ...block,
                    options: block.options.map((item) => ({
                      ...item,
                      isCorrect: item._key === option._key,
                    })),
                  })
                }
              />
              Correct
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() =>
                onUpdate({
                  ...block,
                  options: block.options.filter((item) => item._key !== option._key),
                })
              }
              aria-label="Remove option"
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onUpdate({
              ...block,
              options: [...block.options, { _key: createKey(), text: "New option", isCorrect: false }],
            })
          }
        >
          + Add option
        </Button>
      </div>
    </div>
    <Textarea
      rows={2}
      value={block.explanation ?? ""}
      onChange={(event) => onUpdate({ ...block, explanation: event.target.value })}
      placeholder="Explanation or reasoning (optional)"
    />
  </div>
);

const renderQuizBlock = (block: QuizBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <Input
      value={block.question}
      onChange={(event) => onUpdate({ ...block, question: event.target.value })}
      placeholder="Question"
    />
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Answers</Label>
      <div className="space-y-2">
        {block.answers.map((answer, idx) => (
          <div key={`${block._key}-answer-${idx}`} className="flex items-center gap-2">
            <Input
              value={answer}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  answers: block.answers.map((item, i) => (i === idx ? event.target.value : item)),
                })
              }
              className="flex-1"
              placeholder={`Answer ${idx + 1}`}
            />
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="radio"
                name={`quiz-correct-${block._key}`}
                checked={block.correctAnswerIndex === idx}
                onChange={() => onUpdate({ ...block, correctAnswerIndex: idx })}
              />
              Correct
            </label>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() =>
                onUpdate({
                  ...block,
                  answers: block.answers.filter((_, i) => i !== idx),
                  correctAnswerIndex:
                    block.correctAnswerIndex >= idx
                      ? Math.max(0, block.correctAnswerIndex - 1)
                      : block.correctAnswerIndex,
                })
              }
              aria-label="Remove answer"
            >
              ×
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onUpdate({
              ...block,
              answers: [...block.answers, `Answer ${block.answers.length + 1}`],
            })
          }
        >
          + Add answer
        </Button>
      </div>
    </div>
    <Textarea
      rows={2}
      value={block.explanation ?? ""}
      onChange={(event) => onUpdate({ ...block, explanation: event.target.value })}
      placeholder="Explanation (optional)"
    />
  </div>
);

const renderComparisonTableBlock = (block: ComparisonTableBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="space-y-2">
    <div className="grid gap-2 md:grid-cols-2">
      <Input
        value={block.title ?? ""}
        onChange={(event) => onUpdate({ ...block, title: event.target.value })}
        placeholder="Table title"
      />
      <Input
        value={block.description ?? ""}
        onChange={(event) => onUpdate({ ...block, description: event.target.value })}
        placeholder="Description"
      />
    </div>
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Columns</Label>
      <div className="space-y-2">
        {block.columns.map((col, idx) => (
          <div key={col._key} className="grid gap-2 md:grid-cols-3">
            <Input
              value={col.label}
              onChange={(event) =>
                onUpdate({
                  ...block,
                  columns: block.columns.map((item) =>
                    item._key === col._key ? { ...item, label: event.target.value } : item,
                  ),
                })
              }
              placeholder={`Column ${idx + 1}`}
            />
            <Select
              value={col.align ?? "left"}
              onValueChange={(value) =>
                onUpdate({
                  ...block,
                  columns: block.columns.map((item) =>
                    item._key === col._key ? { ...item, align: value as ComparisonTableBlock["columns"][number]["align"] } : item,
                  ),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Align" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start text-red-500"
              onClick={() =>
                onUpdate({
                  ...block,
                  columns: block.columns.filter((item) => item._key !== col._key),
                  rows: block.rows.map((row) => ({
                    ...row,
                    cells: row.cells.filter((_, i) => i !== idx),
                  })),
                })
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onUpdate({
              ...block,
              columns: [...block.columns, { _key: createKey(), label: `Column ${block.columns.length + 1}`, align: "left" }],
              rows: block.rows.map((row) => ({ ...row, cells: [...row.cells, ""] })),
            })
          }
        >
          + Add column
        </Button>
      </div>
    </div>

    <div className="space-y-1">
      <Label className="text-xs text-slate-600">Rows</Label>
      <div className="space-y-3">
        {block.rows.map((row, rowIdx) => (
          <div key={row._key} className="rounded border border-slate-200 bg-white p-2">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={row.label}
                onChange={(event) =>
                  onUpdate({
                    ...block,
                    rows: block.rows.map((item) =>
                      item._key === row._key ? { ...item, label: event.target.value } : item,
                    ),
                  })
                }
                placeholder={`Row ${rowIdx + 1} label`}
              />
              <label className="flex items-center gap-1 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={row.highlight ?? false}
                  onChange={(event) =>
                    onUpdate({
                      ...block,
                      rows: block.rows.map((item) =>
                        item._key === row._key ? { ...item, highlight: event.target.checked } : item,
                      ),
                    })
                  }
                />
                Highlight
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500"
                onClick={() =>
                  onUpdate({
                    ...block,
                    rows: block.rows.filter((item) => item._key !== row._key),
                  })
                }
                aria-label="Remove row"
              >
                ×
              </Button>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              {row.cells.map((cell, cellIdx) => (
                <Input
                  key={`${row._key}-cell-${cellIdx}`}
                  value={cell}
                  onChange={(event) =>
                    onUpdate({
                      ...block,
                      rows: block.rows.map((item) =>
                        item._key === row._key
                          ? {
                              ...item,
                              cells: item.cells.map((c, i) => (i === cellIdx ? event.target.value : c)),
                            }
                          : item,
                      ),
                    })
                  }
                  placeholder={`Column ${cellIdx + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onUpdate({
              ...block,
              rows: [
                ...block.rows,
                {
                  _key: createKey(),
                  label: `Row ${block.rows.length + 1}`,
                  cells: block.columns.map(() => ""),
                  highlight: false,
                },
              ],
            })
          }
        >
          + Add row
        </Button>
      </div>
    </div>

    <Textarea
      rows={2}
      value={block.footnote ?? ""}
      onChange={(event) => onUpdate({ ...block, footnote: event.target.value })}
      placeholder="Footnote (optional)"
    />
  </div>
);

const renderResourcePackBlock = (block: ResourcePackBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="grid gap-2 md:grid-cols-2">
    <Input
      value={block.title ?? ""}
      onChange={(event) => onUpdate({ ...block, title: event.target.value })}
      placeholder="Pack title"
    />
    <Input
      value={block.ctaLabel ?? ""}
      onChange={(event) => onUpdate({ ...block, ctaLabel: event.target.value })}
      placeholder="CTA label"
    />
    <Input
      value={block.resourceUrl ?? ""}
      onChange={(event) => onUpdate({ ...block, resourceUrl: event.target.value })}
      placeholder="Resource URL"
    />
  </div>
);

const renderProductCtaBlock = (block: ProductCtaBlock, onUpdate: (block: RichBlock) => void) => (
  <div className="grid gap-2 md:grid-cols-2">
    <Input
      value={block.eyebrow ?? ""}
      onChange={(event) => onUpdate({ ...block, eyebrow: event.target.value })}
      placeholder="Eyebrow (optional)"
    />
    <Input
      value={block.title ?? ""}
      onChange={(event) => onUpdate({ ...block, title: event.target.value })}
      placeholder="Title"
    />
    <Textarea
      className="md:col-span-2"
      rows={2}
      value={block.description ?? ""}
      onChange={(event) => onUpdate({ ...block, description: event.target.value })}
      placeholder="Description"
    />
    <Input
      value={block.buttonLabel ?? ""}
      onChange={(event) => onUpdate({ ...block, buttonLabel: event.target.value })}
      placeholder="Button label"
    />
    <Input
      value={block.url ?? ""}
      onChange={(event) => onUpdate({ ...block, url: event.target.value })}
      placeholder="Target URL"
    />
  </div>
);
