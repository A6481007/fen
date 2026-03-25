"use client";
import { headerData, type HeaderNavChild, type HeaderNavItem } from "@/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { isCatalogPath, isShopPath, normalizePath } from "@/lib/nav-active";

const NAV_LABEL_KEYS: Record<string, string> = {
  "/news": "nav.news",
};

const NAV_CHILD_LABEL_KEYS: Record<string, string> = {
  "/news": "nav.news.news",
  "/news/resources": "nav.news.resources",
  "/news/events": "nav.news.events",
};

const NAV_CHILD_DESC_KEYS: Record<string, string> = {
  "/news": "nav.news.newsDesc",
  "/news/resources": "nav.news.resourcesDesc",
  "/news/events": "nav.news.eventsDesc",
};

const DropdownNavItem = ({
  item,
  pathname,
}: {
  item: HeaderNavItem;
  pathname: string;
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = `${item.title.toLowerCase().replace(/\s+/g, "-")}-menu`;
  const children: HeaderNavChild[] = item.children ?? [];
  const normalizeHref = (href: string) => normalizePath(href);
  const navLabelKey = NAV_LABEL_KEYS[normalizeHref(item.href)];
  const resolvedNavLabel = navLabelKey && t(navLabelKey) !== navLabelKey ? t(navLabelKey) : item.title;
  const currentPath = normalizeHref(pathname);
  const itemPath = normalizeHref(item.href);

  const isActive = (() => {
    if (itemPath === "/shop") return isShopPath(currentPath);
    if (itemPath === "/catalog") return isCatalogPath(currentPath);
    const isSelf =
      currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
    const isChild = children.some((child) => {
      const childPath = normalizeHref(child.href);
      return currentPath === childPath || currentPath.startsWith(`${childPath}/`);
    });
    return isSelf || isChild;
  })();

  const focusMenuLink = useCallback((position: "first" | "last" = "first") => {
    requestAnimationFrame(() => {
      const links =
        menuRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]");
      if (!links || links.length === 0) return;
      const target =
        position === "last" ? links[links.length - 1] : links[0];
      target?.focus();
    });
  }, []);

  const openMenu = useCallback(
    (focusTarget?: "first" | "last") => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsOpen(true);
      if (focusTarget) {
        focusMenuLink(focusTarget);
      }
    },
    [focusMenuLink]
  );

  const closeMenu = useCallback(
    (shouldFocusButton?: boolean) => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsOpen(false);
      if (shouldFocusButton) {
        requestAnimationFrame(() => {
          buttonRef.current?.focus();
        });
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      closeMenu();
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      const activeElement = document.activeElement;
      const shouldRestoreFocus =
        !!activeElement &&
        (menuRef.current?.contains(activeElement) ||
          buttonRef.current === activeElement);
      closeMenu(shouldRestoreFocus);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget as Node | null;
    if (nextFocus && event.currentTarget.contains(nextFocus)) {
      return;
    }
    closeMenu();
  };

  const handleButtonKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu("first");
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu("last");
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    }
  };

  return (
    <div
      className="relative flex items-center"
      ref={menuRef}
      onMouseEnter={() => openMenu()}
      onMouseLeave={() => {
        if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = setTimeout(() => closeMenu(), 200);
      }}
      onFocus={() => openMenu()}
      onBlur={handleBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeMenu(true);
        }
      }}
    >
      <button
        type="button"
        className={`hover:text-brand-text-main hoverEffect relative group px-1 focus:outline-none ${isActive && "text-brand-text-main"}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={resolvedNavLabel}
        onClick={(event) => {
          if (event.detail === 0) return;
          if (isOpen) {
            closeMenu(true);
          } else {
            openMenu();
          }
        }}
        onKeyDown={handleButtonKeyDown}
        ref={buttonRef}
      >
        {resolvedNavLabel}
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
      </button>

      {isOpen && (
        <div
          className="absolute left-1/2 top-full z-30 mt-4 w-72 -translate-x-1/2 rounded-xl border border-neutral-200 bg-white/95 py-3 shadow-2xl backdrop-blur focus:outline-none"
          role="menu"
          aria-label={`${resolvedNavLabel} navigation menu`}
          id={menuId}
        >
          <div className="px-4 pb-2 text-xs font-semibold uppercase tracking-[0.35em] text-brand-text-muted">
            {resolvedNavLabel}
          </div>
          <ul className="flex flex-col gap-1 px-2" role="none">
            {children.map((child) => {
              const childPath = normalizeHref(child.href);
              const isChildActive =
                pathname === childPath ||
                pathname.startsWith(`${childPath}/`);
              const childLabelKey = NAV_CHILD_LABEL_KEYS[childPath];
              const childDescriptionKey = NAV_CHILD_DESC_KEYS[childPath];
              const resolvedChildLabel =
                childLabelKey && t(childLabelKey) !== childLabelKey
                  ? t(childLabelKey)
                  : child.title;
              const resolvedChildDescription =
                childDescriptionKey && t(childDescriptionKey) !== childDescriptionKey
                  ? t(childDescriptionKey)
                  : child.description;
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
                    aria-label={`${resolvedChildLabel} page`}
                    onClick={() => closeMenu()}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{resolvedChildLabel}</span>
                      {resolvedChildDescription ? (
                        <span className="text-xs font-normal text-brand-text-muted">
                          {resolvedChildDescription}
                        </span>
                      ) : null}
                    </div>
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
};

const HeaderMenu = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const normalizeHref = (href: string) => normalizePath(href);
  const currentPath = normalizePath(pathname);

  return (
    <div className="hidden md:inline-flex w-full items-center justify-center gap-7 text-sm capitalize font-semibold text-brand-text-muted">
      {headerData?.map((item) => {
        const itemPath = normalizeHref(item?.href || "");
        const navLabelKey = NAV_LABEL_KEYS[itemPath];
        const resolvedNavLabel =
          navLabelKey && t(navLabelKey) !== navLabelKey ? t(navLabelKey) : item?.title;
        const isActive = (() => {
          if (itemPath === "/shop") return isShopPath(currentPath);
          if (itemPath === "/catalog") return isCatalogPath(currentPath);
          const isSelf =
            currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
          const isChild =
            item?.children?.some((child) => {
              const childPath = normalizeHref(child.href);
              return currentPath === childPath || currentPath.startsWith(`${childPath}/`);
            }) ?? false;
          return isSelf || isChild;
        })();

        if (item?.children && item.children.length > 0) {
          return (
            <DropdownNavItem
              key={item.title}
              item={item}
              pathname={pathname}
            />
          );
        }

        return (
          <Link
            key={item?.title}
            href={item?.href}
            className={`hover:text-brand-text-main hoverEffect relative group ${isActive && "text-brand-text-main"}`}
          >
            {resolvedNavLabel}
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
