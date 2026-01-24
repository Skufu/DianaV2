import React, { useEffect, useState, useMemo } from 'react';
import {
  fetchClusterDistributionApi, fetchTrendInsightsApi, fetchAssessmentsApi,
  fetchMLMetricsApi, fetchMLInformationGainApi, fetchMLClustersApi
} from '../../api';
import { AlertCircle } from 'lucide-react';
import InsightsHeader from './InsightsHeader';
import InsightsSummary from './InsightsSummary';
import ModelPerformance from './ModelPerformance';
import RiskFactorChart from './RiskFactorChart';
import SubgroupDistribution from './SubgroupDistribution';
import ClusterComparison from './ClusterComparison';
import VisualizationCard from './VisualizationCard';
import BMIGlucoseCorrelation from './BMIGlucoseCorrelation';
import RiskDistribution from './RiskDistribution';
import BiomarkerTrends from './BiomarkerTrends';

const Insights = ({ token, patients = [] }) => {
  const [clusters, setClusters] = useState([]);
  const [trends, setTrends] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [mlMetrics, setMlMetrics] = useState(null);
  const [mlIG, setMlIG] = useState(null);
  const [mlClusters, setMlClusters] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);

  useEffect(() => {
    if (!token || hasLoadedOnce) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [cResult, tResult] = await Promise.allSettled([
          fetchClusterDistributionApi(token),
          fetchTrendInsightsApi(token)
        ]);

        const c = cResult.status === 'fulfilled' ? cResult.value : [];
        const t = tResult.status === 'fulfilled' ? tResult.value : [];

        // Log specific errors
        if (cResult.status === 'rejected') {
          console.error('Cluster distribution failed:', cResult.reason);
        }
        if (tResult.status === 'rejected') {
          console.error('Biomarker trends failed:', tResult.reason);
        }

        // Only set a global error if EVERYTHING critical fails
        if (cResult.status === 'rejected' && tResult.status === 'rejected') {
          setError('Failed to load insights data');
        }

        setClusters(c || []);
        setTrends(t || []);
        setHasLoadedOnce(true);

        if (patients && patients.length > 0) {
          const assessmentPromises = patients.map(p =>
            fetchAssessmentsApi(token, p.id).catch(() => [])
          );
          const assessmentArrays = await Promise.all(assessmentPromises);
          const flatAssessments = assessmentArrays.flat().filter(a => a != null);
          setAllAssessments(flatAssessments);
        }
      } catch (err) {
        console.error('Unexpected error loading insights:', err);
        setError('Failed to load insights');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, patients, hasLoadedOnce]);

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
        if (!metrics && !ig && !clusters) {
          setMlError('ML server is unavailable. Some insights may be limited.');
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

  const riskFactorImportance = useMemo(() => {
    if (mlIG && mlIG.feature_ranking) {
      const colors = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#64748B', '#6366F1'];
      return mlIG.feature_ranking.map((item, i) => ({
        factor: item.feature.charAt(0).toUpperCase() + item.feature.slice(1),
        importance: item.ig,
        color: colors[i % colors.length]
      }));
    }
    return [
      { factor: 'HbA1c', importance: 0.28, color: '#7C3AED' },
      { factor: 'FBS', importance: 0.25, color: '#06B6D4' },
      { factor: 'BMI', importance: 0.18, color: '#10B981' },
      { factor: 'Age', importance: 0.12, color: '#F59E0B' },
      { factor: 'Blood Pressure', importance: 0.10, color: '#F43F5E' },
      { factor: 'Physical Activity', importance: 0.07, color: '#64748B' }
    ];
  }, [mlIG]);

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
      .slice(0, 50);
  }, [allAssessments, patients]);

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

  const totalAssessments = allAssessments.length;
  const avgRiskScore = allAssessments.length > 0
    ? (allAssessments.reduce((sum, a) => sum + (a.risk_score || 0), 0) / allAssessments.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <InsightsHeader loading={loading} error={error} />

      <InsightsSummary
        totalAssessments={totalAssessments}
        avgRiskScore={avgRiskScore}
        clusterCount={mlClusters?.n_clusters || clusters.length || 3}
      />

      {mlError && !mlLoading && (
        <div className="glass-card border border-rose-500/30 p-4 flex items-center gap-3 text-rose-400">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{mlError}</span>
        </div>
      )}

      <ModelPerformance mlMetrics={mlMetrics} isLoading={mlLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisualizationCard title="ROC Curve" visualizationName="roc_curve" />
        <VisualizationCard title="Confusion Matrix" visualizationName="confusion_matrix" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisualizationCard title="Cluster Heatmap" visualizationName="cluster_heatmap" />
        <VisualizationCard title="Cluster Distribution" visualizationName="cluster_distribution" />
      </div>

      <RiskFactorChart riskFactorImportance={riskFactorImportance} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BMIGlucoseCorrelation data={bmiGlucoseData} />
        <RiskDistribution data={riskDistribution} />
      </div>

      <SubgroupDistribution clusters={clusters} isLoading={loading} />

      <BiomarkerTrends trends={trends} />

      <ClusterComparison clusters={clusters} isLoading={loading} />
    </div>
  );
};

export default Insights;
