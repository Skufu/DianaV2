// Dashboard: Clinical Precision cohort overview with comprehensive risk analysis
import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertCircle, Droplet, Activity, Plus, ArrowRight, TrendingUp, BarChart2, Filter, Info, Layers, Target, TrendingDown, Shield } from 'lucide-react';
import { fetchClusterDistributionApi, fetchTrendAnalyticsApi, fetchPatientsApi, fetchAssessmentsApi } from '../../api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ScatterChart, Scatter, LineChart, Line, Legend, ComposedChart
} from 'recharts';

const Dashboard = ({ token, patientCount = 0, onNavigateToPatient, onStartAssessment, loading: patientsLoading = false }) => {
  const [activeBiomarker, setActiveBiomarker] = useState('hba1c');
  const [clusterStats, setClusterStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter states
  const [riskFilter, setRiskFilter] = useState('all');
  const [ageRange, setAgeRange] = useState({ min: 0, max: 100 });
  const [viewMode, setViewMode] = useState('risk'); // 'risk' or 'age'
  const [assessmentPeriod, setAssessmentPeriod] = useState('all'); // 'all', 'week', 'month', 'quarter'

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setAnalyticsLoading(true);
      setError(null);
      try {
        const [clusters, trendData, patients] = await Promise.all([
          fetchClusterDistributionApi(token),
          fetchTrendAnalyticsApi(token),
          fetchPatientsApi(token),
        ]);
        setClusterStats(clusters || []);
        setTrends(trendData || []);
        setAllPatients(patients || []);

        // Fetch all assessments for all patients
        const assessmentsPromises = (patients || []).map(patient =>
          fetchAssessmentsApi(token, patient.id).catch(() => [])
        );
        const assessmentsArrays = await Promise.all(assessmentsPromises);
        // Filter out any null/undefined assessments to prevent null reference errors
        const flatAssessments = assessmentsArrays.flat().filter(Boolean);
        setAllAssessments(flatAssessments);
      } catch (_) {
        setError('Unable to load analytics data');
      } finally {
        setAnalyticsLoading(false);
      }
    };
    load();
  }, [token]);

  // Calculate risk distribution
  const riskDistribution = useMemo(() => {
    if (!allAssessments.length) return { low: 0, moderate: 0, high: 0, total: 0 };

    const low = allAssessments.filter(a => (a.risk_score || 0) < 34).length;
    const moderate = allAssessments.filter(a => (a.risk_score || 0) >= 34 && (a.risk_score || 0) < 67).length;
    const high = allAssessments.filter(a => (a.risk_score || 0) >= 67).length;

    return { low, moderate, high, total: allAssessments.length };
  }, [allAssessments]);

  // Calculate averages
  const averages = useMemo(() => {
    if (!allAssessments.length) return { hba1c: 0, fbs: 0 };

    const hba1c = allAssessments.reduce((sum, a) => sum + (a.hba1c || 0), 0) / allAssessments.length;
    const fbs = allAssessments.reduce((sum, a) => sum + (a.fbs || 0), 0) / allAssessments.length;

    return { hba1c: hba1c.toFixed(1), fbs: Math.round(fbs) };
  }, [allAssessments]);

  // Cluster color mapping - defined before useMemo hooks that use it
  const clusterColor = (label) => {
    const key = (label || '').toUpperCase();
    switch (key) {
      case 'SIRD': return '#F43F5E';
      case 'SIDD': return '#F59E0B';
      case 'MARD': return '#22D3EE';
      case 'MOD': return '#14B8A6';
      default: return '#64748B';
    }
  };

  // Risk level mapping - defined before useMemo hooks that use it
  const getRiskLevel = (riskScore) => {
    if (riskScore < 34) return 'Low';
    if (riskScore < 67) return 'Moderate';
    return 'High';
  };

  // Top-level summary cards
  const summaryCards = useMemo(() => [
    { label: 'Total Patients Assessed', value: patientCount || '0', icon: Users, iconColor: '#14B8A6', bg: 'bg-teal-500/10' },
    { label: 'High-Risk Count', value: riskDistribution.high.toString(), icon: AlertCircle, iconColor: '#F43F5E', bg: 'bg-rose-500/10' },
    { label: 'Moderate-Risk Count', value: riskDistribution.moderate.toString(), icon: Shield, iconColor: '#F59E0B', bg: 'bg-amber-500/10' },
    { label: 'Low-Risk Count', value: riskDistribution.low.toString(), icon: Target, iconColor: '#22D3EE', bg: 'bg-cyan-500/10' },
    { label: 'Average HbA1c', value: `${averages.hba1c}%`, icon: Droplet, iconColor: '#8B5CF6', bg: 'bg-purple-500/10' },
    { label: 'Average FBS', value: averages.fbs === '0' ? '—' : `${averages.fbs} mg/dL`, icon: Activity, iconColor: '#10B981', bg: 'bg-emerald-500/10' },
  ], [patientCount, riskDistribution, averages]);

  // Risk distribution chart data
  const riskDistributionData = useMemo(() => [
    { name: 'Low Risk', value: riskDistribution.low, color: '#22D3EE', fill: '#22D3EE' },
    { name: 'Moderate Risk', value: riskDistribution.moderate, color: '#F59E0B', fill: '#F59E0B' },
    { name: 'High Risk', value: riskDistribution.high, color: '#F43F5E', fill: '#F43F5E' },
  ], [riskDistribution]);

  // Cluster visualization data
  const clusterBarData = useMemo(() => {
    return clusterStats.map(c => ({
      name: c.cluster || 'Unknown',
      count: c.count || 0,
      fill: clusterColor(c.cluster)
    }));
  }, [clusterStats]);

  // 2D Cluster plot (HbA1c vs FBS)
  const clusterScatterData = useMemo(() => {
    if (!allAssessments.length || !allPatients.length) return [];

    const clusterMap = {};
    allAssessments.forEach(assessment => {
      const cluster = assessment.cluster || 'Unknown';
      if (!clusterMap[cluster]) {
        clusterMap[cluster] = [];
      }
      clusterMap[cluster].push({
        x: assessment.hba1c || 0,
        y: assessment.fbs || 0,
        cluster: cluster
      });
    });

    return Object.keys(clusterMap).map(cluster => ({
      name: cluster,
      data: clusterMap[cluster],
      fill: clusterColor(cluster)
    }));
  }, [allAssessments, allPatients]);

  // Heatmap data (biomarkers vs clusters) - calculate from assessments
  const heatmapData = useMemo(() => {
    if (!clusterStats.length || !allAssessments.length) return [];

    const biomarkers = ['hba1c', 'fbs', 'cholesterol', 'ldl', 'hdl', 'triglycerides'];
    const clusters = clusterStats.map(c => c.cluster || 'Unknown');

    // Group assessments by cluster
    const clusterAssessments = {};
    clusters.forEach(cluster => {
      clusterAssessments[cluster] = allAssessments.filter(a => (a.cluster || 'Unknown') === cluster);
    });

    // Calculate average for each biomarker per cluster
    return biomarkers.map(biomarker => {
      const row = { biomarker: biomarker.toUpperCase() };
      clusters.forEach(cluster => {
        const assessments = clusterAssessments[cluster] || [];
        if (assessments.length > 0) {
          const values = assessments.map(a => a[biomarker] || 0).filter(v => v > 0);
          row[cluster] = values.length > 0
            ? values.reduce((a, b) => a + b, 0) / values.length
            : 0;
        } else {
          row[cluster] = 0;
        }
      });
      return row;
    });
  }, [clusterStats, allAssessments]);

  // Biomarker trends data
  const biomarkerTrendsData = useMemo(() => {
    if (!trends.length) return [];
    return trends.map(t => ({
      period: t.label || '',
      hba1c: t.hba1c || 0,
      fbs: t.fbs || 0,
      cholesterol: t.cholesterol || 0,
      ldl: t.ldl || 0,
      hdl: t.hdl || 0,
      triglycerides: t.triglycerides || 0,
    }));
  }, [trends]);

  // Age distribution data
  const ageDistributionData = useMemo(() => {
    if (!allPatients.length) return [];

    const ageGroups = [
      { name: '<45', min: 0, max: 44 },
      { name: '45-54', min: 45, max: 54 },
      { name: '55-64', min: 55, max: 64 },
      { name: '65+', min: 65, max: 200 },
    ];

    return ageGroups.map(group => {
      const count = allPatients.filter(p => {
        const age = p.age || 0;
        return age >= group.min && age <= group.max;
      }).length;
      return { name: group.name, count };
    });
  }, [allPatients]);

  // Risk by age group
  const riskByAgeData = useMemo(() => {
    if (!allPatients.length || !allAssessments.length) return [];

    const ageGroups = [
      { name: '<45', min: 0, max: 44 },
      { name: '45-54', min: 45, max: 54 },
      { name: '55-64', min: 55, max: 64 },
      { name: '65+', min: 65, max: 200 },
    ];

    return ageGroups.map(group => {
      const patientsInGroup = allPatients.filter(p => {
        const age = p.age || 0;
        return age >= group.min && age <= group.max;
      });
      const patientIds = new Set(patientsInGroup.map(p => p.id));
      const assessmentsInGroup = allAssessments.filter(a => patientIds.has(a.patient_id));

      const low = assessmentsInGroup.filter(a => (a.risk_score || 0) < 34).length;
      const moderate = assessmentsInGroup.filter(a => (a.risk_score || 0) >= 34 && (a.risk_score || 0) < 67).length;
      const high = assessmentsInGroup.filter(a => (a.risk_score || 0) >= 67).length;

      return { name: group.name, low, moderate, high };
    });
  }, [allPatients, allAssessments]);

  // Key biomarkers per risk group
  const biomarkerImportance = useMemo(() => {
    if (!allAssessments.length) return { low: [], moderate: [], high: [] };

    const riskGroups = {
      low: allAssessments.filter(a => (a.risk_score || 0) < 34),
      moderate: allAssessments.filter(a => (a.risk_score || 0) >= 34 && (a.risk_score || 0) < 67),
      high: allAssessments.filter(a => (a.risk_score || 0) >= 67),
    };

    const calculateAvg = (assessments, key) => {
      const values = assessments.map(a => a[key] || 0).filter(v => v > 0);
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };

    const biomarkers = ['hba1c', 'fbs', 'cholesterol', 'ldl', 'hdl', 'triglycerides'];

    return Object.keys(riskGroups).reduce((acc, risk) => {
      acc[risk] = biomarkers.map(biomarker => ({
        name: biomarker.toUpperCase(),
        value: calculateAvg(riskGroups[risk], biomarker),
      })).sort((a, b) => b.value - a.value);
      return acc;
    }, {});
  }, [allAssessments]);

  // Risk interpretation text
  const riskInterpretation = useMemo(() => {
    if (!allAssessments.length) return null;

    const avgRisk = allAssessments.reduce((sum, a) => sum + (a.risk_score || 0), 0) / allAssessments.length;
    const dominantCluster = clusterStats.length > 0
      ? clusterStats.reduce((max, c) => (c.count > max.count ? c : max), clusterStats[0])
      : null;

    return {
      overallRisk: getRiskLevel(avgRisk),
      dominantCluster: dominantCluster?.cluster || 'N/A',
      avgRiskScore: avgRisk.toFixed(1),
      keyBiomarkers: biomarkerImportance.high.slice(0, 3).map(b => b.name).join(', '),
    };
  }, [allAssessments, clusterStats, biomarkerImportance]);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <header className="mb-2">
        <p className="text-slate-400 text-sm font-medium mb-1">Overview</p>
        <h2 className="text-3xl font-bold text-white">Overall Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">Current diabetes risk status of the population and how the system arrived at it</p>
      </header>

      {/* Welcome Banner - Only for new users */}
      {patientCount === 0 && !patientsLoading && (
        <div className="glass-card p-6 border border-teal-500/20">
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">Welcome to DIANA</h3>
            <p className="text-slate-300 text-sm mb-4 max-w-lg">
              Get started by creating your first patient assessment. Our ML-powered analysis identifies diabetes risk clusters for menopausal women.
            </p>
            <button
              onClick={onStartAssessment}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white
                         bg-gradient-to-r from-teal-500 to-cyan-500 
                         hover:from-teal-400 hover:to-cyan-400 
                         hover:shadow-lg hover:shadow-teal-500/25
                         transition-all duration-300"
            >
              Create First Assessment
              <ArrowRight size={16} />
            </button>
          </div>
          <Activity size={100} className="absolute -right-2 -bottom-2 text-teal-500/20" />
        </div>
      )}

      {/* A. Top-Level Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {analyticsLoading || patientsLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
            <div key={`sk-${idx}`} className="glass-card p-5 animate-pulse space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700" />
              <div className="h-6 w-16 bg-slate-700 rounded" />
              <div className="h-3 w-20 bg-slate-700 rounded" />
            </div>
          ))
          : summaryCards.map((stat, idx) => (
            <div
              key={idx}
              className="glass-card p-5 hover-lift animate-slide-up"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon size={20} style={{ color: stat.iconColor }} />
              </div>
              <h3 className="text-2xl font-bold text-white mt-3">{stat.value}</h3>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mt-1">{stat.label}</p>
            </div>
          ))}
      </div>

      {/* B. Risk Distribution Overview */}
      <div className="glass-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white">Risk Distribution Overview</h3>
          <div className="flex gap-2 items-center">
            <div className="flex gap-1 bg-slate-700/50 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('risk')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                  ${viewMode === 'risk' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                By Risk
              </button>
              <button
                onClick={() => setViewMode('age')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                  ${viewMode === 'age' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                By Age
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut Chart */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Risk Level Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Bar Chart */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Risk Count by Category</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="value" fill="#14B8A6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* C. Cluster Visualization Panel */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold text-white mb-6">Cluster Visualization Panel</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Cluster Bar Chart */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">Population per Cluster</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={clusterBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* 2D Cluster Plot */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-4">2D Cluster Plot (HbA1c vs FBS)</h4>
            <ResponsiveContainer width="100%" height={250}>
              {clusterScatterData.length > 0 ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" dataKey="x" name="HbA1c" unit="%" stroke="#64748B" style={{ fontSize: '11px' }} />
                  <YAxis type="number" dataKey="y" name="FBS" unit="mg/dL" stroke="#64748B" style={{ fontSize: '11px' }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  {clusterScatterData.map((cluster, idx) => (
                    <Scatter key={idx} name={cluster.name} data={cluster.data} fill={cluster.fill} />
                  ))}
                </ScatterChart>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <BarChart2 size={40} className="opacity-30 mb-3" />
                  <p className="text-sm font-medium">No cluster data</p>
                  <p className="text-xs mt-1">Complete assessments to see cluster visualization</p>
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
        {/* Heatmap */}
        <div className="border-t border-slate-600/30 pt-4 mb-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">Biomarkers vs Clusters Heatmap</h4>
          {heatmapData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-slate-400 font-semibold p-2">Biomarker</th>
                    {clusterStats.map((c, idx) => (
                      <th key={idx} className="text-center text-slate-400 font-semibold p-2">
                        {c.cluster || 'N/A'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapData.map((row, idx) => (
                    <tr key={idx} className="border-t border-slate-600/30">
                      <td className="text-slate-300 font-medium p-2">{row.biomarker}</td>
                      {clusterStats.map((c, cIdx) => {
                        const value = row[c.cluster] || 0;
                        const maxValue = Math.max(...heatmapData.flatMap(r =>
                          clusterStats.map(cl => r[cl.cluster] || 0)
                        ));
                        const intensity = maxValue > 0 ? (value / maxValue) * 100 : 0;
                        return (
                          <td key={cIdx} className="text-center p-2">
                            <div
                              className="inline-block px-3 py-1 rounded text-white font-semibold text-xs"
                              style={{
                                backgroundColor: `rgba(20, 184, 166, ${intensity / 100})`,
                                minWidth: '60px'
                              }}
                            >
                              {value.toFixed(1)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">
              <p className="text-sm">No heatmap data available</p>
            </div>
          )}
        </div>
        {/* Cluster Legend */}
        <div className="border-t border-slate-600/30 pt-4">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Cluster Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clusterStats.map((c, idx) => {
              // Determine risk level based on cluster type
              const clusterKey = (c.cluster || '').toUpperCase();
              let riskLevel = 'Moderate';
              if (['SIRD', 'SIDD'].includes(clusterKey)) {
                riskLevel = 'High';
              } else if (['MARD', 'MOD'].includes(clusterKey)) {
                riskLevel = 'Low';
              }

              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30"
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: clusterColor(c.cluster) }} />
                  <div>
                    <div className="text-sm font-semibold text-white">{c.cluster || 'N/A'}</div>
                    <div className="text-xs text-slate-400">Risk: {riskLevel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* D. Biomarker Trends & Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biomarker Trends */}
        <div className="glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Biomarker Trends</h3>
            <div className="flex gap-1 bg-slate-700/50 p-1 rounded-lg">
              {['hba1c', 'fbs', 'lipids'].map((marker) => (
                <button
                  key={marker}
                  onClick={() => setActiveBiomarker(marker)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all uppercase
                    ${activeBiomarker === marker
                      ? 'bg-slate-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'}`}
                >
                  {marker}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {biomarkerTrendsData.length > 0 ? (
              <LineChart data={biomarkerTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="period" stroke="#64748B" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend />
                {activeBiomarker === 'hba1c' && (
                  <Line type="monotone" dataKey="hba1c" stroke="#14B8A6" strokeWidth={2} name="HbA1c (%)" />
                )}
                {activeBiomarker === 'fbs' && (
                  <Line type="monotone" dataKey="fbs" stroke="#22D3EE" strokeWidth={2} name="FBS (mg/dL)" />
                )}
                {activeBiomarker === 'lipids' && (
                  <>
                    <Line type="monotone" dataKey="cholesterol" stroke="#8B5CF6" strokeWidth={2} name="Cholesterol" />
                    <Line type="monotone" dataKey="ldl" stroke="#F59E0B" strokeWidth={2} name="LDL" />
                    <Line type="monotone" dataKey="hdl" stroke="#10B981" strokeWidth={2} name="HDL" />
                    <Line type="monotone" dataKey="triglycerides" stroke="#F43F5E" strokeWidth={2} name="Triglycerides" />
                  </>
                )}
              </LineChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={40} className="opacity-30 mb-3" />
                <p className="text-sm font-medium">No trend data yet</p>
                <p className="text-xs mt-1">Complete assessments to see biomarker trends</p>
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Biomarker Contribution Summary */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-6">Biomarker Contribution Summary</h3>
          <div className="space-y-4">
            {['high', 'moderate', 'low'].map(riskLevel => (
              <div key={riskLevel} className="border border-slate-600/30 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-white mb-3 capitalize">{riskLevel} Risk Group</h4>
                <div className="space-y-2">
                  {biomarkerImportance[riskLevel]?.slice(0, 5).map((biomarker, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">{biomarker.name}</span>
                      <span className="text-xs font-semibold text-white">{biomarker.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* E. Demographic & Filter Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-slate-400" />
            <h3 className="text-lg font-bold text-white">Filters</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Risk Level</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="moderate">Moderate Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Age Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={ageRange.min}
                  onChange={(e) => setAgeRange({ ...ageRange, min: parseInt(e.target.value) || 0 })}
                  className="w-full bg-slate-700/50 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Min"
                />
                <input
                  type="number"
                  value={ageRange.max}
                  onChange={(e) => setAgeRange({ ...ageRange, max: parseInt(e.target.value) || 100 })}
                  className="w-full bg-slate-700/50 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="Max"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">Assessment Period</label>
              <select
                value={assessmentPeriod}
                onChange={(e) => setAssessmentPeriod(e.target.value)}
                className="w-full bg-slate-700/50 border border-slate-600/30 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Demographic Summary */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-6">Demographic Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Age Distribution */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Age Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ageDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748B" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#14B8A6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Risk by Age */}
            <div>
              <h4 className="text-sm font-semibold text-slate-300 mb-4">Risk Group Distribution by Age</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskByAgeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748B" style={{ fontSize: '11px' }} />
                  <YAxis stroke="#64748B" style={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="low" stackId="a" fill="#22D3EE" />
                  <Bar dataKey="moderate" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="high" stackId="a" fill="#F43F5E" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* F. Risk Interpretation Panel */}
      {riskInterpretation && (
        <div className="glass-card p-6 border border-teal-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Info size={18} className="text-teal-400" />
            <h3 className="text-lg font-bold text-white">Risk Interpretation</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Overall Risk Level</p>
                <p className="text-lg font-bold text-white">{riskInterpretation.overallRisk} Risk</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Average Risk Score</p>
                <p className="text-lg font-bold text-white">{riskInterpretation.avgRiskScore}%</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Dominant Cluster</p>
                <p className="text-lg font-bold text-white">{riskInterpretation.dominantCluster}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Key Contributing Biomarkers</p>
                <p className="text-lg font-bold text-white">{riskInterpretation.keyBiomarkers || 'N/A'}</p>
              </div>
            </div>
            <div className="border-t border-slate-600/30 pt-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                The population shows a <strong className="text-white">{riskInterpretation.overallRisk.toLowerCase()}</strong> overall diabetes risk
                with an average risk score of <strong className="text-white">{riskInterpretation.avgRiskScore}%</strong>.
                The dominant cluster identified is <strong className="text-white">{riskInterpretation.dominantCluster}</strong>,
                indicating specific metabolic patterns within the cohort. Key biomarkers contributing to risk assessment include
                <strong className="text-white"> {riskInterpretation.keyBiomarkers || 'various metabolic markers'}</strong>.
                This analysis helps identify patients who may benefit from targeted interventions and closer monitoring.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          className="px-6 py-3 rounded-xl text-teal-400 font-semibold text-sm hover:bg-teal-500/10 transition-colors flex items-center justify-center gap-2 glass-card"
          onClick={onNavigateToPatient}
        >
          View All Patients
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
