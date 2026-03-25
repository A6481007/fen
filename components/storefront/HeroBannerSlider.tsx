"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/Container";
import { buildCategoryUrl } from "@/lib/paths";
import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";
import type { HeroBannerSliderSlide } from "@/sanity/queries";

type HeroBannerSliderProps = {
  slides: HeroBannerSliderSlide[];
  className?: string;
};

const AUTOPLAY_MS = 5500;

const useInterval = (callback: () => void, delay: number | null) => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return undefined;
    const id = window.setInterval(() => savedCallback.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
};

const clampHeight = "clamp(280px, 42vh, 480px)";

const slideMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const HeroBannerSlider = ({ slides, className }: HeroBannerSliderProps) => {
  if (!Array.isArray(slides) || slides.length === 0) {
    return null;
  }

  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const [ariaLiveMode, setAriaLiveMode] = useState<"off" | "polite">("off");
  const reducedMotion = useReducedMotion();
  const announceTimeout = useRef<number | null>(null);
  const regionRef = useRef<HTMLElement | null>(null);
  const hasMultipleSlides = slides.length > 1;

  useEffect(() => {
    if (reducedMotion) {
      setIsUserPaused(true);
    }
  }, [reducedMotion]);

  const shouldAutoplay =
    !reducedMotion && hasMultipleSlides && !isUserPaused && !isHovered && !isFocusWithin;

  const safeIndex = (value: number) => {
    const total = slides.length;
    if (total === 0) return 0;
    return ((value % total) + total) % total;
  };

  const setLiveForUserNav = () => {
    setAriaLiveMode("polite");
    if (announceTimeout.current) {
      window.clearTimeout(announceTimeout.current);
    }
    announceTimeout.current = window.setTimeout(() => setAriaLiveMode("off"), 1200);
  };

  useEffect(() => {
    return () => {
      if (announceTimeout.current) {
        window.clearTimeout(announceTimeout.current);
      }
    };
  }, []);

  const goTo = (next: number, source: "auto" | "user") => {
    setIndex(safeIndex(next));
    if (source === "user") {
      setLiveForUserNav();
    }
  };

  const goNext = (source: "auto" | "user" = "user") => goTo(index + 1, source);
  const goPrev = (source: "auto" | "user" = "user") => goTo(index - 1, source);

  useInterval(
    () => {
      goNext("auto");
    },
    shouldAutoplay ? AUTOPLAY_MS : null
  );

  const handleFocus = () => setIsFocusWithin(true);
  const handleBlur = () => {
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (regionRef.current && active && regionRef.current.contains(active)) return;
      setIsFocusWithin(false);
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev("user");
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext("user");
    }
  };

  const toggleAutoplay = () => {
    if (reducedMotion || !hasMultipleSlides) return;
    setIsUserPaused((prev) => !prev);
  };

  const currentSlide = slides[safeIndex(index)];
  const transition = reducedMotion ? { duration: 0 } : { duration: 0.45, ease: "easeInOut" };

  const textColor = currentSlide.textColorHex || "#ffffff";
  const accent = currentSlide.accentHex || "#0f172a";
  const ctaHref = buildCategoryUrl(currentSlide.categorySlug);
  const desktopCtaLabel = currentSlide.ctaLabel || "View All";

  return (
    <section
      ref={regionRef}
      aria-label="Homepage featured categories"
      aria-roledescription="carousel"
      tabIndex={-1}
      className={cn(
        "relative isolate w-full overflow-hidden border-b border-border focus-visible:outline-none",
        className
      )}
      style={{ height: clampHeight }}
      onKeyDown={handleKeyDown}
      onFocusCapture={handleFocus}
      onBlurCapture={handleBlur}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleAutoplay}
          aria-label={isUserPaused || reducedMotion ? "Start autoplay" : "Pause autoplay"}
          aria-pressed={!isUserPaused && !reducedMotion}
          disabled={reducedMotion || !hasMultipleSlides}
          className="pointer-events-auto rounded-full bg-black/40 text-white hover:bg-black/60 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUserPaused || reducedMotion ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          <span className="sr-only">Toggle autoplay</span>
        </Button>
      </div>

      {hasMultipleSlides ? (
        <>
          <div className="absolute inset-y-0 left-2 z-20 flex items-center">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Previous slide"
              onClick={() => goPrev("user")}
              className="pointer-events-auto h-10 w-10 rounded-full bg-black/35 text-white hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-2 z-20 flex items-center">
            <Button
              variant="secondary"
              size="icon"
              aria-label="Next slide"
              onClick={() => goNext("user")}
              className="pointer-events-auto h-10 w-10 rounded-full bg-black/35 text-white hover:bg-black/55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="pointer-events-auto absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
            {slides.map((slide, idx) => {
              const isActive = idx === safeIndex(index);
              return (
                <button
                  key={slide._key}
                  type="button"
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={isActive}
                  onClick={() => goTo(idx, "user")}
                  className={cn(
                    "h-3 w-3 rounded-full border border-white/60 transition",
                    isActive ? "bg-white" : "bg-white/30 hover:bg-white/60"
                  )}
                />
              );
            })}
          </div>
        </>
      ) : null}

      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={currentSlide._key}
          {...slideMotion}
          transition={transition}
          className="absolute inset-0 z-0"
          style={{ backgroundColor: accent }}
          aria-live={ariaLiveMode}
          role="group"
          aria-roledescription="slide"
          aria-label={`${safeIndex(index) + 1} of ${slides.length}`}
        >
          {currentSlide.backgroundImage ? (
            <div className="absolute inset-0 pointer-events-none opacity-25">
              <div className="relative h-full w-full">
                <Image
                  src={urlFor(currentSlide.backgroundImage).width(1600).height(900).quality(75).url()}
                  alt=""
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/20 to-transparent" />
            </div>
          ) : null}

          <div className="absolute inset-0 pointer-events-none z-5">
            <div className="relative h-full w-full">
              {currentSlide.products.map((product, idx) => {
                const imageUrl = (() => {
                  try {
                    return urlFor(product.image).width(product.imageWidth * 2).url();
                  } catch {
                    return null;
                  }
                })();
                const aspect =
                  product.dimensions?.width && product.dimensions?.height
                    ? product.dimensions.height / product.dimensions.width
                    : 0.9;
                const height = Math.max(60, Math.round(product.imageWidth * (aspect || 1)));

                if (!imageUrl) return null;
                return (
                  <div
                    key={product._key}
                    aria-hidden="true"
                    className="absolute drop-shadow-[0_12px_28px_rgba(0,0,0,0.25)]"
                    style={{
                      top: product.top,
                      left: product.left,
                      width: product.imageWidth,
                      height,
                    }}
                  >
                    <div className="inline-flex rounded-full bg-black/50 px-2 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-white/90">
                      {product.modelNumber}
                    </div>
                    <div className="relative mt-2 h-full w-full overflow-visible">
                      <Image
                        src={imageUrl}
                        alt={product.imageAlt || product.modelNumber}
                        fill
                        priority={index === 0 && idx === 0}
                        className="object-contain"
                        sizes={`${Math.min(product.imageWidth + 80, 480)}px`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-black/20 via-transparent to-black/10" />

          <Container className="relative z-20 flex h-full items-center">
            <div
              className="relative z-20 max-w-xl space-y-3 rounded-2xl bg-black/10 p-4 backdrop-blur-sm md:bg-transparent md:p-0"
              style={{ color: textColor }}
            >
              <p className="text-2xl md:text-3xl font-black uppercase tracking-[0.32em] leading-tight">
                {currentSlide.categoryTitle}
              </p>
              {currentSlide.subtitle ? (
                <p className="text-sm md:text-base opacity-90" style={{ color: textColor }}>
                  {currentSlide.subtitle}
                </p>
              ) : null}
              {currentSlide.showCta ? (
                <div className="hidden md:block pt-2">
                  <Button
                    asChild
                    variant="secondary"
                    className="rounded-full border-white/40 bg-white/10 px-5 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
                    style={{ color: textColor, borderColor: textColor }}
                  >
                    <Link href={ctaHref}>{desktopCtaLabel}</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          </Container>

          {currentSlide.showCta ? (
            <Link
              href={ctaHref}
              className="md:hidden absolute left-1/2 bottom-4 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-ink shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label={`View ${currentSlide.categoryTitle}`}
            >
              {desktopCtaLabel}
            </Link>
          ) : null}
        </motion.div>
      </AnimatePresence>

    </section>
  );
};

export default HeroBannerSlider;
