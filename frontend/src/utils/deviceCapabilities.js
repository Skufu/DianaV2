/**
 * deviceCapabilities.js
 * Detects hardware capabilities to adjust animation load.
 */

export const PERF_TIER = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
};

export const getPerformanceTier = () => {
  // SSR check
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return PERF_TIER.MEDIUM;
  }

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // GB

  if (cores >= 8 && memory >= 8) return PERF_TIER.HIGH;
  if (cores >= 4 && memory >= 4) return PERF_TIER.MEDIUM;
  return PERF_TIER.LOW;
};

export const getAnimationNodeCount = () => {
  const tier = getPerformanceTier();
  if (tier === PERF_TIER.HIGH) return 40;
  if (tier === PERF_TIER.MEDIUM) return 20;
  return 0;
};

export const shouldDisableHeavyEffects = () => {
  return getPerformanceTier() === PERF_TIER.LOW;
};
