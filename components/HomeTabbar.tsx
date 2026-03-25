"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

type TabCategory = { title: string; href: string };

interface Props {
  selectedTab: string;
  onTabSelect: (tab: string) => void;
  categories: TabCategory[];
}

const HomeTabbar = ({ selectedTab, onTabSelect, categories }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          {t("client.home.productGrid.tabbar.title")}
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white/80 px-3 py-1.5 text-sm font-semibold text-ink-strong shadow-[0_10px_30px_rgba(12,18,38,0.08)] transition hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-[0_16px_38px_rgba(12,18,38,0.12)]"
        >
          {t("client.home.productGrid.tabbar.seeAll")}
          <span aria-hidden className="text-lg leading-none">→</span>
        </Link>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white via-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white via-white to-transparent" />

        <div className="flex gap-3 overflow-x-auto pb-1 pr-3 -mr-3">
          {categories?.map((item, index) => {
            const isActive = selectedTab === item?.href;
            return (
              <button
                onClick={() => onTabSelect(item?.href)}
                key={item?.href}
                className={`group relative min-w-[170px] rounded-2xl border px-4 py-3 text-left transition-all duration-200 backdrop-blur-sm shadow-[0_10px_30px_rgba(12,18,38,0.08)] hover:-translate-y-0.5 hover:shadow-[0_16px_42px_rgba(12,18,38,0.12)] ${
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-border/70 bg-white/85 text-ink-strong"
                }`}
                aria-pressed={isActive}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold ${
                      isActive ? "bg-white/20 text-white" : "bg-ink/5 text-ink-strong"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-semibold leading-tight ${
                        isActive ? "text-white" : "text-ink-strong"
                      }`}
                    >
                      {item?.title}
                    </div>
                    <p
                      className={`text-[12px] leading-5 ${
                        isActive ? "text-white/80" : "text-ink-muted"
                      }`}
                    >
                      {isActive
                        ? t("client.home.productGrid.tabbar.currentlyShowing")
                        : t("client.home.productGrid.tabbar.tapToFocus")}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HomeTabbar;
