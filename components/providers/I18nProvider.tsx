"use client";

import { ReactNode, useEffect } from "react";
import i18n from "i18next";
import "@/app/i18n";

type Props = { children: ReactNode };

/**
 * Lightweight client wrapper that initializes i18next once
 * and renders children unchanged.
 */
const I18nProvider = ({ children }: Props) => {
  useEffect(() => {
    const updateHtmlLang = (lng?: string) => {
      if (typeof document === "undefined") return;
      const nextLang = lng || i18n.resolvedLanguage || "en";
      document.documentElement.lang = nextLang;
    };

    updateHtmlLang(i18n.language);
    i18n.on("languageChanged", updateHtmlLang);

    return () => {
      i18n.off("languageChanged", updateHtmlLang);
    };
  }, []);
  return <>{children}</>;
};

export default I18nProvider;
