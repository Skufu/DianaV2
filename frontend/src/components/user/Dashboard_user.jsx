import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, TrendingUp, AlertCircle, Plus, Download, RefreshCw, User as UserIcon, Calendar, Eye } from 'lucide-react';
import RiskIndicator from '../common/RiskIndicator';
import MLResultModal from '../common/MLResultModal';
import { useAssessments } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeIn, slideUp, cardVariants, useReducedMotion } from '../../utils/animations';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const Dashboard_user = ({ userId, setActiveTab, onStartAssessment }) => {
  const isReduced = useReducedMotion();
  const queryClient = useQueryClient();
  const { data: rawAssessments, isLoading, error, refetch } = useAssessments();
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  // Ensure assessments is always an array (API may return null)
  const assessments = rawAssessments ?? [];

  const latestAssessment = useMemo(() => {
    return assessments && assessments.length > 0 ? assessments[0] : null;
  }, [assessments]);

  // --- NEW: Data for Sparkline ---
  // We take the last 5 assessments and reverse them to show chronological order (oldest -> newest) for the chart
  const sparklineData = useMemo(() => {
    if (!assessments || assessments.length === 0) return [];
    return [...assessments].slice(0, 10).reverse().map(a => ({
      date: a.date, // simple date for key
      risk_score: a.risk_score || 0
    }));
  }, [assessments]);

  // --- NEW: Health Tip Logic ---
  const healthTip = useMemo(() => {
    if (!latestAssessment) return null;
    const cluster = latestAssessment.cluster;

    // Simple mapping for now - can be expanded later or moved to a utility
    const tips = {
      'SIDD': {
        title: "Focus on Insulin Sensitivity",
        text: "Your profile suggests insulin deficiency. Prioritize strength training to improve muscle glucose uptake.",
        icon: Activity,
        color: "text-rose-600 bg-rose-50 border-rose-100"
      },
      'SIRD': {
        title: "Manage Insulin Resistance",
        text: "Focus on weight management and reducing processed carb intake to help your body use insulin more effectively.",
        icon: TrendingUp, // Using available icons
        color: "text-amber-600 bg-amber-50 border-amber-100"
      },
      'MOD': {
        title: "Balanced Lifestyle",
        text: "Maintain a healthy BMI and monitor cardiovascular health. Regular moderate cardio is highly beneficial.",
        icon: UserIcon,
        color: "text-blue-600 bg-blue-50 border-blue-100"
      },
      'MARD': {
        title: "Healthy Aging",
        text: "Focus on metabolic health and preventing frailty. distinct nutritional needs may apply.",
        icon: Calendar,
        color: "text-indigo-600 bg-indigo-50 border-indigo-100"
      }
    };

    // Fallback/Default tip
    return tips[cluster] || {
      title: "Stay Consistent",
      text: "Regular monitoring is key to understanding your health trends. Keep logging your assessments!",
      icon: Activity,
      color: "text-diana-forest bg-diana-forest/5 border-diana-forest/10"
    };
  }, [latestAssessment]);

  const handleViewAssessment = (assessment) => {
    setSelectedAssessment(assessment);
    setShowAssessmentModal(true);
  };

  const handleCloseModal = () => {
    setShowAssessmentModal(false);
    setSelectedAssessment(null);
  };


  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Welcome Section */}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Col: Welcome + Health Tip */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div variants={slideUp} className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Welcome Back!</h1>
                <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
                  Your latest health profile has been analyzed.
                </p>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
            </motion.div>

            {/* --- NEW: Daily Insight / Health Tip --- */}
            {healthTip && (
              <motion.div variants={slideUp} className={`rounded-3xl p-6 border ${healthTip.color} flex items-start gap-4 shadow-sm`}>
                <div className={`p-3 rounded-full bg-white/60 shrink-0`}>
                  <healthTip.icon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{healthTip.title}</h3>
                  <p className="text-sm opacity-90 leading-relaxed">{healthTip.text}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Col: Recent Activity Feed (Mini) */}
          <motion.div variants={slideUp} className="glass-card p-6 bg-white h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-diana-text-primary">Recent Activity</h3>
              <button type="button" onClick={() => setActiveTab('trends')} className="text-xs font-bold text-diana-forest hover:underline">View All</button>
            </div>
            <div className="space-y-4">
              {assessments.slice(0, 3).map((assessment) => (
                <div key={assessment.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    {assessment.risk_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-diana-text-primary truncate">Assessment Logged</div>
                    <div className="text-xs text-diana-text-secondary">{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'Just now'}</div>
                  </div>
                </div>
              ))}
              {assessments.length === 0 && (
                <div className="text-center text-diana-text-muted text-sm py-4">No recent activity</div>
              )}
            </div>
          </motion.div>
        </div>
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

            {/* --- MODIFIED: Assessment Card with Sparkline --- */}
            <motion.div variants={cardVariants} whileHover="hover" className={`glass-card p-6 flex flex-col justify-between h-56 ${assessments.length === 0 ? 'bg-diana-stone/50 border-dashed border-2 border-diana-sand' : 'bg-white overflow-hidden relative'}`}>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${assessments.length === 0 ? 'bg-diana-sand text-diana-text-muted' : 'bg-diana-stone text-diana-forest'}`}>
                    <Activity size={20} />
                  </div>
                  <span className="text-diana-text-secondary font-bold text-sm tracking-wide uppercase">Assessments</span>
                </div>
                <div className={`text-4xl font-serif font-bold mt-1 ${assessments.length === 0 ? 'text-diana-text-muted' : 'text-diana-text-primary'}`}>
                  {assessments.length}
                </div>
                <div className="text-sm text-diana-text-muted mt-2">
                  {assessments.length === 0 ? 'No records yet' : 'Total logged records'}
                </div>
              </div>

              {/* Sparkline Chart */}
              {assessments.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <Area type="monotone" dataKey="risk_score" stroke="#10B981" fill="#10B981" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
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
                  <RiskIndicator riskScore={latestAssessment.risk_score || 0} riskLevel={latestAssessment.risk_level} cluster={latestAssessment.cluster} />
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
                  {!latestAssessment
                    ? 'No Assessment'
                    : latestAssessment.risk_score >= 67
                      ? 'Action Needed'
                      : latestAssessment.risk_score >= 34
                        ? 'Monitor Closely'
                        : 'Optimal Range'}
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">BMI</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.bmi ? (
                      <>
                        {latestAssessment.bmi}
                        <span className="text-lg text-diana-text-muted ml-0.5">kg/m²</span>
                      </>
                    ) : (
                      <span className="text-lg text-diana-text-muted">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Triglycerides</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.triglycerides ? (
                      <>
                        {latestAssessment.triglycerides}
                        <span className="text-lg text-diana-text-muted ml-0.5">mg/dL</span>
                      </>
                    ) : (
                      <span className="text-lg text-diana-text-muted">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">LDL</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.ldl ? (
                      <>
                        {latestAssessment.ldl}
                        <span className="text-lg text-diana-text-muted ml-0.5">mg/dL</span>
                      </>
                    ) : (
                      <span className="text-lg text-diana-text-muted">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">HDL</div>
                  <div className="text-3xl font-bold text-diana-text-primary">
                    {latestAssessment.hdl ? (
                      <>
                        {latestAssessment.hdl}
                        <span className="text-lg text-diana-text-muted ml-0.5">mg/dL</span>
                      </>
                    ) : (
                      <span className="text-lg text-diana-text-muted">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Cluster</div>
                  <div className="text-xl font-bold text-diana-forest bg-diana-stone px-3 py-1 rounded-lg inline-block">
                    {latestAssessment.cluster || 'Pending'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {assessments.length > 0 && (
            <motion.div variants={slideUp} className="glass-card p-8 bg-white/90">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-bold text-diana-text-primary">Past Results</h2>
                <span className="text-xs font-bold uppercase tracking-wider text-diana-text-muted bg-diana-stone px-3 py-1 rounded-full">
                  {assessments.length} Assessment{assessments.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-diana-stone">
                      <th className="text-left py-3 px-4 text-xs font-bold text-diana-text-secondary uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-diana-text-secondary uppercase tracking-wider">Risk Score</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-diana-text-secondary uppercase tracking-wider">Level</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-diana-text-secondary uppercase tracking-wider">Cluster</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-diana-text-secondary uppercase tracking-wider">BMI</th>
                      <th className="text-left py-3 px-4 text-xs font-bold text-diana-text-secondary uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.slice(0, 10).map((assessment) => (
                      <motion.tr
                        key={assessment.id}
                        whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.8)' }}
                        className="border-b border-diana-stone/50 last:border-0 cursor-pointer"
                        onClick={() => handleViewAssessment(assessment)}
                      >
                        <td className="py-4 px-4 text-sm text-diana-text-primary">
                          {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold text-sm">
                            {assessment.risk_score || 0}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            assessment.risk_level === 'low'
                              ? 'bg-green-100 text-green-700'
                              : assessment.risk_level === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : assessment.risk_level === 'high'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {assessment.risk_level || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm text-diana-text-primary">
                          {assessment.cluster || 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-sm text-diana-text-primary">
                          {assessment.bmi ? `${assessment.bmi} kg/m²` : 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAssessment(assessment);
                            }}
                            className="p-2 rounded-lg bg-diana-forest/10 text-diana-forest hover:bg-diana-forest hover:text-white transition-colors"
                            title="View details"
                          >
                            <Eye size={18} />
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {assessments.length > 10 && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('trends')}
                    className="text-sm font-bold text-diana-forest hover:underline"
                  >
                    View all {assessments.length} assessments →
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </>
      )}

      <MLResultModal
        isOpen={showAssessmentModal}
        onClose={handleCloseModal}
        result={selectedAssessment ? {
          risk_score: selectedAssessment.risk_score,
          risk_level: selectedAssessment.risk_level,
          predicted_status: selectedAssessment.predicted_status,
          cluster: selectedAssessment.cluster,
          model_version: selectedAssessment.model_version,
          fbs: selectedAssessment.fbs,
          hba1c: selectedAssessment.hba1c,
          success: true
        } : null}
        onConfirm={handleCloseModal}
        isLoading={false}
      />
    </motion.div>
  );
};

export default Dashboard_user;
