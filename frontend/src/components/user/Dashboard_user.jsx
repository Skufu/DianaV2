import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, TrendingUp, AlertCircle, Plus, Download, RefreshCw, User as UserIcon, Calendar, Eye, FileText } from 'lucide-react';
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

  // --- NEW: Calculate Risk Level Fallback ---
  const getCalculatedRiskLevel = (score, level) => {
    if (level && String(level).toUpperCase() !== 'UNKNOWN' && String(level).trim() !== '') return String(level).toLowerCase();
    if (score === undefined || score === null) return 'unknown';
    if (score < 34) return 'low';
    if (score < 67) return 'medium';
    return 'high';
  };

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
        text: "Maintain a healthy BMI. Moderate cardio is highly beneficial.",
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
              Check whether you may be at risk of Type 2 Diabetes in menopause. Log your first assessment to get your risk estimate.
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
            <motion.div variants={slideUp} className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[32px] p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3 tracking-tight">Welcome Back!</h1>
                <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
                  Your latest health profile has been analyzed.
                </p>
              </div>
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
            </motion.div>

            {/* --- NEW: Daily Insight / Health Tip --- */}
            {healthTip && (
              <motion.div variants={slideUp} className={`rounded-[32px] p-7 border ${healthTip.color} flex items-start gap-4 shadow-sm`}>
                <div className={`p-3 rounded-full bg-white/60 shrink-0`}>
                  <healthTip.icon size={26} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{healthTip.title}</h3>
                  <p className="text-[15px] opacity-90 leading-relaxed font-medium">{healthTip.text}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Col: Recent Activity Feed (Mini) */}
          <motion.div variants={slideUp} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 h-full">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-800 text-lg">Recent Activity</h3>
              <button type="button" onClick={() => setActiveTab('trends')} className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
            </div>
            <div className="space-y-4">
              {assessments.slice(0, 3).map((assessment) => (
                <div key={assessment.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-lg">
                    {assessment.risk_score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-slate-800 truncate">Assessment Logged</div>
                    <div className="text-sm text-slate-500 mt-0.5">{assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'Just now'}</div>
                  </div>
                </div>
              ))}
              {assessments.length === 0 && (
                <div className="text-center text-slate-400 text-base font-medium py-4">No recent activity</div>
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
            <motion.div variants={cardVariants} whileHover="hover" className={`bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between h-56 ${assessments.length === 0 ? 'bg-slate-50 border-dashed border-2' : 'overflow-hidden relative'}`}>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${assessments.length === 0 ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 text-indigo-500'}`}>
                    <Activity size={24} />
                  </div>
                  <span className="text-slate-700 font-semibold text-lg">Assessments</span>
                </div>
                <div className={`text-5xl tracking-tight font-light mt-3 ${assessments.length === 0 ? 'text-slate-300' : 'text-slate-800'}`}>
                  {assessments.length}
                </div>
                <div className="text-base font-medium text-slate-400 mt-2">
                  {assessments.length === 0 ? 'No records yet' : 'Total logged records'}
                </div>
              </div>

              {/* Sparkline Chart */}
              {assessments.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-24 opacity-20 pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData}>
                      <Area type="monotone" dataKey="risk_score" stroke="#6366f1" fill="#6366f1" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>

            <motion.div variants={cardVariants} whileHover="hover" className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-teal-500">
                  <TrendingUp size={24} />
                </div>
                <span className="text-slate-700 font-semibold text-lg">Estimated Risk Level</span>
              </div>
              {latestAssessment ? (
                <div className="mt-1">
                  <RiskIndicator riskScore={latestAssessment.risk_score || 0} riskLevel={getCalculatedRiskLevel(latestAssessment.risk_score, latestAssessment.risk_level)} cluster={latestAssessment.cluster} />
                </div>
              ) : (
                <div className="text-slate-400 text-base italic font-medium mt-3">No data yet</div>
              )}
            </motion.div>

            <motion.div variants={cardVariants} whileHover="hover" className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                    <AlertCircle size={24} />
                  </div>
                  <span className="text-slate-700 font-semibold text-lg">Status</span>
                </div>
                <div className="text-3xl font-light tracking-tight text-slate-800 mt-4">
                  {!latestAssessment
                    ? 'No Risk Estimate Yet'
                    : latestAssessment.risk_score >= 67
                      ? 'Action Needed'
                      : latestAssessment.risk_score >= 34
                        ? 'Monitor Closely'
                        : 'Optimal Range'}
                </div>
              </div>
              <div className="text-base font-medium text-slate-400 mt-4">
                {latestAssessment ? 'Based on latest biomarker analysis' : 'Log your first assessment to generate a risk estimate.'}
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('profile')}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-left hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                  <Plus size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">Log Assessment</h3>
                  <p className="text-slate-500 text-base leading-relaxed font-medium">Log your latest health measurements.</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('trends')}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-left hover:border-teal-200 transition-all group"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-teal-200 group-hover:scale-105 transition-transform">
                  <TrendingUp size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors">View Trends</h3>
                  <p className="text-slate-500 text-base leading-relaxed font-medium">Visualize your progress over time.</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('export')}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-left hover:border-amber-200 transition-all group"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">Health Report</h3>
                  <p className="text-slate-500 text-base leading-relaxed font-medium">Download a PDF summary you can share with your clinician.</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('profile')}
              className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 text-left hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserIcon size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-800 mb-2 transition-colors">My Profile</h3>
                  <p className="text-slate-500 text-base leading-relaxed font-medium">Manage your personal information.</p>
                </div>
              </div>
            </motion.button>
          </motion.div>

          {latestAssessment && (
            <motion.div variants={slideUp} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[28px] font-semibold tracking-tight text-slate-800">Latest Clinical Markers</h2>
                <span className="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">Recent</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
                <div>
                  <div className="text-base font-semibold text-slate-500 mb-2">BMI</div>
                  <div className="text-3xl font-light tracking-tight text-slate-800">
                    {latestAssessment.bmi ? (
                      <>
                        {latestAssessment.bmi}
                        <span className="text-lg font-medium text-slate-400 ml-1">kg/m²</span>
                      </>
                    ) : (
                      <span className="text-lg font-medium text-slate-400">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-500 mb-2">Triglycerides</div>
                  <div className="text-3xl font-light tracking-tight text-slate-800">
                    {latestAssessment.triglycerides ? (
                      <>
                        {latestAssessment.triglycerides}
                        <span className="text-lg font-medium text-slate-400 ml-1">mg/dL</span>
                      </>
                    ) : (
                      <span className="text-lg font-medium text-slate-400">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-500 mb-2">LDL</div>
                  <div className="text-3xl font-light tracking-tight text-slate-800">
                    {latestAssessment.ldl ? (
                      <>
                        {latestAssessment.ldl}
                        <span className="text-lg font-medium text-slate-400 ml-1">mg/dL</span>
                      </>
                    ) : (
                      <span className="text-lg font-medium text-slate-400">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-500 mb-2">HDL</div>
                  <div className="text-3xl font-light tracking-tight text-slate-800">
                    {latestAssessment.hdl ? (
                      <>
                        {latestAssessment.hdl}
                        <span className="text-lg font-medium text-slate-400 ml-1">mg/dL</span>
                      </>
                    ) : (
                      <span className="text-lg font-medium text-slate-400">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-500 mb-2">Profile</div>
                  <div className="text-xl font-medium text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl inline-block">
                    {latestAssessment.cluster || 'Pending'}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {assessments.length > 0 && (
            <motion.div variants={slideUp} className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[28px] font-semibold tracking-tight text-slate-800">Past Results</h2>
                <span className="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-1.5 rounded-full">
                  {assessments.length} Assessment{assessments.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-4 px-4 text-base font-semibold text-slate-500">Date</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-slate-500">Risk Score</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-slate-500">Level</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-slate-500">Profile</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-slate-500">BMI</th>
                      <th className="text-left py-4 px-4 text-base font-semibold text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.slice(0, 10).map((assessment) => (
                      <motion.tr
                        key={assessment.id}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                        className="border-b border-slate-50 last:border-0 cursor-pointer"
                        onClick={() => handleViewAssessment(assessment)}
                      >
                        <td className="py-4 px-4 text-base font-medium text-slate-700">
                          {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 font-bold text-base">
                            {assessment.risk_score || 0}
                          </span>
                        </td>
                        <td className="py-5 px-4">
                          {(() => {
                            const getCalculatedRiskLevel = (score, existingLevel) => {
                              if (existingLevel && existingLevel !== 'UNKNOWN') return existingLevel;
                              if (score >= 67) return 'high';
                              if (score >= 34) return 'moderate';
                              if (score >= 0) return 'low';
                              return 'Unknown';
                            };
                            const level = getCalculatedRiskLevel(assessment.risk_score, assessment.risk_level);
                            return (
                              <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase ${level === 'low'
                                ? 'bg-teal-50 text-teal-700 border border-teal-100'
                                : level === 'medium' || level === 'moderate'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : level === 'high'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : 'bg-slate-50 text-slate-700 border border-slate-100'
                                }`}>
                                {level || 'Unknown'}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="py-4 px-4 text-base font-medium text-slate-700">
                          {assessment.cluster || 'N/A'}
                        </td>
                        <td className="py-4 px-4 text-base font-medium text-slate-700">
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
                            className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            title="View details"
                          >
                            <Eye size={20} />
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
                    className="text-base font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
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
