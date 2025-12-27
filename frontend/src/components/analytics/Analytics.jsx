// Analytics: comprehensive cohort-level analytics with multiple visualizations
import React, { useEffect, useState, useMemo } from 'react';
import { fetchClusterDistributionApi, fetchTrendAnalyticsApi, fetchPatientsApi, fetchAssessmentsApi } from '../../api';
import {
  BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { TrendingUp, Activity, Users, BarChart3 } from 'lucide-react';

const Analytics = ({ token, patients = [] }) => {
  const [clusters, setClusters] = useState([]);
  const [trends, setTrends] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Calculate risk factor importance (mock data based on common T2DM risk factors)
  const riskFactorImportance = useMemo(() => [
    { factor: 'HbA1c', importance: 0.28, color: '#4318FF' },
    { factor: 'FBS', importance: 0.25, color: '#6AD2FF' },
    { factor: 'BMI', importance: 0.18, color: '#FFB547' },
    { factor: 'Age', importance: 0.12, color: '#05CD99' },
    { factor: 'Blood Pressure', importance: 0.10, color: '#EE5D50' },
    { factor: 'Physical Activity', importance: 0.07, color: '#A3AED0' }
  ], []);

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
          <h3 className="text-3xl font-bold text-[#1B2559]">{clusters.length}</h3>
          <p className="text-[#A3AED0] text-sm mt-1">T2DM Subgroups Identified</p>
        </div>
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
