import React from 'react';
import { Users, Activity, BarChart3 } from 'lucide-react';

const InsightsSummary = ({ totalAssessments, avgRiskScore, clusterCount }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
          <Users className="text-teal-400" size={24} />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white">{totalAssessments}</h3>
      <p className="text-slate-400 text-sm mt-1">Total Assessments</p>
    </div>

    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
          <Activity className="text-rose-400" size={24} />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white">{avgRiskScore}%</h3>
      <p className="text-slate-400 text-sm mt-1">Average Risk Score</p>
    </div>

    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <BarChart3 className="text-emerald-400" size={24} />
        </div>
      </div>
      <h3 className="text-3xl font-bold text-white">{clusterCount}</h3>
      <p className="text-slate-400 text-sm mt-1">Risk Clusters</p>
    </div>
  </div>
);

InsightsSummary.displayName = 'InsightsSummary';

export default InsightsSummary;
