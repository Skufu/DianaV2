import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const RiskFactorChart = React.memo(({ riskFactorImportance }) => {
  // Animation enabled by default

  if (!riskFactorImportance || riskFactorImportance.length === 0) {
    return (
      <div className="w-full h-[350px] flex items-center justify-center text-slate-400">
        No risk factor data available
      </div>
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
          Risk Factor Importance
        </h3>
        <p className="text-diana-text-secondary text-sm mt-2">
          Feature importance ranking based on contribution to T2DM risk prediction
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={riskFactorImportance}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" domain={[0, 0.3]} />
          <YAxis
            type="category"
            dataKey="factor"
            stroke="#64748b"
            style={{ fontSize: '14px', fontWeight: 600, fill: '#475569' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              color: '#0f172a',
            }}
            formatter={value => [`${(value * 100).toFixed(1)}%`, 'Importance']}
            cursor={{ fill: '#f1f5f9' }}
          />
          <Bar dataKey="importance" radius={[0, 8, 8, 0]} isAnimationActive={true}>
            {riskFactorImportance.map(entry => (
              <Cell key={entry.factor} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
});

RiskFactorChart.displayName = 'RiskFactorChart';

export default RiskFactorChart;
