import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Globe,
  Linkedin,
  Twitter,
  User2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { urlFor } from "@/sanity/lib/image";

export interface InsightAuthorCardProps {
  author: {
    _id: string;
    name: string;
    slug: { current: string };
    title: string;
    image?: any;
    bio?: string;
    credentials?: string[];
    credentialVerified?: boolean;
    expertise?: string[];
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      website?: string;
    };
  };
  variant?: "compact" | "full";
  showSocialLinks?: boolean;
  authorBasePath?: string;
}

const buildAvatarUrl = (source: any, size: number) => {
  if (!source) return null;
  if (typeof source === "string") return source;

  try {
    return urlFor(source).width(size).height(size).url();
  } catch (error) {
    console.error("Unable to build author image url", error);
    return null;
  }
};

const InsightAuthorCard = ({
  author,
  variant = "full",
  showSocialLinks = true,
  authorBasePath,
}: InsightAuthorCardProps) => {
  const isCompact = variant === "compact";
  const authorName = author?.name || "Insight Author";
  const authorTitle = author?.title || "Insight Contributor";
  const authorBio =
    author?.bio ||
    "An expert contributor sharing practical insight and industry guidance.";
  const authorSlug = author?.slug?.current;
  const basePath = (authorBasePath || "/insight/author").replace(/\/$/, "");
  const authorHref = authorSlug ? `${basePath}/${authorSlug}` : basePath;
  const avatarSize = isCompact ? 40 : 80;
  const avatarUrl = buildAvatarUrl(author?.image, avatarSize);
  const credentials = (author?.credentials || []).filter(Boolean);
  const showVerified = Boolean(author?.credentialVerified);
  const showLinks = showSocialLinks && !isCompact;

  const socialLinks = [
    {
      label: "LinkedIn",
      href: author?.socialLinks?.linkedin,
      icon: Linkedin,
    },
    {
      label: "Twitter",
      href: author?.socialLinks?.twitter,
      icon: Twitter,
    },
    {
      label: "Website",
      href: author?.socialLinks?.website,
      icon: Globe,
    },
  ].filter((link) => Boolean(link.href));

  if (isCompact) {
    return (
      <div
        className="flex flex-wrap items-center gap-3 text-xs text-gray-600"
        role="contentinfo"
        aria-label={`Author information for ${authorName}`}
        data-variant={variant}
      >
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={authorName}
              width={40}
              height={40}
              className="rounded-full border border-gray-200"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green">
              <User2 className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          <div>
            <p className="font-semibold text-shop_dark_green">{authorName}</p>
            <p className="text-[11px] text-gray-500">{authorTitle}</p>
          </div>
        </div>
        {showVerified ? (
          <Badge className="gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Verified
          </Badge>
        ) : null}
      </div>
    );
  }

  return (
    <Card
      className="border-0 shadow-md bg-white"
      role="contentinfo"
      aria-label={`Author profile for ${authorName}`}
      data-variant={variant}
    >
      <CardContent className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-6">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={authorName}
              width={80}
              height={80}
              className="rounded-full border border-gray-200"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-shop_light_bg text-shop_dark_green">
              <User2 className="h-6 w-6" aria-hidden="true" />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Link
                href={authorHref}
                className="text-xl font-semibold text-shop_dark_green hover:text-shop_light_green transition-colors"
              >
                {authorName}
              </Link>
              <p className="text-sm text-gray-600">{authorTitle}</p>
            </div>

            <p className="text-sm text-gray-600">{authorBio}</p>

            {(credentials.length || showVerified) && (
              <div className="flex flex-wrap gap-2">
                {credentials.map((credential) => (
                  <Badge
                    key={credential}
                    variant="secondary"
                    className="bg-shop_light_bg text-shop_dark_green"
                  >
                    {credential}
                  </Badge>
                ))}
                {showVerified ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Credentials verified
                  </Badge>
                ) : null}
              </div>
            )}

            {showLinks && socialLinks.length ? (
              <div className="flex flex-wrap gap-2">
                {socialLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button
                      key={link.label}
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Link
                        href={link.href as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Visit ${authorName} on ${link.label}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {link.label}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            ) : null}

            <Link
              href={authorHref}
              className={cn(
                "text-sm font-semibold text-shop_light_green hover:text-shop_dark_green transition-colors",
                !authorSlug ? "pointer-events-none opacity-70" : ""
              )}
              aria-disabled={!authorSlug}
            >
              View all articles by {authorName}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsightAuthorCard;
