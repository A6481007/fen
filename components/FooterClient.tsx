"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

import Logo from "./common/Logo";
import SocialMedia from "./common/SocialMedia";
import NewsletterForm from "./NewsletterForm";
import FooterTop, { type FooterContactItem } from "./layout/FooterTop";
import type { ContactConfig } from "@/lib/contactSettings";
import { buildCategoryUrl } from "@/lib/paths";

type FooterCategory = { title: string; href: string };

type FooterLink = {
  title?: string | null;
  titleKey?: string | null;
  href?: string | null;
  external?: boolean | null;
};

type FooterSettings = {
  brandName?: string | null;
  brandDescription?: string | null;
  contactLabels?: {
    visitUs?: string | null;
    callUs?: string | null;
    workingHours?: string | null;
    emailUs?: string | null;
  } | null;
  quickLinksTitle?: string | null;
  quickLinks?: FooterLink[] | null;
  categoriesTitle?: string | null;
  newsletterTitle?: string | null;
  newsletterDescription?: string | null;
  newsletterPlaceholder?: string | null;
  newsletterButtonLabel?: string | null;
  newsletterLoadingLabel?: string | null;
  copyrightText?: string | null;
};

interface FooterClientProps {
  contactConfig: ContactConfig;
  footerSettings?: FooterSettings | null;
  categories: FooterCategory[];
}

const DEFAULT_QUICK_LINKS: Array<FooterLink> = [
  { title: "News & Updates", titleKey: "client.footer.links.news", href: "/news" },
  { title: "Events", titleKey: "client.footer.links.events", href: "/news/events" },
  { title: "Resources", titleKey: "client.footer.links.resources", href: "/news/resources" },
  { title: "Knowledge Base", titleKey: "client.footer.links.knowledge", href: "/insights/knowledge" },
  { title: "Solutions", titleKey: "client.footer.links.solutions", href: "/insights/solutions" },
  { title: "Catalog", titleKey: "client.footer.links.catalog", href: "/catalog" },
  { title: "About us", titleKey: "client.footer.links.about", href: "/about" },
  { title: "Contact us", titleKey: "client.footer.links.contact", href: "/contact" },
  { title: "Terms & Conditions", titleKey: "client.footer.links.terms", href: "/terms" },
  { title: "Privacy Policy", titleKey: "client.footer.links.privacy", href: "/privacy" },
  { title: "FAQs", titleKey: "client.footer.links.faqs", href: "/faqs" },
  { title: "Help", titleKey: "client.footer.links.help", href: "/help" },
];

const resolveText = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;

const FooterClient = ({ contactConfig, footerSettings, categories }: FooterClientProps) => {
  const { t } = useTranslation();

  const brandName = resolveText(
    footerSettings?.brandName,
    contactConfig.company.name || "NCSSHOP"
  );
  const brandDescription = resolveText(
    footerSettings?.brandDescription,
    contactConfig.company.description || ""
  );

  const contactLabels = {
    visitUs: resolveText(
      footerSettings?.contactLabels?.visitUs,
      t("client.footer.contact.visitUs")
    ),
    callUs: resolveText(
      footerSettings?.contactLabels?.callUs,
      t("client.footer.contact.callUs")
    ),
    workingHours: resolveText(
      footerSettings?.contactLabels?.workingHours,
      t("client.footer.contact.workingHours")
    ),
    emailUs: resolveText(
      footerSettings?.contactLabels?.emailUs,
      t("client.footer.contact.emailUs")
    ),
  };

  const addressParts = [
    contactConfig.company.address,
    contactConfig.company.city,
  ].filter(Boolean);
  const addressText = addressParts.join(", ");
  const phoneText = contactConfig.company.phone || "";
  const emailText = contactConfig.emails.support || "";
  const hoursText = [contactConfig.businessHours.weekday, contactConfig.businessHours.weekend]
    .filter(Boolean)
    .join(" / ");

  const contactItems: FooterContactItem[] = [
    {
      title: contactLabels.visitUs,
      subtitle: addressText,
      icon: (
        <MapPin className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
      ),
      href: addressText
        ? `https://maps.google.com/?q=${encodeURIComponent(addressText)}`
        : undefined,
    },
    {
      title: contactLabels.callUs,
      subtitle: phoneText,
      icon: (
        <Phone className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
      ),
      href: phoneText ? `tel:${phoneText.replace(/[^0-9+]/g, "")}` : undefined,
    },
    {
      title: contactLabels.workingHours,
      subtitle: hoursText,
      icon: (
        <Clock className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
      ),
    },
    {
      title: contactLabels.emailUs,
      subtitle: emailText,
      icon: (
        <Mail className="h-6 w-6 text-gray-600 group-hover:text-primary transition-colors" />
      ),
      href: emailText ? `mailto:${emailText}` : undefined,
    },
  ];

  const quickLinksTitle = resolveText(
    footerSettings?.quickLinksTitle,
    t("client.footer.quickLinks.title")
  );
  const quickLinksList = footerSettings?.quickLinks;
  const quickLinksSource =
    quickLinksList && quickLinksList.length > 0
      ? quickLinksList
      : DEFAULT_QUICK_LINKS;

  const quickLinks = quickLinksSource
    .map((item) => {
      const label = item?.titleKey
        ? t(item.titleKey, item.title || "")
        : item?.title || "";
      const href = item?.href || "";
      return {
        title: label,
        href,
        external: Boolean(item?.external),
      };
    })
    .filter((item) => item.title && item.href);

  const categoriesTitle = resolveText(
    footerSettings?.categoriesTitle,
    t("client.footer.categories.title")
  );

  const newsletterTitle = resolveText(
    footerSettings?.newsletterTitle,
    t("client.footer.newsletter.title")
  );
  const newsletterDescription = resolveText(
    footerSettings?.newsletterDescription,
    t("client.footer.newsletter.description")
  );
  const newsletterPlaceholder = resolveText(
    footerSettings?.newsletterPlaceholder,
    t("client.footer.newsletter.placeholder")
  );
  const newsletterButtonLabel = resolveText(
    footerSettings?.newsletterButtonLabel,
    t("client.footer.newsletter.subscribe")
  );
  const newsletterLoadingLabel = resolveText(
    footerSettings?.newsletterLoadingLabel,
    t("client.footer.newsletter.subscribing")
  );

  const year = new Date().getFullYear();
  const defaultCopyright = t("client.footer.copyright", {
    year,
    brand: brandName,
  });
  const copyrightTemplate = resolveText(
    footerSettings?.copyrightText,
    defaultCopyright
  );
  const copyrightText = copyrightTemplate
    .replace(/{{year}}/g, String(year))
    .replace(/{{brand}}/g, brandName);

  return (
    <footer className="bg-white border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FooterTop items={contactItems} />

        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="mb-2">
              <Logo variant="sm" />
            </div>
            {brandName ? (
              <p className="text-sm font-semibold text-gray-900">{brandName}</p>
            ) : null}
            {brandDescription ? (
              <p className="text-gray-600 text-sm">{brandDescription}</p>
            ) : null}
            <SocialMedia
              className="text-brand-black-strong/60"
              iconClassName="border-brand-black-strong/60 hover:border-brand-black-strong hover:text-brand-black-strong"
              tooltipClassName="bg-brand-black-strong text-white"
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">{quickLinksTitle}</h3>
            <ul className="space-y-3">
              {quickLinks.map((item) => (
                <li key={`${item.title}-${item.href}`}>
                  <Link
                    href={item.href}
                    className="text-gray-600 hover:text-brand-black-strong text-sm font-medium hoverEffect"
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">{categoriesTitle}</h3>
            <ul className="space-y-3">
              {categories.map((item) => (
                <li key={item.title}>
                  <Link
                    href={buildCategoryUrl(item.href)}
                    className="text-gray-600 hover:text-brand-black-strong text-sm font-medium hoverEffect capitalize"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">{newsletterTitle}</h3>
            <p className="text-gray-600 text-sm mb-4">{newsletterDescription}</p>
            <NewsletterForm
              placeholder={newsletterPlaceholder}
              buttonLabel={newsletterButtonLabel}
              loadingLabel={newsletterLoadingLabel}
            />
          </div>
        </div>

        <div className="py-6 border-t text-center text-sm text-gray-600">
          <p>{copyrightText}</p>
        </div>
      </div>
    </footer>
  );
};

export default FooterClient;
