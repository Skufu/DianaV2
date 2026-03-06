import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fadeIn, scaleIn, useReducedMotion } from '../../utils/animations';

const RiskIndicator = ({ riskScore, riskLevel, cluster }) => {
  const [displayScore, setDisplayScore] = useState(0);
  const isReduced = useReducedMotion();

  // Count-up animation for risk score
  useEffect(() => {
    if (isReduced) {
      setDisplayScore(riskScore);
      return;
    }

    if (riskScore === displayScore) return;

    const duration = 1000; // 1 second animation
    const steps = 60; // 60fps
    const startScore = displayScore;
    const increment = (riskScore - startScore) / steps;
    let current = startScore;
    let rafId = null;

    const animate = () => {
      current += increment;
      const nextScore = Math.min(Math.round(current), riskScore);
      setDisplayScore(nextScore);
      if (nextScore < riskScore) {
        rafId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [riskScore, displayScore, isReduced]);

  const getRiskColor = (level) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getClusterColor = (cluster) => {
    switch (cluster) {
      case 'SIRD':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'SIDD':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'MOD':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MARD':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const fadeInVariants = isReduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : fadeIn;
  const scaleInVariants = isReduced
    ? { hidden: { opacity: 1, scale: 1 }, visible: { opacity: 1, scale: 1 } }
    : scaleIn;

  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      {/* Risk Score */}
      <motion.div
        variants={scaleInVariants}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold text-slate-800">Diabetes Risk Score</h3>
        </div>

        <div className="flex items-baseline gap-2 mb-5">
          <motion.span
            className="text-[56px] leading-none font-light tracking-tighter text-slate-800 sm:text-[64px] md:text-[72px] lg:text-[80px]"
          >
            {displayScore}
          </motion.span>
        </div>

        <motion.div
          className="flex items-center space-x-3"
          initial={isReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={isReduced ? { duration: 0 } : { delay: 0.3, duration: 0.3 }}
        >
          <span className="text-base font-semibold text-slate-700">Risk Level:</span>
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${getRiskColor(riskLevel)}`}>
            {riskLevel?.toUpperCase() || 'UNKNOWN'}
          </span>
        </motion.div>
      </motion.div>

      {/* Cluster Assignment */}
      {cluster && (
        <motion.div
          variants={scaleInVariants}
          className="mt-6 pt-6 border-t border-slate-100"
          initial={isReduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={isReduced ? { duration: 0 } : { delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-center space-x-3">
            <span className="text-base font-semibold text-slate-700">Metabolic Profile:</span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${getClusterColor(cluster)}`}>
              {cluster}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

RiskIndicator.displayName = 'RiskIndicator';

export default React.memo(RiskIndicator);
