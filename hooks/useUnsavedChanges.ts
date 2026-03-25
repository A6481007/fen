"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";

const pendingNavigationRef: { current: (() => void) | null } = { current: null };

type UnsavedChangesState = {
  isDirty: boolean;
  modalOpen: boolean;
  setDirty: () => void;
  setClean: () => void;
  openModal: () => void;
  closeModal: () => void;
};

const useUnsavedChangesStore = create<UnsavedChangesState>((set) => ({
  isDirty: false,
  modalOpen: false,
  setDirty: () => set({ isDirty: true }),
  setClean: () => set({ isDirty: false }),
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),
}));

export function useUnsavedChanges() {
  const router = useRouter();
  const pathname = usePathname();
  const currentPathRef = useRef(pathname);

  const isDirty = useUnsavedChangesStore((state) => state.isDirty);
  const modalOpen = useUnsavedChangesStore((state) => state.modalOpen);
  const setDirty = useUnsavedChangesStore((state) => state.setDirty);
  const setClean = useUnsavedChangesStore((state) => state.setClean);
  const openModal = useUnsavedChangesStore((state) => state.openModal);
  const closeModal = useUnsavedChangesStore((state) => state.closeModal);

  useEffect(() => {
    currentPathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const confirmNavigation = useCallback(
    (onProceed: () => void) => {
      if (isDirty) {
        pendingNavigationRef.current = onProceed;
        openModal();
        return;
      }
      onProceed();
    },
    [isDirty, openModal],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handlePopState = () => {
      if (!isDirty) return;
      const targetPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      confirmNavigation(() => router.push(targetPath));
      router.replace(currentPathRef.current);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [confirmNavigation, isDirty, router]);

  const markDirty = useCallback(() => setDirty(), [setDirty]);
  const markClean = useCallback(() => {
    setClean();
  }, [setClean]);

  const runPendingNavigation = useCallback(() => {
    const cb = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    closeModal();
    cb?.();
  }, [closeModal]);

  const cancelPendingNavigation = useCallback(() => {
    pendingNavigationRef.current = null;
    closeModal();
  }, [closeModal]);

  return {
    isDirty,
    modalOpen,
    markDirty,
    markClean,
    confirmNavigation,
    runPendingNavigation,
    cancelPendingNavigation,
    pendingNavigationRef,
    openModal,
    closeModal,
  };
}

export function resetUnsavedChangesState() {
  pendingNavigationRef.current = null;
  useUnsavedChangesStore.setState({ isDirty: false, modalOpen: false });
  if (typeof document !== "undefined") {
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.pointerEvents = "";
    document
      .querySelectorAll("[data-aria-hidden]")
      .forEach((el) => el.removeAttribute("data-aria-hidden"));
    document
      .querySelectorAll("[data-radix-focus-guard]")
      .forEach((el) => el.remove());
  }
}
