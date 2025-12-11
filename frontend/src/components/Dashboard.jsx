import React, { useEffect, useMemo, useState } from 'react';
import { Users, AlertCircle, Droplet, Activity, Plus, ArrowRight } from 'lucide-react';
import { fetchClusterDistributionApi, fetchTrendAnalyticsApi } from '../api';

const Dashboard = ({ token, patientCount = 0, onNavigateToPatient, onStartAssessment }) => {
  const [activeBiomarker, setActiveBiomarker] = useState('hba1c');
  const [clusterStats, setClusterStats] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
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
        setLoading(false);
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

  const trendBars = useMemo(() => {
    if (!trends.length) return [40, 65, 55, 80, 45, 90];
    const max = Math.max(...trends.map((t) => t.hba1c || 0), 1);
    return trends.map((t) => Math.min(100, Math.round(((t.hba1c || 0) / max) * 100)));
  }, [trends]);

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
        {stats.map((stat, idx) => (
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
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-[#1B2559]">Biomarker Trends (Cohort)</h3>
            <div className="flex gap-2 bg-[#F4F7FE] p-1 rounded-lg">
              {['hba1c', 'fbs', 'estradiol'].map((marker) => (
                <button
                  key={marker}
                  onClick={() => setActiveBiomarker(marker)}
                  className={`px-3 py-1 text-sm font-bold rounded-md transition-all uppercase ${
                    activeBiomarker === marker ? 'bg-white text-[#1B2559] shadow-sm' : 'text-[#A3AED0] hover:text-[#1B2559]'
                  }`}
                >
                  {marker}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full relative">
            <div className="absolute inset-0 flex items-end justify-between px-2">
              {trendBars.map((h, i) => (
                <div key={i} className="w-full mx-1 group relative">
                  <div
                    className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                    style={{
                      height: `${h}%`,
                      backgroundColor: activeBiomarker === 'hba1c' ? '#4318FF' : activeBiomarker === 'fbs' ? '#6AD2FF' : '#FFB547',
                    }}
                  ></div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1B2559] text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {h / 10}%
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-full h-px bg-[#E0E5F2] border-t border-dashed border-[#E0E5F2]"></div>
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-4 text-[#A3AED0] text-xs font-medium uppercase tracking-wider">
            <span>Jan</span>
            <span>Dec</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm flex flex-col border border-[#E0E5F2]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-[#1B2559]">Cluster Distribution</h3>
            {loading && <span className="text-xs text-[#A3AED0]">Loading…</span>}
            {error && !loading && <span className="text-xs text-[#EE5D50]">Failed to load</span>}
          </div>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 flex items-center justify-center relative">
              <div className="w-48 h-48 rounded-full border-[16px] border-[#F4F7FE] flex items-center justify-center relative overflow-hidden">
                <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center z-10 shadow-inner">
                  <span className="text-2xl font-bold text-[#1B2559]">{totalClusterCount}</span>
                  <span className="text-[10px] uppercase text-[#A3AED0]">Assessments</span>
                </div>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {clusterStats.length ? (
                clusterStats.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E0E5F2] animate-scale-in"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: clusterColor(c.cluster) }}></div>
                      <span className="text-sm font-bold text-[#1B2559]">{c.cluster || 'Unknown'}</span>
                    </div>
                    <span className="text-sm font-semibold text-[#4318FF]">{c.count ?? 0}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[#A3AED0]">No cluster data yet.</div>
              )}
            </div>
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

