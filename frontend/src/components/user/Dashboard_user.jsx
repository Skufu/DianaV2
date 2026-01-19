import React, { useEffect, useState } from 'react';
import { Activity, TrendingUp, AlertCircle, Plus, Download } from 'lucide-react';
import RiskIndicator from '../common/RiskIndicator';
import { getAssessmentsApi } from '../../api';

const Dashboard_user = ({ token, userId }) => {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await getAssessmentsApi(token);
        setAssessments(data || []);
        setLatestAssessment(data && data.length > 0 ? data[0] : null);
      } catch (err) {
        setError('Failed to load assessments');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-teal-100">
          {latestAssessment
            ? 'Your latest assessment has been analyzed. Review your results below.'
            : 'Start your first health assessment to get personalized insights.'}
        </p>
      </div>

      {loading && (
        <div className="text-center py-12 text-slate-400">Loading your health data...</div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Activity size={20} className="text-teal-400" />
                </div>
                <span className="text-slate-300 font-medium">Assessments</span>
              </div>
              <div className="text-3xl font-bold text-white">{assessments.length}</div>
              <div className="text-sm text-slate-400 mt-1">Total logged</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <TrendingUp size={20} className="text-cyan-400" />
                </div>
                <span className="text-slate-300 font-medium">Risk Level</span>
              </div>
              {latestAssessment ? (
                <RiskIndicator riskScore={latestAssessment.risk_score || 0} />
              ) : (
                <div className="text-slate-400 text-sm">No data yet</div>
              )}
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle size={20} className="text-amber-400" />
                </div>
                <span className="text-slate-300 font-medium">Status</span>
              </div>
              <div className="text-lg font-semibold text-white">
                {latestAssessment?.risk_score >= 67
                  ? 'High Risk'
                  : latestAssessment?.risk_score >= 34
                  ? 'Moderate Risk'
                  : latestAssessment
                  ? 'Low Risk'
                  : 'No Assessment'}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {latestAssessment ? 'Based on latest results' : 'Log your first assessment'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 text-left hover:border-teal-500/50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 transition-colors">
                  <Plus size={24} className="text-teal-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Log Assessment</h3>
                  <p className="text-sm text-slate-400">Record new health measurements and get AI-powered insights</p>
                </div>
              </div>
            </button>

            <button className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 text-left hover:border-teal-500/50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                  <TrendingUp size={24} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">View Trends</h3>
                  <p className="text-sm text-slate-400">Track your health progress over time with detailed charts</p>
                </div>
              </div>
            </button>

            <button className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 text-left hover:border-teal-500/50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                  <Download size={24} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">Export Health Report</h3>
                  <p className="text-sm text-slate-400">Download a comprehensive PDF of your health data</p>
                </div>
              </div>
            </button>

            <button className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 text-left hover:border-teal-500/50 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                  <Activity size={24} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">My Profile</h3>
                  <p className="text-sm text-slate-400">Update your health information and preferences</p>
                </div>
              </div>
            </button>
          </div>

          {latestAssessment && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Latest Assessment</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-400 mb-1">HbA1c</div>
                  <div className="text-2xl font-bold text-white">
                    {latestAssessment.hba1c}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">FBS</div>
                  <div className="text-2xl font-bold text-white">
                    {latestAssessment.fbs} mg/dL
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Cholesterol</div>
                  <div className="text-2xl font-bold text-white">
                    {latestAssessment.cholesterol} mg/dL
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">Cluster</div>
                  <div className="text-xl font-bold text-teal-400">
                    {latestAssessment.cluster || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard_user;
