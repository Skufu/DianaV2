import React, { useState } from 'react';
import {
  TrendingUp,
  Calendar,
  Activity,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  Download,
} from 'lucide-react';
import { useTrends, useExportPDF } from '../../api';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn, useReducedMotion } from '../../utils/animations';

const clusterTransforms = {
  SIRD: 'Severe Insulin-Resistant',
  SIDD: 'Lipid-Driven Pattern',
  MOD: 'Mild Obesity-Related',
  MARD: 'Age-Related Pattern',
};

const formatClusterName = cluster => clusterTransforms[cluster] || `${cluster} Profile`;

const biomarkerMetrics = {
  bmi: {
    label: 'Body Mass Index (BMI)',
    unit: 'kg/m²',
    normalMin: 18.5,
    normalMax: 24.9,
    domainPadding: 0.8,
    tooltip: 'A measure of body fat. Post-menopausal changes often affect BMI baseline.',
    lowerIsBetter: true,
  },
  triglycerides: {
    label: 'Triglycerides',
    unit: 'mg/dL',
    normalMin: 0,
    normalMax: 150,
    domainPadding: 8,
    tooltip: 'A type of fat in your blood. Levels often rise during menopause.',
    lowerIsBetter: true,
  },
  ldl: {
    label: 'LDL Cholesterol',
    unit: 'mg/dL',
    normalMin: 0,
    normalMax: 100,
    domainPadding: 8,
    tooltip: 'Often called "bad" cholesterol. Estrogen decline can cause this to rise.',
    lowerIsBetter: true,
  },
  hdl: {
    label: 'HDL Cholesterol',
    unit: 'mg/dL',
    normalMin: 50,
    normalMax: 100, // For women, >50 is good
    domainPadding: 4,
    tooltip: 'Often called "good" cholesterol. It helps clear extra cholesterol from your blood.',
    lowerIsBetter: false, // higher is better
  },
  waist_circumference: {
    label: 'Waist Circumference',
    unit: 'cm',
    normalMin: 0,
    normalMax: 88, // Typically < 88cm for women
    domainPadding: 3,
    tooltip:
      'Measures abdominal fat. Fat redistribution to the waist is common during perimenopause.',
    lowerIsBetter: true,
  },
};

const RISK_THRESHOLDS = {
  medium: 30,
  high: 70,
};

const sortByDateAsc = items =>
  [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

const getNumericValue = value => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const formatNumericValue = value => {
  const numericValue = getNumericValue(value);
  if (numericValue === null) return `${value}`;
  return Number.isInteger(numericValue)
    ? `${numericValue}`
    : numericValue.toFixed(1).replace(/\.0$/, '');
};

const formatValueWithUnit = (value, unit) => {
  const displayValue = formatNumericValue(value);
  return unit ? `${displayValue} ${unit}` : displayValue;
};

const formatDateLabel = date => {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return `${date}`;

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
};

const getRangeLabel = months => {
  const rangeLabels = {
    0: 'All Time',
    1: '1 Month',
    3: '3 Months',
    6: '6 Months',
    12: '1 Year',
    24: '2 Years',
    60: '5 Years',
  };
  return rangeLabels[months] || `${months} Months`;
};

const getRangeSentenceLabel = label => (label === 'All Time' ? 'all-time' : label.toLowerCase());

const getDateRangeText = history => {
  if (!history.length) return 'No assessments in this range';

  const firstDate = formatDateLabel(history[0].date);
  const lastDate = formatDateLabel(history[history.length - 1].date);
  return firstDate === lastDate ? firstDate : `${firstDate} to ${lastDate}`;
};

const pluralizeAssessments = count => `${count} assessment${count === 1 ? '' : 's'}`;

const getMetricSeries = (history, metricKey) =>
  history
    .map(entry => ({
      ...entry,
      value: getNumericValue(entry[metricKey]),
    }))
    .filter(entry => entry.value !== null);

const buildRiskTrendSummary = history => {
  if (history.length < 2) return 'Log one more assessment to compare screening scores.';

  const first = history[0];
  const last = history[history.length - 1];
  const diff = last.riskScore - first.riskScore;

  if (Math.abs(diff) < 1) {
    return `Screening score stayed at ${formatNumericValue(last.riskScore)} across ${pluralizeAssessments(history.length)}.`;
  }

  const trendVerb = diff < 0 ? 'improved' : 'increased';
  return `Screening score ${trendVerb} from ${formatNumericValue(first.riskScore)} to ${formatNumericValue(last.riskScore)} across ${pluralizeAssessments(history.length)}.`;
};

const buildBiomarkerTrendSummary = (history, metricKey) => {
  const metric = biomarkerMetrics[metricKey];
  const metricSeries = getMetricSeries(history, metricKey);

  if (metricSeries.length < 2) {
    return `Log one more ${metric.label} value to compare this biomarker.`;
  }

  const first = metricSeries[0];
  const last = metricSeries[metricSeries.length - 1];
  const diff = last.value - first.value;

  if (Math.abs(diff) < 0.01) {
    return `${metric.label} stayed at ${formatValueWithUnit(last.value, metric.unit)}.`;
  }

  const trendVerb = diff < 0 ? 'decreased' : 'increased';
  return `${metric.label} ${trendVerb} from ${formatValueWithUnit(first.value, metric.unit)} to ${formatValueWithUnit(last.value, metric.unit)}.`;
};

const buildBiggestMovers = (history, limit = 3) =>
  Object.entries(biomarkerMetrics)
    .map(([metricKey, metric]) => {
      const metricSeries = getMetricSeries(history, metricKey);
      if (metricSeries.length < 2) return null;

      const first = metricSeries[0];
      const last = metricSeries[metricSeries.length - 1];
      const diff = last.value - first.value;
      if (Math.abs(diff) < 0.01) return null;

      const denominator = Math.max(Math.abs(first.value), 1);
      const percentChange = (diff / denominator) * 100;
      const changedDirection = diff < 0 ? 'decreased' : 'increased';
      const isFavorable = (metric.lowerIsBetter && diff < 0) || (!metric.lowerIsBetter && diff > 0);

      return {
        key: metricKey,
        label: metric.label,
        summary: `${metric.label} ${changedDirection} from ${formatValueWithUnit(first.value, metric.unit)} to ${formatValueWithUnit(last.value, metric.unit)}.`,
        percentChange,
        isFavorable,
      };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
    .slice(0, limit);

const roundDomainValue = (value, direction) => {
  const roundedValue = direction === 'floor' ? Math.floor(value * 10) : Math.ceil(value * 10);
  return Number((roundedValue / 10).toFixed(1));
};

const getBiomarkerDomain = (history, metricKey) => {
  const metric = biomarkerMetrics[metricKey];
  const values = getMetricSeries(history, metricKey).map(entry => entry.value);

  if (!values.length) return ['auto', 'auto'];

  const anchors = [...values];
  if (metric.normalMin != null && metric.normalMin > 0) anchors.push(metric.normalMin);
  if (metric.normalMax != null && metric.lowerIsBetter) anchors.push(metric.normalMax);

  const minValue = Math.min(...anchors);
  const maxValue = Math.max(...anchors);
  const domainPadding = metric.domainPadding || 1;
  const span = Math.max(maxValue - minValue, domainPadding);
  const padding = Math.max(span * 0.12, domainPadding);

  return [
    Math.max(0, roundDomainValue(minValue - padding, 'floor')),
    roundDomainValue(maxValue + padding, 'ceil'),
  ];
};

const BiomarkerTooltip = ({ tooltip }) => (
  <div className="group relative ml-1 inline-flex items-center align-middle">
    <Info size={14} className="text-slate-400 hover:text-slate-600 cursor-help" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg group-hover:block z-10 font-normal normal-case tracking-normal text-center">
      {tooltip}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
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

  const activeTrends = trends || {};
  const clusterHistory = Array.isArray(activeTrends.clusterHistory)
    ? activeTrends.clusterHistory
    : [];
  const biomarkerHistory = Array.isArray(activeTrends.biomarkerHistory)
    ? activeTrends.biomarkerHistory
    : [];
  const chronologicalClusterHistory = sortByDateAsc(clusterHistory);
  const chronologicalBiomarkerHistory = sortByDateAsc(biomarkerHistory);
  const latestClusterHistory = [...chronologicalClusterHistory].reverse();
  const latestBiomarkerHistory = [...chronologicalBiomarkerHistory].reverse();
  const hasAssessmentData = clusterHistory.length > 0;
  const selectedRangeLabel = getRangeLabel(selectedMonths);
  const selectedRangeSentenceLabel = getRangeSentenceLabel(selectedRangeLabel);
  const selectedBiomarkerMetric = biomarkerMetrics[selectedBiomarker];
  const biomarkerDomain = getBiomarkerDomain(chronologicalBiomarkerHistory, selectedBiomarker);
  const riskTrendSummary = buildRiskTrendSummary(chronologicalClusterHistory);
  const biomarkerTrendSummary = buildBiomarkerTrendSummary(
    chronologicalBiomarkerHistory,
    selectedBiomarker
  );
  const biggestMovers = buildBiggestMovers(chronologicalBiomarkerHistory);
  const hasBiomarkerChartData =
    chronologicalBiomarkerHistory.length > 1 &&
    chronologicalBiomarkerHistory.some(h => h[selectedBiomarker] != null);

  const toggleRow = assessmentKey => {
    setExpandedRows(prev => ({ ...prev, [assessmentKey]: !prev[assessmentKey] }));
  };

  const getTimeOptions = hasData => {
    const baseOptions = [
      { value: 1, label: '1 Month' },
      { value: 3, label: '3 Months' },
      { value: 6, label: '6 Months' },
      { value: 12, label: '1 Year' },
    ];
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

  const riskTierStyles = {
    low: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    medium: 'bg-amber-100 text-amber-900 border border-amber-300',
    high: 'bg-rose-100 text-rose-800 border border-rose-200',
  };

  const getRiskTier = score => {
    if (score < RISK_THRESHOLDS.medium) return 'low';
    if (score < RISK_THRESHOLDS.high) return 'medium';
    return 'high';
  };

  const getBannerInsight = () => {
    if (!hasAssessmentData || chronologicalClusterHistory.length < 2) return null;

    const current = chronologicalClusterHistory[chronologicalClusterHistory.length - 1];
    const previous = chronologicalClusterHistory[chronologicalClusterHistory.length - 2];
    const riskDelta = current.riskScore - previous.riskScore;

    const currentBio =
      chronologicalBiomarkerHistory[chronologicalBiomarkerHistory.length - 1] || {};
    const prevBio = chronologicalBiomarkerHistory[chronologicalBiomarkerHistory.length - 2] || {};

    if (riskDelta <= -10) {
      return {
        type: 'celebration',
        Icon: TrendingUp,
        color: 'emerald',
        message: `Your screening score decreased by ${Math.abs(riskDelta)} points since your last assessment.`,
      };
    } else if (currentBio.hba1c && prevBio.hba1c && currentBio.hba1c < prevBio.hba1c) {
      return {
        type: 'celebration',
        Icon: TrendingUp,
        color: 'emerald',
        message: `Your HbA1c decreased from ${prevBio.hba1c}% to ${currentBio.hba1c}% since the previous assessment.`,
      };
    } else if (
      currentBio.systolic &&
      prevBio.systolic &&
      Math.abs(currentBio.systolic - prevBio.systolic) <= 5
    ) {
      return {
        type: 'encouragement',
        Icon: Activity,
        color: 'blue',
        message: 'Blood pressure values changed by 5 mmHg or less since the previous assessment.',
      };
    } else if (riskDelta >= 10) {
      return {
        type: 'action',
        Icon: AlertCircle,
        color: 'rose',
        message:
          'Your screening score increased. Review the trend and discuss it with your healthcare provider if it is unexpected.',
      };
    } else {
      return {
        type: 'encouragement',
        Icon: Activity,
        color: 'blue',
        message: 'Your health metrics are relatively steady across recent assessments.',
      };
    }
  };

  const calculateDelta = (current, previous, metric) => {
    if (current === null || current === undefined || previous === null || previous === undefined)
      return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return { text: 'Stable', color: 'text-slate-500', icon: '→' };

    const isIncrease = diff > 0;
    const isBad = (metric.lowerIsBetter && isIncrease) || (!metric.lowerIsBetter && !isIncrease);

    return {
      text: `${isIncrease ? '+' : ''}${diff.toFixed(1)} ${metric.unit}`,
      color: isBad ? 'text-rose-600' : 'text-emerald-600',
      icon: isIncrease ? '↑' : '↓',
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
    return <div className="text-center py-12 text-slate-500">Loading your trends...</div>;
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="space-y-8 pt-16 lg:pt-0"
    >
      {/* HEADER TILE */}
      <motion.div className="bg-gradient-to-br from-diana-forest to-[#1A365D] rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between">
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-3">Health Trends</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Track screening metrics over time for discussion with your healthcare provider.
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
        <motion.div
          variants={fadeIn}
          className={`flex items-start gap-3 p-4 rounded-xl border ${bannerColors[banner.color]}`}
        >
          <div className="mt-0.5">
            <banner.Icon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1 uppercase tracking-wider opacity-80">
              Latest Insight
            </h3>
            <p className="font-medium">{banner.message}</p>
          </div>
        </motion.div>
      )}

      {/* TIME CONTROLS */}
      {hasAssessmentData && (
        <motion.div
          variants={fadeIn}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <p className="text-slate-600 font-medium whitespace-nowrap">Select time range:</p>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {timeOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedMonths(option.value)}
                className={`px-4 py-2 min-h-[44px] min-w-[44px] rounded-xl text-sm font-bold transition-all shadow-sm ${
                  selectedMonths === option.value
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

      {/* RANGE SUMMARY */}
      {hasAssessmentData && (
        <motion.div variants={fadeIn} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Selected Range
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{selectedRangeLabel}</p>
            <p className="mt-1 text-sm text-slate-500">
              {pluralizeAssessments(chronologicalClusterHistory.length)} -{' '}
              {getDateRangeText(chronologicalClusterHistory)}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Screening Trend
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-950">
              {riskTrendSummary}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Biomarker Trend
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-blue-950">
              {biomarkerTrendSummary}
            </p>
          </div>

          {biggestMovers.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:col-span-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Biggest Movers
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {biggestMovers.map(mover => (
                  <li
                    key={mover.key}
                    className="flex min-h-[56px] items-start gap-3 border-t border-slate-100 pt-3 md:border-l md:border-t-0 md:pl-4 md:pt-0 first:border-l-0 first:pl-0"
                  >
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        mover.isFavorable ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold leading-6 text-slate-700">
                      {mover.summary}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* MAIN CHARTS SECTION */}
      {clusterHistory.length > 0 && (
        <React.Fragment>
          {/* RISK SCORE CHART */}
          <motion.div
            variants={fadeIn}
            className="p-5 sm:p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100"
          >
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">
              Screening Score History
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Scores are screening estimates from 0-100 for the selected{' '}
              {selectedRangeSentenceLabel} range, not diagnostic results.
            </p>
            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[280px] h-[300px] md:min-w-[500px]">
                {chronologicalClusterHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={chronologicalClusterHistory}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={val =>
                          new Date(val).toLocaleDateString(undefined, {
                            month: 'short',
                            year: 'numeric',
                          })
                        }
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
                        domain={[0, 100]}
                        width={40}
                      />

                      <ReferenceLine
                        y={RISK_THRESHOLDS.medium}
                        stroke="#D97706"
                        strokeDasharray="4 4"
                        label={{
                          value: 'Moderate range',
                          position: 'insideTopLeft',
                          fill: '#D97706',
                          fontSize: 11,
                        }}
                      />
                      <ReferenceLine
                        y={RISK_THRESHOLDS.high}
                        stroke="#E11D48"
                        strokeDasharray="4 4"
                        label={{
                          value: 'High range',
                          position: 'insideTopLeft',
                          fill: '#E11D48',
                          fontSize: 11,
                        }}
                      />

                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                        labelFormatter={val =>
                          new Date(val).toLocaleDateString(undefined, { dateStyle: 'long' })
                        }
                        formatter={value => [`${value} / 100`, 'Screening Score']}
                      />
                      <Area
                        type="monotone"
                        dataKey="riskScore"
                        stroke="#10B981"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorRisk)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#059669' }}
                        isAnimationActive={!isReduced}
                        animationDuration={isReduced ? 0 : 1500}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium text-center px-4">
                      Log one more assessment to see your chart trend!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* KEY BIOMARKER TRENDS */}
          <motion.div
            variants={fadeIn}
            className="p-5 sm:p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100"
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-slate-900">
                  Key Biomarker Trends
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedBiomarkerMetric.label} over the selected {selectedRangeSentenceLabel}{' '}
                  range.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex min-h-[32px] items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600">
                    Unit: {selectedBiomarkerMetric.unit || 'unitless'}
                  </span>
                  <span className="inline-flex min-h-[32px] items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-bold text-emerald-700">
                    Reference band shown
                  </span>
                </div>
              </div>
              <select
                value={selectedBiomarker}
                onChange={e => setSelectedBiomarker(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 min-h-[44px] w-full sm:w-auto"
              >
                {Object.entries(biomarkerMetrics).map(([key, metric]) => (
                  <option key={key} value={key}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[280px] h-[250px] md:min-w-[400px]">
                {hasBiomarkerChartData ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart
                      data={chronologicalBiomarkerHistory}
                      margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={val =>
                          new Date(val).toLocaleDateString(undefined, {
                            month: 'short',
                            year: 'numeric',
                          })
                        }
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
                        domain={biomarkerDomain}
                        width={58}
                      />

                      {selectedBiomarkerMetric.normalMin != null &&
                        selectedBiomarkerMetric.normalMax != null && (
                          <ReferenceArea
                            y1={selectedBiomarkerMetric.normalMin}
                            y2={selectedBiomarkerMetric.normalMax}
                            fill="#10B981"
                            fillOpacity={0.1}
                            label={{
                              value: 'Reference Range',
                              position: 'insideTopLeft',
                              fill: '#059669',
                              fontSize: 10,
                              fontWeight: 'bold',
                            }}
                          />
                        )}

                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '12px',
                          border: 'none',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        }}
                        labelFormatter={val =>
                          new Date(val).toLocaleDateString(undefined, { dateStyle: 'long' })
                        }
                        formatter={value => [
                          formatValueWithUnit(value, selectedBiomarkerMetric.unit),
                          selectedBiomarkerMetric.label,
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={selectedBiomarker}
                        stroke="#3B82F6"
                        strokeWidth={4}
                        fillOpacity={0.1}
                        fill="#3B82F6"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                        connectNulls={true}
                        isAnimationActive={!isReduced}
                        animationDuration={isReduced ? 0 : 1500}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-slate-500 font-medium text-center px-4">
                      Not enough data to graph {selectedBiomarkerMetric.label}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* EXPANDABLE PREVIOUS ASSESSMENTS */}
          <motion.div
            variants={fadeIn}
            className="p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100"
          >
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-6">
              Previous Assessments Details
            </h2>
            <div className="space-y-3">
              {latestClusterHistory.map((entry, index) => {
                // Use index in key to ensure uniqueness (same date + cluster can occur multiple times)
                const uniqueKey = `${entry.date}-${entry.cluster}-${index}`;

                const riskTier = getRiskTier(entry.riskScore);
                const riskLabel =
                  riskTier === 'low' ? 'Low' : riskTier === 'medium' ? 'Medium' : 'High';
                const isExpanded = expandedRows[uniqueKey];

                const currentBio = latestBiomarkerHistory.find(b => b.date === entry.date) || {};
                const prevBio = latestBiomarkerHistory[index + 1] || null;

                return (
                  <div
                    key={uniqueKey}
                    className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow"
                  >
                    <button
                      onClick={() => toggleRow(uniqueKey)}
                      className="w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors text-left min-h-[64px]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100 text-diana-forest">
                          <Calendar size={20} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-slate-900 font-bold block">
                            {new Date(entry.date).toLocaleDateString(undefined, {
                              dateStyle: 'medium',
                            })}
                          </span>
                          <span className="text-slate-500 text-sm mt-0.5 block">
                            {formatClusterName(entry.cluster)}
                          </span>
                        </div>
                      </div>
                      <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:flex-nowrap sm:justify-end">
                        <div
                          className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap ${riskTierStyles[riskTier]}`}
                        >
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
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-white"
                        >
                          <div className="p-4 sm:p-5 overflow-x-auto">
                            <div className="min-w-[320px]">
                              <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                  <tr>
                                    <th className="px-3 sm:px-4 py-3 font-bold rounded-tl-lg">
                                      Biomarker
                                    </th>
                                    <th className="px-3 sm:px-4 py-3 font-bold">Value</th>
                                    <th className="px-3 sm:px-4 py-3 font-bold rounded-tr-lg">
                                      Change
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {Object.entries(biomarkerMetrics).map(([key, metric]) => {
                                    const val = currentBio[key];
                                    const prevVal = prevBio ? prevBio[key] : null;

                                    if (val === null || val === undefined) return null;

                                    const delta = calculateDelta(val, prevVal, metric);

                                    return (
                                      <tr
                                        key={key}
                                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30"
                                      >
                                        <td className="px-3 sm:px-4 py-3 font-medium text-slate-900 border-r border-slate-50/50 align-middle">
                                          {metric.label}
                                          <BiomarkerTooltip tooltip={metric.tooltip} />
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 font-bold text-slate-700 align-middle whitespace-nowrap">
                                          {formatValueWithUnit(val, metric.unit)}
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 align-middle">
                                          {delta ? (
                                            <div
                                              className={`inline-flex items-center gap-1 font-bold ${delta.color} text-xs sm:text-sm`}
                                            >
                                              <span>{delta.icon}</span>
                                              <span>{delta.text}</span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-400 italic text-xs sm:text-sm">
                                              No previous data
                                            </span>
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
        <motion.div
          variants={fadeIn}
          className="p-6 md:p-8 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center md:items-start md:text-left"
        >
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">
            Your Health Snapshot
          </h2>
          <p className="text-slate-500 mb-8 max-w-2xl">
            A quick summary of the selected {selectedRangeSentenceLabel} range. Use these ranges to
            notice changes and prepare questions for a healthcare provider.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 w-full">
            <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm">
              <Activity size={28} className="mx-auto text-emerald-600 mb-3" />
              <div className="text-4xl font-serif font-bold text-emerald-700 mb-1">
                {activeTrends.riskLevels?.low || 0}
              </div>
              <p className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                Low Screening Risk
              </p>
              <p className="text-xs text-emerald-700 mt-1 font-medium">Lower range</p>
            </div>
            <div className="text-center p-6 bg-amber-50 rounded-2xl border border-amber-300 shadow-sm">
              <Activity size={28} className="mx-auto text-amber-600 mb-3" />
              <div className="text-4xl font-serif font-bold text-amber-800 mb-1">
                {activeTrends.riskLevels?.medium || 0}
              </div>
              <p className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                Moderate Screening Risk
              </p>
              <p className="text-xs text-amber-700 mt-1 font-medium">Review trend</p>
            </div>
            <div className="text-center p-6 bg-rose-50 rounded-2xl border border-rose-200 shadow-sm">
              <Activity size={28} className="mx-auto text-rose-600 mb-3" />
              <div className="text-4xl font-serif font-bold text-rose-800 mb-1">
                {activeTrends.riskLevels?.high || 0}
              </div>
              <p className="text-sm font-bold text-rose-900 uppercase tracking-wide">
                High Screening Risk
              </p>
              <p className="text-xs text-rose-700 mt-1 font-medium">Provider review</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {!hasAssessmentData && (
        <motion.div
          variants={fadeIn}
          className="p-12 text-center bg-white rounded-3xl shadow-sm border border-slate-100"
        >
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Health Data Yet</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Start tracking your health journey by logging your first assessment. You&apos;ll see
            trends, risk summaries, and screening history here.
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
