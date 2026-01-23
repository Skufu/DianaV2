import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';

const subgroupInfo = {
  'SIDD': {
    name: 'Severe Insulin-Deficient Diabetes',
    color: '#EE5D50',
    description: 'Early onset, low BMI, poor metabolic control',
    characteristics: [
      'Low insulin production',
      'Younger age group',
      'Lower BMI',
      'Higher HbA1c',
      'Insulin dependence'
    ]
  },
  'SIRD': {
    name: 'Severe Insulin-Resistant Diabetes',
    color: '#FFB547',
    description: 'High insulin resistance, high risk of kidney disease',
    characteristics: [
      'High insulin resistance',
      'Elevated BMI',
      'Kidney disease risk',
      'Fatty liver',
      'Metabolic syndrome'
    ]
  },
  'MOD': {
    name: 'Mild Obesity-Related Diabetes',
    color: '#6AD2FF',
    description: 'High BMI but relatively normal metabolic state',
    characteristics: [
      'Obesity-driven',
      'Normal insulin sensitivity',
      'Good metabolic control',
      'Lifestyle-responsive',
      'Lower complications'
    ]
  },
  'MARD': {
    name: 'Mild Age-Related Diabetes',
    color: '#05CD99',
    description: 'Older onset, modest metabolic derangements',
    characteristics: [
      'Later onset (>60)',
      'Mild metabolic changes',
      'Slow progression',
      'Multiple comorbidities',
      'Polypharmacy common'
    ]
  }
};

const ClusterComparison = React.memo(({ clusters = [], isLoading = false }) => {
  const clusterData = useMemo(() => {
    if (!clusters || clusters.length === 0) {
      return Object.keys(subgroupInfo).map(key => ({
        key,
        ...subgroupInfo[key],
        count: 0
      }));
    }

    return Object.keys(subgroupInfo).map(key => {
      const cluster = clusters.find(c => c.cluster?.toUpperCase() === key);
      return {
        key,
        ...subgroupInfo[key],
        count: cluster?.count || 0
      };
    });
  }, [clusters]);

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-7 h-7 rounded-full bg-slate-600 animate-pulse" />
          <div className="w-48 h-7 bg-slate-600 animate-pulse rounded" />
        </div>
        <div className="w-full h-[400px] bg-slate-700/30 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!clusterData || clusterData.length === 0) {
    return (
      <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white">Cluster Comparison</h3>
          <p className="text-slate-400 text-sm mt-2">
            Comparative analysis of T2DM subgroups
          </p>
        </div>
        <div className="text-center py-12 text-slate-400">
          No clustering data available. Complete patient assessments to see cluster comparison.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Layers size={28} className="text-teal-400" />
          <h3 className="text-2xl font-bold text-white">Cluster Comparison</h3>
        </div>
        <p className="text-slate-400 text-sm mt-2">
          Comparative analysis of T2DM subgroups based on Ahlqvist et al. classification
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-600/50">
              <th className="text-left py-3 px-4">Cluster</th>
              <th className="text-left py-3 px-4">Description</th>
              <th className="text-left py-3 px-4">Key Characteristics</th>
              <th className="text-right py-3 px-4">Patient Count</th>
            </tr>
          </thead>
          <tbody>
            {clusterData.map((cluster, index) => (
              <tr
                key={cluster.key}
                className={`border-b border-slate-700/50 text-white hover:bg-slate-700/20 transition-colors ${
                  index % 2 === 0 ? 'bg-slate-800/10' : ''
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cluster.color }}
                    />
                    <div>
                      <div className="font-bold">{cluster.key}</div>
                      <div className="text-xs text-slate-400">{cluster.name}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-300">
                  {cluster.description}
                </td>
                <td className="py-3 px-4">
                  <ul className="space-y-1">
                    {cluster.characteristics.map((char, i) => (
                      <li key={i} className="text-slate-400 text-xs flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-teal-400 flex-shrink-0" />
                        {char}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-2xl font-bold text-teal-400">{cluster.count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-white">Clinical Note:</span> These subgroups represent distinct phenotypes of type 2 diabetes with different etiologies, complications, and treatment responses. Understanding a patient's subgroup can inform personalized treatment strategies.
        </p>
      </div>
    </div>
  );
});

ClusterComparison.displayName = 'ClusterComparison';

export default ClusterComparison;
