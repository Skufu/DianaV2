import React, { useState } from 'react';
import { TrendingUp, Calendar, Activity, Plus, ChevronDown, ChevronUp, AlertCircle, Info, Download } from 'lucide-react';
import { useTrends, useExportPDF } from '../../api';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine, ReferenceArea } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, useReducedMotion } from '../../utils/animations';

const clusterTransforms = {
  'SIRD': 'Severe Insulin-Resistant',
  'SIDD': 'Lipid-Driven Pattern',
  'MOD': 'Mild Obesity-Related',
  'MARD': 'Age-Related Pattern'
};

const formatClusterName = (cluster) => clusterTransforms[cluster] || `${cluster} Profile`;

const biomarkerMetrics = {
  bmi: {
    label: 'Body Mass Index (BMI)',
    unit: '',
    normalMin: 18.5, normalMax: 24.9,
    tooltip: 'A measure of body fat. Post-menopausal changes often affect BMI baseline.',
    lowerIsBetter: true
  },
  triglycerides: {
    label: 'Triglycerides',
    unit: 'mg/dL',
    normalMin: 0, normalMax: 150,
    tooltip: 'A type of fat in your blood. Levels often rise during menopause.',
    lowerIsBetter: true
  },
  ldl: {
    label: 'LDL Cholesterol',
    unit: 'mg/dL',
    normalMin: 0, normalMax: 100,
    tooltip: 'Often called "bad" cholesterol. Estrogen decline can cause this to rise.',
    lowerIsBetter: true
  },
  hdl: {
    label: 'HDL Cholesterol',
    unit: 'mg/dL',
    normalMin: 50, normalMax: 100, // For women, >50 is good
    tooltip: 'Often called "good" cholesterol. It helps clear extra cholesterol from your blood.',
    lowerIsBetter: false // higher is better
  },
  waist_circumference: {
    label: 'Waist Circumference',
    unit: 'cm',
    normalMin: 0, normalMax: 88, // Typically < 88cm for women
    tooltip: 'Measures abdominal fat. Fat redistribution to the waist is common during perimenopause.',
    lowerIsBetter: true
  }
};

const BiomarkerTooltip = ({ tooltip }) => (
  <div className="group relative ml-1 inline-flex items-center align-middle">
    <Info size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg group-hover:block z-10 font-normal normal-case tracking-normal text-center">
      {tooltip}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
    </div>
  </div>
);

const PersonalTrends = ({ onStartAssessment }) => {
  const isReduced = useReducedMotion();
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [selectedBiomarker, setSelectedBiomarker] = useState('bmi');
  const [expandedRows, setExpandedRows] = useState({});

  const { data: trends, isLoading } = useTrends(selectedMonths);
  const { mutate: exportPDF, isPending: isExporting } = useExportPDF();

  const hasAssessmentData = trends?.clusterHistory && trends.clusterHistory.length > 0;
  const activeTrends = trends || {};

  const toggleRow = (date) => {
    setExpandedRows(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const getTimeOptions = (hasData) => {
    const baseOptions = [
      { value: 1, label: '1 Month' },
      { value: 3, label: '3 Months' },
      { value: 6, label: '6 Months' },
      { value: 12, label: '1 Year' },
    ];
    if (hasData) {
      return [...baseOptions, { value: 24, label: '2 Years' }, { value: 60, label: '5 Years' }, { value: 0, label: 'All Time' }];
    }
    return baseOptions;
  };

  const timeOptions = getTimeOptions(hasAssessmentData);

  const riskTierStyles = {
    low: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    medium: 'bg-amber-100 text-amber-900 border border-amber-300',
    high: 'bg-rose-100 text-rose-800 border border-rose-200',
  };

  const getRiskTier = (score) => {
    if (score < 34) return 'low';
    if (score < 67) return 'medium';
    return 'high';
  };

  const getBannerInsight = () => {
    if (!hasAssessmentData || activeTrends.clusterHistory.length < 2) return null;

    const current = activeTrends.clusterHistory[0];
    const previous = activeTrends.clusterHistory[1];
    const riskDelta = current.riskScore - previous.riskScore;

    const currentBio = activeTrends.biomarkerHistory?.[0] || {};
    const prevBio = activeTrends.biomarkerHistory?.[1] || {};

    if (riskDelta <= -10) {
      return { type: 'celebration', Icon: TrendingUp, color: 'emerald', message: `Great job! Your risk score dropped by ${Math.abs(riskDelta)} points since your last assessment.` };
    } else if (currentBio.hba1c && prevBio.hba1c && currentBio.hba1c < prevBio.hba1c) {
      return { type: 'celebration', Icon: TrendingUp, color: 'emerald', message: `Your HbA1c dropped from ${prevBio.hba1c}% to ${currentBio.hba1c}% — that's getting closer to your doctor's target!` };
    } else if (currentBio.systolic && prevBio.systolic && Math.abs(currentBio.systolic - prevBio.systolic) <= 5) {
      return { type: 'encouragement', Icon: Activity, color: 'blue', message: `Blood pressure stable during menopause transition — excellent work!` };
    } else if (riskDelta >= 10) {
      return { type: 'action', Icon: AlertCircle, color: 'rose', message: `Your risk score increased. Consider adding 20min walks — even gentle movement helps!` };
    } else {
      return { type: 'encouragement', Icon: Activity, color: 'blue', message: `Your health metrics are steady. Keep maintaining those healthy habits!` };
    }
  };

  const calculateDelta = (current, previous, metric) => {
    if (current === null || current === undefined || previous === null || previous === undefined) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return { text: 'Stable', color: 'text-slate-500', icon: '→' };

    const isIncrease = diff > 0;
    const isBad = (metric.lowerIsBetter && isIncrease) || (!metric.lowerIsBetter && !isIncrease);

    return {
      text: `${isIncrease ? '+' : ''}${diff.toFixed(1)} ${metric.unit}`,
      color: isBad ? 'text-rose-600' : 'text-emerald-600',
      icon: isIncrease ? '↑' : '↓'
    };
  };

  const bannerColors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    amber: 'bg-amber-50 border-amber-300 text-amber-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
  };

  const banner = getBannerInsight();

  if (isLoading) {
    return (
      <div className="text-center py-12 text-slate-500">
        Loading your trends...
      </div>
    );
  }

  return (
    <motion.div variants={fadeIn} initial="hidden" animate="visible" className="space-y-8">
      {/* HEADER TILE */}
      <motion.div className="bg-gradient-to-br from-diana-forest to-[#1A365D] rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Health Trends</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Track your health metrics over time and visualize your progress.
          </p>
        </div>

        {hasAssessmentData && (
          <div className="relative z-10 mt-6 md:mt-0">
            <motion.button
              whileHover={isReduced ? undefined : { scale: 1.02 }}
              whileTap={isReduced ? undefined : { scale: 0.98 }}
              onClick={() => exportPDF()}
              disabled={isExporting}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white px-5 py-3 rounded-xl font-bold transition-colors w-full md:w-auto min-h-[44px]"
            >
              <Download size={20} />
              {isExporting ? 'Generating...' : 'Share with Doctor'}
            </motion.button>
          </div>
        )}

        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
      </motion.div>

      {/* DYNAMIC INSIGHT BANNER */}
      {banner && (
        <motion.div variants={fadeIn} className={`flex items-start gap-3 p-4 rounded-xl border ${bannerColors[banner.color]}`}>
          <div className="mt-0.5"><banner.Icon size={24} /></div>
          <div>
            <h3 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80">Latest Insight</h3>
            <p className="font-medium">{banner.message}</p>
          </div>
        </motion.div>
      )}

      {/* TIME CONTROLS */}
      {hasAssessmentData && (
        <motion.div variants={fadeIn} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <p className="text-slate-600 font-medium whitespace-nowrap">
            Select time range:
          </p>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {timeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedMonths(option.value)}
                className={`px-4 py-2 min-h-[44px] min-w-[44px] rounded-xl text-sm font-bold transition-all shadow-sm ${selectedMonths === option.value
                  ? 'bg-diana-forest text-white shadow-emerald-500/30'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* MAIN CHARTS SECTION */}
      {activeTrends.clusterHistory && activeTrends.clusterHistory.length > 0 && (
        <React.Fragment>
          {/* RISK SCORE CHART */}
          <motion.div variants={fadeIn} className="p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-6">Risk Score History</h2>
            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[280px] h-[300px] md:min-w-[500px]">
                {activeTrends.clusterHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeTrends.clusterHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        interval="preserveStartEnd"
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} domain={[0, 100]} width={35} />

                      <ReferenceLine y={34} stroke="#D97706" strokeDasharray="4 4" label={{ value: 'Medium Risk', position: 'insideTopLeft', fill: '#D97706', fontSize: 11 }} />
                      <ReferenceLine y={67} stroke="#E11D48" strokeDasharray="4 4" label={{ value: 'High Risk', position: 'insideTopLeft', fill: '#E11D48', fontSize: 11 }} />

                      <RechartsTooltip
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
                    <p className="text-slate-500 font-medium text-center px-4">Log one more assessment to see your chart trend!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* KEY BIOMARKER TRENDS */}
          <motion.div variants={fadeIn} className="p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-serif font-bold text-slate-900">Key Biomarker Trends</h2>
              <select
                value={selectedBiomarker}
                onChange={(e) => setSelectedBiomarker(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 min-h-[44px] w-full sm:w-auto"
              >
                {Object.entries(biomarkerMetrics).map(([key, metric]) => (
                  <option key={key} value={key}>{metric.label}</option>
                ))}
              </select>
            </div>

            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[280px] h-[250px] md:min-w-[400px]">
                {activeTrends.biomarkerHistory.length > 1 && Array.from(activeTrends.biomarkerHistory).some(h => h[selectedBiomarker] != null) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activeTrends.biomarkerHistory} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short' })}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        dy={10}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748B', fontSize: 12 }}
                        domain={['dataMin - 1', 'dataMax + 1']}
                        width={35}
                      />

                      {biomarkerMetrics[selectedBiomarker].normalMin && biomarkerMetrics[selectedBiomarker].normalMax && (
                        <ReferenceArea
                          y1={biomarkerMetrics[selectedBiomarker].normalMin}
                          y2={biomarkerMetrics[selectedBiomarker].normalMax}
                          fill="#10B981"
                          fillOpacity={0.1}
                          label={{ value: 'Healthy Range', position: 'insideTopLeft', fill: '#059669', fontSize: 10, fontWeight: 'bold' }}
                        />
                      )}

                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { dateStyle: 'long' })}
                        formatter={(value) => [`${value} ${biomarkerMetrics[selectedBiomarker].unit}`, biomarkerMetrics[selectedBiomarker].label]}
                      />
                      <Area
                        type="monotone"
                        dataKey={selectedBiomarker}
                        stroke="#3B82F6"
                        strokeWidth={3}
                        fillOpacity={0.1}
                        fill="#3B82F6"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                        connectNulls={true}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium text-center px-4">Not enough data to graph {biomarkerMetrics[selectedBiomarker].label}.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* EXPANDABLE PREVIOUS ASSESSMENTS */}
          <motion.div variants={fadeIn} className="p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-6">Previous Assessments Details</h2>
            <div className="space-y-3">
              {activeTrends.clusterHistory.map((entry, index) => {
                const riskTier = getRiskTier(entry.riskScore);
                const riskLabel = riskTier === 'low' ? 'Low' : riskTier === 'medium' ? 'Medium' : 'High';
                const isExpanded = expandedRows[entry.date];

                const currentBio = activeTrends.biomarkerHistory.find(b => b.date === entry.date) || {};
                const prevBio = activeTrends.biomarkerHistory[index + 1] || null;

                // Use index in key to ensure uniqueness (same date + cluster can occur multiple times)
                const uniqueKey = `${entry.date}-${entry.cluster}-${index}`;

                return (
                  <div key={uniqueKey} className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                    <button
                      onClick={() => toggleRow(entry.date)}
                      className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left min-h-[64px]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-diana-forest">
                          <Calendar size={20} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-900 font-bold block">{new Date(entry.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          <span className="text-slate-500 text-sm mt-0.5 block">{formatClusterName(entry.cluster)}</span>
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
                        <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap ${riskTierStyles[riskTier]}`}>
                          Score: {entry.riskScore} ({riskLabel})
                        </div>
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-white"
                        >
                          <div className="p-4 sm:p-5 overflow-x-auto">
                            <div className="min-w-[320px]">
                              <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                  <tr>
                                    <th className="px-3 sm:px-4 py-3 font-bold rounded-tl-lg">Biomarker</th>
                                    <th className="px-3 sm:px-4 py-3 font-bold">Value</th>
                                    <th className="px-3 sm:px-4 py-3 font-bold rounded-tr-lg">Change</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(biomarkerMetrics).map(([key, metric]) => {
                                    const val = currentBio[key];
                                    const prevVal = prevBio ? prevBio[key] : null;

                                    if (val === null || val === undefined) return null;

                                    const delta = calculateDelta(val, prevVal, metric);

                                    return (
                                      <tr key={key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                                        <td className="px-3 sm:px-4 py-3 font-medium text-slate-900 border-r border-slate-50/50 align-middle">
                                          {metric.label}
                                          <BiomarkerTooltip tooltip={metric.tooltip} />
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 font-bold text-slate-700 align-middle whitespace-nowrap">
                                          {val} {metric.unit}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 align-middle">
                                          {delta ? (
                                            <div className={`inline-flex items-center gap-1 font-bold ${delta.color} text-xs sm:text-sm`}>
                                              <span>{delta.icon}</span>
                                              <span>{delta.text}</span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 italic text-xs sm:text-sm">No previous data</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </React.Fragment>
      )}

      {/* HEALTH SNAPSHOT */}
      {activeTrends.riskLevels && (
        <motion.div variants={fadeIn} className="p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center md:items-start md:text-left">
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Your Health Snapshot</h2>
          <p className="text-slate-500 mb-8 max-w-2xl">
            A quick summary of your past assessments. The goal is to keep your numbers in the green &quot;Healthy Baseline&quot; zone by maintaining steady habits.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 w-full">
            <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm">
              <Activity size={28} className="mx-auto text-emerald-600 mb-3" />
              <div className="text-4xl font-serif font-bold text-emerald-700 mb-1">
                {activeTrends.riskLevels?.low || 0}
              </div>
              <p className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Low Risk</p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">Healthy Baseline</p>
            </div>
            <div className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-300 shadow-sm">
              <Activity size={28} className="mx-auto text-amber-600 mb-3" />
              <div className="text-4xl font-serif font-bold text-amber-800 mb-1">
                {activeTrends.riskLevels?.medium || 0}
              </div>
              <p className="text-sm font-bold text-amber-900 uppercase tracking-wide">Medium Risk</p>
              <p className="text-xs text-amber-700 mt-1 font-medium">Monitor Closely</p>
            </div>
            <div className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-200 shadow-sm">
              <Activity size={28} className="mx-auto text-rose-600 mb-3" />
              <div className="text-4xl font-serif font-bold text-rose-800 mb-1">
                {activeTrends.riskLevels?.high || 0}
              </div>
              <p className="text-sm font-bold text-rose-900 uppercase tracking-wide">High Risk</p>
              <p className="text-xs text-rose-700 mt-1 font-medium">Action Required</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {!hasAssessmentData && (
        <motion.div variants={fadeIn} className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Health Data Yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Start tracking your health journey by logging your first assessment.
            You&apos;ll see trends, risk analysis, and personalized insights here.
          </p>
          <motion.button
            whileHover={isReduced ? undefined : { scale: 1.02 }}
            whileTap={isReduced ? undefined : { scale: 0.98 }}
            onClick={onStartAssessment}
            className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] bg-diana-forest text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
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
