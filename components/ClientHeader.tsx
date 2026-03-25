"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ClerkLoaded, SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import i18n from "i18next";
import { useTranslation } from "react-i18next";

import CartIcon from "./cart/CartIcon";
import Container from "./Container";
import FavoriteButton from "./FavoriteButton";
import HeaderMenu from "./layout/HeaderMenu";
import Logo from "./common/Logo";
import NotificationBell from "./NotificationBell";
import SearchBar from "./common/SearchBar";
import UserDropdown from "./UserDropdown";

const MobileMenu = dynamic(() => import("./layout/MobileMenu"), {
  ssr: false,
  loading: () => (
    <button
      type="button"
      aria-label="Open navigation menu"
      className="md:hidden rounded-md p-2 text-ink/60"
      disabled
    >
      <span className="sr-only">Loading navigation</span>
    </button>
  ),
});
const languages = [
  { code: "en", label: "EN" },
  { code: "th", label: "TH" },
];

const normalizeLang = (value?: string | null) =>
  (value || "th").split("-")[0] || "th";

const ClientHeader = () => {
  const { user, isSignedIn } = useUser();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [lang, setLang] = useState<string>(
    normalizeLang(i18n.resolvedLanguage || i18n.language || "th")
  );
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Track when component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle redirect after successful login
  useEffect(() => {
    if (isSignedIn && user && isMounted && typeof window !== "undefined") {
      const redirectTo = searchParams.get("redirectTo");
      if (redirectTo) {
        // Clean up the URL and redirect
        const cleanUrl = decodeURIComponent(redirectTo);
        router.push(cleanUrl);
        // Remove the redirectTo param from current URL
        const currentPath = window.location.pathname;
        router.replace(currentPath);
      }
    }
  }, [isSignedIn, user, searchParams, router, isMounted]);

  // Keep in sync with i18next
  useEffect(() => {
    const handler = (lng: string) => setLang(normalizeLang(lng));
    i18n.on("languageChanged", handler);
    const initial = normalizeLang(i18n.resolvedLanguage || i18n.language || "th");
    if (initial !== "th") {
      i18n.changeLanguage("th");
    }
    return () => {
      i18n.off("languageChanged", handler);
    };
  }, []);

  const getSignInUrl = () => {
    if (!isMounted || typeof window === "undefined") return "/sign-in";
    const currentPath = window.location.pathname + window.location.search;
    return `/sign-in?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  const getSignUpUrl = () => {
    if (!isMounted || typeof window === "undefined") return "/sign-up";
    const currentPath = window.location.pathname + window.location.search;
    return `/sign-up?redirectTo=${encodeURIComponent(currentPath)}`;
  };

  const changeLanguage = (code: string) => {
    setShowLangMenu(false);
    i18n.changeLanguage(code);
    setLang(normalizeLang(code));
  };

  return (
    <header className="sticky top-0 z-40 py-2 sm:py-3 lg:py-4 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <Container className="h-full">
        <div className="flex items-center h-full min-h-[3rem] sm:min-h-[3.5rem] lg:min-h-[4rem] lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 lg:flex-none">
            <MobileMenu />
            <Logo />
          </div>

          {/* Center Section: Navigation Menu (Desktop Only) */}
          <div className="hidden lg:flex items-center justify-center">
            <HeaderMenu />
          </div>

          {/* Right Section: Search + Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-3 ml-auto lg:ml-0 lg:justify-self-end lg:flex-none lg:min-w-0">
            {/* Search Bar */}
            <div className="flex-shrink-0">
              <SearchBar />
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Language switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangMenu((s) => !s)}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-ink/80 hover:bg-white transition"
                  aria-haspopup="listbox"
                  aria-expanded={showLangMenu}
                >
                  <span className="uppercase tracking-wide">{lang}</span>
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-20 rounded-xl border border-border bg-white shadow-lg z-50">
                    {languages.map((lng) => (
                      <button
                        key={lng.code}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-surface-1 ${
                          lng.code === lang ? "text-ink font-semibold" : "text-ink-muted"
                        }`}
                        onClick={() => changeLanguage(lng.code)}
                        role="option"
                        aria-selected={lng.code === lang}
                      >
                        <span className="uppercase">{lng.code}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <CartIcon />
              <FavoriteButton />
              <NotificationBell />

              <ClerkLoaded>
                <SignedIn>
                  <UserDropdown />
                </SignedIn>

                <SignedOut>
                  <div className="flex items-center gap-3">
                    <Link
                      href={getSignInUrl()}
                      className="bg-transparent border border-brand-red-accent hover:bg-brand-red-accent text-brand-red-accent  hover:text-white px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      {t("Sign In")}
                    </Link>
                    <Link
                      href={getSignUpUrl()}
                      className="bg-brand-red-accent border border-brand-red-accent hover:bg-transparent text-white hover:text-brand-red-accent px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      {t("Sign Up")}
                    </Link>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>

            {/* Tablet Actions (Medium screens) */}
            <div className="hidden md:flex lg:hidden items-center gap-2">
              {/* language toggle compact */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangMenu((s) => !s)}
                  className="rounded-md border border-border px-2 py-1 text-xs font-semibold uppercase text-ink hover:border-ink/80 hover:bg-white"
                  aria-haspopup="listbox"
                  aria-expanded={showLangMenu}
                >
                  {lang}
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-28 rounded-lg border border-border bg-white shadow-md z-50">
                    {languages.map((lng) => (
                      <button
                        key={lng.code}
                        className={`block w-full px-3 py-2 text-left text-xs uppercase hover:bg-surface-1 ${
                          lng.code === lang ? "font-semibold text-ink" : "text-ink-muted"
                        }`}
                        onClick={() => changeLanguage(lng.code)}
                        role="option"
                        aria-selected={lng.code === lang}
                      >
                        {lng.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <CartIcon />
              <FavoriteButton />
              <NotificationBell />

              <ClerkLoaded>
                <SignedIn>
                  <UserDropdown />
                </SignedIn>
                <SignedOut>
                  <div className="flex items-center gap-2">
                    <Link
                      href={getSignInUrl()}
                      className="text-sm font-semibold hover:text-brand-text-main hoverEffect px-2 py-1 transition-colors duration-200"
                    >
                      {t("Sign In")}
                    </Link>
                    <Link
                      href={getSignUpUrl()}
                      className="bg-brand-black-strong hover:bg-brand-text-main text-white px-3 py-1.5 rounded-md text-sm font-semibold transition-all duration-200"
                    >
                      {t("Sign Up")}
                    </Link>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>

            {/* Mobile Actions (Small screens) */}
            <div className="relative flex md:hidden items-center gap-1">
              <button
                type="button"
                onClick={() => setShowLangMenu((s) => !s)}
                className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold uppercase text-ink hover:border-ink/80 hover:bg-white"
                aria-haspopup="listbox"
                aria-expanded={showLangMenu}
              >
                {lang}
              </button>
              {showLangMenu && (
                <div className="absolute right-2 top-12 w-24 rounded-lg border border-border bg-white shadow-md z-50">
                  {languages.map((lng) => (
                    <button
                      key={lng.code}
                      className={`block w-full px-3 py-2 text-left text-[11px] uppercase hover:bg-surface-1 ${
                        lng.code === lang ? "font-semibold text-ink" : "text-ink-muted"
                      }`}
                      onClick={() => changeLanguage(lng.code)}
                      role="option"
                      aria-selected={lng.code === lang}
                    >
                      {lng.code}
                    </button>
                  ))}
                </div>
              )}

              <ClerkLoaded>
                <SignedIn>
                  <UserDropdown />
                </SignedIn>
                <SignedOut>
                  <div className="flex items-center gap-1">
                    <Link
                      href={getSignInUrl()}
                      className="bg-transparent border border-brand-red-accent hover:bg-brand-red-accent text-brand-red-accent  hover:text-white px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      {t("Sign In")}
                    </Link>
                    <Link
                      href={getSignUpUrl()}
                      className="bg-brand-red-accent border border-brand-red-accent hover:bg-transparent text-white hover:text-brand-red-accent px-2 py-1.5 rounded text-xs font-semibold hoverEffect"
                    >
                      {t("Sign Up")}
                    </Link>
                  </div>
                </SignedOut>
              </ClerkLoaded>
            </div>
          </div>
        </div>
      </Container>
    </header>
  );
};

export default ClientHeader;
