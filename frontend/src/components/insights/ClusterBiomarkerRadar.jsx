import React, { useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const subgroupInfo = {
  SIRD: { name: 'Severe Insulin-Resistant', color: '#FFB547' },
  SIDD: { name: 'Severe Insulin-Deficient', color: '#EE5D50' },
  MOD: { name: 'Mild Obesity-Related', color: '#6AD2FF' },
  MARD: { name: 'Mild Age-Related', color: '#05CD99' },
};

const ClusterBiomarkerRadar = React.memo(({ clusterProfiles = null, isLoading = false }) => {
  // Transform the cluster profile data into a format suitable for Recharts Radar
  const radarData = useMemo(() => {
    if (!clusterProfiles || !clusterProfiles.cluster_profiles) return [];

    // The ML API returns data like:
    // "cluster_profiles": {
    //   "SIRD": { "means": { "bmi": 32.5, "triglycerides": 250, ... } }, ...
    // }

    // We want an array of metrics where each metric has a value for every cluster:
    // [
    //   { metric: "BMI", SIRD: 32.5, SIDD: 24.1, MARD: 26.2, MOD: 31.0, fullMark: 40 },
    //   { metric: "Trigs", SIRD: 250, SIDD: 180, MARD: 140, MOD: 160, fullMark: 300 }, ...
    // ]

    const profiles = clusterProfiles.cluster_profiles;

    // Define the metrics we want to visualize, with human-readable names
    // scaled down/up if necessary to make the radar chart look balanced,
    // though Recharts can handle varying scales if we use multiple axes or
    // normalize the data. We'll simply use raw values since Recharts automatically
    // scales the polar radius axis, but we may need to normalize them to 0-100%
    // of the maximum value across all clusters so the chart isn't dominated by
    // Triglycerides (which can be 200+) vs Age (which is ~50).

    const metrics = [
      { key: 'bmi', label: 'BMI' },
      { key: 'triglycerides', label: 'Triglycerides' },
      { key: 'ldl', label: 'LDL Chol.' },
      { key: 'hdl', label: 'HDL Chol.' },
      { key: 'age', label: 'Age' },
      { key: 'waist_circumference', label: 'Waist Circ.' },
    ];

    const subgroups = Object.keys(profiles);
    if (subgroups.length === 0) return [];

    // Calculate maximums for normalization
    const maxVals = {};
    metrics.forEach(m => {
      let max = 0;
      subgroups.forEach(sg => {
        const val = profiles[sg]?.means?.[m.key] || 0;
        if (val > max) max = val;
      });
      maxVals[m.key] = max;
    });

    // Create normalized data points (0-100 scale relative to the max of that metric)
    // We store both the raw value (for tooltips) and the normalized value (for plotting)
    return metrics.map(m => {
      const dataPoint = {
        metric: m.label,
        fullMark: 100,
      };

      subgroups.forEach(sg => {
        const rawVal = profiles[sg]?.means?.[m.key] || 0;
        const maxVal = maxVals[m.key] || 1;

        // Plot value is percentage of max
        dataPoint[sg] = (rawVal / maxVal) * 100;
        // Keep raw value for tooltips
        dataPoint[`${sg}_raw`] = Number(rawVal.toFixed(1));
      });

      return dataPoint;
    });
  }, [clusterProfiles]);

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

  if (!radarData || radarData.length === 0) {
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
          <h3 className="text-2xl font-bold text-white">Cluster Biomarker Profiles</h3>
          <p className="text-slate-400 text-sm mt-2">Ahlqvist subtype clinical characteristics</p>
        </div>
        <div className="text-center py-12 text-slate-400">
          ML cluster analysis data unavailable. Ensure the model has been trained on clinical data.
        </div>
      </motion.div>
    );
  }

  const activeClusters = Object.keys(clusterProfiles?.cluster_profiles || {});

  // Custom tooltip to show raw values instead of the 0-100 normalized plotting values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
          <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
          {payload.map(entry => {
            // Retrieve the raw value we tucked into the data object earlier
            const rawVal = entry.payload[`${entry.dataKey}_raw`];
            return (
              <div
                key={`${entry.dataKey}-${entry.color}`}
                className="flex items-center gap-2 text-sm my-1"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600">
                  {subgroupInfo[entry.dataKey]?.name || entry.dataKey}:
                </span>
                <span className="font-bold text-slate-800">{rawVal}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.3 }}
      whileHover="hover"
      className="glass-card p-8 bg-white border border-diana-stone/50 h-full flex flex-col"
    >
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Activity size={28} className="text-diana-forest" />
          <h3 className="text-2xl font-serif font-bold text-diana-text-primary">
            Metabolic Signatures
          </h3>
        </div>
        <p className="text-diana-text-secondary text-sm mt-2">
          Normalized biomarker shapes for each Ahlqvist Subtype (100 = Highest Group Mean)
        </p>
      </div>

      <div className="flex-1 min-h-[400px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
            />
            {/* Hide the radius axis since it's just 0-100 normalized scores */}
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />

            {activeClusters.map(cluster => (
              <Radar
                key={cluster}
                name={subgroupInfo[cluster]?.name || cluster}
                dataKey={cluster}
                stroke={subgroupInfo[cluster]?.color || '#8884d8'}
                fill={subgroupInfo[cluster]?.color || '#8884d8'}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}

            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
});

ClusterBiomarkerRadar.displayName = 'ClusterBiomarkerRadar';

export default ClusterBiomarkerRadar;
