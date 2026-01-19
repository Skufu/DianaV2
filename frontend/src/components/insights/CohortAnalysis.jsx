// CohortAnalysis: Compare risk factors across patient groups
import React, { useEffect, useState, useMemo } from 'react';
import { fetchCohortAnalysisApi } from '../../api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Users, TrendingUp, Activity, Filter } from 'lucide-react';
import { shouldAnimateCharts } from '../../utils/deviceCapabilities';

const GROUPING_OPTIONS = [
    { value: 'cluster', label: 'T2DM Cluster' },
    { value: 'risk_level', label: 'Risk Level' },
    { value: 'age_group', label: 'Age Group' },
    { value: 'menopause_status', label: 'Menopause Status' },
];

const GROUP_COLORS = [
    '#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#6366F1', '#8B5CF6'
];

const CohortAnalysis = ({ token }) => {
    const [groupBy, setGroupBy] = useState('cluster');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const animateCharts = useMemo(() => shouldAnimateCharts(), []);

    useEffect(() => {
        if (!token) return;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await fetchCohortAnalysisApi(token, groupBy);
                setData(result);
            } catch (err) {
                setError('Failed to load cohort analysis');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token, groupBy]);

    const groups = data?.groups || [];
    const totalPatients = data?.total_patients || 0;
    const totalAssessments = data?.total_assessments || 0;

    // Prepare data for radar chart
    const radarData = useMemo(() => {
        if (!groups.length) return [];
        const metrics = ['avg_hba1c', 'avg_fbs', 'avg_bmi', 'avg_bp_systolic', 'avg_risk_score'];
        const metricLabels = {
            avg_hba1c: 'HbA1c',
            avg_fbs: 'FBS',
            avg_bmi: 'BMI',
            avg_bp_systolic: 'BP Systolic',
            avg_risk_score: 'Risk Score'
        };

        return metrics.map(metric => {
            const point = { metric: metricLabels[metric] };
            groups.forEach((g, i) => {
                point[g.name] = g[metric] || 0;
            });
            return point;
        });
    }, [groups]);

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h4 className="text-slate-400 font-medium text-sm mb-1">Risk Factor Comparison</h4>
                    <h2 className="text-3xl font-bold text-white">Cohort Insights</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Compare risk factors across patient groups to identify patterns
                    </p>
                </div>

                {/* Grouping Selector */}
                <div className="flex items-center gap-3">
                    <Filter className="text-slate-400" size={20} />
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className="bg-slate-700/50 text-white border border-slate-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                        {GROUPING_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </header>

            {loading && (
                <div className="glass-card p-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-400">Loading cohort data...</p>
                </div>
            )}

            {error && !loading && (
                <div className="glass-card p-6 border border-rose-500/30 text-rose-400">
                    {error}
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Users className="text-violet-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{groups.length}</h3>
                            <p className="text-slate-400 text-sm mt-1">Patient Groups</p>
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
                                    <TrendingUp className="text-teal-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{totalPatients}</h3>
                            <p className="text-slate-400 text-sm mt-1">Total Patients</p>
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <Activity className="text-cyan-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{totalAssessments}</h3>
                            <p className="text-slate-400 text-sm mt-1">Total Assessments</p>
                        </div>
                    </div>

                    {/* Group Distribution Bar Chart */}
                    <div className="glass-card p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">Group Distribution</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={groups} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94A3B8"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis stroke="#94A3B8" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1B2559',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="count" name="Patient Count" fill="#7C3AED" radius={[8, 8, 0, 0]} isAnimationActive={animateCharts} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Risk Factor Comparison Bar Chart */}
                    <div className="glass-card p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">Average Biomarkers by Group</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={groups} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#94A3B8"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis stroke="#94A3B8" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1B2559',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff'
                                    }}
                                    formatter={(value) => value.toFixed(1)}
                                />
                                <Legend />
                                <Bar dataKey="avg_hba1c" name="HbA1c (%)" fill="#7C3AED" isAnimationActive={animateCharts} />
                                <Bar dataKey="avg_bmi" name="BMI" fill="#06B6D4" isAnimationActive={animateCharts} />
                                <Bar dataKey="avg_risk_score" name="Risk Score" fill="#F43F5E" isAnimationActive={animateCharts} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Radar Chart for Multi-dimensional Comparison */}
                    {radarData.length > 0 && groups.length <= 5 && (
                        <div className="glass-card p-8">
                            <h3 className="text-2xl font-bold text-white mb-6">Multi-factor Comparison (Radar)</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#475569" />
                                    <PolarAngleAxis dataKey="metric" stroke="#94A3B8" />
                                    <PolarRadiusAxis stroke="#94A3B8" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1B2559',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#fff'
                                        }}
                                    />
                                    <Legend />
                                    {groups.map((g, i) => (
                                        <Radar
                                            key={g.name}
                                            name={g.name}
                                            dataKey={g.name}
                                            stroke={GROUP_COLORS[i % GROUP_COLORS.length]}
                                            fill={GROUP_COLORS[i % GROUP_COLORS.length]}
                                            fillOpacity={0.2}
                                            isAnimationActive={animateCharts}
                                        />
                                    ))}
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Data Table */}
                    <div className="glass-card p-8 overflow-x-auto">
                        <h3 className="text-2xl font-bold text-white mb-6">Detailed Statistics</h3>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-600/50">
                                    <th className="text-left py-3 px-4">Group</th>
                                    <th className="text-right py-3 px-4">Count</th>
                                    <th className="text-right py-3 px-4">Avg HbA1c</th>
                                    <th className="text-right py-3 px-4">Avg FBS</th>
                                    <th className="text-right py-3 px-4">Avg BMI</th>
                                    <th className="text-right py-3 px-4">Avg BP</th>
                                    <th className="text-right py-3 px-4">Avg Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((g, i) => (
                                    <tr key={g.name} className="border-b border-slate-700/50 text-white hover:bg-slate-700/30">
                                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length] }}
                                            />
                                            {g.name}
                                        </td>
                                        <td className="text-right py-3 px-4">{g.count}</td>
                                        <td className="text-right py-3 px-4">{g.avg_hba1c?.toFixed(1) || 'N/A'}</td>
                                        <td className="text-right py-3 px-4">{g.avg_fbs?.toFixed(1) || 'N/A'}</td>
                                        <td className="text-right py-3 px-4">{g.avg_bmi?.toFixed(1) || 'N/A'}</td>
                                        <td className="text-right py-3 px-4">{g.avg_bp_systolic?.toFixed(0) || 'N/A'}/{g.avg_bp_diastolic?.toFixed(0) || 'N/A'}</td>
                                        <td className="text-right py-3 px-4">{g.avg_risk_score?.toFixed(1) || 'N/A'}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default CohortAnalysis;
