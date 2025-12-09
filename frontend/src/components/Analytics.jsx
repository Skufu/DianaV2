import React from 'react';

const Analytics = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h4 className="text-[#707EAE] font-medium text-sm mb-1">Insights & Clustering</h4>
          <h2 className="text-3xl font-bold text-[#1B2559]">Analytics</h2>
        </div>
      </header>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2] text-[#1B2559]">
        <p className="text-sm text-[#707EAE]">Analytics endpoints available; wire charts to backend aggregations if needed.</p>
      </div>
    </div>
  );
};

export default Analytics;

