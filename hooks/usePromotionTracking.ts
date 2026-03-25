"use client";

import { useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";

type TrackingAction = 'view' | 'click' | 'addToCart' | 'purchase';

interface TrackingMetadata {
  productId?: string;
  productName?: string;
  quantity?: number;
  cartValue?: number;
  discountAmount?: number;
  orderValue?: number;
  orderId?: string;
  page?: string;
  variant?: string;
}

interface UsePromotionTrackingOptions {
  debounceMs?: number;
}

export function usePromotionTracking(options: UsePromotionTrackingOptions = {}) {
  const { debounceMs = 0 } = options;
  const pendingTracks = useRef<Set<string>>(new Set());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const { user } = useUser();

  // Get or create session ID for anonymous tracking
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    
    let sessionId = sessionStorage.getItem('promo_session_id');
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('promo_session_id', sessionId);
    }
    return sessionId;
  }, []);

  // Core tracking function
  const track = useCallback(async (
    campaignId: string,
    action: TrackingAction,
    metadata?: TrackingMetadata
  ) => {
    // Create unique key for deduplication
    const trackKey = `${campaignId}_${action}_${metadata?.orderId || Date.now()}`;
    
    // Prevent duplicate tracking
    if (pendingTracks.current.has(trackKey)) {
      return;
    }
    
    // For view events, check session storage
    if (action === 'view') {
      const viewedKey = `promo_viewed_${campaignId}`;
      if (sessionStorage.getItem(viewedKey)) {
        return;
      }
    }

    pendingTracks.current.add(trackKey);

    try {
      const response = await fetch('/api/promotions/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          action,
          userId: user?.id,
          sessionId: getSessionId(),
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
            deviceType: getDeviceType(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Tracking failed');
      }

      // Mark view as tracked
      if (action === 'view') {
        sessionStorage.setItem(`promo_viewed_${campaignId}`, 'true');
      }

      return await response.json();
    } catch (error) {
      console.error('Promotion tracking error:', error);
    } finally {
      pendingTracks.current.delete(trackKey);
    }
  }, [getSessionId, user?.id]);

  // Debounced tracking (useful for rapid interactions)
  const trackDebounced = useCallback((
    campaignId: string,
    action: TrackingAction,
    metadata?: TrackingMetadata
  ) => {
    const key = `${campaignId}_${action}`;
    
    // Clear existing timer
    const existingTimer = debounceTimers.current.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      track(campaignId, action, metadata);
      debounceTimers.current.delete(key);
    }, debounceMs);

    debounceTimers.current.set(key, timer);
  }, [track, debounceMs]);

  // Specific action helpers
  const trackView = useCallback((campaignId: string, metadata?: TrackingMetadata) => {
    return debounceMs > 0 
      ? trackDebounced(campaignId, 'view', metadata)
      : track(campaignId, 'view', metadata);
  }, [track, trackDebounced, debounceMs]);

  const trackClick = useCallback((campaignId: string, metadata?: TrackingMetadata) => {
    return track(campaignId, 'click', metadata);
  }, [track]);

  const trackAddToCart = useCallback((
    campaignId: string,
    productId: string,
    metadata?: Omit<TrackingMetadata, 'productId'>
  ) => {
    return track(campaignId, 'addToCart', { productId, ...metadata });
  }, [track]);

  const trackPurchase = useCallback((
    campaignId: string,
    orderId: string,
    orderValue: number,
    discountAmount: number,
    metadata?: Omit<TrackingMetadata, 'orderId' | 'orderValue' | 'discountAmount'>
  ) => {
    return track(campaignId, 'purchase', {
      orderId,
      orderValue,
      discountAmount,
      ...metadata,
    });
  }, [track]);

  return {
    track,
    trackView,
    trackClick,
    trackAddToCart,
    trackPurchase,
  };
}

// Helper functions
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Type export for consumers
export type { TrackingAction, TrackingMetadata };
