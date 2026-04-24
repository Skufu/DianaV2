import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Activity,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { useReducedMotion } from '../../utils/animations';

const CANONICAL_CLUSTERS = new Set(['SIDD', 'SIRD', 'MOD', 'MARD']);

const StatusSummaryCard = ({
  latestAssessment,
  priorAssessment,
  onStartAssessment,
  onViewTrends,
  onViewLatest,
}) => {
  const isReduced = useReducedMotion();

  const deriveRiskLevel = score => {
    const s = Number(score);
    if (!Number.isFinite(s)) return 'unknown';
    if (s < 30) return 'low';
    if (s < 70) return 'medium';
    return 'high';
  };

  const riskChange = useMemo(() => {
    if (!latestAssessment || !priorAssessment) return null;
    const latestScore = Number(latestAssessment.risk_score) || 0;
    const priorScore = Number(priorAssessment.risk_score) || 0;
    const delta = latestScore - priorScore;

    return {
      delta,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable',
      percentChange: priorScore !== 0 ? Math.round((delta / priorScore) * 100) : 0,
    };
  }, [latestAssessment, priorAssessment]);

  const getClusterInfo = cluster => {
    const normalized = typeof cluster === 'string' ? cluster.trim().toUpperCase() : '';
    if (!CANONICAL_CLUSTERS.has(normalized)) {
      return {
        label: 'Metabolic Profile',
        value: 'Not yet classified',
        color: 'bg-slate-100 text-slate-700 border-slate-200',
        description: 'Complete more assessments to reveal your metabolic pattern.',
      };
    }

    const clusterMap = {
      SIDD: {
        label: 'Lipid-Driven Profile',
        value: 'SIDD',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        description: 'Focus on heart-healthy habits and lipid monitoring.',
      },
      SIRD: {
        label: 'Insulin Resistance Profile',
        value: 'SIRD',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
        description: 'Managing carbs and staying active can help significantly.',
      },
      MOD: {
        label: 'Weight Harmony Profile',
        value: 'MOD',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        description: 'Balanced weight management supports your metabolic health.',
      },
      MARD: {
        label: 'Age-Related Changes',
        value: 'MARD',
        color: 'bg-teal-50 text-teal-700 border-teal-200',
        description: 'Staying active and eating well are your best allies.',
      },
    };

    return clusterMap[normalized] || clusterMap.MOD;
  };

  const getStatusTheme = level => {
    switch (level) {
      case 'low':
        return {
          gradient: 'bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent',
          bgLight: 'bg-teal-50/50 backdrop-blur-sm',
          border: 'border-teal-500/20',
          text: 'text-teal-700',
          icon: CheckCircle,
          iconColor: 'text-teal-500',
          badge: 'bg-teal-500 text-white shadow-md shadow-teal-500/20',
          statusText: 'Looking Good',
          guidance:
            'Your screening shows a healthy risk profile. Keep up your wonderful habits!',
          glow: 'shadow-[inset_0_0_40px_rgba(20,184,166,0.1)]'
        };
      case 'medium':
        return {
          gradient: 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent',
          bgLight: 'bg-amber-50/50 backdrop-blur-sm',
          border: 'border-amber-500/20',
          text: 'text-amber-700',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          badge: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
          statusText: 'Monitor Closely',
          guidance:
            'Some risk factors need attention. Small lifestyle adjustments can make a big difference.',
          glow: 'shadow-[inset_0_0_40px_rgba(245,158,11,0.1)]'
        };
      case 'high':
        return {
          gradient: 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent',
          bgLight: 'bg-rose-50/50 backdrop-blur-sm',
          border: 'border-rose-500/20',
          text: 'text-rose-700',
          icon: AlertTriangle,
          iconColor: 'text-rose-500',
          badge: 'bg-rose-500 text-white shadow-md shadow-rose-500/20',
          statusText: 'Action Recommended',
          guidance:
            "Please schedule a visit with your doctor soon to discuss these results. Early action is powerful.",
          glow: 'shadow-[inset_0_0_40px_rgba(244,63,94,0.1)]'
        };
      default:
        return {
          gradient: 'bg-gradient-to-br from-slate-400/10 via-slate-500/5 to-transparent',
          bgLight: 'bg-slate-50/50 backdrop-blur-sm',
          border: 'border-slate-200/50',
          text: 'text-slate-600',
          icon: Activity,
          iconColor: 'text-slate-400',
          badge: 'bg-slate-100 text-slate-700',
          statusText: 'No Data Yet',
          guidance: 'Log your first assessment to see your risk profile.',
          glow: ''
        };
    }
  };

  if (!latestAssessment) {
    return (
      <motion.div
        initial={isReduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 rounded-[32px] p-6 sm:p-8 md:p-10 text-white shadow-xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/80 uppercase tracking-wide">
                Getting Started
              </span>
              <h1 className="text-2xl md:text-3xl font-serif font-bold">
                Welcome to DIANA
              </h1>
            </div>
          </div>

          <p className="text-white/90 text-lg max-w-xl leading-relaxed mb-8">
            Check whether you may be at risk of Type 2 Diabetes during menopause.
            Your first assessment takes just a few minutes.
          </p>

          <motion.button
            whileHover={isReduced ? undefined : { scale: 1.02 }}
            whileTap={isReduced ? undefined : { scale: 0.98 }}
            onClick={onStartAssessment}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-lg text-lg"
          >
            <Activity size={22} />
            Log Your First Assessment
            <ChevronRight size={20} />
          </motion.button>
        </div>

        <div className="absolute right-0 top-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 right-24 w-48 h-48 bg-purple-400/20 rounded-full blur-2xl -mb-16 pointer-events-none" />
      </motion.div>
    );
  }

  const riskLevel = deriveRiskLevel(latestAssessment.risk_score);
  const theme = getStatusTheme(riskLevel);
  const clusterInfo = getClusterInfo(latestAssessment.cluster);
  const assessmentDate = latestAssessment.created_at
    ? new Date(latestAssessment.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently';

  const StatusIcon = theme.icon;

  return (
    <motion.div
      initial={isReduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/80 backdrop-blur-xl rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden relative ${theme.glow}`}
    >
      <div className={`p-5 sm:p-6 md:p-8 border-b ${theme.border} ${theme.gradient} relative overflow-hidden`}>
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl bg-white/50 backdrop-blur-sm border ${theme.border} flex items-center justify-center shadow-sm`}>
              <StatusIcon size={20} className={theme.iconColor} />
            </div>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Latest Assessment
            </span>
          </div>
          <span className="text-sm text-slate-500 flex items-center gap-1.5 px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full border border-slate-200/50">
            <Calendar size={14} />
            {assessmentDate}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold font-serif text-slate-800 mt-2 relative z-10">{theme.statusText}</h2>
      </div>

      <div className="p-5 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5">
            <div className="flex items-end gap-3 mb-4">
              <motion.div
                initial={isReduced ? false : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="text-[72px] md:text-[96px] leading-none font-light tracking-tighter text-slate-800"
              >
                {latestAssessment.risk_score || 0}
              </motion.div>
              <div className="pb-3">
                <span className="text-slate-500 font-medium text-lg">/ 100</span>
                <div className="text-slate-400 text-sm mt-1">Risk Score</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <span className={`px-4 py-2 rounded-xl font-bold text-sm ${theme.badge}`}>
                {riskLevel.toUpperCase()} RISK
              </span>
              {clusterInfo.value !== 'Not yet classified' && (
                <span className={`px-3 py-1.5 rounded-lg font-medium text-sm border ${clusterInfo.color}`}>
                  {clusterInfo.value}
                </span>
              )}
            </div>

            {riskChange && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {riskChange.direction === 'up' ? (
                  <TrendingUp size={20} className="text-rose-500" />
                ) : riskChange.direction === 'down' ? (
                  <TrendingDown size={20} className="text-teal-500" />
                ) : (
                  <Minus size={20} className="text-slate-400" />
                )}
                <div>
                  <div className="text-sm text-slate-600">
                    {riskChange.direction === 'up'
                      ? `+${riskChange.delta} points`
                      : riskChange.direction === 'down'
                        ? `${riskChange.delta} points`
                        : 'No change'}
                    {riskChange.percentChange !== 0 && (
                      <span className="text-slate-400 ml-1">
                        ({riskChange.percentChange > 0 ? '+' : ''}
                        {riskChange.percentChange}%)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">vs. previous assessment</div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            <div className={`${theme.bgLight} rounded-2xl p-5 border ${theme.border} mb-6`}>
              <p className={`${theme.text} leading-relaxed font-medium`}>{theme.guidance}</p>
            </div>

            {clusterInfo.value !== 'Not yet classified' && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  {clusterInfo.label}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {clusterInfo.description}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-6">
              <motion.button
                whileHover={isReduced ? undefined : { scale: 1.02 }}
                whileTap={isReduced ? undefined : { scale: 0.98 }}
                onClick={onViewTrends}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
              >
                <TrendingUp size={18} />
                See Trends
              </motion.button>
              <motion.button
                whileHover={isReduced ? undefined : { scale: 1.02 }}
                whileTap={isReduced ? undefined : { scale: 0.98 }}
                onClick={onViewLatest}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Activity size={18} />
                View Full Results
              </motion.button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <ShieldCheck size={18} className="text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-500 leading-relaxed">
              <span className="font-semibold">Screening support</span> — not a diagnosis.
              Use these insights with clinical context and discuss with your healthcare provider.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

StatusSummaryCard.displayName = 'StatusSummaryCard';

export default StatusSummaryCard;