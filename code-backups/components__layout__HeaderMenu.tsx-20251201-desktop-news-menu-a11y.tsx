"use client";
import { NAV_STRUCTURE, headerData, type HeaderNavChild } from "@/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FocusEvent } from "react";

const HeaderMenu = () => {
  const pathname = usePathname();
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const newsMenuRef = useRef<HTMLDivElement>(null);
  const newsMenuId = "desktop-news-menu";
  const newsItem = headerData.find(
    (item) => item.href === NAV_STRUCTURE.newsHub.path
  );
  const newsChildren: HeaderNavChild[] = newsItem?.children ?? [];

  useEffect(() => {
    if (!isNewsOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && newsMenuRef.current?.contains(target)) {
        return;
      }
      setIsNewsOpen(false);
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNewsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isNewsOpen]);

  useEffect(() => {
    setIsNewsOpen(false);
  }, [pathname]);

  const handleNewsBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget as Node | null;
    if (nextFocus && event.currentTarget.contains(nextFocus)) {
      return;
    }
    setIsNewsOpen(false);
  };

  const closeNewsMenu = () => setIsNewsOpen(false);

  return (
    <div className="hidden md:inline-flex w-full items-center justify-center gap-7 text-sm capitalize font-semibold text-brand-text-muted">
      {headerData?.map((item) => {
        const isActive = pathname === item?.href;

        if (item?.href === NAV_STRUCTURE.newsHub.path && newsChildren.length > 0) {
          const isNewsActive =
            pathname === item?.href ||
            pathname.startsWith(`${NAV_STRUCTURE.newsHub.path}/`);

          return (
            <div
              key={item?.title}
              className="relative flex items-center"
              ref={newsMenuRef}
              onMouseEnter={() => setIsNewsOpen(true)}
              onMouseLeave={closeNewsMenu}
              onFocus={() => setIsNewsOpen(true)}
              onBlur={handleNewsBlur}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  closeNewsMenu();
                }
              }}
            >
              <button
                type="button"
                className={`hover:text-brand-text-main hoverEffect relative group px-1 focus:outline-none ${isNewsActive && "text-brand-text-main"}`}
                aria-haspopup="menu"
                aria-expanded={isNewsOpen}
                aria-controls={newsMenuId}
                aria-label={`${NAV_STRUCTURE.newsHub.label} menu`}
                onClick={() => setIsNewsOpen((prev) => !prev)}
              >
                {item?.title}
                <span
                  className={`absolute -bottom-0.5 left-1/2 w-0 h-0.5 bg-brand-text-main transition-all duration-300 group-hover:w-1/2 group-hover:left-0 ${
                    isNewsActive && "w-1/2"
                  }`}
                />
                <span
                  className={`absolute -bottom-0.5 right-1/2 w-0 h-0.5 bg-brand-text-main transition-all duration-300 group-hover:w-1/2 group-hover:right-0 ${
                    isNewsActive && "w-1/2"
                  }`}
                />
              </button>

              {isNewsOpen && (
                <div
                  className="absolute left-1/2 top-full z-30 mt-4 w-72 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white/95 py-3 shadow-2xl backdrop-blur focus:outline-none"
                  role="menu"
                  aria-label={`${NAV_STRUCTURE.newsHub.label} navigation menu`}
                  id={newsMenuId}
                >
                  <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-[0.35em] text-brand-text-muted">
                    {NAV_STRUCTURE.newsHub.label}
                  </div>
                  <ul className="flex flex-col gap-1 px-2" role="none">
                    {newsChildren.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <li key={child.href} role="none">
                          <Link
                            href={child.href}
                            role="menuitem"
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text-main ${
                              isChildActive
                                ? "bg-neutral-50 text-brand-text-main"
                                : "text-neutral-800 hover:bg-neutral-50 hover:text-brand-text-main"
                            }`}
                            aria-label={`${child.title} page`}
                            onClick={closeNewsMenu}
                          >
                            <span>{child.title}</span>
                            <span className="text-xs text-brand-text-muted">&gt;</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item?.title}
            href={item?.href}
            className={`hover:text-brand-text-main hoverEffect relative group ${isActive && "text-brand-text-main"}`}
          >
            {item?.title}
            <span
              className={`absolute -bottom-0.5 left-1/2 w-0 h-0.5 bg-brand-text-main transition-all duration-300 group-hover:w-1/2 group-hover:left-0 ${
                isActive && "w-1/2"
              }`}
            />
            <span
              className={`absolute -bottom-0.5 right-1/2 w-0 h-0.5 bg-brand-text-main transition-all duration-300 group-hover:w-1/2 group-hover:right-0 ${
                isActive && "w-1/2"
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
};

export default HeaderMenu;
