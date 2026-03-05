import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchClusterDistributionApi, fetchTrendInsightsApi,
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
import ClusterBiomarkerRadar from './ClusterBiomarkerRadar';
import RiskDistribution from './RiskDistribution';
import BiomarkerTrends from './BiomarkerTrends';

const Insights = ({ token, patients }) => {
  const [clusters, setClusters] = useState([]);
  const [trends, setTrends] = useState([]);
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

  // patientList and allAssessments logic removed as per instructions
  // const patientList = useMemo(() => (Array.isArray(patients) ? patients : []), [patients]);

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

        // Removed fetchAssessmentsApi logic
        // if (patientList.length > 0) {
        //   const assessmentPromises = patientList.map(p =>
        //     fetchAssessmentsApi(token, p.id).catch(() => [])
        //   );
        //   const assessmentArrays = await Promise.all(assessmentPromises);
        //   const flatAssessments = assessmentArrays.flat().filter(a => a != null);
        //   setAllAssessments(flatAssessments);
        // }

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

  }, [token, reloadKey]); // Removed patientList from dependencies

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

  // bmiGlucoseData and riskDistribution now depend on mlClusters or other data if allAssessments is removed
  // For now, they will return empty or default values if allAssessments is the only source.
  // The instruction did not provide new logic for these, so they will be effectively empty.
  const bmiGlucoseData = useMemo(() => {
    // If there's no allAssessments, this will return an empty array.
    // New logic for this data based on mlClusters or other sources would be needed if desired.
    return [];
  }, []);

  const riskDistribution = useMemo(() => {
    // If there's no allAssessments, this will return an empty array.
    // New logic for this data based on mlClusters or other sources would be needed if desired.
    return [];
  }, []);

  const globalAvgRisk = useMemo(() => {
    if (!mlClusters?.cluster_labels) return null;
    let totalRisk = 0;
    let totalSize = 0;
    Object.values(mlClusters.cluster_labels).forEach(c => {
      totalRisk += c.risk_score * c.size;
      totalSize += c.size;
    });
    return totalSize > 0 ? (totalRisk / totalSize) : null; // Risk score is typically 0-100, so no * 100 needed here if it's already in that range
  }, [mlClusters]);

  const totalAssessments = mlClusters?.cluster_sizes ? Object.values(mlClusters.cluster_sizes).reduce((a, b) => a + b, 0) : 0;

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
        avgRiskScore={globalAvgRisk !== null ? globalAvgRisk.toFixed(1) : '—'}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        <SubgroupDistribution clusters={clusters} isLoading={loading} />
        <ClusterBiomarkerRadar clusterProfiles={mlClusters} isLoading={mlLoading} />
      </div>

      <BiomarkerTrends trends={trends} />

      <ClusterComparison clusters={clusters} isLoading={loading} />
    </div>
  );
};

export default Insights;
