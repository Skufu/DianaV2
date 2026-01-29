import React from 'react';

const InsightsHeader = ({ loading, error }) => (
  <div className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-8 md:p-10 text-white shadow-xl relative overflow-hidden mb-8">
    <div className="relative z-10">
      <h4 className="text-blue-200 font-bold uppercase tracking-wider text-sm mb-2">Insights & Clustering</h4>
      <h2 className="text-3xl md:text-4xl font-serif font-bold mb-3">Advanced Insights</h2>
      <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
        Cohort-level analysis including risk factors, clustering, and biomarker correlations
      </p>
    </div>
    <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
    <div className="absolute bottom-0 right-20 w-40 h-40 bg-blue-400/20 rounded-full blur-2xl -mb-10 pointer-events-none" />
    
    {loading && (
      <div className="absolute top-6 right-6">
        <span className="text-sm font-bold text-white/80 animate-pulse">Loading analysis...</span>
      </div>
    )}
    {error && !loading && (
      <div className="absolute top-6 right-6">
        <span className="text-sm font-bold text-rose-200 bg-rose-500/20 px-3 py-1 rounded-lg border border-rose-400/30">{error}</span>
      </div>
    )}
  </div>
);

InsightsHeader.displayName = 'InsightsHeader';

export default InsightsHeader;
