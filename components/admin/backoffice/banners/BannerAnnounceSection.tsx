"use client";

import { BANNER_PLACEMENT_OPTIONS, DEFAULT_BANNER_ANNOUNCE_STATE, type BannerAnnounceState } from "./types";
import { getCtaStyleOptions } from "@/constants/bannerConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type BannerAnnounceSectionProps = {
  state?: BannerAnnounceState;
  onChange: (next: BannerAnnounceState) => void;
  defaultPlacement?: string;
  sourceId?: string | null;
  typeLabel?: string;
  className?: string;
};

const CTA_STYLE_OPTIONS = getCtaStyleOptions();

export const BannerAnnounceSection = ({
  state,
  onChange,
  defaultPlacement = "sitewidepagehero",
  sourceId,
  typeLabel = "Entry",
  className,
}: BannerAnnounceSectionProps) => {
  const current = state ?? DEFAULT_BANNER_ANNOUNCE_STATE;
  const settings = {
    heroVariant: "light" as const,
    ...(current.bannerSettings || {}),
    bannerPlacement:
      (current.bannerSettings?.bannerPlacement as string | undefined) || defaultPlacement,
  };

  const setPublish = (publishAsBanner: boolean) => {
    onChange({
      ...current,
      publishAsBanner,
      bannerSettings: settings,
    });
  };

  const setSettings = (next: Partial<BannerAnnounceState["bannerSettings"]>) => {
    onChange({
      ...current,
      publishAsBanner: current.publishAsBanner,
      bannerSettings: { ...settings, ...next },
    });
  };

  const resetSettings = () =>
    onChange({
      publishAsBanner: current.publishAsBanner,
      bannerSettings: { ...DEFAULT_BANNER_ANNOUNCE_STATE.bannerSettings, bannerPlacement: defaultPlacement },
    });

  return (
    <section className={cn("rounded-xl border border-border bg-surface-0 p-4 sm:p-6 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.35)]", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-ink-strong">Hero Banner</p>
            {sourceId ? <Badge variant="secondary">Saved • {sourceId}</Badge> : null}
            {current.publishAsBanner ? <Badge variant="accent">On</Badge> : <Badge variant="outline">Off</Badge>}
          </div>
          <p className="text-xs text-ink-muted">
            Publish this {typeLabel.toLowerCase()} as a page-level hero banner. A fallback placement keeps the layout filled if the targeted slot is empty.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="publish-as-banner" className="text-xs text-ink-muted">
            Publish as banner
          </Label>
          <Switch id="publish-as-banner" checked={current.publishAsBanner} onCheckedChange={setPublish} />
        </div>
      </div>

      {!current.publishAsBanner ? (
        <p className="mt-4 text-sm text-ink-muted">
          Toggle on to expose this {typeLabel.toLowerCase()} as a hero banner. Only active banners appear when the date window is valid.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-placement">Placement</Label>
              <Select
                value={settings.bannerPlacement}
                onValueChange={(value) => setSettings({ bannerPlacement: value })}
              >
                <SelectTrigger id="banner-placement">
                  <SelectValue placeholder="Choose placement" />
                </SelectTrigger>
                <SelectContent>
                  {BANNER_PLACEMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-muted">
                Primary slot this banner should occupy. Fallback logic is handled at render time.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-variant">Variant</Label>
              <Select
                value={settings.heroVariant ?? "light"}
                onValueChange={(value) => setSettings({ heroVariant: value as "light" | "dark" })}
              >
                <SelectTrigger id="hero-variant">
                  <SelectValue placeholder="Light" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-ink-muted">
                Light keeps the neutral surface; dark inverts copy for stronger contrast.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="datetime-local"
                value={settings.startDate ?? ""}
                onChange={(event) => setSettings({ startDate: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="datetime-local"
                value={settings.endDate ?? ""}
                onChange={(event) => setSettings({ endDate: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-title-override">Title override</Label>
              <Input
                id="banner-title-override"
                placeholder="Optional short headline"
                value={settings.titleOverride ?? ""}
                onChange={(event) => setSettings({ titleOverride: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="banner-description-override">Description override</Label>
              <Textarea
                id="banner-description-override"
                rows={3}
                placeholder="One or two sentences max."
                value={settings.descriptionOverride ?? ""}
                onChange={(event) => setSettings({ descriptionOverride: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="cta-label">CTA label</Label>
              <Input
                id="cta-label"
                placeholder="Shop the drop"
                value={settings.ctaLabel ?? ""}
                onChange={(event) => setSettings({ ctaLabel: event.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta-style">CTA style</Label>
              <Select
                value={(settings as any).ctaStyle ?? "primary"}
                onValueChange={(value) =>
                  setSettings({ ctaStyle: value as "primary" | "secondary" | "ghost" })
                }
              >
                <SelectTrigger id="cta-style">
                  <SelectValue placeholder="Primary" />
                </SelectTrigger>
                <SelectContent>
                  {CTA_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta-url">CTA link</Label>
              <Input
                id="cta-url"
                type="url"
                placeholder="https://"
                value={settings.ctaUrlOverride ?? ""}
                onChange={(event) => setSettings({ ctaUrlOverride: event.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={resetSettings}>
              Reset banner fields
            </Button>
            <p className="text-xs text-ink-muted">
              Reset only affects local form state; save to persist in Sanity.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default BannerAnnounceSection;
