import React, { useMemo } from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

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
    <motion.div
      variants={cardVariants}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.3 }}
      whileHover="hover"
      className="glass-card p-8 bg-white border border-diana-lime/30 shadow-lg shadow-diana-lime/5"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-diana-lime/10 rounded-xl">
          <Brain size={32} className="text-diana-lime-dark" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-diana-text-primary">ML Model Performance</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-diana-stone/30 p-6 rounded-2xl border border-diana-stone">
          <p className="text-diana-text-secondary font-bold text-xs uppercase tracking-wider mb-2">Best Model</p>
          <p className="text-2xl font-serif font-bold text-diana-forest">
            {metrics?.best_model?.best_model || metrics?.best_model?.model_type || 'clinical'}
          </p>
        </div>
        <div className="bg-diana-stone/30 p-6 rounded-2xl border border-diana-stone">
          <p className="text-diana-text-secondary font-bold text-xs uppercase tracking-wider mb-2">Accuracy</p>
          <p className="text-3xl font-serif font-bold text-diana-forest">
            {formatMetric(metrics?.best_model?.metrics?.accuracy, true)}
          </p>
        </div>
        <div className="bg-diana-stone/30 p-6 rounded-2xl border border-diana-stone">
          <p className="text-diana-text-secondary font-bold text-xs uppercase tracking-wider mb-2">AUC-ROC</p>
          <p className="text-3xl font-serif font-bold text-diana-forest">
            {formatMetric(metrics?.best_model?.metrics?.auc_roc, false, 3)}
          </p>
        </div>
        <div className="bg-diana-stone/30 p-6 rounded-2xl border border-diana-stone">
          <p className="text-diana-text-secondary font-bold text-xs uppercase tracking-wider mb-2">F1-Score</p>
          <p className="text-3xl font-serif font-bold text-diana-forest">
            {formatMetric(metrics?.best_model?.metrics?.f1_score, true)}
          </p>
        </div>
      </div>

      {modelComparison.length > 0 && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-diana-text-secondary border-b border-diana-sand">
                <th className="text-left py-4 font-bold uppercase tracking-wider">Model</th>
                <th className="text-right py-4 font-bold uppercase tracking-wider">Accuracy</th>
                <th className="text-right py-4 font-bold uppercase tracking-wider">Precision</th>
                <th className="text-right py-4 font-bold uppercase tracking-wider">Recall</th>
                <th className="text-right py-4 font-bold uppercase tracking-wider">AUC-ROC</th>
              </tr>
            </thead>
            <tbody>
              {modelComparison.map((m) => (
                <tr key={m.Model} className="border-b border-diana-sand last:border-0 hover:bg-diana-stone/20 transition-colors">
                  <td className="py-4 font-bold text-diana-text-primary">{m.Model}</td>
                  <td className="text-right py-4 text-diana-text-secondary font-medium">{formatMetric(m.Accuracy, true)}</td>
                  <td className="text-right py-4 text-diana-text-secondary font-medium">{formatMetric(m.Precision, true)}</td>
                  <td className="text-right py-4 text-diana-text-secondary font-medium">{formatMetric(m.Recall, true)}</td>
                  <td className="text-right py-4 text-diana-text-secondary font-medium">{formatMetric(m['AUC-ROC'], false, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
});

ModelPerformance.displayName = 'ModelPerformance';

export default ModelPerformance;
