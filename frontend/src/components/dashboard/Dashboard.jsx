// Dashboard: cohort overview cards, biomarker trends, cluster distribution.
import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertCircle, Droplet, Activity, Plus, ArrowRight } from 'lucide-react';
import { fetchClusterDistributionApi, fetchTrendAnalyticsApi } from '../../api';
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
        .filter((c) => ['SOIRD', 'SIDD'].includes((c.cluster || '').toUpperCase()))
        .reduce((sum, c) => sum + (c.count || 0), 0) || 0;
    const avgHbA1c = trends.length
      ? (trends.reduce((s, t) => s + (t.hba1c || 0), 0) / trends.length).toFixed(1)
      : '—';
    const avgFBS = trends.length
      ? Math.round(trends.reduce((s, t) => s + (t.fbs || 0), 0) / trends.length)
      : '—';
    return [
      { label: 'Total Patients', value: patientCount || '0', icon: Users, trend: '', iconColor: '#4318FF', bg: '#F4F7FE' },
      { label: 'High Risk (SOIRD/SIDD)', value: highRisk.toString(), icon: AlertCircle, trend: '', iconColor: '#EE5D50', bg: '#FFF5F5' },
      { label: 'Avg HbA1c', value: `${avgHbA1c}%`, icon: Droplet, trend: '', iconColor: '#FFB547', bg: '#FFF9EB' },
      { label: 'Avg FBS', value: avgFBS === '—' ? '—' : `${avgFBS}`, icon: Activity, trend: '', iconColor: '#05CD99', bg: '#E6FBF5' },
    ];
  }, [clusterStats, trends, patientCount]);

  const totalClusterCount = useMemo(
    () => clusterStats.reduce((sum, c) => sum + (c.count || 0), 0),
    [clusterStats],
  );
  const clusterColor = (label) => {
    const key = (label || '').toUpperCase();
    switch (key) {
      case 'SOIRD':
        return '#EE5D50';
      case 'SIDD':
        return '#FFB547';
      case 'MARD':
        return '#6AD2FF';
      case 'MIDD':
        return '#4318FF';
      default:
        return '#A3AED0';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end pb-2">
        <div>
          <h4 className="text-[#707EAE] font-medium text-sm mb-1">Overview</h4>
          <h2 className="text-3xl font-bold text-[#1B2559]">Dashboard</h2>
          <p className="text-[#A3AED0] text-sm mt-1">For menopausal women: review assessments, track trends, then consult your provider.</p>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div
          onClick={onStartAssessment}
          className="lg:col-span-1 bg-gradient-to-br from-[#4318FF] to-[#6AD2FF] p-6 rounded-3xl shadow-lg cursor-pointer hover:scale-105 transition-transform flex flex-col justify-center items-center text-white text-center group"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3 group-hover:bg-white/30 transition-colors">
            <Plus size={24} />
          </div>
          <h3 className="font-bold text-lg">New Patient Assessment</h3>
          <p className="text-xs opacity-80 mt-2">Start a cluster-based analysis</p>
        </div>
        {analyticsLoading || patientsLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
            <div key={`sk-${idx}`} className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2] animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full bg-[#E0E5F2]" />
                <div className="h-4 w-10 bg-[#E0E5F2] rounded" />
              </div>
              <div className="h-6 w-16 bg-[#E0E5F2] rounded" />
              <div className="h-3 w-24 bg-[#E0E5F2] rounded" />
            </div>
          ))
          : stats.map((stat, idx) => (
            <div
              key={idx}
              className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between border border-[#E0E5F2] animate-slide-up"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: stat.bg, color: stat.iconColor }}>
                  <stat.icon size={20} />
                </div>
                <span className="text-xs font-bold text-[#05CD99] bg-[#E6FBF5] px-2 py-1 rounded-md">{stat.trend}</span>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-bold text-[#1B2559]">{stat.value}</h3>
                <p className="text-[#A3AED0] text-xs font-medium uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#1B2559]">Biomarker Trends (Cohort)</h3>
            <div className="flex gap-2 bg-[#F4F7FE] p-1 rounded-lg">
              {['hba1c', 'fbs'].map((marker) => (
                <button
                  key={marker}
                  onClick={() => setActiveBiomarker(marker)}
                  className={`px-3 py-1 text-sm font-bold rounded-md transition-all uppercase ${activeBiomarker === marker ? 'bg-white text-[#1B2559] shadow-sm' : 'text-[#A3AED0] hover:text-[#1B2559]'
                    }`}
                >
                  {marker}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {trends.length > 0 ? (
              <AreaChart
                data={trends}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorHbA1c" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4318FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4318FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFBS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6AD2FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6AD2FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
                <XAxis
                  dataKey="label"
                  stroke="#A3AED0"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                />
                <YAxis
                  stroke="#A3AED0"
                  style={{ fontSize: '12px', fontWeight: 600 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1B2559',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                    padding: '10px'
                  }}
                  labelStyle={{ color: '#A3AED0', marginBottom: '5px' }}
                />
                {activeBiomarker === 'hba1c' && (
                  <Area
                    type="monotone"
                    dataKey="hba1c"
                    stroke="#4318FF"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorHbA1c)"
                    name="HbA1c (%)"
                  />
                )}
                {activeBiomarker === 'fbs' && (
                  <Area
                    type="monotone"
                    dataKey="fbs"
                    stroke="#6AD2FF"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorFBS)"
                    name="FBS (mg/dL)"
                  />
                )}
              </AreaChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A3AED0] text-sm">
                No trend data available
              </div>
            )}
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm flex flex-col border border-[#E0E5F2]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-[#1B2559]">Cluster Distribution</h3>
            {analyticsLoading && <span className="text-xs text-[#A3AED0]">Loading…</span>}
            {error && !analyticsLoading && <span className="text-xs text-[#EE5D50]">Failed to load</span>}
          </div>
          <div className="flex flex-col items-center">
            {clusterStats.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={clusterStats.map(c => ({ name: c.cluster || 'Unknown', value: c.count || 0 }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      labelLine={{ stroke: '#A3AED0', strokeWidth: 1 }}
                    >
                      {clusterStats.map((c, idx) => (
                        <Cell key={`cell-${idx}`} fill={clusterColor(c.cluster)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1B2559',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                  {clusterStats.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E0E5F2] animate-scale-in"
                      style={{ animationDelay: `${idx * 60}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: clusterColor(c.cluster) }}></div>
                        <span className="text-sm font-bold text-[#1B2559]">{c.cluster || 'Unknown'}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#4318FF]">{c.count ?? 0}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-4">
                  <span className="text-2xl font-bold text-[#1B2559]">{totalClusterCount}</span>
                  <span className="text-xs uppercase text-[#A3AED0] ml-2">Total Assessments</span>
                </div>
              </>
            ) : (
              <div className="text-sm text-[#A3AED0] py-12">No cluster data yet.</div>
            )}
          </div>
          <button
            className="w-full text-[#4318FF] font-bold flex items-center justify-center gap-2 mt-4 hover:underline"
            onClick={onNavigateToPatient}
          >
            View Patients
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

