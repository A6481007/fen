export type PortableTextSpan = {
  _key?: string;
  _type?: "span";
  text?: string;
  marks?: string[];
};

export type PortableTextLinkDef = {
  _key?: string;
  _type: "link";
  href?: string;
  openInNewTab?: boolean;
};

export type PortableTextRecommendedKitDef = {
  _key?: string;
  _type: "recommendedKitLink";
  kit?: { _ref?: string } | null;
  label?: string;
  href?: string; // optional external override
  openInNewTab?: boolean;
};

export type PortableTextMarkDef =
  | PortableTextLinkDef
  | PortableTextRecommendedKitDef
  | ({ _key?: string; _type?: string } & Record<string, unknown>);

export type PortableTextBlock = {
  _key?: string;
  _type?: string;
  style?: string;
  listItem?: "bullet" | "number";
  level?: number;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
};

export type PortableTextInlineImage = {
  _key?: string;
  _type: "inlineImage" | "image";
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
  credit?: string;
};

export type PortableTextBlockImage = {
  _key?: string;
  _type: "blockImage";
  image?: unknown;
  alt?: string;
  caption?: string;
  credit?: string;
  alignment?: "full" | "wide" | "left" | "right" | "center";
  width?: "small" | "medium" | "large";
  isDecorative?: boolean;
};

export type PortableTextFigure = {
  _key?: string;
  _type: "figure";
  image?: {
    asset?: { _ref?: string };
    alt?: string;
    caption?: string;
    credit?: string;
  };
  enableZoom?: boolean;
};

export type PortableTextCallout = {
  _key?: string;
  _type: "callout";
  variant?: "note" | "tip" | "warning" | "example" | "definition";
  title?: string;
  body?: PortableTextBlock[];
};

export type PortableTextVideoEmbed = {
  _key?: string;
  _type: "videoEmbed";
  title?: string;
  url?: string;
  poster?: unknown;
  transcript?: string;
};

export type PortableTextVideoBlock = {
  _key?: string;
  _type: "videoBlock";
  title?: string;
  url?: string;
  transcriptUrl?: string;
  poster?: unknown;
  keyMoments?: {
    _key?: string;
    label?: string;
    timestamp?: string;
    description?: string;
  }[];
};

export type PortableTextStepList = {
  _key?: string;
  _type: "stepList";
  title?: string;
  steps?: {
    _key?: string;
    title?: string;
    description?: string;
    duration?: string;
  }[];
};

export type PortableTextUnknownBlock = { _key?: string; _type: string } & Record<string, unknown>;

export type PortableTextContent = Array<
  | PortableTextBlock
  | PortableTextInlineImage
  | PortableTextBlockImage
  | PortableTextFigure
  | PortableTextCallout
  | PortableTextVideoEmbed
  | PortableTextVideoBlock
  | PortableTextStepList
  | PortableTextUnknownBlock
>;
