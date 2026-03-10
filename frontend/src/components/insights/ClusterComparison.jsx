import React, { useMemo } from 'react';
import { Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const subgroupInfo = {
  SIDD: {
    name: 'Atherogenic / Lipid-Driven Diabetes',
    color: '#EE5D50',
    description: 'Early onset, low BMI, poor metabolic control',
    characteristics: [
      'Low insulin production',
      'Younger age group',
      'Lower BMI',
      'Higher HbA1c',
      'Insulin dependence',
    ],
  },
  SIRD: {
    name: 'Severe Insulin-Resistant Diabetes',
    color: '#FFB547',
    description: 'High insulin resistance, high risk of kidney disease',
    characteristics: [
      'High insulin resistance',
      'Elevated BMI',
      'Kidney disease risk',
      'Fatty liver',
      'Metabolic syndrome',
    ],
  },
  MOD: {
    name: 'Mild Obesity-Related Diabetes',
    color: '#6AD2FF',
    description: 'High BMI but relatively normal metabolic state',
    characteristics: [
      'Obesity-driven',
      'Normal insulin sensitivity',
      'Good metabolic control',
      'Lifestyle-responsive',
      'Lower complications',
    ],
  },
  MARD: {
    name: 'Mild Age-Related Diabetes',
    color: '#05CD99',
    description: 'Older onset, modest metabolic derangements',
    characteristics: [
      'Later onset (>60)',
      'Mild metabolic changes',
      'Slow progression',
      'Multiple comorbidities',
      'Polypharmacy common',
    ],
  },
};

const ClusterComparison = React.memo(({ clusters = [], isLoading = false }) => {
  const clusterData = useMemo(() => {
    if (!clusters || clusters.length === 0) {
      return Object.keys(subgroupInfo).map(key => ({
        key,
        ...subgroupInfo[key],
        count: 0,
      }));
    }

    return Object.keys(subgroupInfo).map(key => {
      const cluster = clusters.find(c => c.cluster?.toUpperCase() === key);
      return {
        key,
        ...subgroupInfo[key],
        count: cluster?.count || 0,
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
      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30"
      >
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white">Cluster Comparison</h3>
          <p className="text-slate-400 text-sm mt-2">Comparative analysis of T2DM subgroups</p>
        </div>
        <div className="text-center py-12 text-slate-400">
          No clustering data available. Complete patient assessments to see cluster comparison.
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.3 }}
      whileHover="hover"
      className="glass-card p-8 bg-white border border-diana-stone/50"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Layers size={28} className="text-diana-forest" />
          <h3 className="text-2xl font-serif font-bold text-diana-text-primary">
            Cluster Comparison
          </h3>
        </div>
        <p className="text-diana-text-secondary text-sm mt-2">
          Comparative analysis of T2DM subgroups based on Ahlqvist et al. classification
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-diana-stone">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-diana-stone/30 text-diana-text-secondary border-b border-diana-stone">
              <th className="text-left py-4 px-6 font-bold uppercase tracking-wider">Cluster</th>
              <th className="text-left py-4 px-6 font-bold uppercase tracking-wider">
                Description
              </th>
              <th className="text-left py-4 px-6 font-bold uppercase tracking-wider">
                Key Characteristics
              </th>
              <th className="text-right py-4 px-6 font-bold uppercase tracking-wider">
                Patient Count
              </th>
            </tr>
          </thead>
          <tbody>
            {clusterData.map(cluster => (
              <tr
                key={`${cluster.key}-${cluster.count}`}
                className="border-b border-diana-stone last:border-0 hover:bg-blue-50/50 transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: cluster.color }}
                    />
                    <div>
                      <div className="font-bold text-diana-text-primary">{cluster.key}</div>
                      <div className="text-xs text-diana-text-secondary font-medium">
                        {cluster.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-diana-text-secondary">{cluster.description}</td>
                <td className="py-4 px-6">
                  <ul className="space-y-1.5">
                    {cluster.characteristics.map(char => (
                      <li
                        key={`${cluster.key}-${char}`}
                        className="text-diana-text-secondary text-xs flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-diana-lime-dark flex-shrink-0" />
                        {char}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="text-2xl font-bold text-diana-forest">{cluster.count}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 p-6 bg-blue-50/50 rounded-xl border border-blue-100">
        <p className="text-sm text-diana-text-secondary">
          <span className="font-bold text-diana-forest">Clinical Note:</span> These subgroups
          represent distinct phenotypes of type 2 diabetes with different etiologies, complications,
          and treatment responses. Understanding a patient&apos;s subgroup can inform personalized
          treatment strategies.
        </p>
      </div>
    </motion.div>
  );
});

ClusterComparison.displayName = 'ClusterComparison';

export default ClusterComparison;
