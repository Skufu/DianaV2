import React from 'react';
import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const BMIGlucoseCorrelation = React.memo(({ data = [] }) => {
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
          BMI vs Glucose Correlation
        </h3>
        <p className="text-diana-text-secondary text-sm mt-2">
          Scatter plot showing relationship between BMI and fasting blood sugar
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {data.length > 0 ? (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="bmi"
              name="BMI"
              stroke="#64748b"
              label={{
                value: 'BMI (kg/m²)',
                position: 'insideBottom',
                offset: -10,
                fill: '#64748b',
              }}
            />
            <YAxis
              type="number"
              dataKey="fbs"
              name="FBS"
              stroke="#64748b"
              label={{ value: 'FBS (mg/dL)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                color: '#0f172a',
              }}
              formatter={(value, name) => {
                if (name === 'BMI') return [value.toFixed(1), 'BMI'];
                if (name === 'FBS') return [value.toFixed(1), 'FBS'];
                return [value, name];
              }}
            />
            <Scatter name="Patients" data={data} fill="#0B215E" isAnimationActive={true} />
          </ScatterChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No correlation data available
          </div>
        )}
      </ResponsiveContainer>
    </motion.div>
  );
});

BMIGlucoseCorrelation.displayName = 'BMIGlucoseCorrelation';

export default BMIGlucoseCorrelation;
