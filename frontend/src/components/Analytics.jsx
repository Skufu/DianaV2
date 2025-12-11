import React, { useEffect, useState } from 'react';
import { fetchClusterDistributionApi, fetchTrendAnalyticsApi } from '../api';

const Analytics = ({ token }) => {
  const [clusters, setClusters] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, t] = await Promise.all([fetchClusterDistributionApi(token), fetchTrendAnalyticsApi(token)]);
        setClusters(c || []);
        setTrends(t || []);
      } catch (err) {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h4 className="text-[#707EAE] font-medium text-sm mb-1">Insights & Clustering</h4>
          <h2 className="text-3xl font-bold text-[#1B2559]">Analytics</h2>
          <p className="text-[#A3AED0] text-sm mt-1">Informational trends to review with your provider.</p>
        </div>
        {loading && <span className="text-xs text-[#A3AED0]">Loading…</span>}
        {error && !loading && <span className="text-xs text-[#EE5D50]">{error}</span>}
      </header>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2] text-[#1B2559] animate-fade-in">
        <h3 className="text-xl font-bold mb-4">Cluster Distribution</h3>
        {clusters.length === 0 ? (
          <p className="text-sm text-[#707EAE]">No data yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {clusters.map((c, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-[#E0E5F2] flex items-center justify-between">
                <span className="font-semibold">{c.cluster || 'Unknown'}</span>
                <span className="text-[#4318FF] font-bold">{c.count ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2] text-[#1B2559] animate-fade-in">
        <h3 className="text-xl font-bold mb-4">Biomarker Trends</h3>
        {trends.length === 0 ? (
          <p className="text-sm text-[#707EAE]">No data yet.</p>
        ) : (
          <div className="space-y-2">
            {trends.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-[#E0E5F2]">
                <div className="text-sm text-[#707EAE]">{t.label}</div>
                <div className="flex gap-4 text-sm font-semibold">
                  <span className="text-[#4318FF]">HbA1c: {t.hba1c?.toFixed ? t.hba1c.toFixed(1) : t.hba1c}</span>
                  <span className="text-[#05CD99]">FBS: {t.fbs}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;

