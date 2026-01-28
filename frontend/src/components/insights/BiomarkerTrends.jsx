import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

const BiomarkerTrends = React.memo(({ trends = [] }) => {

  return (
    <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">Biomarker Trends Over Time</h3>
        <p className="text-slate-400 text-sm mt-2">
          Monthly averages of key biomarkers across the cohort
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {trends.length > 0 ? (
          <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="label" stroke="#94A3B8" style={{ fontSize: '12px', fontWeight: 600 }} />
            <YAxis stroke="#94A3B8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B2559',
                border: 'none',
                borderRadius: '12px',
                color: '#fff'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="hba1c"
              stroke="#14B8A6"
              strokeWidth={3}
              name="HbA1c (%)"
              dot={{ fill: '#4318FF', r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="fbs"
              stroke="#6AD2FF"
              strokeWidth={3}
              name="FBS (mg/dL)"
              dot={{ fill: '#6AD2FF', r: 5 }}
            />
          </LineChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No trend data available
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
});

BiomarkerTrends.displayName = 'BiomarkerTrends';

export default BiomarkerTrends;
