import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';

const subgroupInfo = {
  'SIDD': { name: 'Severe Insulin-Deficient Diabetes', color: '#EE5D50', description: 'Early onset, low BMI, poor metabolic control' },
  'SIRD': { name: 'Severe Insulin-Resistant Diabetes', color: '#FFB547', description: 'High insulin resistance, high risk of kidney disease' },
  'MOD': { name: 'Mild Obesity-Related Diabetes', color: '#6AD2FF', description: 'High BMI but relatively normal metabolic state' },
  'MARD': { name: 'Mild Age-Related Diabetes', color: '#05CD99', description: 'Older onset, modest metabolic derangements' }
};

const clusterColor = (label) => {
  const key = (label || '').toUpperCase();
  return subgroupInfo[key]?.color || '#A3AED0';
};

const SubgroupDistribution = React.memo(({ clusters = [], isLoading = false }) => {
  // Animation enabled by default

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="w-48 h-7 bg-slate-600 animate-pulse rounded mb-2" />
        <div className="w-96 h-5 bg-slate-600 animate-pulse rounded mb-6" />
        <div className="w-full h-[300px] bg-slate-700/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-600/30">
              <div className="w-32 h-4 bg-slate-600 animate-pulse rounded mb-2" />
              <div className="w-24 h-3 bg-slate-600 animate-pulse rounded mb-2" />
              <div className="w-16 h-8 bg-slate-600 animate-pulse rounded" />
              <div className="w-full h-12 bg-slate-600 animate-pulse rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!clusters || clusters.length === 0) {
    return (
      <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white">T2DM Subgroups (Novel Clustering)</h3>
          <p className="text-slate-400 text-sm mt-2">
            Distribution across four diabetes subgroups based on Ahlqvist et al. classification
          </p>
        </div>
        <div className="text-center py-12 text-slate-400">
          No clustering data available. Complete patient assessments to see subgroup distribution.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">T2DM Subgroups (Novel Clustering)</h3>
        <p className="text-slate-400 text-sm mt-2">
          Distribution across four diabetes subgroups based on Ahlqvist et al. classification
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={clusters.map(c => ({
              name: c.cluster || 'Unknown',
              value: c.count || 0,
              fullName: subgroupInfo[c.cluster?.toUpperCase()]?.name || c.cluster
            }))}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
          >
            {clusters.map((c) => (
              <Cell key={c.cluster} fill={clusterColor(c.cluster)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#1B2559',
              border: 'none',
              borderRadius: '12px',
              color: '#fff'
            }}
            formatter={(value, name, props) => {
              const total = clusters.reduce((sum, c) => sum + (c.count || 0), 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return [`${value} patients (${percentage}%)`, props.payload?.fullName || name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {Object.entries(subgroupInfo).map(([key, info]) => {
          const clusterData = clusters.find(c => c.cluster?.toUpperCase() === key);
          const count = clusterData?.count || 0;

          return (
            <div key={key} className="p-4 rounded-xl border border-slate-600/30 hover:border-teal-500 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: info.color }}
                  />
                  <div>
                    <h4 className="font-bold text-white">{key}</h4>
                    <p className="text-xs text-slate-400 font-medium">{info.name}</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-teal-400">{count}</span>
              </div>
              <p className="text-sm text-slate-400 mt-2">{info.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

SubgroupDistribution.displayName = 'SubgroupDistribution';

export default SubgroupDistribution;
