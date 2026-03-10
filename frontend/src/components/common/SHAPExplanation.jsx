/**
 * SHAP Explanation Component
 * Displays SHAP values for model interpretability
 * Light‑theme variant matching the admin dashboard glass‑card style.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Brain, ChevronDown, ChevronUp, AlertCircle, Info, Users } from 'lucide-react';
import { mlFetchJson } from '../../api';

const FEATURE_LABELS = {
  bmi: 'BMI',
  triglycerides: 'Triglycerides',
  ldl: 'LDL Cholesterol',
  hdl: 'HDL Cholesterol',
  age: 'Age',
  hba1c: 'HbA1c',
  fbs: 'Fasting Blood Sugar',
  bmi_category: 'BMI Category',
  tg_hdl_ratio: 'TG/HDL Ratio',
  smoking_encoded: 'Smoking Status',
  activity_encoded: 'Activity Level',
  alcohol_encoded: 'Alcohol Use',
  metabolic_syndrome_score: 'Metabolic Score',
  waist_circumference: 'Waist Circumference',
  family_history_diabetes: 'Family History',
  crp: 'CRP',
  systolic: 'Systolic BP',
  diastolic: 'Diastolic BP',
};

const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

const coerceNumber = value => {
  if (isFiniteNumber(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatNumber = (value, digits, fallback = 'N/A') => {
  const numeric = coerceNumber(value);
  return numeric == null ? fallback : numeric.toFixed(digits);
};

const resolveExplainModelType = modelType => {
  const normalized = String(modelType || '').trim();
  if (normalized === 'ada') return 'ada';
  if (normalized === 'binary_v2_bp') return 'binary_v2_bp';
  if (normalized === 'binary_v2_no_bp') return 'binary_v2_no_bp';
  if (normalized === 'clinical') return 'clinical';
  return 'binary_v2_no_bp';
};

const EXPLAINABILITY_UNAVAILABLE_PATTERNS = [
  /shap/i,
  /explainer/i,
  /explainability/i,
  /formatter/i,
];

const isExplainabilityUnavailableMessage = message => {
  if (!message || typeof message !== 'string') return false;
  return EXPLAINABILITY_UNAVAILABLE_PATTERNS.some(pattern => pattern.test(message));
};

const buildExplainabilityFallback = reason => ({
  available: false,
  reason: reason || 'explainability_unavailable',
  summary:
    'Detailed SHAP explainability is currently unavailable. Review risk outputs with clinical judgment.',
  limitations: [
    'Detailed SHAP feature attributions are unavailable for this assessment.',
    'This output supports screening discussion only and does not replace clinical judgment.',
    'No feature-level SHAP values are shown in fallback mode.',
  ],
});

const SHAPExplanation = ({
  patientData,
  modelType = 'binary_v2_no_bp',
  showTitle = true,
  compact = false,
}) => {
  const resolvedModelType = resolveExplainModelType(modelType);
  const [explanation, setExplanation] = useState(null);
  const [riskCluster, setRiskCluster] = useState(null);
  const [clusterInfo, setClusterInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);
  const abortControllerRef = useRef(null);

  const fetchExplanation = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const data = await mlFetchJson(
        `/predict/explain?model_type=${resolvedModelType}&format=full&include_plot=waterfall`,
        {
          method: 'POST',
          body: patientData,
          signal: abortControllerRef.current.signal,
        }
      );
      const predictionCandidates = [data?.probability, data?.at_risk_probability, data?.prediction];
      const predictionValue =
        predictionCandidates.map(coerceNumber).find(value => value != null) ?? null;
      const explanationPayload = data.explanation || data;

      const fallbackReason =
        explanationPayload?.reason ||
        data?.shap_metadata?.fallback_reason ||
        (data?.shap_metadata?.explanation_available === false ? 'explainability_unavailable' : null);

      if (explanationPayload?.available === false || fallbackReason) {
        setExplanation({
          ...buildExplainabilityFallback(fallbackReason),
          ...explanationPayload,
          prediction: coerceNumber(explanationPayload?.prediction) ?? predictionValue,
        });
        return;
      }

      setExplanation({
        ...explanationPayload,
        prediction: coerceNumber(explanationPayload?.prediction) ?? predictionValue,
      });
      setRiskCluster(data?.risk_cluster || null);
      setClusterInfo({
        riskLevel: data?.risk_level || null,
        clusterDescription: data?.cluster_description || null,
        treatmentFocus: data?.treatment_focus || null,
        metabolicSubtype: data?.metabolic_subtype || null,
      });
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (isExplainabilityUnavailableMessage(err.message)) {
        setExplanation(buildExplainabilityFallback('explainability_unavailable'));
        setError(null);
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [patientData, resolvedModelType]);

  useEffect(() => {
    if (patientData && Object.keys(patientData).length > 0) {
      fetchExplanation();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchExplanation, patientData]);

  // Prepare chart data
  const getChartData = () => {
    if (!explanation?.shap_values) return [];

    const isObjectShape =
      Array.isArray(explanation.shap_values) &&
      explanation.shap_values.length > 0 &&
      typeof explanation.shap_values[0] === 'object';

    if (isObjectShape) {
      return explanation.shap_values
        .map(sv => {
          const numericValue = coerceNumber(sv.shap_value) ?? 0;
          const numericFeatureValue = coerceNumber(sv.feature_value);
          return {
            feature: FEATURE_LABELS[sv.feature] || sv.feature,
            value: numericValue,
            featureValue: numericFeatureValue,
            absValue: Math.abs(numericValue),
          };
        })
        .sort((a, b) => b.absValue - a.absValue);
    }

    const featureNames = explanation.feature_names || [];
    const featureValues = explanation.feature_values || [];

    return explanation.shap_values
      .map((value, index) => {
        const numericValue = coerceNumber(value) ?? 0;
        const rawFeatureValue = featureValues[index];
        const numericFeatureValue = coerceNumber(rawFeatureValue);
        return {
          feature:
            FEATURE_LABELS[featureNames[index]] || featureNames[index] || `Feature ${index + 1}`,
          value: numericValue,
          featureValue: numericFeatureValue,
          absValue: Math.abs(numericValue),
        };
      })
      .sort((a, b) => b.absValue - a.absValue);
  };

  const chartData = getChartData();
  const hasChartData = chartData.length > 0;
  const isFallback = explanation?.available === false;

  if (loading) {
    return (
      <div className="glass-card bg-white rounded-3xl p-6 border border-slate-200/60">
        <div className="flex items-center gap-3 text-slate-500">
          <Brain className="w-5 h-5 animate-pulse text-purple-500" />
          <span className="font-medium">Generating SHAP explanation…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card bg-white rounded-3xl p-6 border border-rose-200/60">
        <div className="flex items-center gap-2 text-rose-600">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Unable to generate explanation: {error}</span>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return null;
  }

  return (
    <div className="glass-card bg-white rounded-3xl border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        type="button"
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-xl">
            <Brain className="w-5 h-5 text-purple-600" />
          </div>
          {showTitle && (
            <div className="text-left">
              <h3 className="text-slate-900 font-semibold">AI Explanation</h3>
              <p className="text-sm text-slate-500">SHAP Feature Contributions</p>
            </div>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5">
          {/* Info tooltip */}
          {isFallback ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Explainability Limited</p>
                  <p>{explanation.summary}</p>
                </div>
              </div>
              {Array.isArray(explanation.limitations) && explanation.limitations.length > 0 && (
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600">
                  {explanation.limitations.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-indigo-700">
                  SHAP values show how each feature contributes to the prediction in a standardized
                  feature space (mean=0, std=1).
                  <span className="text-emerald-600 font-medium"> Green bars</span> increase risk,
                  <span className="text-rose-600 font-medium"> red bars</span> decrease risk.
                </p>
              </div>

              {/* Bar Chart */}
              <div className="h-72 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <XAxis type="number" stroke="#64748b" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="feature"
                      stroke="#64748b"
                      fontSize={12}
                      width={110}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        color: '#0f172a',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      formatter={(value, name, props) => [
                        `${formatNumber(value, 4)} (Value: ${formatNumber(props.payload?.featureValue, 1)})`,
                        'Contribution',
                      ]}
                    />
                    <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map(entry => (
                        <Cell key={entry.feature} fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Waterfall plot image if available */}
          {!isFallback && explanation.waterfall_plot && (
            <div className="mt-2">
              <h4 className="text-sm font-semibold text-slate-600 mb-2">Detailed Waterfall Plot</h4>
              <img
                src={`data:image/png;base64,${explanation.waterfall_plot}`}
                alt="SHAP Waterfall Plot"
                className="w-full rounded-2xl border border-slate-200"
                loading="lazy"
                decoding="async"
                width="800"
                height="600"
              />
            </div>
          )}

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-1">Base Value</div>
              <div className="text-xl font-bold text-slate-900">
                {formatNumber(explanation.base_value, 3)}
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <div className="text-xs font-medium text-slate-500 mb-1">Final Prediction</div>
              <div className="text-xl font-bold text-slate-900">
                {isFiniteNumber(explanation.prediction)
                  ? `${formatNumber(explanation.prediction * 100, 1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Risk Cluster Display */}
          {riskCluster && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">Metabolic Subtype</h4>
                  <p className="text-xs text-slate-500">Ahlqvist-inspired diabetes cluster</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-indigo-700">{riskCluster}</span>
                  {clusterInfo?.riskLevel && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      clusterInfo.riskLevel === 'HIGH' ? 'bg-rose-100 text-rose-700' :
                      clusterInfo.riskLevel === 'MODERATE' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {clusterInfo.riskLevel} RISK
                    </span>
                  )}
                </div>
                {clusterInfo?.clusterDescription && (
                  <p className="text-sm text-slate-600 mt-2">{clusterInfo.clusterDescription}</p>
                )}
                {clusterInfo?.treatmentFocus && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-500">Treatment Focus: </span>
                    <span className="text-sm text-slate-700">{clusterInfo.treatmentFocus}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {!isFallback && !hasChartData && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No SHAP feature contributions available for this assessment.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SHAPExplanation;
