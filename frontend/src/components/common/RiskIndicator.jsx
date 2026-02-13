import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { fadeIn, scaleIn } from '../../utils/animations';

const RiskIndicator = ({ riskScore, riskLevel, cluster }) => {
  const [displayScore, setDisplayScore] = useState(0);

  // Count-up animation for risk score
  useEffect(() => {
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
  }, [riskScore]);

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
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SIDD':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MOD':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MARD':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <motion.div variants={fadeIn} initial="offscreen" animate="onscreen" className="space-y-3">
      {/* Risk Score */}
      <motion.div
        variants={scaleIn}
        whileHover={{ y: -4 }}
        className="bg-white p-4 rounded-lg shadow border"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Diabetes Risk Score</h3>
          <motion.span
            className={`text-3xl font-bold px-4 py-2 rounded-lg ${getRiskColor(riskLevel)}`}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            {displayScore}
          </motion.span>
        </div>

        <motion.div
          className="flex items-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <span className="text-sm text-gray-600">Risk Level:</span>
          <span className={`px-3 py-1 rounded-md text-sm font-medium ${getRiskColor(riskLevel)}`}>
            {riskLevel?.toUpperCase() || 'UNKNOWN'}
          </span>
        </motion.div>
      </motion.div>

      {/* Cluster Assignment */}
      {cluster && (
        <motion.div
          variants={scaleIn}
          whileHover={{ y: -4 }}
          className="mt-4 pt-4 border-t"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Metabolic Subtype:</span>
            <span className={`px-3 py-1 rounded-md text-sm font-medium ${getClusterColor(cluster)}`}>
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
