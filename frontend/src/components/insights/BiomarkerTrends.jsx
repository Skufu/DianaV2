import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const BiomarkerTrends = React.memo(({ trends = [] }) => {
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
          Biomarker Trends Over Time
        </h3>
        <p className="text-diana-text-secondary text-sm mt-2">
          Monthly averages of key biomarkers across the cohort
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {trends.length > 0 ? (
          <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
            <YAxis stroke="#64748b" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: '#0f172a',
              }}
            />
            <Legend iconType="circle" />
            <Line
              type="monotone"
              dataKey="hba1c"
              stroke="#0B215E"
              strokeWidth={3}
              name="HbA1c (%)"
              dot={{ fill: '#0B215E', r: 5, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
            <Line
              type="monotone"
              dataKey="fbs"
              stroke="#06b6d4"
              strokeWidth={3}
              name="FBS (mg/dL)"
              dot={{ fill: '#06b6d4', r: 5, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No trend data available
          </div>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
});

BiomarkerTrends.displayName = 'BiomarkerTrends';

export default BiomarkerTrends;
