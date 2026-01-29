import React, { useState } from 'react';
import { TrendingUp, Calendar, Activity, Plus } from 'lucide-react';
import { useTrends } from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';
import { staggerContainer, fadeIn, slideUp, cardVariants, useReducedMotion } from '../../utils/animations';
import { shouldDisableHeavyEffects } from '../../utils/deviceCapabilities';

const PersonalTrends = ({ userId, setActiveTab, onStartAssessment }) => {
  const isReduced = useReducedMotion();
  const [selectedMonths, setSelectedMonths] = useState(12);

  const { data: trends, isLoading } = useTrends(selectedMonths);

  const MOCK_DATA = {
    biomarkerHistory: [
      { date: '2025-08-15', hba1c: 6.8, fbs: 112, bmi: 24.5 },
      { date: '2025-09-12', hba1c: 6.7, fbs: 108, bmi: 24.4 },
      { date: '2025-10-10', hba1c: 6.5, fbs: 104, bmi: 24.2 },
      { date: '2025-11-05', hba1c: 6.3, fbs: 98, bmi: 24.1 },
      { date: '2025-12-01', hba1c: 6.2, fbs: 96, bmi: 23.9 },
      { date: '2026-01-15', hba1c: 6.1, fbs: 95, bmi: 23.8 },
    ],
    clusterHistory: [
      { date: '2025-08-15', cluster: 'SIDD', riskScore: 78 },
      { date: '2025-10-10', cluster: 'MOD', riskScore: 52 },
      { date: '2026-01-15', cluster: 'MARD', riskScore: 24 },
    ],
    riskLevels: { low: 1, medium: 2, high: 1 }
  };

  const hasAssessmentData = trends?.biomarkerHistory && trends.biomarkerHistory.length > 0;
  const isDemoMode = !hasAssessmentData && !isLoading;
  const activeTrends = isDemoMode ? MOCK_DATA : (trends || {});
  const getTimeOptions = (hasData) => {
    const baseOptions = [
      { value: 1, label: '1 Month' },
      { value: 3, label: '3 Months' },
      { value: 6, label: '6 Months' },
      { value: 12, label: '1 Year' },
    ];

    // Only show extended time ranges if user has data
    if (hasData) {
      return [
        ...baseOptions,
        { value: 24, label: '2 Years' },
        { value: 60, label: '5 Years' },
        { value: 0, label: 'All Time' },
      ];
    }

    return baseOptions;
  };

  const timeOptions = getTimeOptions(hasAssessmentData || isDemoMode);

  const handleLogAssessment = () => {
    if (onStartAssessment) {
      onStartAssessment();
    }
  };

  if (isLoading) {
    return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-slate-400">Loading trends...</motion.div>;
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={slideUp} className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Health Trends</h1>
          <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
            Track your health metrics over time and visualize your progress
          </p>
          {isDemoMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30"
            >
              <Activity size={12} className="text-blue-100" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-50">Demonstration Mode</span>
            </motion.div>
          )}
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
      </motion.div>

      {(hasAssessmentData || isDemoMode) && (
        <motion.div variants={fadeIn} className="flex justify-between items-center">
          <div>
            <p className="text-diana-text-secondary">
              {isDemoMode ? 'Showing example health data' : 'Select time range to view your data'}
            </p>
          </div>
          <div className="flex gap-2">
            {timeOptions.map(option => (
              <motion.button
                key={option.value}
                whileHover={{ scale: isReduced ? 1 : 1.05 }}
                whileTap={{ scale: isReduced ? 1 : 0.95 }}
                whileFocus={{ scale: isReduced ? 1 : 1.05, boxShadow: "0px 0px 0px 2px #10B981" }}
                onClick={() => setSelectedMonths(option.value)}
                disabled={isDemoMode}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${selectedMonths === option.value
                  ? 'bg-diana-forest text-white shadow-diana-forest/30'
                  : 'bg-white text-diana-text-secondary hover:bg-slate-50 border border-slate-200'
                  } ${isDemoMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {(activeTrends.biomarkerHistory && activeTrends.biomarkerHistory.length > 0) && (
        <motion.div variants={cardVariants} className="glass-card p-6 bg-white">
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6">HbA1c Over Time</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activeTrends.biomarkerHistory}>
                <defs>
                  <linearGradient id="colorHba1c" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B215E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0B215E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: '#0f172a'
                  }}
                  itemStyle={{ color: '#0B215E' }}
                />
                <Area
                  type="monotone"
                  dataKey="hba1c"
                  stroke="#0B215E"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHba1c)"
                  isAnimationActive={!shouldDisableHeavyEffects()}
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {trends?.biomarkerHistory && trends.biomarkerHistory.length > 0 && (
        <motion.div variants={cardVariants} className="glass-card p-6 bg-white">
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6">Fasting Blood Sugar</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activeTrends.biomarkerHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    color: '#0f172a'
                  }}
                />
                <Legend iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="fbs"
                  name="FBS (mg/dL)"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  isAnimationActive={!shouldDisableHeavyEffects()}
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {activeTrends.clusterHistory && activeTrends.clusterHistory.length > 0 && (
        <motion.div variants={cardVariants} className="glass-card p-6 bg-white">
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6">Risk Evolution</h2>
          <div className="space-y-4">
            {activeTrends.clusterHistory.map((entry) => (
              <motion.div
                whileHover={{ scale: isReduced ? 1 : 1.01 }}
                key={`${entry.date}-${entry.cluster}`}
                className="flex items-center justify-between p-4 bg-diana-stone/30 rounded-xl border border-diana-stone/50 hover:bg-diana-stone/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-diana-text-secondary">
                    <Calendar size={18} />
                  </div>
                  <span className="text-diana-text-primary font-bold">{entry.date}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-diana-text-secondary text-sm font-medium">{entry.cluster}</span>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${entry.riskScore < 30
                      ? 'bg-green-100 text-green-700'
                      : entry.riskScore < 70
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                      }`}
                  >
                    {entry.riskScore < 30
                      ? 'Low'
                      : entry.riskScore < 70
                        ? 'Moderate'
                        : 'High'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTrends.riskLevels && (
        <motion.div variants={cardVariants} className="glass-card p-6 bg-white">
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6">Risk Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: isReduced ? 1 : 1.05 }} className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
              <Activity size={32} className="mx-auto text-green-500 mb-3" />
              <div className="text-4xl font-serif font-bold text-green-700 mb-1">
                {activeTrends.riskLevels?.low || 0}
              </div>
              <p className="text-sm font-bold text-green-800 uppercase tracking-wide">Low Risk</p>
              <p className="text-xs text-green-600 mt-1">Score: 0-29</p>
            </motion.div>
            <motion.div whileHover={{ scale: isReduced ? 1 : 1.05 }} className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-100">
              <Activity size={32} className="mx-auto text-amber-500 mb-3" />
              <div className="text-4xl font-serif font-bold text-amber-700 mb-1">
                {activeTrends.riskLevels?.medium || 0}
              </div>
              <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Moderate Risk</p>
              <p className="text-xs text-amber-600 mt-1">Score: 30-69</p>
            </motion.div>
            <motion.div whileHover={{ scale: isReduced ? 1 : 1.05 }} className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-100">
              <Activity size={32} className="mx-auto text-rose-500 mb-3" />
              <div className="text-4xl font-serif font-bold text-rose-700 mb-1">
                {activeTrends.riskLevels?.high || 0}
              </div>
              <p className="text-sm font-bold text-rose-800 uppercase tracking-wide">High Risk</p>
              <p className="text-xs text-rose-600 mt-1">Score: 70+</p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {isDemoMode && (
        <motion.div variants={fadeIn} className="glass-card p-8 text-center bg-diana-forest/5 border border-diana-forest/20">
          <h3 className="text-lg font-bold text-diana-forest mb-2">Unlock Your Personal Trends</h3>
          <p className="text-diana-text-secondary mb-6 max-w-md mx-auto">
            The data shown above is for demonstration. Log your first health assessment to start building your own personalized trends and risk profile.
          </p>
          <motion.button
            whileHover={{ scale: isReduced ? 1 : 1.05 }}
            whileTap={{ scale: isReduced ? 1 : 0.95 }}
            onClick={handleLogAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 bg-diana-forest text-white font-bold rounded-xl hover:bg-diana-forest-light transition-all shadow-lg"
          >
            <Plus size={20} />
            Log Your First Assessment
          </motion.button>
        </motion.div>
      )}

      {!isDemoMode && (!activeTrends || (activeTrends.biomarkerHistory?.length === 0 && !activeTrends.riskLevels)) && (
        <motion.div variants={fadeIn} className="glass-card p-12 text-center bg-white">
          <div className="w-20 h-20 rounded-full bg-diana-stone flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={40} className="text-diana-text-muted" />
          </div>
          <h3 className="text-xl font-bold text-diana-text-primary mb-2">No Health Data Yet</h3>
          <p className="text-diana-text-secondary mb-6 max-w-md mx-auto">
            Start tracking your health journey by logging your first assessment.
            You'll see trends, risk analysis, and personalized insights here.
          </p>
          <motion.button
            whileHover={{ scale: isReduced ? 1 : 1.05 }}
            whileTap={{ scale: isReduced ? 1 : 0.95 }}
            onClick={handleLogAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 bg-diana-forest text-white font-bold rounded-xl hover:bg-diana-forest-light transition-all shadow-lg"
          >
            <Plus size={20} />
            Log Your First Assessment
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default PersonalTrends;
