"use client";
import { headerData } from "@/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { FocusEvent } from "react";

const newsSections = [
  {
    title: "Latest News",
    description: "Product announcements and updates.",
    href: "/news",
    cta: "Visit News Hub",
  },
  {
    title: "Events",
    description: "Upcoming webinars, launches, and community meetups.",
    href: "/news/events",
    cta: "See events",
  },
  {
    title: "Resources",
    description: "Guides, how-tos, and documentation to get more from our tools.",
    href: "/news/resources",
    cta: "Browse resources",
  },
  {
    title: "Downloads",
    description: "Release notes, firmware, and downloadable assets.",
    href: "/news/downloads",
    cta: "View downloads",
  },
];

const HeaderMenu = () => {
  const pathname = usePathname();
  const [isNewsOpen, setIsNewsOpen] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNewsOpen(false);
      }
    };

    if (isNewsOpen) {
      document.addEventListener("keydown", handleEsc);
    }

    return () => {
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

  return (
    <div className="hidden md:inline-flex w-full items-center justify-center gap-7 text-sm capitalize font-semibold text-brand-text-muted">
      {headerData?.map((item) => {
        const isActive = pathname === item?.href;

        if (item?.title === "News") {
          return (
            <div
              key={item?.title}
              className="relative flex items-center"
              onMouseEnter={() => setIsNewsOpen(true)}
              onMouseLeave={() => setIsNewsOpen(false)}
              onFocus={() => setIsNewsOpen(true)}
              onBlur={handleNewsBlur}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsNewsOpen(false);
                }
              }}
            >
              <Link
                href={item?.href}
                className={`hover:text-brand-text-main hoverEffect relative group px-1 ${isActive && "text-brand-text-main"}`}
                aria-haspopup="dialog"
                aria-expanded={isNewsOpen}
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

              {isNewsOpen && (
                <div className="absolute left-1/2 top-full z-30 mt-5 w-[700px] -translate-x-1/2 rounded-2xl border border-neutral-200 bg-white/95 p-8 text-left shadow-2xl backdrop-blur">
                  <div className="mb-6 text-xs font-semibold uppercase tracking-widest text-brand-text-muted">
                    News & Resources
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    {newsSections.map((section) => (
                      <div
                        key={section.title}
                        className="flex flex-col gap-3 rounded-xl bg-neutral-50/60 p-4 transition hover:bg-neutral-100"
                      >
                        <div>
                          <h4 className="text-base font-semibold text-neutral-900">{section.title}</h4>
                          <p className="mt-1 text-sm font-normal text-neutral-500">{section.description}</p>
                        </div>
                        <Link
                          href={section.href}
                          className="text-sm font-semibold text-brand-text-main hover:underline"
                          onClick={() => setIsNewsOpen(false)}
                        >
                          {section.cta}
                        </Link>
                      </div>
                    ))}
                  </div>
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
