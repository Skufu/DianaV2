import React, { useMemo } from 'react';
import { Brain } from 'lucide-react';

const formatMetric = (value, isPercentage = false, decimals = 1) => {
  if (value === null || value === undefined) return 'N/A';
  return isPercentage ? `${(value * 100).toFixed(decimals)}%` : value.toFixed(decimals);
};

const getMLMetrics = (mlMetrics) => {
  if (!mlMetrics) return null;
  return mlMetrics.clinical?.best_model ? mlMetrics.clinical : mlMetrics.ada_baseline;
};

const ModelPerformance = React.memo(({ mlMetrics, isLoading = false }) => {
  const metrics = useMemo(() => getMLMetrics(mlMetrics), [mlMetrics]);
  const modelComparison = useMemo(
    () => mlMetrics?.clinical?.model_comparison || mlMetrics?.ada_baseline?.model_comparison || [],
    [mlMetrics]
  );

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-7 h-7 rounded-full bg-slate-600 animate-pulse" />
          <div className="w-48 h-7 bg-slate-600 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4'].map((id) => (
            <div key={id} className="bg-slate-700/30 p-4 rounded-2xl">
              <div className="w-20 h-4 mb-2 bg-slate-600 animate-pulse rounded" />
              <div className="w-16 h-6 bg-slate-600 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="glass-card p-8 border border-teal-500/20">
      <div className="flex items-center gap-3 mb-6">
        <Brain size={28} className="text-teal-400" />
        <h3 className="text-2xl font-bold text-white">ML Model Performance</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700/30 p-4 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">Best Model</p>
          <p className="text-xl font-bold text-white">
            {metrics?.best_model?.best_model || metrics?.best_model?.model_type || 'clinical'}
          </p>
        </div>
        <div className="bg-slate-700/30 p-4 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">Accuracy</p>
          <p className="text-xl font-bold text-white">
            {formatMetric(metrics?.best_model?.metrics?.accuracy, true)}
          </p>
        </div>
        <div className="bg-slate-700/30 p-4 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">AUC-ROC</p>
          <p className="text-xl font-bold text-white">
            {formatMetric(metrics?.best_model?.metrics?.auc_roc, false, 3)}
          </p>
        </div>
        <div className="bg-slate-700/30 p-4 rounded-2xl">
          <p className="text-slate-400 text-sm mb-1">F1-Score</p>
          <p className="text-xl font-bold text-white">
            {formatMetric(metrics?.best_model?.metrics?.f1_score, true)}
          </p>
        </div>
      </div>

      {modelComparison.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-600/50">
                <th className="text-left py-2">Model</th>
                <th className="text-right py-2">Accuracy</th>
                <th className="text-right py-2">Precision</th>
                <th className="text-right py-2">Recall</th>
                <th className="text-right py-2">AUC-ROC</th>
              </tr>
            </thead>
            <tbody>
              {modelComparison.map((m) => (
                <tr key={m.Model} className="border-b border-slate-700/50 text-white">
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
});

ModelPerformance.displayName = 'ModelPerformance';

export default ModelPerformance;
