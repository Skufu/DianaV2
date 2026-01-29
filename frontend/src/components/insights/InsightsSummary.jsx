import React from 'react';
import { Users, Activity, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants, fadeIn, useReducedMotion } from '../../utils/animations';

const InsightsSummary = ({ totalAssessments, avgRiskScore, clusterCount }) => {
  const isReduced = useReducedMotion();
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
            delayChildren: 0.05
          }
        }
      }}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      <motion.div variants={cardVariants} className="glass-card p-8 bg-white hover:bg-white/80 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-diana-lime/10 flex items-center justify-center">
            <motion.div whileHover={{ scale: isReduced ? 1 : 1.05, rotate: isReduced ? 0 : 5 }} transition={{ duration: 0.2 }}>
              <Users className="text-diana-lime-dark" size={32} />
            </motion.div>
          </div>
        </div>
        <motion.h3 whileHover={{ scale: isReduced ? 1 : 1.02 }} variants={fadeIn} className="text-4xl font-serif font-bold text-diana-text-primary">{totalAssessments}</motion.h3>
        <p className="text-diana-text-secondary font-bold text-sm mt-2 uppercase tracking-wide">Total Assessments</p>
      </motion.div>

      <motion.div variants={cardVariants} className="glass-card p-8 bg-white hover:bg-white/80 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
            <motion.div whileHover={{ scale: isReduced ? 1 : 1.05, rotate: isReduced ? 0 : 5 }} transition={{ duration: 0.2 }}>
              <Activity className="text-rose-500" size={32} />
            </motion.div>
          </div>
        </div>
        <motion.h3 whileHover={{ scale: isReduced ? 1 : 1.02 }} variants={fadeIn} className="text-4xl font-serif font-bold text-diana-text-primary">{avgRiskScore}%</motion.h3>
        <p className="text-diana-text-secondary font-bold text-sm mt-2 uppercase tracking-wide">Average Risk Score</p>
      </motion.div>

      <motion.div variants={cardVariants} className="glass-card p-8 bg-white hover:bg-white/80 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-diana-forest-light/10 flex items-center justify-center">
            <motion.div whileHover={{ scale: isReduced ? 1 : 1.05, rotate: isReduced ? 0 : 5 }} transition={{ duration: 0.2 }}>
              <BarChart3 className="text-diana-forest" size={32} />
            </motion.div>
          </div>
        </div>
        <motion.h3 whileHover={{ scale: isReduced ? 1 : 1.02 }} variants={fadeIn} className="text-4xl font-serif font-bold text-diana-text-primary">{clusterCount}</motion.h3>
        <p className="text-diana-text-secondary font-bold text-sm mt-2 uppercase tracking-wide">Risk Clusters</p>
      </motion.div>
    </motion.div>
  );
};

InsightsSummary.displayName = 'InsightsSummary';

export default InsightsSummary;
