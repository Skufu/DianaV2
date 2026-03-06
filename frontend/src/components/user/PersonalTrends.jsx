import React, { useState } from 'react';
import { TrendingUp, Calendar, Activity, Plus } from 'lucide-react';
import { useTrends } from '../../api';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion } from 'framer-motion';
import { fadeIn, useReducedMotion } from '../../utils/animations';

const PersonalTrends = ({ onStartAssessment }) => {
  const isReduced = useReducedMotion();
  const [selectedMonths, setSelectedMonths] = useState(12);

  const { data: trends, isLoading } = useTrends(selectedMonths);

  const hasAssessmentData = trends?.clusterHistory && trends.clusterHistory.length > 0;
  const activeTrends = trends || {};
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

  const timeOptions = getTimeOptions(hasAssessmentData);

  const handleLogAssessment = () => {
    if (onStartAssessment) {
      onStartAssessment();
    }
  };

  const riskTierStyles = {
    low: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-rose-100 text-rose-800',
  };

  const getRiskTier = (score) => {
    if (score < 34) return 'low';
    if (score < 67) return 'medium';
    return 'high';
  };

  if (isLoading) {
    return (
      <motion.div
        key="loading_trends"
        initial={isReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={isReduced ? { duration: 0 } : { duration: 0.3 }}
        className="text-center py-12 text-diana-text-muted"
      >
        Loading your trends...
      </motion.div>
    );
  }

  return (
    <motion.div key="content_trends" variants={fadeIn} initial="hidden" animate="visible" className="space-y-8">
      <motion.div className="bg-gradient-to-br from-diana-forest to-[#1A365D] rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Health Trends</h1>
          <p className="text-blue-100 text-lg max-w-xl leading-relaxed">
            Track your health metrics over time and visualize your progress
          </p>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
      </motion.div>

      {hasAssessmentData && (
        <motion.div variants={fadeIn} className="flex justify-between items-center">
          <div>
            <p className="text-diana-text-secondary">
              Select time range to view your data
            </p>
          </div>
          <div className="flex gap-2">
            {timeOptions.map(option => (
              <motion.button
                key={option.value}
                whileHover={isReduced ? undefined : { scale: 1.05 }}
                whileTap={isReduced ? undefined : { scale: 0.95 }}
                whileFocus={isReduced ? undefined : { scale: 1.05, boxShadow: "0px 0px 0px 2px #10B981" }}
                onClick={() => setSelectedMonths(option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${selectedMonths === option.value
                  ? 'bg-diana-forest text-white shadow-diana-forest/30'
                  : 'bg-white text-diana-text-secondary hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {activeTrends.clusterHistory && activeTrends.clusterHistory.length > 0 && (
        <motion.div variants={fadeIn} className="glass-card p-6 md:p-8 bg-white shadow-sm border border-slate-100">
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6">Risk Score History</h2>

          {/* Chart Area */}
          <div className="h-[300px] w-full mb-8">
            {activeTrends.clusterHistory.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeTrends.clusterHistory.slice().reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 12 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    formatter={(value) => [`${value} / 100`, 'Risk Score']}
                  />
                  <Area
                    type="monotone"
                    dataKey="riskScore"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRisk)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium text-center">Log one more assessment to see your chart trend!</p>
              </div>
            )}
          </div>

          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6">Previous Assessments</h2>
          <div className="space-y-3">
            {activeTrends.clusterHistory.map((entry, index) => {
              const riskTier = getRiskTier(entry.riskScore);
              const riskLabel = riskTier === 'low' ? 'Low' : riskTier === 'medium' ? 'Medium' : 'High';

              return (
            <motion.div
              initial={isReduced ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={isReduced ? { duration: 0 } : { delay: index * 0.1, duration: 0.3 }}
              whileHover={isReduced ? undefined : { scale: 1.01, x: 4 }}
              whileTap={isReduced ? undefined : { scale: 0.98 }}
              key={`${entry.date}-${entry.cluster}`}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 text-diana-forest group-hover:bg-diana-forest group-hover:text-white transition-colors">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-diana-text-primary font-bold block">{new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    <span className="text-slate-500 text-sm mt-0.5 block">{entry.cluster} Profile</span>
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
                  <div className="text-right hidden sm:block">
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-bold block">Score</span>
                    <span className="text-diana-text-primary font-bold text-lg">{entry.riskScore}</span>
                  </div>
                  <div className="text-right sm:hidden">
                    <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold block">Score</span>
                    <span className="text-diana-text-primary font-bold text-base">{entry.riskScore}</span>
                  </div>
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap ${riskTierStyles[riskTier]}`}
                  >
                    {riskLabel}
                  </div>
                </div>
              </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {activeTrends.riskLevels && (
        <motion.div variants={fadeIn} className="glass-card p-6 md:p-8 bg-white shadow-sm border border-slate-100 flex flex-col items-center text-center md:items-start md:text-left">
          <h2 className="text-2xl font-serif font-bold text-diana-text-primary mb-2">Your Health Snapshot</h2>
          <p className="text-slate-500 mb-8 max-w-2xl">
            A quick summary of your past assessments. The goal is to keep your numbers in the green &quot;Healthy Baseline&quot; zone by maintaining steady habits.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 w-full">
          <motion.div whileHover={isReduced ? undefined : { scale: 1.02 }} className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100/50">
              <Activity size={28} className="mx-auto text-emerald-500 mb-3" />
              <div className="text-4xl font-serif font-bold text-emerald-700 mb-1">
                {activeTrends.riskLevels?.low || 0}
              </div>
              <p className="text-sm font-bold text-emerald-800 uppercase tracking-wide">Low Risk Results</p>
              <p className="text-xs text-emerald-600/70 mt-1 font-medium">Healthy Baseline</p>
            </motion.div>
          <motion.div whileHover={isReduced ? undefined : { scale: 1.02 }} className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-100/50">
              <Activity size={28} className="mx-auto text-amber-500 mb-3" />
              <div className="text-4xl font-serif font-bold text-amber-700 mb-1">
                {activeTrends.riskLevels?.medium || 0}
              </div>
              <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Medium Risk Results</p>
              <p className="text-xs text-amber-600/70 mt-1 font-medium">Monitor Closely</p>
            </motion.div>
          <motion.div whileHover={isReduced ? undefined : { scale: 1.02 }} className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-100/50">
              <Activity size={28} className="mx-auto text-rose-500 mb-3" />
              <div className="text-4xl font-serif font-bold text-rose-700 mb-1">
                {activeTrends.riskLevels?.high || 0}
              </div>
              <p className="text-sm font-bold text-rose-800 uppercase tracking-wide">High Risk Results</p>
              <p className="text-xs text-rose-600/70 mt-1 font-medium">Action Required</p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {!hasAssessmentData && (
        <motion.div variants={fadeIn} className="glass-card p-12 text-center bg-white">
          <div className="w-20 h-20 rounded-full bg-diana-stone flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={40} className="text-diana-text-muted" />
          </div>
          <h3 className="text-xl font-bold text-diana-text-primary mb-2">No Health Data Yet</h3>
          <p className="text-diana-text-secondary mb-6 max-w-md mx-auto">
            Start tracking your health journey by logging your first assessment.
            You&apos;ll see trends, risk analysis, and personalized insights here.
          </p>
          <motion.button
            whileHover={isReduced ? undefined : { scale: 1.05 }}
            whileTap={isReduced ? undefined : { scale: 0.95 }}
            onClick={handleLogAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 bg-diana-forest text-white font-bold rounded-xl hover:bg-diana-forest-light transition-all shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
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
