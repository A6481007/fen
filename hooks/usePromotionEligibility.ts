'use client';

import { useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';
import type { CartItem } from '@/lib/cart/types';

type EligibilityCartItem = Pick<CartItem, 'productId' | 'quantity' | 'unitPrice'> & {
  categoryId?: string;
};

interface EligibilityContext {
  page: 'homepage' | 'product' | 'category' | 'cart' | 'checkout';
  productId?: string;
  categoryId?: string;
  cartValue?: number;
  cartItems?: EligibilityCartItem[];
}

interface EligiblePromotion {
  campaignId: string;
  name: string;
  type: string;
  discountType: string;
  discountValue: number;
  discountDisplay: string;
  badgeLabel: string;
  shortDescription: string;
  ctaText: string;
  ctaLink: string;
  priority: number;
  endsAt: string;
  timeRemaining: number;
  urgencyMessage?: string;
  thumbnailUrl?: string;
  eligibilityReason: string;
  assignedVariant?: 'control' | 'variantA' | 'variantB';
}

interface EligibilityResponse {
  eligible: EligiblePromotion[];
  ineligible: Array<{
    campaignId: string;
    name: string;
    reason: string;
  }>;
  metadata: {
    checkedAt: string;
    totalActive: number;
    userSegment?: string;
  };
}

interface UsePromotionEligibilityOptions {
  enabled?: boolean;
  refreshInterval?: number; // ms
  context: EligibilityContext;
}

// Fetcher function for SWR
const eligibilityFetcher = async (url: string, context: EligibilityContext, userId?: string) => {
  const sessionId = typeof window !== 'undefined'
    ? sessionStorage.getItem('promo_session_id') || ''
    : '';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      sessionId,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to check eligibility');
  }

  return response.json() as Promise<EligibilityResponse>;
};

export function usePromotionEligibility({
  enabled = true,
  refreshInterval = 60000, // Refresh every minute
  context,
}: UsePromotionEligibilityOptions) {
  const { userId } = useAuth();

  // Create stable cache key
  const cacheKey = enabled
    ? [
        'promotion-eligibility',
        context.page,
        context.productId,
        context.categoryId,
        context.cartValue,
        userId ?? 'anon',
        JSON.stringify(context.cartItems ?? []),
      ]
    : null;

  // Use SWR for caching and revalidation
  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    () => eligibilityFetcher('/api/promotions/eligibility', context, userId),
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  // Get the best (highest priority) eligible promotion
  const bestPromotion = data?.eligible?.[0] || null;

  // Get promotions for a specific type
  const getPromotionsByType = useCallback((type: string) => {
    return data?.eligible?.filter(p => p.type === type) || [];
  }, [data]);

  // Check if a specific promotion is eligible
  const isEligible = useCallback((campaignId: string) => {
    return data?.eligible?.some(p => p.campaignId === campaignId) || false;
  }, [data]);

  // Get ineligibility reason for a specific promotion
  const getIneligibilityReason = useCallback((campaignId: string) => {
    return data?.ineligible?.find(p => p.campaignId === campaignId)?.reason || null;
  }, [data]);

  // Force refresh eligibility
  const refresh = useCallback(() => {
    return mutate();
  }, [mutate]);

  return {
    // Data
    eligible: data?.eligible || [],
    ineligible: data?.ineligible || [],
    bestPromotion,
    userSegment: data?.metadata?.userSegment,

    // State
    isLoading,
    error,

    // Helpers
    getPromotionsByType,
    isEligible,
    getIneligibilityReason,
    refresh,
  };
}

// Export types
export type { EligibilityContext, EligiblePromotion, EligibilityResponse };
