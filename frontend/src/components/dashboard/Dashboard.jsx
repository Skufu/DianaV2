// Dashboard: Clinical Precision cohort overview with glass cards
import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertCircle, Droplet, Activity, Plus, ArrowRight, TrendingUp, BarChart2 } from 'lucide-react';
import { fetchClusterDistributionApi, fetchTrendAnalyticsApi } from '../../api';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const Dashboard = ({ token, patientCount = 0, onNavigateToPatient, onStartAssessment, loading: patientsLoading = false }) => {
  const [activeBiomarker, setActiveBiomarker] = useState('hba1c');
  const [clusterStats, setClusterStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setAnalyticsLoading(true);
      setError(null);
      try {
        const [clusters, trendData] = await Promise.all([
          fetchClusterDistributionApi(token),
          fetchTrendAnalyticsApi(token),
        ]);
        setClusterStats(clusters || []);
        setTrends(trendData || []);
      } catch (_) {
        setError('Unable to load analytics data');
      } finally {
        setAnalyticsLoading(false);
      }
    };
    load();
  }, [token]);

  const stats = useMemo(() => {
    const highRisk =
      clusterStats
        .filter((c) => ['SIRD', 'SIDD'].includes((c.cluster || '').toUpperCase()))
        .reduce((sum, c) => sum + (c.count || 0), 0) || 0;
    const avgHbA1c = trends.length
      ? (trends.reduce((s, t) => s + (t.hba1c || 0), 0) / trends.length).toFixed(1)
      : '—';
    const avgFBS = trends.length
      ? Math.round(trends.reduce((s, t) => s + (t.fbs || 0), 0) / trends.length)
      : '—';
    return [
      { label: 'Total Patients', value: patientCount || '0', icon: Users, iconColor: '#14B8A6', bg: 'bg-teal-500/10' },
      { label: 'High Risk', value: highRisk.toString(), icon: AlertCircle, iconColor: '#F43F5E', bg: 'bg-rose-500/10' },
      { label: 'Avg HbA1c', value: `${avgHbA1c}%`, icon: Droplet, iconColor: '#F59E0B', bg: 'bg-amber-500/10' },
      { label: 'Avg FBS', value: avgFBS === '—' ? '—' : `${avgFBS}`, icon: Activity, iconColor: '#22D3EE', bg: 'bg-cyan-500/10' },
    ];
  }, [clusterStats, trends, patientCount]);

  const totalClusterCount = useMemo(
    () => clusterStats.reduce((sum, c) => sum + (c.count || 0), 0),
    [clusterStats],
  );
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

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <header className="mb-2">
        <p className="text-slate-400 text-sm font-medium mb-1">Overview</p>
        <h2 className="text-3xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">Patient cohort analytics and risk cluster distribution</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* New Assessment Card */}
        <div
          onClick={onStartAssessment}
          className="sm:col-span-1 p-5 rounded-2xl cursor-pointer transition-all duration-300 hover-lift
                     bg-gradient-to-br from-teal-500 to-cyan-500 text-white"
        >
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
            <Plus size={20} />
          </div>
          <h3 className="font-semibold text-base">New Assessment</h3>
          <p className="text-xs text-white/70 mt-1">Start analysis</p>
        </div>

        {/* Stat Cards */}
        {analyticsLoading || patientsLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
            <div key={`sk-${idx}`} className="glass-card p-5 animate-pulse space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-700" />
              <div className="h-6 w-16 bg-slate-700 rounded" />
              <div className="h-3 w-20 bg-slate-700 rounded" />
            </div>
          ))
          : stats.map((stat, idx) => (
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biomarker Trends */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Biomarker Trends</h3>
            <div className="flex gap-1 bg-slate-700/50 p-1 rounded-lg">
              {['hba1c', 'fbs'].map((marker) => (
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
          <ResponsiveContainer width="100%" height={260}>
            {trends.length > 0 ? (
              <AreaChart data={trends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHbA1c" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFBS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#64748B" style={{ fontSize: '11px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
                  }}
                />
                {activeBiomarker === 'hba1c' && (
                  <Area
                    type="monotone"
                    dataKey="hba1c"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHbA1c)"
                    name="HbA1c (%)"
                  />
                )}
                {activeBiomarker === 'fbs' && (
                  <Area
                    type="monotone"
                    dataKey="fbs"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFBS)"
                    name="FBS (mg/dL)"
                  />
                )}
              </AreaChart>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <TrendingUp size={40} className="opacity-30 mb-3" />
                <p className="text-sm font-medium">No trend data yet</p>
                <p className="text-xs mt-1">Complete assessments to see biomarker trends</p>
              </div>
            )}
          </ResponsiveContainer>
        </div>
        {/* Cluster Distribution */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Cluster Distribution</h3>
            {analyticsLoading && <span className="text-xs text-slate-400">Loading…</span>}
            {error && !analyticsLoading && <span className="text-xs text-rose-400">Failed</span>}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {clusterStats.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={clusterStats.map(c => ({ name: c.cluster || 'Unknown', value: c.count || 0 }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {clusterStats.map((c, idx) => (
                        <Cell key={`cell-${idx}`} fill={clusterColor(c.cluster)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                  {clusterStats.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-700/30 border border-slate-600/30"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: clusterColor(c.cluster) }} />
                        <span className="text-xs font-semibold text-slate-300">{c.cluster || 'N/A'}</span>
                      </div>
                      <span className="text-xs font-bold text-white">{c.count ?? 0}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-4 pt-4 border-t border-slate-600/30 w-full">
                  <span className="text-2xl font-bold text-white">{totalClusterCount}</span>
                  <span className="text-xs uppercase text-slate-400 ml-2">Total Assessments</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 py-8">
                <BarChart2 size={40} className="opacity-30 mb-3" />
                <p className="text-sm font-medium">No cluster data</p>
                <p className="text-xs mt-1 text-center">Assessments will be grouped into risk clusters</p>
              </div>
            )}
          </div>

          <button
            className="w-full mt-4 py-3 rounded-xl text-teal-400 font-semibold text-sm hover:bg-teal-500/10 transition-colors flex items-center justify-center gap-2"
            onClick={onNavigateToPatient}
          >
            View All Patients
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

