"use client";

import { useEffect } from "react";
import useCartStore from "@/store";

export function useAbandonmentMonitor() {
  const checkAbandonmentStatus = useCartStore(
    (state) => state.checkAbandonmentStatus
  );
  const cartLength = useCartStore((state) => state.items.length);
  const abandonmentStatus = useCartStore((state) => state.abandonmentStatus);

  useEffect(() => {
    if (cartLength === 0) return;

    const interval = setInterval(() => {
      checkAbandonmentStatus();
    }, 60000);

    checkAbandonmentStatus();

    return () => clearInterval(interval);
  }, [cartLength, checkAbandonmentStatus]);

  return abandonmentStatus;
}
