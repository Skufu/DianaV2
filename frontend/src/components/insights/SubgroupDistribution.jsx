import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { cardVariants, staggerContainer, slideUp } from '../../utils/animations';

const subgroupInfo = {
  SIDD: {
    name: 'Atherogenic / Lipid-Driven Diabetes',
    color: '#EE5D50',
    description: 'High LDL, severe dyslipidemia, atherogenic phenotype',
  },
  SIRD: {
    name: 'Severe Insulin-Resistant Diabetes',
    color: '#FFB547',
    description: 'High insulin resistance, high risk of kidney disease',
  },
  MOD: {
    name: 'Mild Obesity-Related Diabetes',
    color: '#6AD2FF',
    description: 'High BMI but relatively normal metabolic state',
  },
  MARD: {
    name: 'Mild Age-Related Diabetes',
    color: '#05CD99',
    description: 'Older onset, modest metabolic derangements',
  },
};

const clusterColor = label => {
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
          {[1, 2, 3, 4].map(i => (
            <div key={`skeleton-${i}`} className="p-4 rounded-xl border border-slate-600/30">
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
      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30"
      >
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-white">T2DM Subgroups (Novel Clustering)</h3>
          <p className="text-slate-400 text-sm mt-2">
            Distribution across four diabetes subgroups based on Ahlqvist et al. classification
          </p>
        </div>
        <div className="text-center py-12 text-slate-400">
          No clustering data available. Complete patient assessments to see subgroup distribution.
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
        <h3 className="text-2xl font-serif font-bold text-diana-text-primary">
          T2DM Subgroups (Novel Clustering)
        </h3>
        <p className="text-diana-text-secondary text-sm mt-2">
          Distribution across four diabetes subgroups based on Ahlqvist et al. classification
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={clusters.map(c => ({
              name: c.cluster || 'Unknown',
              value: c.count || 0,
              fullName: subgroupInfo[c.cluster?.toUpperCase()]?.name || c.cluster,
            }))}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={entry => `${entry.name}: ${entry.value}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            isAnimationActive={true}
          >
            {clusters.map(c => (
              <Cell key={c.cluster} fill={clusterColor(c.cluster)} stroke="#fff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#0f172a',
            }}
            itemStyle={{ color: '#0f172a' }}
            formatter={(value, name, props) => {
              const total = clusters.reduce((sum, c) => sum + (c.count || 0), 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return [`${value} patients (${percentage}%)`, props.payload?.fullName || name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
      >
        {Object.entries(subgroupInfo).map(([key, info], index) => {
          const clusterData = clusters.find(c => c.cluster?.toUpperCase() === key);
          const count = clusterData?.count || 0;
          const imagePath = `/src/assets/clusters/${key.toLowerCase()}.png`;

          return (
            <motion.div
              variants={slideUp}
              whileHover={{ scale: 1.02, borderColor: 'rgba(75, 85, 99, 0.5)' }}
              key={key}
              className="glass-card bg-white rounded-3xl border-2 transition-all cursor-pointer border-diana-sand hover:border-diana-forest/50"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={imagePath}
                      alt={`${key} logo`}
                      className="w-12 h-12 rounded-2xl object-cover"
                      loading="lazy"
                      decoding="async"
                      width="48"
                      height="48"
                    />
                    <div>
                      <h4 className="font-bold text-diana-text-primary">{key}</h4>
                      <p className="text-xs text-diana-text-muted">{info.name}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-diana-forest">{count}</span>
                </div>
                <p className="text-diana-text-secondary text-sm">{info.description}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
});

SubgroupDistribution.displayName = 'SubgroupDistribution';

export default SubgroupDistribution;
