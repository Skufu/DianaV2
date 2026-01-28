import React from 'react';
import {
  ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts';

const BMIGlucoseCorrelation = React.memo(({ data = [] }) => {

  return (
    <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white">BMI vs Glucose Correlation</h3>
        <p className="text-slate-400 text-sm mt-2">
          Scatter plot showing relationship between BMI and fasting blood sugar
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        {data.length > 0 ? (
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis
              type="number"
              dataKey="bmi"
              name="BMI"
              stroke="#94A3B8"
              label={{ value: 'BMI (kg/m²)', position: 'insideBottom', offset: -10, fill: "#94A3B8" }}
            />
            <YAxis
              type="number"
              dataKey="fbs"
              name="FBS"
              stroke="#94A3B8"
              label={{ value: 'FBS (mg/dL)', angle: -90, position: 'insideLeft', fill: "#94A3B8" }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: '#1B2559',
                border: 'none',
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value, name) => {
                if (name === 'BMI') return [value.toFixed(1), 'BMI'];
                if (name === 'FBS') return [value.toFixed(1), 'FBS'];
                return [value, name];
              }}
            />
            <Scatter name="Patients" data={data} fill="#14B8A6" isAnimationActive={true} />
          </ScatterChart>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            No correlation data available
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
});

BMIGlucoseCorrelation.displayName = 'BMIGlucoseCorrelation';

export default BMIGlucoseCorrelation;
