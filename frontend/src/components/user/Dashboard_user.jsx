import { useMemo, useState } from 'react';
import {
  Activity,
  TrendingUp,
  AlertCircle,
  Plus,
  RefreshCw,
  User as UserIcon,
  Eye,
  FileText,
  ChevronRight,
} from 'lucide-react';
import RiskIndicator from '../common/RiskIndicator';
import MLResultModal from '../common/MLResultModal';
import StatusSummaryCard from '../common/StatusSummaryCard';
import { deriveRiskLevelFromScore, normalizeAssessmentContract, useAssessments } from '../../api';
import { motion } from 'framer-motion';
import { staggerContainer, slideUp, cardVariants, useReducedMotion } from '../../utils/animations';

const CANONICAL_CLUSTERS = new Set(['SIDD', 'SIRD', 'MOD', 'MARD']);

const capabilityOrFalse = capabilityValue => capabilityValue === true;

const getAssessmentClusterContext = assessment => {
  if (!assessment || typeof assessment !== 'object') {
    return {
      canRenderSubtypeProfile: false,
      normalizedCluster: '',
    };
  }

  const outputCapabilities =
    assessment.output_capabilities && typeof assessment.output_capabilities === 'object'
      ? assessment.output_capabilities
      : null;
  const clusterCapability =
    assessment.cluster_capability && typeof assessment.cluster_capability === 'object'
      ? assessment.cluster_capability
      : null;

  const normalizedCluster =
    typeof assessment.cluster === 'string' ? assessment.cluster.trim().toUpperCase() : '';
  const hasCanonicalCluster = CANONICAL_CLUSTERS.has(normalizedCluster);

  const capabilityExplicitlyDisabled =
    (outputCapabilities !== null || clusterCapability !== null) &&
    (!capabilityOrFalse(outputCapabilities?.metabolic_subtype) ||
      !capabilityOrFalse(clusterCapability?.supported));

  const canRenderSubtypeProfile = hasCanonicalCluster && !capabilityExplicitlyDisabled;

  return {
    canRenderSubtypeProfile,
    normalizedCluster,
  };
};

const Dashboard_user = ({ setActiveTab, onStartAssessment }) => {
  const isReduced = useReducedMotion();
  const { data: rawAssessments, isLoading, error, refetch } = useAssessments();
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);

  const assessments = rawAssessments ?? [];

  const latestAssessment = useMemo(() => {
    return assessments && assessments.length > 0 ? assessments[0] : null;
  }, [assessments]);

  const priorAssessment = useMemo(() => {
    return assessments && assessments.length > 1 ? assessments[1] : null;
  }, [assessments]);

  const getCalculatedRiskLevel = (score, level) => {
    return deriveRiskLevelFromScore(score, level);
  };

  const latestClusterContext = useMemo(
    () => getAssessmentClusterContext(latestAssessment),
    [latestAssessment]
  );
  const canUseClusterSemantics = latestClusterContext.canRenderSubtypeProfile;
  const latestCluster = canUseClusterSemantics ? latestClusterContext.normalizedCluster : '';

  const handleViewAssessment = assessment => {
    setSelectedAssessment(normalizeAssessmentContract(assessment));
    setShowAssessmentModal(true);
  };

  const handleCloseModal = () => {
    setShowAssessmentModal(false);
    setSelectedAssessment(null);
  };

  const handleViewLatest = () => {
    if (latestAssessment) {
      handleViewAssessment(latestAssessment);
    }
  };

  const getTableRiskLevel = (score, existingLevel) => {
    if (existingLevel && existingLevel !== 'UNKNOWN') return existingLevel;
    if (score >= 70) return 'high';
    if (score >= 30) return 'medium';
    if (score >= 0) return 'low';
    return 'Unknown';
  };

  const renderRiskLevelBadge = (score, existingLevel) => {
    const level = getTableRiskLevel(score, existingLevel);
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
          level === 'low'
            ? 'bg-teal-50 text-teal-700 border border-teal-100'
            : level === 'medium' || level === 'moderate'
              ? 'bg-amber-50 text-amber-700 border border-amber-100'
              : level === 'high'
                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                : 'bg-slate-50 text-slate-700 border border-slate-100'
        }`}
      >
        {level || 'Unknown'}
      </span>
    );
  };

  const riskScoreBadgeClass =
    'inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold text-sm';

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <StatusSummaryCard
        latestAssessment={latestAssessment}
        priorAssessment={priorAssessment}
        onStartAssessment={onStartAssessment}
        onViewTrends={() => setActiveTab('trends')}
        onViewLatest={handleViewLatest}
      />

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 text-slate-500"
          aria-live="polite"
        >
          Loading your health data...
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-rose-600 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-lg">Failed to load assessments</div>
              <div className="text-sm text-rose-500/80">
                {error.message || 'Please check your connection and try again'}
              </div>
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
            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <span className="text-slate-600 font-medium">Total Assessments</span>
              </div>
              <div className="text-4xl font-light tracking-tight text-slate-800">
                {assessments.length}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {assessments.length === 0 ? 'No records yet' : 'Health records logged'}
              </div>
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <span className="text-slate-600 font-medium">Risk Level</span>
              </div>
              {latestAssessment ? (
                <RiskIndicator
                  riskScore={latestAssessment.risk_score || 0}
                  riskLevel={getCalculatedRiskLevel(
                    latestAssessment.risk_score,
                    latestAssessment.risk_level
                  )}
                  cluster={latestCluster}
                />
              ) : (
                <div className="text-slate-400 text-sm italic">No data yet</div>
              )}
            </motion.div>

            <motion.div
              variants={cardVariants}
              whileHover="hover"
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <span className="text-slate-600 font-medium">Status</span>
              </div>
              <div className="text-2xl font-light tracking-tight text-slate-800">
                {!latestAssessment
                  ? 'No Risk Estimate Yet'
                  : latestAssessment.risk_score >= 70
                    ? 'Action Needed'
                    : latestAssessment.risk_score >= 30
                      ? 'Monitor Closely'
                      : 'Looking Good'}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {latestAssessment
                  ? 'Based on latest screening'
                  : 'Log your first assessment'}
              </div>
            </motion.div>
          </motion.div>

          <motion.div variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={onStartAssessment}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 text-left hover:border-indigo-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                  <Plus size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    Log New Assessment
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Record your latest health measurements
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-400 ml-auto" />
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('trends')}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 text-left hover:border-teal-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-teal-200 group-hover:scale-105 transition-transform">
                  <TrendingUp size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">
                    View Trends
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Visualize your progress over time
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-teal-400 ml-auto" />
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('export')}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 text-left hover:border-amber-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-800 group-hover:text-amber-600 transition-colors">
                    Health Report
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Download PDF for your clinician
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-amber-400 ml-auto" />
              </div>
            </motion.button>

            <motion.button
              variants={cardVariants}
              whileHover="hover"
              whileTap={{ scale: isReduced ? 1 : 0.98 }}
              onClick={() => setActiveTab('profile')}
              className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 text-left hover:border-slate-300 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserIcon size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-800 transition-colors">
                    My Profile
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Manage your personal information
                  </p>
                </div>
                <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-400 ml-auto" />
              </div>
            </motion.button>
          </motion.div>

          {assessments.length > 0 && (
            <motion.div
              variants={slideUp}
              className="bg-white rounded-[32px] p-6 md:p-8 shadow-sm border border-slate-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Recent Results</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('trends')}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3 md:hidden">
                {assessments.slice(0, 5).map(assessment => {
                  const assessmentClusterContext = getAssessmentClusterContext(assessment);
                  const assessmentClusterDisplay = assessmentClusterContext.canRenderSubtypeProfile
                    ? assessmentClusterContext.normalizedCluster
                    : 'N/A';

                  return (
                    <motion.div
                      key={assessment.id}
                      whileHover={{ backgroundColor: '#f8fafc' }}
                      className="border border-slate-100 rounded-xl p-4 transition-colors cursor-pointer"
                      onClick={() => handleViewAssessment(assessment)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            {assessment.created_at
                              ? new Date(assessment.created_at).toLocaleDateString()
                              : 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={riskScoreBadgeClass}>
                              {assessment.risk_score || 0}
                            </span>
                            {renderRiskLevelBadge(assessment.risk_score, assessment.risk_level)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {assessmentClusterDisplay}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleViewAssessment(assessment);
                            }}
                            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            aria-label="View details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">
                        Date
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-500">
                        Score
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">
                        Level
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">
                        Profile
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-500">
                        BMI
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.slice(0, 5).map(assessment => {
                      const assessmentClusterContext = getAssessmentClusterContext(assessment);
                      const assessmentClusterDisplay =
                        assessmentClusterContext.canRenderSubtypeProfile
                          ? assessmentClusterContext.normalizedCluster
                          : 'N/A';

                      return (
                        <motion.tr
                          key={assessment.id}
                          whileHover={{ backgroundColor: '#f8fafc' }}
                          className="border-b border-slate-50 last:border-0 cursor-pointer"
                          onClick={() => handleViewAssessment(assessment)}
                        >
                          <td className="py-3 px-4 text-sm font-medium text-slate-700 align-middle">
                            {assessment.created_at
                              ? new Date(assessment.created_at).toLocaleDateString()
                              : 'N/A'}
                          </td>
                          <td className="py-3 px-4 align-middle">
                            <div className="flex items-center justify-center">
                              <span className={riskScoreBadgeClass}>
                                {assessment.risk_score || 0}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 align-middle">
                            {renderRiskLevelBadge(assessment.risk_score, assessment.risk_level)}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-700 align-middle">
                            {assessmentClusterDisplay}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-700 align-middle">
                            {assessment.bmi ? `${assessment.bmi} kg/m²` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-right align-middle">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={e => {
                                e.stopPropagation();
                                handleViewAssessment(assessment);
                              }}
                              className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                              aria-label="View details"
                            >
                              <Eye size={18} />
                            </motion.button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {assessments.length > 5 && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('trends')}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
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
        result={selectedAssessment ? { ...selectedAssessment, success: true } : null}
        onConfirm={handleCloseModal}
        isLoading={false}
      />
    </motion.div>
  );
};

export default Dashboard_user;