import React, { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, TrendingUp, AlertCircle, Plus, Download, RefreshCw, User as UserIcon } from 'lucide-react';
import RiskIndicator from '../common/RiskIndicator';
import { useAssessments } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeIn, slideUp, cardVariants, useReducedMotion } from '../../utils/animations';

const Dashboard_user = ({ userId, setActiveTab, onStartAssessment }) => {
  const isReduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: rawAssessments, isLoading, error, refetch } = useAssessments();

  // Ensure assessments is always an array (API may return null)
  const assessments = rawAssessments ?? [];

  const latestAssessment = useMemo(() => {
    return assessments && assessments.length > 0 ? assessments[0] : null;
  }, [assessments]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {assessments.length === 0 ? (
        <motion.div variants={slideUp} className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Welcome to DIANA</h1>
            <p className="text-blue-100 text-lg max-w-xl leading-relaxed mb-6">
              Your personal diabetes risk assessment platform. Start by logging your first health assessment to unlock personalized clinical insights.
            </p>
            <motion.button
              whileHover={{ scale: isReduced ? 1 : 1.05 }}
              whileTap={{ scale: isReduced ? 1 : 0.95 }}
              onClick={onStartAssessment}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-diana-forest font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
            >
              <Plus size={20} />
              Log Your First Assessment
            </motion.button>
          </div>
          {/* Abstract shapes for visual interest */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
        </motion.div>
      ) : (
        <motion.div variants={slideUp} className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Welcome Back!</h1>
            <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
              Your latest health profile has been analyzed. Review your personalized summary below.
            </p>
          </div>
          {/* Abstract shapes for visual interest */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
        </motion.div>
      )}

      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-diana-text-muted" aria-live="polite">Loading your health data...</motion.div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-600 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg">Failed to load assessments</div>
              <div className="text-sm text-rose-500/80">{error.message || 'Please check your connection and try again'}</div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: isReduced ? 1 : 1.05 }}
            whileTap={{ scale: isReduced ? 1 : 0.95 }}
            onClick={() => refetch()}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-md active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </motion.button>
        </motion.div>
      )}

      {!isLoading && !error && (
        <>
          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div variants={cardVariants} whileHover="hover" className={`glass-card p-6 flex flex-col justify-between h-full ${assessments.length === 0 ? 'bg-diana-stone/50 border-dashed border-2 border-diana-sand' : 'bg-white'}`}>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${assessments.length === 0 ? 'bg-diana-sand text-diana-text-muted' : 'bg-diana-stone text-diana-forest'}`}>
                    <Activity size={20} />
                  </div>
                  <span className="text-diana-text-secondary font-bold text-sm tracking-wide uppercase">Assessments</span>
                </div>
                <div className={`text-4xl font-serif font-bold mt-2 ${assessments.length === 0 ? 'text-diana-text-muted' : 'text-diana-text-primary'}`}>
                  {assessments.length}
                </div>
              </div>
              <div className="text-sm text-diana-text-muted mt-4">
                {assessments.length === 0 ? 'No records yet' : 'Total logged records'}
              </div>
            </motion.div>

            <motion.div variants={cardVariants} whileHover="hover" className="glass-card p-6 flex flex-col justify-between h-full bg-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-diana-stone flex items-center justify-center text-diana-forest">
                  <TrendingUp size={20} />
                </div>
                <span className="text-diana-text-secondary font-bold text-sm tracking-wide uppercase">Risk Level</span>
              </div>
              {latestAssessment ? (
                <div className="mt-1">
                  <RiskIndicator riskScore={latestAssessment.risk_score || 0} />
                </div>
              ) : (
                <div className="text-diana-text-muted text-sm italic">No data yet</div>
              )}
            </motion.div>

            <motion.div variants={cardVariants} whileHover="hover" transformTemplate={({ scale }) => `scale(${scale})`} className="glass-card p-6 flex flex-col justify-between h-full bg-white">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-diana-stone flex items-center justify-center text-amber-500">
                    <AlertCircle size={20} />
                  </div>
                  <span className="text-diana-text-secondary font-bold text-sm tracking-wide uppercase">Status</span>
                </div>
                <div className="text-xl font-bold text-diana-text-primary mt-1">
                  {latestAssessment?.risk_score >= 67
                    ? 'Action Needed'
                    : latestAssessment?.risk_score >= 34
                      ? 'Monitor Closely'
                      : latestAssessment
                        ? 'Optimal Range'
                        : 'No Assessment'}
                </div>
              </div>
              <div className="text-sm text-diana-text-muted mt-2">
                {latestAssessment ? 'Based on latest biomarker analysis' : 'Log your first assessment to begin'}
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('profile')}
              className="glass-card p-6 text-left hover:border-diana-forest/30 transition-all group bg-white"
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-diana-forest text-white flex items-center justify-center shrink-0 shadow-lg shadow-diana-forest/20 group-hover:scale-110 transition-transform">
                  <Plus size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-diana-text-primary mb-2 group-hover:text-diana-forest transition-colors">Log Assessment</h3>
                  <p className="text-diana-text-secondary text-sm leading-relaxed">Record new health measurements. Our AI will analyze your biomarkers instantly.</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('trends')}
              className="glass-card p-6 text-left hover:border-diana-forest/30 transition-all group bg-white"
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-diana-forest-light text-white flex items-center justify-center shrink-0 shadow-lg shadow-diana-forest/20 group-hover:scale-110 transition-transform">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-diana-text-primary mb-2 group-hover:text-diana-forest transition-colors">View Trends</h3>
                  <p className="text-diana-text-secondary text-sm leading-relaxed">Visualize your health progress over time with interactive detailed charts.</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('export')}
              className="glass-card p-6 text-left hover:border-amber-400/30 transition-all group bg-white"
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Download size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-diana-text-primary mb-2 group-hover:text-amber-600 transition-colors">Export Report</h3>
                  <p className="text-diana-text-secondary text-sm leading-relaxed">Download a comprehensive PDF summary of your health data for your clinician.</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('profile')}
              className="glass-card p-6 text-left hover:border-diana-forest/30 transition-all group bg-white"
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-diana-stone text-diana-text-secondary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <UserIcon size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-diana-text-primary mb-2 group-hover:text-diana-forest transition-colors">My Profile</h3>
                  <p className="text-diana-text-secondary text-sm leading-relaxed">Update your personal information, medical history, and account preferences.</p>
                </div>
              </div>
            </motion.button>
          </motion.div>

          {latestAssessment && (
            <motion.div variants={slideUp} className="glass-card p-8 bg-white/90">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold text-diana-text-primary">Latest Clinical Markers</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-diana-text-muted bg-diana-stone px-3 py-1 rounded-full">Recent</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">HbA1c</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.hba1c}<span className="text-lg text-diana-text-muted ml-0.5">%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">FBS</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.fbs} <span className="text-lg text-diana-text-muted ml-0.5">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Cholesterol</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.cholesterol} <span className="text-lg text-diana-text-muted ml-0.5">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Cluster</div>
                  <div className="text-2xl font-bold text-diana-forest bg-diana-stone px-3 py-1 rounded-lg inline-block">
                    {latestAssessment.cluster || 'Pending'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Dashboard_user;
