import React from 'react';

const InsightsHeader = ({ loading, error }) => (
  <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
    <div>
      <h4 className="text-slate-400 font-medium text-sm mb-1">Insights & Clustering</h4>
      <h2 className="text-3xl font-bold text-white">Advanced Insights</h2>
      <p className="text-slate-400 text-sm mt-1">
        Cohort-level analysis including risk factors, clustering, and biomarker correlations
      </p>
    </div>
    {loading && <span className="text-xs text-slate-400">Loading…</span>}
    {error && !loading && <span className="text-xs text-rose-400">{error}</span>}
  </header>
);

InsightsHeader.displayName = 'InsightsHeader';

export default InsightsHeader;
