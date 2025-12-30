/**
 * Device Capability Detection Utility
 * Automatically detects device performance tier for graceful degradation
 */

// Performance tiers
export const PERF_TIER = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
};

// Cache the result to avoid repeated calculations
let cachedTier = null;

/**
 * Detect device performance tier based on hardware capabilities
 * @returns {'high' | 'medium' | 'low'} Performance tier
 */
export const getPerformanceTier = () => {
    if (cachedTier) return cachedTier;

    // Default to medium if detection fails
    let tier = PERF_TIER.MEDIUM;

    try {
        // CPU cores (navigator.hardwareConcurrency)
        const cores = navigator.hardwareConcurrency || 2;

        // Device memory in GB (navigator.deviceMemory) - Chrome only
        const memory = navigator.deviceMemory || 4;

        // Screen size (small screens = likely mobile = potentially low-end)
        const isSmallScreen = window.innerWidth < 768;

        // Check for mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        // Determine tier based on criteria
        if (cores >= 4 && memory >= 4 && !isSmallScreen) {
            tier = PERF_TIER.HIGH;
        } else if (cores <= 2 || memory <= 2 || (isMobile && isSmallScreen)) {
            tier = PERF_TIER.LOW;
        } else {
            tier = PERF_TIER.MEDIUM;
        }

        // Also check for slow connection (Network Information API)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            const effectiveType = connection.effectiveType;
            if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                tier = PERF_TIER.LOW;
            }
        }

        // Check if user prefers reduced motion (accessibility)
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Respect user preference - treat as low tier for animations
            if (tier === PERF_TIER.HIGH) tier = PERF_TIER.MEDIUM;
        }

    } catch (e) {
        console.warn('Device capability detection failed, defaulting to medium tier');
        tier = PERF_TIER.MEDIUM;
    }

    cachedTier = tier;
    return tier;
};

/**
 * Check if device should have reduced animations
 * @returns {boolean}
 */
export const shouldReduceAnimations = () => {
    const tier = getPerformanceTier();
    return tier === PERF_TIER.LOW || tier === PERF_TIER.MEDIUM;
};

/**
 * Check if device should disable heavy effects (blur, shadows)
 * @returns {boolean}
 */
export const shouldDisableHeavyEffects = () => {
    return getPerformanceTier() === PERF_TIER.LOW;
};

/**
 * Get appropriate animation node count for BiologicalNetwork
 * @returns {number}
 */
export const getAnimationNodeCount = () => {
    const tier = getPerformanceTier();
    switch (tier) {
        case PERF_TIER.HIGH:
            return 40;
        case PERF_TIER.MEDIUM:
            return 20;
        case PERF_TIER.LOW:
        default:
            return 0; // Disable animation entirely
    }
};

/**
 * Check if charts should animate
 * @returns {boolean}
 */
export const shouldAnimateCharts = () => {
    return getPerformanceTier() === PERF_TIER.HIGH;
};

/**
 * Reset cached tier (useful for testing or when window resizes significantly)
 */
export const resetPerformanceTier = () => {
    cachedTier = null;
};
