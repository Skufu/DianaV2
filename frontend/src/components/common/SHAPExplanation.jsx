/**
 * SHAP Explanation Component
 * Displays SHAP values for model interpretability
 */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Brain, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';

const FEATURE_LABELS = {
    bmi: 'BMI',
    triglycerides: 'Triglycerides',
    ldl: 'LDL Cholesterol',
    hdl: 'HDL Cholesterol',
    age: 'Age',
    hba1c: 'HbA1c',
    fbs: 'Fasting Blood Sugar'
};

const SHAPExplanation = ({
    patientData,
    modelType = 'clinical',
    mlBase = import.meta.env.VITE_ML_BASE || 'http://localhost:5000',
    showTitle = true,
    compact = false
}) => {
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(!compact);

    useEffect(() => {
        if (patientData && Object.keys(patientData).length > 0) {
            fetchExplanation();
        }
    }, [patientData, modelType]);

    const fetchExplanation = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${mlBase}/explain?model_type=${modelType}&include_plot=waterfall`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patientData)
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get explanation: ${response.statusText}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            setExplanation(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Prepare chart data
    const getChartData = () => {
        if (!explanation?.shap_values) return [];

        return explanation.shap_values
            .map(sv => ({
                feature: FEATURE_LABELS[sv.feature] || sv.feature,
                value: sv.shap_value,
                featureValue: sv.feature_value,
                absValue: Math.abs(sv.shap_value)
            }))
            .sort((a, b) => b.absValue - a.absValue);
    };

    const chartData = getChartData();

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-gray-400">
                    <Brain className="w-5 h-5 animate-pulse" />
                    <span>Generating explanation...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 rounded-xl p-4 border border-red-700/50">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>Unable to generate explanation: {error}</span>
                </div>
            </div>
        );
    }

    if (!explanation) {
        return null;
    }

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    {showTitle && (
                        <div className="text-left">
                            <h3 className="text-white font-medium">AI Explanation</h3>
                            <p className="text-sm text-gray-400">SHAP Feature Contributions</p>
                        </div>
                    )}
                </div>
                {expanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
            </button>

            {/* Content */}
            {expanded && (
                <div className="p-4 pt-0 space-y-4">
                    {/* Info tooltip */}
                    <div className="flex items-start gap-2 p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-300">
                            SHAP values show how each feature contributes to the prediction.
                            <span className="text-emerald-400"> Green bars</span> increase risk,
                            <span className="text-rose-400"> red bars</span> decrease risk.
                        </p>
                    </div>

                    {/* Bar Chart */}
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            >
                                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                                <YAxis
                                    type="category"
                                    dataKey="feature"
                                    stroke="#9ca3af"
                                    fontSize={12}
                                    width={90}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: '1px solid #374151',
                                        borderRadius: '8px',
                                        color: '#fff'
                                    }}
                                    formatter={(value, name, props) => [
                                        `${value.toFixed(4)} (Value: ${props.payload.featureValue?.toFixed(1) ?? 'N/A'})`,
                                        'Contribution'
                                    ]}
                                />
                                <ReferenceLine x={0} stroke="#6b7280" />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.value >= 0 ? '#10b981' : '#f43f5e'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Waterfall plot image if available */}
                    {explanation.waterfall_plot && (
                        <div className="mt-4">
                            <h4 className="text-sm text-gray-400 mb-2">Detailed Waterfall Plot</h4>
                            <img
                                src={`data:image/png;base64,${explanation.waterfall_plot}`}
                                alt="SHAP Waterfall Plot"
                                className="w-full rounded-lg border border-gray-700"
                            />
                        </div>
                    )}

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-400">Base Value</div>
                            <div className="text-lg font-semibold text-white">
                                {explanation.base_value?.toFixed(3) ?? 'N/A'}
                            </div>
                        </div>
                        <div className="bg-gray-700/30 rounded-lg p-3">
                            <div className="text-xs text-gray-400">Final Prediction</div>
                            <div className="text-lg font-semibold text-white">
                                {explanation.prediction != null
                                    ? `${(explanation.prediction * 100).toFixed(1)}%`
                                    : 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SHAPExplanation;
