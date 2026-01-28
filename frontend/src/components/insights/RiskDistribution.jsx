import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const RiskDistribution = React.memo(({ data = [] }) => {
  // Animation enabled by default

  return (
    <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Risk Distribution</h3>
        <p className="text-slate-400 text-sm mt-2">
          Breakdown of patient assessments by risk category
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {data.length > 0 && data.some(r => r.value > 0) ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
            <YAxis stroke="#94A3B8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B2559',
                border: 'none',
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value, name, props) => [
                `${value} patients (${props.payload.percentage}%)`,
                'Count'
              ]}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={true}>
              {data.map((entry) => (
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
    </div>
  );
});

RiskDistribution.displayName = 'RiskDistribution';

export default RiskDistribution;
