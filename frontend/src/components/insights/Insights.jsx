import { useEffect, useMemo, useRef, useState } from 'react';
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

const Insights = ({ token, patients }) => {
  const [clusters, setClusters] = useState([]);
  const [trends, setTrends] = useState([]);
  const [allAssessments, setAllAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [rateLimited, setRateLimited] = useState(false);
  const inFlightRef = useRef(false);
  const lastAttemptRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const tokenRef = useRef(null);
  const rateLimitedRef = useRef(false);

  const [mlMetrics, setMlMetrics] = useState(null);
  const [mlIG, setMlIG] = useState(null);
  const [mlClusters, setMlClusters] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError] = useState(null);

  const patientList = useMemo(() => (Array.isArray(patients) ? patients : []), [patients]);

  useEffect(() => {
    if (!token) return;
    const now = Date.now();
    const tokenChanged = tokenRef.current !== token;
    if (inFlightRef.current) return;
    if (!tokenChanged && hasLoadedRef.current && reloadKey === 0) return;
    if (rateLimitedRef.current && reloadKey === 0) return;
    if (now - lastAttemptRef.current < 1500) return;

    const load = async () => {
      inFlightRef.current = true;
      lastAttemptRef.current = Date.now();
      setLoading(true);
      setError(null);
      tokenRef.current = token;
      try {
        const [cResult, tResult] = await Promise.allSettled([
          fetchClusterDistributionApi(token),
          fetchTrendInsightsApi(token)
        ]);

        const c = cResult.status === 'fulfilled' ? cResult.value : [];
        const t = tResult.status === 'fulfilled' ? tResult.value : [];

        let sawRateLimit = false;
        if (cResult.status === 'rejected') {
          console.error('Cluster distribution failed:', cResult.reason);
          sawRateLimit = cResult.reason?.status === 429 || String(cResult.reason?.message || cResult.reason || '').includes('rate limit');
        }
        if (tResult.status === 'rejected') {
          console.error('Biomarker trends failed:', tResult.reason);
          sawRateLimit = sawRateLimit || tResult.reason?.status === 429 || String(tResult.reason?.message || tResult.reason || '').includes('rate limit');
        }

        if (cResult.status === 'rejected' && tResult.status === 'rejected') {
          setError(sawRateLimit ? 'Rate limited — please retry in a moment.' : 'Failed to load insights data');
        }
        setRateLimited(sawRateLimit);
        rateLimitedRef.current = sawRateLimit;

        setClusters(c || []);
        setTrends(t || []);

        if (patientList.length > 0) {
          const assessmentPromises = patientList.map(p =>
            fetchAssessmentsApi(token, p.id).catch(() => [])
          );
          const assessmentArrays = await Promise.all(assessmentPromises);
          const flatAssessments = assessmentArrays.flat().filter(a => a != null);
          setAllAssessments(flatAssessments);
        }

        if (!sawRateLimit) {
          hasLoadedRef.current = true;
          if (reloadKey !== 0) setReloadKey(0);
        }
      } catch (err) {
        console.error('Unexpected error loading insights:', err);
        setError('Failed to load insights');
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    };

    load();

  }, [token, patientList, reloadKey]);

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
      { factor: 'BMI', importance: 0.22, color: '#10B981' },
      { factor: 'Triglycerides', importance: 0.18, color: '#F59E0B' },
      { factor: 'LDL', importance: 0.16, color: '#7C3AED' },
      { factor: 'HDL', importance: 0.14, color: '#06B6D4' },
      { factor: 'Age', importance: 0.12, color: '#F43F5E' },
      { factor: 'Lifestyle', importance: 0.08, color: '#64748B' }
    ];
  }, [mlIG]);

  const bmiGlucoseData = useMemo(() => {
    if (!allAssessments.length) return [];
    return allAssessments
      .map(assessment => {
        if (!assessment?.bmi || !assessment?.fbs) return null;
        return {
          bmi: parseFloat(assessment.bmi),
          fbs: parseFloat(assessment.fbs),
          hba1c: parseFloat(assessment.hba1c) || 0,
          risk: assessment.risk_score || 0
        };
      })
      .filter(Boolean)
      .slice(0, 50);
  }, [allAssessments]);

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

  const totalAssessments = allAssessments.length || clusters.reduce((sum, c) => sum + (c.count || 0), 0);
  const avgRiskScore = allAssessments.length > 0
    ? (allAssessments.reduce((sum, a) => sum + (a.risk_score || 0), 0) / allAssessments.length).toFixed(1)
    : clusters.length > 0
      ? '—'
      : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <InsightsHeader loading={loading} error={error} />
      {rateLimited && (
        <div className="glass-card border border-amber-400/40 p-4 flex items-start gap-3 text-amber-500">
          <AlertCircle size={20} />
          <div className="text-sm">
            <p className="font-semibold">Rate limit reached</p>
            <p className="text-amber-500/80">Wait 10–20 seconds, then retry.</p>
            <button
              type="button"
              onClick={() => setReloadKey(Date.now())}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-400/50 px-3 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50"
            >
              Retry now
            </button>
          </div>
        </div>
      )}

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
