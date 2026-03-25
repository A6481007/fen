'use client';

import { useEffect, useRef, useCallback } from 'react';
import useStore from '@/store';

const SYNC_DEBOUNCE_MS = 5000; // Debounce API calls
const ABANDONMENT_CHECK_INTERVAL_MS = 60000; // Check every minute

export function useCartAbandonmentSync() {
  const items = useStore((state) => state.items);
  const cartValue = useStore((state) => state.getTotalPrice());
  const lastCartUpdatedAt = useStore((state) => state.lastCartUpdatedAt);
  const abandonmentStatus = useStore((state) => state.abandonmentStatus);
  const checkAbandonmentStatus = useStore((state) => state.checkAbandonmentStatus);
  const userId = undefined;

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedRef = useRef<string | null>(null);
  const abandonmentIdRef = useRef<string | null>(null);

  // Get session ID for anonymous users
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    let sessionId = sessionStorage.getItem('cart_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('cart_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Sync abandonment to API
  const syncAbandonment = useCallback(async () => {
    if (items.length === 0) return;
    if (!lastCartUpdatedAt) return;

    const cartFingerprint = JSON.stringify(
      items.map((item) => `${item.product._id}:${item.quantity}`),
    );

    // Don't sync if cart hasn't changed
    if (lastSyncedRef.current === cartFingerprint) return;

    try {
      const response = await fetch('/api/cart-abandonment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId: getSessionId(),
          cartId: getSessionId(), // Use session as cart ID
          cartValue,
          items: items.map((item) => ({
            productId: item.product._id,
            name: item.product.name ?? 'Unknown product',
            quantity: item.quantity,
            price: item.product.price ?? 0,
            imageUrl: item.product.images?.[0]?.asset?._ref,
          })),
          lastUpdatedAt: lastCartUpdatedAt.toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        abandonmentIdRef.current = data.abandonmentId;
        lastSyncedRef.current = cartFingerprint;
      }
    } catch (error) {
      console.error('Failed to sync abandonment:', error);
    }
  }, [items, cartValue, lastCartUpdatedAt, getSessionId]);

  // Mark as recovered when checkout completes
  const markRecovered = useCallback(async (orderId?: string, promotionApplied?: string) => {
    if (!abandonmentIdRef.current) return;

    try {
      await fetch('/api/cart-abandonment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          abandonmentId: abandonmentIdRef.current,
          status: 'recovered',
          orderId,
          recoveryPromotionApplied: promotionApplied,
        }),
      });

      abandonmentIdRef.current = null;
      lastSyncedRef.current = null;
    } catch (error) {
      console.error('Failed to mark recovery:', error);
    }
  }, []);

  // Clear abandonment (cart emptied)
  const clearAbandonment = useCallback(async () => {
    if (!abandonmentIdRef.current) return;

    try {
      await fetch('/api/cart-abandonment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          abandonmentId: abandonmentIdRef.current,
          status: 'cleared',
        }),
      });

      abandonmentIdRef.current = null;
      lastSyncedRef.current = null;
    } catch (error) {
      console.error('Failed to clear abandonment:', error);
    }
  }, []);

  // Debounced sync effect
  useEffect(() => {
    if (items.length === 0) {
      // Cart emptied - clear abandonment
      if (abandonmentIdRef.current) {
        clearAbandonment();
      }
      return;
    }

    // Debounce the sync
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncAbandonment();
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [items, syncAbandonment, clearAbandonment]);

  // Periodic abandonment status check
  useEffect(() => {
    const interval = setInterval(() => {
      checkAbandonmentStatus();
    }, ABANDONMENT_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [checkAbandonmentStatus]);

  // Handle page visibility changes (detect when user leaves/returns)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && items.length > 0) {
        // User leaving page with items in cart - sync immediately
        syncAbandonment();
      } else if (document.visibilityState === 'visible') {
        // User returned - check abandonment status
        checkAbandonmentStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [items.length, syncAbandonment, checkAbandonmentStatus]);

  // Handle beforeunload (user closing tab)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (items.length > 0) {
        // Use sendBeacon for reliable delivery
        const data = JSON.stringify({
          userId,
          sessionId: getSessionId(),
          cartId: getSessionId(),
          cartValue,
          items: items.map((item) => ({
            productId: item.product._id,
            name: item.product.name ?? 'Unknown product',
            quantity: item.quantity,
            price: item.product.price ?? 0,
          })),
          lastUpdatedAt: new Date().toISOString(),
        });

        navigator.sendBeacon('/api/cart-abandonment', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [items, cartValue, getSessionId]);

  return {
    abandonmentStatus,
    abandonmentId: abandonmentIdRef.current,
    markRecovered,
    clearAbandonment,
    syncAbandonment,
  };
}
