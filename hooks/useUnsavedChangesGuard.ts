"use client";

import { useEffect, useRef } from "react";

const UNSAVED_MESSAGE = "You have unsaved changes. Leave anyway? Your changes will be lost.";

const isModifiedClick = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

export function useUnsavedChangesGuard(isDirty: boolean) {
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const confirmLeave = () => window.confirm(UNSAVED_MESSAGE);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      if (!dirtyRef.current) return;
      const proceed = confirmLeave();
      if (!proceed) {
        window.history.forward();
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!dirtyRef.current) return;
      if (isModifiedClick(event)) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const proceed = confirmLeave();
      if (!proceed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    if (dirtyRef.current) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      window.addEventListener("popstate", handlePopState);
      document.addEventListener("click", handleClick, true);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isDirty]);
}

export default useUnsavedChangesGuard;
