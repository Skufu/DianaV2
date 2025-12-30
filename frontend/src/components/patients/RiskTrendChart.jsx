/**
 * Risk Trend Chart Component
 * Displays patient risk score and biomarker trends over time
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, Area, ComposedChart, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Calendar } from 'lucide-react';

const RiskTrendChart = ({
    patientId,
    token,
    apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:8080',
    height = 300,
    showBiomarkers = true
}) => {
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMetrics, setSelectedMetrics] = useState(['risk_score', 'hba1c']);

    useEffect(() => {
        if (patientId) {
            fetchTrendData();
        }
    }, [patientId]);

    const fetchTrendData = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `${apiBase}/api/v1/patients/${patientId}/trend`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch trend data: ${response.statusText}`);
            }

            const data = await response.json();
            setTrendData(data.trend || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Format data for chart
    const chartData = useMemo(() => {
        return trendData.map((point, index) => ({
            date: new Date(point.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: '2-digit'
            }),
            fullDate: new Date(point.created_at).toLocaleDateString(),
            risk_score: point.risk_score ? point.risk_score * 100 : null,
            cluster: point.cluster,
            hba1c: point.hba1c,
            bmi: point.bmi,
            fbs: point.fbs,
            triglycerides: point.triglycerides,
            ldl: point.ldl,
            hdl: point.hdl,
            index: index + 1
        }));
    }, [trendData]);

    // Calculate trend direction
    const trendDirection = useMemo(() => {
        if (chartData.length < 2) return null;
        const first = chartData[0].risk_score;
        const last = chartData[chartData.length - 1].risk_score;
        if (first === null || last === null) return null;
        return last > first ? 'increasing' : last < first ? 'decreasing' : 'stable';
    }, [chartData]);

    const metricOptions = [
        { key: 'risk_score', label: 'Risk Score (%)', color: '#8b5cf6' },
        { key: 'hba1c', label: 'HbA1c', color: '#f59e0b' },
        { key: 'bmi', label: 'BMI', color: '#10b981' },
        { key: 'fbs', label: 'FBS', color: '#3b82f6' },
        { key: 'triglycerides', label: 'Triglycerides', color: '#ec4899' },
        { key: 'ldl', label: 'LDL', color: '#f43f5e' },
        { key: 'hdl', label: 'HDL', color: '#14b8a6' }
    ];

    const toggleMetric = (key) => {
        setSelectedMetrics(prev =>
            prev.includes(key)
                ? prev.filter(m => m !== key)
                : [...prev, key]
        );
    };

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-2 text-gray-400">
                    <Activity className="w-5 h-5 animate-pulse" />
                    <span>Loading trend data...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 rounded-xl p-6 border border-red-700/50">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="w-5 h-5" />
                    <span>No assessment history available</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">Risk Trend</h3>
                            <p className="text-sm text-gray-400">{chartData.length} assessments</p>
                        </div>
                    </div>

                    {/* Trend indicator */}
                    {trendDirection && (
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${trendDirection === 'decreasing'
                                ? 'bg-green-500/20 text-green-400'
                                : trendDirection === 'increasing'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-gray-500/20 text-gray-400'
                            }`}>
                            {trendDirection === 'decreasing' ? (
                                <TrendingDown className="w-4 h-4" />
                            ) : (
                                <TrendingUp className="w-4 h-4" />
                            )}
                            <span className="capitalize">{trendDirection}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Metric toggles */}
            {showBiomarkers && (
                <div className="p-4 border-b border-gray-700 flex flex-wrap gap-2">
                    {metricOptions.map(metric => (
                        <button
                            key={metric.key}
                            onClick={() => toggleMetric(metric.key)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedMetrics.includes(metric.key)
                                    ? 'text-white'
                                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                }`}
                            style={{
                                backgroundColor: selectedMetrics.includes(metric.key)
                                    ? metric.color + '40'
                                    : undefined,
                                borderColor: selectedMetrics.includes(metric.key)
                                    ? metric.color
                                    : undefined,
                                border: selectedMetrics.includes(metric.key)
                                    ? `1px solid ${metric.color}`
                                    : '1px solid transparent'
                            }}
                        >
                            {metric.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Chart */}
            <div className="p-4" style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            labelFormatter={(value, payload) => {
                                const item = payload?.[0]?.payload;
                                return item ? `${item.fullDate} - ${item.cluster || 'Unknown Cluster'}` : value;
                            }}
                        />
                        <Legend />

                        {/* Risk score area + line */}
                        {selectedMetrics.includes('risk_score') && (
                            <>
                                <Area
                                    type="monotone"
                                    dataKey="risk_score"
                                    fill="#8b5cf6"
                                    fillOpacity={0.2}
                                    stroke="none"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="risk_score"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    dot={{ fill: '#8b5cf6', r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Risk Score (%)"
                                />
                            </>
                        )}

                        {/* Other metrics */}
                        {metricOptions.slice(1).filter(m => selectedMetrics.includes(m.key)).map(metric => (
                            <Line
                                key={metric.key}
                                type="monotone"
                                dataKey={metric.key}
                                stroke={metric.color}
                                strokeWidth={2}
                                dot={{ fill: metric.color, r: 3 }}
                                name={metric.label}
                            />
                        ))}

                        {/* HbA1c reference lines */}
                        {selectedMetrics.includes('hba1c') && (
                            <>
                                <ReferenceLine y={5.7} stroke="#22c55e" strokeDasharray="5 5" label={{ value: 'Normal', fill: '#22c55e', fontSize: 10 }} />
                                <ReferenceLine y={6.5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Diabetic', fill: '#ef4444', fontSize: 10 }} />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-px bg-gray-700">
                {chartData.length > 0 && (
                    <>
                        <div className="bg-gray-800 p-3 text-center">
                            <div className="text-xs text-gray-400">First Assessment</div>
                            <div className="text-sm font-medium text-white">
                                {chartData[0].risk_score?.toFixed(1) ?? 'N/A'}%
                            </div>
                        </div>
                        <div className="bg-gray-800 p-3 text-center">
                            <div className="text-xs text-gray-400">Latest Assessment</div>
                            <div className="text-sm font-medium text-white">
                                {chartData[chartData.length - 1].risk_score?.toFixed(1) ?? 'N/A'}%
                            </div>
                        </div>
                        <div className="bg-gray-800 p-3 text-center">
                            <div className="text-xs text-gray-400">Change</div>
                            <div className={`text-sm font-medium ${(chartData[chartData.length - 1].risk_score ?? 0) < (chartData[0].risk_score ?? 0)
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}>
                                {chartData[0].risk_score != null && chartData[chartData.length - 1].risk_score != null
                                    ? `${(chartData[chartData.length - 1].risk_score - chartData[0].risk_score).toFixed(1)}%`
                                    : 'N/A'
                                }
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RiskTrendChart;
