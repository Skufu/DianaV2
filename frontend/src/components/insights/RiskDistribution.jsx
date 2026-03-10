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

const RiskDistribution = React.memo(({ data = [] }) => {
  // Animation enabled by default

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
        <h3 className="text-2xl font-serif font-bold text-diana-text-primary">Risk Distribution</h3>
        <p className="text-diana-text-secondary text-sm mt-2">
          Breakdown of patient assessments by risk category
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {data.length > 0 && data.some(r => r.value > 0) ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: '#0f172a',
              }}
              formatter={(value, name, props) => [
                `${value} patients (${props.payload.percentage}%)`,
                'Count',
              ]}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={true}>
              {data.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No risk distribution data available
          </div>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
});

RiskDistribution.displayName = 'RiskDistribution';

export default RiskDistribution;
