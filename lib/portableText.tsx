import Image from "next/image";
import Link from "next/link";
import { PortableText, type PortableTextComponents } from "@portabletext/react";

import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";

type PortableTextValue = any;

const getImageUrl = (source: any, width = 1400, height = 900) => {
  if (!source) return null;
  if (typeof source === "string") return source;
  try {
    return urlFor(source).width(width).height(height).url();
  } catch (error) {
    console.error("portableText: failed to build image url", error);
    return null;
  }
};

const toEmbedUrl = (url?: string | null) => {
  if (!url) return null;
  const trimmed = url.trim();

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

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="text-3xl font-semibold text-ink-strong">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-semibold text-ink-strong">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-semibold text-ink-strong">{children}</h3>,
    h4: ({ children }) => <h4 className="text-lg font-semibold text-ink-strong">{children}</h4>,
    blockquote: ({ children }) => (
      <blockquote className="rounded-2xl border border-border bg-surface-1 p-5 text-base italic text-ink">
        {children}
      </blockquote>
    ),
  },
  marks: {
    code: ({ children }) => (
      <code className="rounded bg-surface-1 px-1.5 py-0.5 font-mono text-sm text-ink">
        {children}
      </code>
    ),
    link: ({ value, children }) => {
      const href = value?.href || "#";
      const isExternal = href.startsWith("http");
      return (
        <Link
          href={href}
          target={value?.openInNewTab ?? isExternal ? "_blank" : undefined}
          rel={value?.openInNewTab ?? isExternal ? "noopener noreferrer" : undefined}
          className="underline decoration-ink-muted underline-offset-4 hover:text-shop_light_green"
        >
          {children}
        </Link>
      );
    },
  },
  types: {
    code: ({ value }) => {
      if (!value?.code) return null;
      const language = value?.language ? `language-${value.language}` : "";
      return (
        <pre className="overflow-x-auto rounded-2xl border border-border bg-surface-1 p-4">
          <code className={cn("font-mono text-sm text-ink", language)}>{value.code}</code>
        </pre>
      );
    },
    inlineImage: ({ value }) => {
      const imageUrl = getImageUrl(value);
      if (!imageUrl) return null;
      const alt = value?.alt || "Insight image";
      return (
        <figure className="space-y-2">
          <Image
            src={imageUrl}
            alt={alt}
            width={1400}
            height={900}
            className="h-auto w-full rounded-2xl border border-border object-cover"
            sizes="(min-width: 1024px) 900px, 100vw"
            loading="lazy"
          />
          {value?.caption ? (
            <figcaption className="text-xs text-ink-muted">
              {value.caption}
              {value?.credit ? ` — ${value.credit}` : ""}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    figure: ({ value }) => {
      const imageUrl = getImageUrl(value?.image);
      if (!imageUrl) return null;
      const alt = value?.image?.alt || "Insight figure";
      const zoomUrl = value?.enableZoom ? getImageUrl(value?.image, 2000, 1400) : null;
      const imageElement = (
        <Image
          src={imageUrl}
          alt={alt}
          width={1600}
          height={1000}
          className="h-auto w-full rounded-2xl border border-border object-cover"
          sizes="(min-width: 1024px) 900px, 100vw"
          loading="lazy"
        />
      );

      return (
        <figure className="space-y-2">
          {zoomUrl ? (
            <Link href={zoomUrl} target="_blank" rel="noopener noreferrer">
              {imageElement}
            </Link>
          ) : (
            imageElement
          )}
          {value?.image?.caption ? (
            <figcaption className="text-xs text-ink-muted">
              {value.image.caption}
              {value?.image?.credit ? ` — ${value.image.credit}` : ""}
            </figcaption>
          ) : null}
        </figure>
      );
    },
    callout: ({ value }) => {
      const variant = value?.variant || "note";
      const variantStyles: Record<string, string> = {
        note: "border-blue-200 bg-blue-50 text-blue-900",
        tip: "border-emerald-200 bg-emerald-50 text-emerald-900",
        warning: "border-amber-200 bg-amber-50 text-amber-900",
        example: "border-purple-200 bg-purple-50 text-purple-900",
        definition: "border-slate-200 bg-slate-50 text-slate-900",
      };

      return (
        <aside className={cn("rounded-2xl border p-5 text-sm", variantStyles[variant] || variantStyles.note)}>
          {value?.title ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">{value.title}</p>
          ) : null}
          {Array.isArray(value?.body) ? (
            <div className="prose prose-sm max-w-none text-current">
              <PortableText value={value.body} components={components} />
            </div>
          ) : null}
        </aside>
      );
    },
    videoEmbed: ({ value }) => {
      const url = toEmbedUrl(value?.url);
      if (!url) return null;
      const isMp4 = url.endsWith(".mp4") || url.endsWith(".webm");
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-black">
          {isMp4 ? (
            <video
              controls
              preload="none"
              poster={getImageUrl(value?.poster) || undefined}
              className="h-full w-full"
            >
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
        </div>
      );
    },
    videoBlock: ({ value }) => {
      const url = toEmbedUrl(value?.url);
      if (!url) return null;
      return (
        <div className="overflow-hidden rounded-2xl border border-border bg-black">
          <iframe
            src={url}
            title={value?.title || "Video"}
            className="h-[360px] w-full md:h-[420px]"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    },
    stepList: ({ value }) => {
      const steps = Array.isArray(value?.steps) ? value.steps : [];
      if (!steps.length) return null;
      return (
        <section className="space-y-3 rounded-2xl border border-border bg-surface-0 p-5">
          {value?.title ? (
            <h3 className="text-lg font-semibold text-ink-strong">{value.title}</h3>
          ) : null}
          <ol className="space-y-3 text-sm text-ink">
            {steps.map((step: any, index: number) => (
              <li key={step?._key || index} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-6 items-center justify-center rounded-full border border-border bg-surface-1 text-[11px] font-semibold text-ink-strong">
                  {index + 1}
                </span>
                <div>
                  <p className="font-semibold">{step?.title || `Step ${index + 1}`}</p>
                  {step?.description ? <p className="text-ink-muted">{step.description}</p> : null}
                  {step?.duration ? (
                    <p className="text-xs text-ink-muted">Duration: {step.duration}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      );
    },
    stepByStep: ({ value }) => {
      const steps = Array.isArray(value?.steps) ? value.steps : [];
      if (!steps.length) return null;
      return (
        <section className="space-y-4 rounded-2xl border border-border bg-surface-0 p-5">
          {value?.title ? (
            <h3 className="text-lg font-semibold text-ink-strong">{value.title}</h3>
          ) : null}
          <div className="space-y-6">
            {steps.map((step: any, index: number) => (
              <div key={step?._key || index} className="space-y-2">
                <p className="text-sm font-semibold text-ink-strong">
                  {index + 1}. {step?.title || `Step ${index + 1}`}
                </p>
                {Array.isArray(step?.body) ? (
                  <div className="prose prose-sm max-w-none text-ink">
                    <PortableText value={step.body} components={components} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      );
    },
    knowledgeCheck: ({ value }) => {
      const options = Array.isArray(value?.options) ? value.options : [];
      if (!value?.question) return null;
      return (
        <section className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Knowledge check</p>
          <h3 className="text-lg font-semibold text-ink-strong">{value.question}</h3>
          {options.length ? (
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {options.map((option: any, index: number) => (
                <li key={option?._key || index} className="rounded-lg border border-border bg-white px-3 py-2">
                  {option?.text || `Option ${index + 1}`}
                </li>
              ))}
            </ul>
          ) : null}
          {value?.explanation ? (
            <p className="mt-3 text-sm text-ink-muted">{value.explanation}</p>
          ) : null}
        </section>
      );
    },
    quiz: ({ value }) => {
      if (!value?.question) return null;
      const answers = Array.isArray(value?.answers) ? value.answers : [];
      return (
        <section className="rounded-2xl border border-border bg-surface-1 p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-ink-muted">Quiz</p>
          <h3 className="text-lg font-semibold text-ink-strong">{value.question}</h3>
          {answers.length ? (
            <ul className="mt-3 space-y-2 text-sm text-ink">
              {answers.map((answer: any, index: number) => (
                <li key={answer?._key || index} className="rounded-lg border border-border bg-white px-3 py-2">
                  {answer?.text || `Answer ${index + 1}`}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      );
    },
  },
};

export function RichText({ value }: { value: PortableTextValue }) {
  if (!value || !Array.isArray(value)) return null;
  return <PortableText value={value} components={components} />;
}
