import { useMemo } from 'react';
import { shouldDisableHeavyEffects, getAnimationNodeCount } from './deviceCapabilities';
import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';

export const useReducedMotion = () => {
  const isReduced = useFramerReducedMotion();
  return isReduced || shouldDisableHeavyEffects();
};

export const useInputFocusVariants = () => {
  const isReduced = useReducedMotion();
  return useMemo(() => ({
    focus: { 
      scale: isReduced ? 1 : 1.01, 
      borderColor: "#4318FF", 
      boxShadow: "0px 0px 0px 1px #4318FF",
      transition: { duration: 0.2 }
    }
  }), [isReduced]);
};

// Non-hook version for use with useMemo
export const getInputFocusVariants = (isReduced) => ({
  focus: { 
    scale: isReduced ? 1 : 1.01, 
    borderColor: "#4318FF", 
    boxShadow: "0px 0px 0px 1px #4318FF",
    transition: { duration: 0.2 }
  }
});

export const EASE_IN_OUT = [0.4, 0, 0.2, 1];
export const SPRING_TIGHT = { type: "spring", stiffness: 400, damping: 40, mass: 0.8 };
export const SPRING_GENTLE = { type: "spring", stiffness: 180, damping: 28, mass: 1 };
export const SPRING_BOUNCY = { type: "spring", stiffness: 400, damping: 10, mass: 1 };

export const breathing = {
  animate: {
    opacity: [0.4, 0.7, 0.4],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Helper to disable animations on low-tier devices
const getTransition = (duration) => {
  if (shouldDisableHeavyEffects()) {
    return { duration: 0 };
  }
  return { duration, ease: EASE_IN_OUT };
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: getTransition(0.3)
  },
  exit: { 
    opacity: 0,
    transition: getTransition(0.2)
  }
};

export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: getTransition(0.4)
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: getTransition(0.3)
  }
};

export const slideInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: getTransition(0.4)
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: getTransition(0.3)
  }
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: getTransition(0.3)
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: getTransition(0.2)
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: shouldDisableHeavyEffects() ? 0 : 0.1,
      delayChildren: shouldDisableHeavyEffects() ? 0 : 0.05
    }
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: shouldDisableHeavyEffects() ? 0 : 0.05,
      staggerDirection: -1
    }
  }
};

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: getTransition(0.3)
  },
  exit: { 
    opacity: 0, 
    y: -10, 
    transition: getTransition(0.2)
  }
};

export const cardVariants = {
  offscreen: {
    y: 20,
    opacity: 0
  },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: shouldDisableHeavyEffects() 
      ? { duration: 0 } 
      : {
          type: "spring",
          bounce: 0.2,
          duration: 0.6
        }
  }
};

export const navLabelVariants = {
  hidden: { opacity: 0, x: -10, width: 0 },
  visible: { 
    opacity: 1, 
    x: 0, 
    width: "auto",
    transition: { duration: 0.3, ease: EASE_IN_OUT }
  },
  exit: { 
    opacity: 0, 
    x: -10, 
    width: 0,
    transition: { duration: 0.2, ease: EASE_IN_OUT }
  }
};

export const getFocusVariants = (isReduced) => ({
  focus: {
    scale: isReduced ? 1 : 1.02,
    boxShadow: "0px 0px 0px 3px rgba(67, 24, 255, 0.2)",
    transition: { duration: 0.2 }
  }
});
