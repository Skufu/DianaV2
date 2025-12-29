// Analytics: comprehensive cohort-level analytics with multiple visualizations
import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchClusterDistributionApi, fetchTrendAnalyticsApi, fetchPatientsApi, fetchAssessmentsApi,
  fetchMLMetricsApi, fetchMLInformationGainApi, fetchMLClustersApi, getMLVisualizationUrl
} from '../../api';
import {
  BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, Activity, Users, BarChart3, Brain, Target, Layers, AlertCircle, Image } from 'lucide-react';

// Loading Skeleton Component
const LoadingSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#E0E5F2] rounded-xl ${className}`} />
);

// ML Loading Skeleton for the metrics section
const MLMetricsSkeleton = () => (
  <div className="bg-gradient-to-br from-[#4318FF] to-[#7C3AED] p-8 rounded-3xl shadow-lg">
    <div className="flex items-center gap-3 mb-6">
      <LoadingSkeleton className="w-7 h-7 rounded-full !bg-white/20" />
      <LoadingSkeleton className="w-48 h-7 !bg-white/20" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white/10 p-4 rounded-2xl">
          <LoadingSkeleton className="w-20 h-4 mb-2 !bg-white/20" />
          <LoadingSkeleton className="w-16 h-6 !bg-white/20" />
        </div>
      ))}
    </div>
  </div>
);

// Visualization Card with loading/error states
const VisualizationCard = ({ title, visualizationName }) => {
  const [status, setStatus] = useState('loading'); // 'loading', 'loaded', 'error'

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2]">
      <h3 className="text-xl font-bold text-[#1B2559] mb-4">{title}</h3>
      {status === 'loading' && (
        <LoadingSkeleton className="w-full h-64" />
      )}
      <img
        src={getMLVisualizationUrl(visualizationName)}
        alt={title}
        className={`w-full rounded-xl ${status !== 'loaded' ? 'hidden' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
      />
      {status === 'error' && (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-[#F4F7FE] rounded-xl text-[#A3AED0]">
          <Image size={48} className="mb-3 opacity-40" />
          <p className="font-medium">Visualization Unavailable</p>
          <p className="text-sm mt-1">ML server may be offline</p>
        </div>
      )}
    </div>
  );
};

// Format metric value - shows N/A if null/undefined
const formatMetric = (value, isPercentage = false, decimals = 1) => {
  if (value === null || value === undefined) return 'N/A';
  return isPercentage ? `${(value * 100).toFixed(decimals)}%` : value.toFixed(decimals);
};

// Helper to get ML metrics from either clinical or ada_baseline response
const getMLMetrics = (mlMetrics) => {
  if (!mlMetrics) return null;
  // Prefer clinical model, fallback to ada_baseline
  return mlMetrics.clinical?.best_model ? mlMetrics.clinical : mlMetrics.ada_baseline;
};

const Analytics = ({ token, patients = [] }) => {
  const [clusters, setClusters] = useState([]);
  const [trends, setTrends] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ML Model state
  const [mlMetrics, setMlMetrics] = useState(null);
  const [mlIG, setMlIG] = useState(null);
  const [mlClusters, setMlClusters] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);


  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [c, t] = await Promise.all([
          fetchClusterDistributionApi(token),
          fetchTrendAnalyticsApi(token)
        ]);
        setClusters(c || []);
        setTrends(t || []);

        // Fetch all patient assessments for advanced analytics
        const patientData = await fetchPatientsApi(token);
        if (patientData && patientData.length > 0) {
          const assessmentPromises = patientData.map(p =>
            fetchAssessmentsApi(token, p.id).catch(() => [])
          );
          const assessmentArrays = await Promise.all(assessmentPromises);
          const flatAssessments = assessmentArrays.flat().filter(a => a != null);
          setAllAssessments(flatAssessments);
        }
      } catch (err) {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Load ML model data
  useEffect(() => {
    const loadML = async () => {
      setMlLoading(true);
      setMlError(null);
      try {
        const [metrics, ig, clusters] = await Promise.all([
          fetchMLMetricsApi().catch(() => null),
          fetchMLInformationGainApi().catch(() => null),
          fetchMLClustersApi().catch(() => null)
        ]);
        setMlMetrics(metrics);
        setMlIG(ig);
        setMlClusters(clusters);
        // Check if all ML data failed
        if (!metrics && !ig && !clusters) {
          setMlError('ML server is unavailable. Some analytics may be limited.');
        }
      } catch (err) {
        console.error('Failed to load ML data:', err);
        setMlError('Failed to connect to ML server');
      } finally {
        setMlLoading(false);
      }
    };
    loadML();
  }, []);

  // Calculate risk factor importance from real IG data or fallback to mock
  const riskFactorImportance = useMemo(() => {
    if (mlIG && mlIG.feature_ranking) {
      const colors = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#64748B', '#6366F1'];
      return mlIG.feature_ranking.map((item, i) => ({
        factor: item.feature.charAt(0).toUpperCase() + item.feature.slice(1),
        importance: item.ig,
        color: colors[i % colors.length]
      }));
    }
    // Fallback mock data
    return [
      { factor: 'HbA1c', importance: 0.28, color: '#7C3AED' },
      { factor: 'FBS', importance: 0.25, color: '#06B6D4' },
      { factor: 'BMI', importance: 0.18, color: '#10B981' },
      { factor: 'Age', importance: 0.12, color: '#F59E0B' },
      { factor: 'Blood Pressure', importance: 0.10, color: '#F43F5E' },
      { factor: 'Physical Activity', importance: 0.07, color: '#64748B' }
    ];
  }, [mlIG]);

  // BMI vs Glucose correlation data
  const bmiGlucoseData = useMemo(() => {
    if (!allAssessments.length || !patients.length) return [];

    return allAssessments
      .map(assessment => {
        const patient = patients.find(p => p.id === assessment.patient_id);
        if (!patient || !patient.bmi || !assessment.fbs) return null;

        return {
          bmi: parseFloat(patient.bmi),
          fbs: parseFloat(assessment.fbs),
          hba1c: parseFloat(assessment.hba1c) || 0,
          risk: assessment.risk_score || 0
        };
      })
      .filter(Boolean)
      .slice(0, 50); // Limit to 50 points for performance
  }, [allAssessments, patients]);

  // Risk distribution
  const riskDistribution = useMemo(() => {
    if (!allAssessments.length) return [];

    const lowRisk = allAssessments.filter(a => (a.risk_score || 0) < 34).length;
    const moderateRisk = allAssessments.filter(a => (a.risk_score || 0) >= 34 && (a.risk_score || 0) < 67).length;
    const highRisk = allAssessments.filter(a => (a.risk_score || 0) >= 67).length;

    return [
      { name: 'Low Risk', value: lowRisk, color: '#6AD2FF', percentage: ((lowRisk / allAssessments.length) * 100).toFixed(1) },
      { name: 'Moderate Risk', value: moderateRisk, color: '#FFB547', percentage: ((moderateRisk / allAssessments.length) * 100).toFixed(1) },
      { name: 'High Risk', value: highRisk, color: '#EE5D50', percentage: ((highRisk / allAssessments.length) * 100).toFixed(1) }
    ];
  }, [allAssessments]);

  // T2DM Subgroup descriptions
  const subgroupInfo = {
    'SIDD': { name: 'Severe Insulin-Deficient Diabetes', color: '#EE5D50', description: 'Early onset, low BMI, poor metabolic control' },
    'SIRD': { name: 'Severe Insulin-Resistant Diabetes', color: '#FFB547', description: 'High insulin resistance, high risk of kidney disease' },
    'MOD': { name: 'Mild Obesity-Related Diabetes', color: '#6AD2FF', description: 'High BMI but relatively normal metabolic state' },
    'MARD': { name: 'Mild Age-Related Diabetes', color: '#05CD99', description: 'Older onset, modest metabolic derangements' }
  };

  const clusterColor = (label) => {
    const key = (label || '').toUpperCase();
    return subgroupInfo[key]?.color || '#A3AED0';
  };

  const totalAssessments = allAssessments.length;
  const avgRiskScore = allAssessments.length > 0
    ? (allAssessments.reduce((sum, a) => sum + (a.risk_score || 0), 0) / allAssessments.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h4 className="text-[#707EAE] font-medium text-sm mb-1">Insights & Clustering</h4>
          <h2 className="text-3xl font-bold text-[#1B2559]">Advanced Analytics</h2>
          <p className="text-[#A3AED0] text-sm mt-1">
            Cohort-level analysis including risk factors, clustering, and biomarker correlations
          </p>
        </div>
        {loading && <span className="text-xs text-[#A3AED0]">Loading…</span>}
        {error && !loading && <span className="text-xs text-[#EE5D50]">{error}</span>}
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-[#F4F7FE] flex items-center justify-center">
              <Users className="text-[#4318FF]" size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#1B2559]">{totalAssessments}</h3>
          <p className="text-[#A3AED0] text-sm mt-1">Total Assessments</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-[#FFF5F5] flex items-center justify-center">
              <Activity className="text-[#EE5D50]" size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#1B2559]">{avgRiskScore}%</h3>
          <p className="text-[#A3AED0] text-sm mt-1">Average Risk Score</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-[#E6FBF5] flex items-center justify-center">
              <BarChart3 className="text-[#05CD99]" size={24} />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-[#1B2559]">{mlClusters?.n_clusters || clusters.length || 3}</h3>
          <p className="text-[#A3AED0] text-sm mt-1">Risk Clusters</p>
        </div>
      </div>

      {/* ML Error Banner */}
      {mlError && !mlLoading && (
        <div className="bg-[#FFF5F5] border border-[#EE5D50]/30 p-4 rounded-2xl flex items-center gap-3 text-[#EE5D50]">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{mlError}</span>
        </div>
      )}

      {/* ML Loading Skeleton */}
      {mlLoading && <MLMetricsSkeleton />}

      {/* ML Model Performance Dashboard */}
      {!mlLoading && mlMetrics && (() => {
        const metrics = getMLMetrics(mlMetrics);
        const modelComparison = mlMetrics.clinical?.model_comparison || mlMetrics.ada_baseline?.model_comparison || [];
        return (
          <div className="bg-gradient-to-br from-[#4318FF] to-[#7C3AED] p-8 rounded-3xl shadow-lg text-white">
            <div className="flex items-center gap-3 mb-6">
              <Brain size={28} />
              <h3 className="text-2xl font-bold">ML Model Performance</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Best Model</p>
                <p className="text-xl font-bold">
                  {typeof metrics?.best_model === 'string'
                    ? metrics.best_model
                    : (metrics?.best_model?.model_type || metrics?.model_type || 'N/A')}
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">Accuracy</p>
                <p className="text-xl font-bold">
                  {formatMetric(metrics?.metrics?.accuracy, true)}
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">AUC-ROC</p>
                <p className="text-xl font-bold">
                  {formatMetric(metrics?.metrics?.auc_roc, false, 3)}
                </p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <p className="text-white/70 text-sm mb-1">F1-Score</p>
                <p className="text-xl font-bold">
                  {formatMetric(metrics?.metrics?.f1_score, true)}
                </p>
              </div>
            </div>

            {/* Model Comparison Table */}
            {modelComparison.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-white/70 border-b border-white/20">
                      <th className="text-left py-2">Model</th>
                      <th className="text-right py-2">Accuracy</th>
                      <th className="text-right py-2">Precision</th>
                      <th className="text-right py-2">Recall</th>
                      <th className="text-right py-2">AUC-ROC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelComparison.map((m, i) => (
                      <tr key={i} className="border-b border-white/10">
                        <td className="py-2 font-medium">{m.Model}</td>
                        <td className="text-right py-2">{formatMetric(m.Accuracy, true)}</td>
                        <td className="text-right py-2">{formatMetric(m.Precision, true)}</td>
                        <td className="text-right py-2">{formatMetric(m.Recall, true)}</td>
                        <td className="text-right py-2">{formatMetric(m['AUC-ROC'], false, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ML Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisualizationCard title="ROC Curve" visualizationName="roc_curve" />
        <VisualizationCard title="Confusion Matrix" visualizationName="confusion_matrix" />
      </div>

      {/* Cluster Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisualizationCard title="Cluster Heatmap" visualizationName="cluster_heatmap" />
        <VisualizationCard title="Cluster Distribution" visualizationName="cluster_distribution" />
      </div>

      {/* Risk Factor Importance Chart */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[#1B2559]">Risk Factor Importance</h3>
          <p className="text-[#A3AED0] text-sm mt-2">
            Feature importance ranking based on contribution to T2DM risk prediction
          </p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={riskFactorImportance}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
            <XAxis type="number" stroke="#A3AED0" domain={[0, 0.3]} />
            <YAxis type="category" dataKey="factor" stroke="#A3AED0" style={{ fontSize: '14px', fontWeight: 600 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1B2559',
                border: 'none',
                borderRadius: '12px',
                color: '#fff'
              }}
              formatter={(value) => `${(value * 100).toFixed(1)}%`}
            />
            <Bar dataKey="importance" radius={[0, 8, 8, 0]}>
              {riskFactorImportance.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BMI vs Glucose Correlation */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#1B2559]">BMI vs Glucose Correlation</h3>
            <p className="text-[#A3AED0] text-sm mt-2">
              Scatter plot showing relationship between BMI and fasting blood sugar
            </p>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            {bmiGlucoseData.length > 0 ? (
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
                <XAxis
                  type="number"
                  dataKey="bmi"
                  name="BMI"
                  stroke="#A3AED0"
                  label={{ value: 'BMI (kg/m²)', position: 'insideBottom', offset: -10, fill: '#A3AED0' }}
                />
                <YAxis
                  type="number"
                  dataKey="fbs"
                  name="FBS"
                  stroke="#A3AED0"
                  label={{ value: 'FBS (mg/dL)', angle: -90, position: 'insideLeft', fill: '#A3AED0' }}
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
                <Scatter name="Patients" data={bmiGlucoseData} fill="#4318FF" />
              </ScatterChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A3AED0]">
                No correlation data available
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-[#1B2559]">Risk Distribution</h3>
            <p className="text-[#A3AED0] text-sm mt-2">
              Breakdown of patient assessments by risk category
            </p>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            {riskDistribution.length > 0 && riskDistribution.some(r => r.value > 0) ? (
              <BarChart data={riskDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
                <XAxis dataKey="name" stroke="#A3AED0" style={{ fontSize: '12px', fontWeight: 600 }} />
                <YAxis stroke="#A3AED0" />
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
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#A3AED0]">
                No risk distribution data available
              </div>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* T2DM Subgroups (Clustering) */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[#1B2559]">T2DM Subgroups (Novel Clustering)</h3>
          <p className="text-[#A3AED0] text-sm mt-2">
            Distribution across four diabetes subgroups based on Ahlqvist et al. classification
          </p>
        </div>

        {clusters.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={clusters.map(c => ({
                    name: c.cluster || 'Unknown',
                    value: c.count || 0,
                    fullName: subgroupInfo[c.cluster?.toUpperCase()]?.name || c.cluster
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {clusters.map((c, index) => (
                    <Cell key={`cell-${index}`} fill={clusterColor(c.cluster)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1B2559',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value, name, props) => {
                    const total = clusters.reduce((sum, c) => sum + (c.count || 0), 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                    return [`${value} patients (${percentage}%)`, props.payload?.fullName || name];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {Object.entries(subgroupInfo).map(([key, info]) => {
                const clusterData = clusters.find(c => c.cluster?.toUpperCase() === key);
                const count = clusterData?.count || 0;

                return (
                  <div key={key} className="p-4 rounded-xl border-2 border-[#E0E5F2] hover:border-[#4318FF] transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <div>
                          <h4 className="font-bold text-[#1B2559]">{key}</h4>
                          <p className="text-xs text-[#707EAE] font-medium">{info.name}</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-[#4318FF]">{count}</span>
                    </div>
                    <p className="text-sm text-[#A3AED0] mt-2">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-[#A3AED0]">
            No clustering data available. Complete patient assessments to see subgroup distribution.
          </div>
        )}
      </div>

      {/* Biomarker Trends */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[#1B2559]">Biomarker Trends Over Time</h3>
          <p className="text-[#A3AED0] text-sm mt-2">
            Monthly averages of key biomarkers across the cohort
          </p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          {trends.length > 0 ? (
            <LineChart data={trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
              <XAxis dataKey="label" stroke="#A3AED0" style={{ fontSize: '12px', fontWeight: 600 }} />
              <YAxis stroke="#A3AED0" />
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
                stroke="#4318FF"
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
            <div className="w-full h-full flex items-center justify-center text-[#A3AED0]">
              No trend data available
            </div>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
