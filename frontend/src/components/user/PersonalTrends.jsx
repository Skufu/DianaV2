import React, { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Activity } from 'lucide-react';
import { getTrendsApi } from '../../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const PersonalTrends = ({ token, userId }) => {
  const [selectedMonths, setSelectedMonths] = useState(12);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getTrendsApi(selectedMonths);
        setTrends(data);
      } catch (err) {
        console.error('Failed to load trends:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [selectedMonths, token]);

  const timeOptions = [
    { value: 1, label: '1 Month' },
    { value: 3, label: '3 Months' },
    { value: 6, label: '6 Months' },
    { value: 12, label: '1 Year' },
    { value: 24, label: '2 Years' },
    { value: 60, label: '5 Years' },
    { value: 0, label: 'All Time' },
  ];

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading trends...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Health Trends</h1>
          <p className="text-slate-400">Track your health metrics over time</p>
        </div>
        <div className="flex gap-2">
          {timeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setSelectedMonths(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedMonths === option.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {trends?.biomarkerHistory && trends.biomarkerHistory.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">HbA1c Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends.biomarkerHistory}>
                <defs>
                  <linearGradient id="colorHba1c" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#E2E8F0' }}
                />
                <Area
                  type="monotone"
                  dataKey="hba1c"
                  stroke="#14B8A6"
                  fillOpacity={1}
                  fill="url(#colorHba1c)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trends?.biomarkerHistory && trends.biomarkerHistory.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Fasting Blood Sugar</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends.biomarkerHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#E2E8F0' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fbs"
                  stroke="#22D3EE"
                  strokeWidth={2}
                  dot={{ fill: '#22D3EE', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {trends?.clusterHistory && trends.clusterHistory.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Evolution</h2>
          <div className="space-y-3">
            {trends.clusterHistory.map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-slate-400" />
                  <span className="text-white text-sm">{entry.date}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-300 text-sm">{entry.cluster}</span>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      entry.riskScore < 34
                        ? 'bg-green-500/20 text-green-400'
                        : entry.riskScore < 67
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {entry.riskScore < 34
                      ? 'Low'
                      : entry.riskScore < 67
                      ? 'Moderate'
                      : 'High'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {trends?.riskLevels && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <Activity size={24} className="mx-auto text-green-400 mb-2" />
              <div className="text-3xl font-bold text-green-600">
                {trends.riskLevels?.low || 0}
              </div>
              <p className="text-sm text-green-700">Low Risk</p>
              <p className="text-xs text-gray-500">Score: 0-29</p>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Activity size={24} className="mx-auto text-yellow-400 mb-2" />
              <div className="text-3xl font-bold text-yellow-600">
                {trends.riskLevels?.medium || 0}
              </div>
              <p className="text-sm text-yellow-700">Moderate Risk</p>
              <p className="text-xs text-gray-500">Score: 30-69</p>
            </div>
            <div className="text-center p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <Activity size={24} className="mx-auto text-red-400 mb-2" />
              <div className="text-3xl font-bold text-red-600">
                {trends.riskLevels?.high || 0}
              </div>
              <p className="text-sm text-red-700">High Risk</p>
              <p className="text-xs text-gray-500">Score: 70+</p>
            </div>
          </div>
        </div>
      )}

      {!trends || (trends.biomarkerHistory?.length === 0 && !trends.riskLevels) && (
        <div className="text-center py-12 text-slate-400">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
          <p>No trend data available. Log your first assessment to start tracking.</p>
        </div>
      )}
    </div>
  );
};

export default PersonalTrends;
