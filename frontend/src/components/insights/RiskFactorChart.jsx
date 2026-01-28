import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

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
    <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Risk Factor Importance</h3>
        <p className="text-slate-400 text-sm mt-2">
          Feature importance ranking based on contribution to T2DM risk prediction
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={riskFactorImportance}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis type="number" stroke="#94A3B8" domain={[0, 0.3]} />
          <YAxis type="category" dataKey="factor" stroke="#94A3B8" style={{ fontSize: '14px', fontWeight: 600 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1B2559',
              border: 'none',
              borderRadius: '12px',
              color: '#fff'
            }}
            formatter={(value) => `${(value * 100).toFixed(1)}%`}
          />
          <Bar dataKey="importance" radius={[0, 8, 8, 0]} isAnimationActive={true}>
            {riskFactorImportance.map((entry) => (
              <Cell key={entry.factor} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

RiskFactorChart.displayName = 'RiskFactorChart';

export default RiskFactorChart;
