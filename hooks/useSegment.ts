'use client';

import useCartStore from '@/store';

export function useSegment() {
  const segment = useCartStore((state) => state.segment);
  const segmentData = useCartStore((state) => state.segmentData);
  const refreshSegment = useCartStore((state) => state.refreshSegment);

  return { segment, segmentData, refreshSegment };
}
