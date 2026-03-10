// ModelTraceability: Admin oversight for ML model tracking
// Displays active production model with lineage, sync status, and training history
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { fetchModelRunsApi, fetchActiveModelApi, syncModelRunsApi } from '../../api';
import {
  Cpu,
  Clock,
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Copy,
  AlertCircle,
  Database,
  Activity,
  Server,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  staggerContainer,
  fadeIn,
  cardVariants,
  useReducedMotion,
} from '../../utils/animations';

const copyToClipboard = async (text, onSuccess) => {
  try {
    await navigator.clipboard.writeText(text);
    onSuccess?.();
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
};

const truncateHash = (hash, length = 12) => {
  if (!hash) return 'N/A';
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
};

const ModelTraceability = ({ token }) => {
  const isReduced = useReducedMotion();
  const [activeModel, setActiveModel] = useState(null);
  const [modelRuns, setModelRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, runs] = await Promise.all([
        fetchActiveModelApi(token).catch(() => null),
        fetchModelRunsApi(token, { page, page_size: pageSize }),
      ]);
      setActiveModel(active);
      setModelRuns(runs.data || []);
      setTotal(runs.total || 0);
      setTotalPages(runs.total_pages || 1);
    } catch (err) {
      setError('Failed to load model information');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncSuccess(null);
    try {
      await syncModelRunsApi(token);
      setLastSyncTime(new Date().toISOString());
      // Reload data
      const [active, runs] = await Promise.all([
        fetchActiveModelApi(token).catch(() => null),
        fetchModelRunsApi(token, { page, page_size: pageSize }),
      ]);
      setActiveModel(active);
      setModelRuns(runs.data || []);
      setTotal(runs.total || 0);
      setTotalPages(runs.total_pages || 1);
      setSyncSuccess('Model registry synced successfully');
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (err) {
      setError('Failed to sync model from ML Server');
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyHash = (hash, identifier) => {
    copyToClipboard(hash, () => {
      setCopiedHash(identifier);
      setTimeout(() => setCopiedHash(null), 2000);
    });
  };

  const showingFrom = useMemo(() => {
    if (total === 0 || modelRuns.length === 0) return 0;
    return (page - 1) * pageSize + 1;
  }, [page, pageSize, total, modelRuns.length]);

  const showingTo = useMemo(() => {
    if (total === 0 || modelRuns.length === 0) return 0;
    return Math.min(page * pageSize, total);
  }, [page, pageSize, total, modelRuns.length]);

  const rowVariants = {
    hidden: { opacity: 0, x: isReduced ? 0 : -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    },
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeIn}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-violet-500/20">
            <Cpu size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Model Traceability</h1>
            <p className="text-sm text-slate-500">
              ML model registry, lineage tracking, and production oversight
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sync Status Bar */}
      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        className="glass-card p-4 bg-white/80 shadow-sm border border-slate-200/50"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Server size={20} className="text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">ML Server Connection</p>
              <p className="text-xs text-slate-500">
                Last sync: {formatRelativeTime(lastSyncTime || activeModel?.created_at)}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync with ML Server'}
          </motion.button>
        </div>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {syncSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            role="status"
            aria-live="polite"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            <span className="text-emerald-700">{syncSuccess}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-rose-600" />
            </div>
            <span className="text-rose-700">{error}</span>
            <button
              onClick={load}
              className="ml-auto px-3 py-1 text-sm bg-rose-100 hover:bg-rose-200 rounded text-rose-700 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <motion.div
          variants={fadeIn}
          className="glass-card p-12 text-center bg-white/80 shadow-sm border border-slate-200/50"
        >
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading model information...</p>
        </motion.div>
      )}

      {/* Active Model Hero Card */}
      {!loading && activeModel && (
        <motion.div
          variants={cardVariants}
          initial="offscreen"
          whileInView="onscreen"
          viewport={{ once: true, amount: 0.3 }}
          whileHover="hover"
          className="glass-card overflow-hidden bg-white/80 shadow-sm border border-emerald-200"
        >
          {/* Production Banner */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-white" />
                <span className="text-white font-semibold">Production Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-white/90 text-sm">Live</span>
              </div>
            </div>
          </div>

          {/* Model Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Version */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <Cpu size={14} />
                  <span>Model Version</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 font-mono">
                  {activeModel.model_version}
                </p>
                <p className="text-xs text-slate-400 mt-1">Binary classifier</p>
              </div>

              {/* Dataset Lineage */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <Database size={14} />
                  <span>Dataset Lineage</span>
                </div>
                <div className="flex items-center gap-2">
                  <p
                    className="text-slate-900 font-mono text-sm truncate flex-1"
                    title={activeModel.dataset_hash}
                  >
                    {truncateHash(activeModel.dataset_hash, 16)}
                  </p>
                  <button
                    onClick={() => handleCopyHash(activeModel.dataset_hash, 'active')}
                    className="p-1.5 hover:bg-slate-200 rounded transition-colors"
                    title="Copy full hash"
                  >
                    {copiedHash === 'active' ? (
                      <CheckCircle size={14} className="text-emerald-500" />
                    ) : (
                      <Copy size={14} className="text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">NHANES training data</p>
              </div>

              {/* Training Date */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <Clock size={14} />
                  <span>Trained</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {new Date(activeModel.created_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatRelativeTime(activeModel.created_at)}
                </p>
              </div>
            </div>

            {/* Notes */}
            {activeModel.notes && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                  <FileText size={14} />
                  <span>Training Notes</span>
                </div>
                <p className="text-slate-700">{activeModel.notes}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* No Active Model State */}
      {!loading && !activeModel && (
        <motion.div
          variants={fadeIn}
          className="glass-card p-8 bg-white/80 shadow-sm border border-amber-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Info size={24} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Active Model</h3>
              <p className="text-slate-500 text-sm mb-4">
                No production model is currently registered. Sync with the ML server to retrieve the
                active model, or ensure a model has been trained and deployed.
              </p>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                Sync Now
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Training History */}
      {!loading && (
        <motion.div
          variants={cardVariants}
          initial="offscreen"
          whileInView="onscreen"
          viewport={{ once: true, amount: 0.3 }}
          whileHover="hover"
          className="glass-card overflow-hidden bg-white/80 shadow-sm border border-slate-200/50"
        >
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Training History</h3>
              <p className="text-slate-500 text-sm">
                {total > 0
                  ? `${total} model run${total !== 1 ? 's' : ''} recorded`
                  : 'No training runs recorded yet'}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            {modelRuns.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Cpu size={32} className="text-slate-400" />
                </div>
                <p className="text-slate-500 mb-2">No model runs in registry</p>
                <p className="text-slate-400 text-sm">
                  Train and register models to see them here
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-left bg-slate-50/50">
                    <th className="px-6 py-3 text-slate-500 font-medium text-sm">Status</th>
                    <th className="px-6 py-3 text-slate-500 font-medium text-sm">Version</th>
                    <th className="px-6 py-3 text-slate-500 font-medium text-sm">Dataset Hash</th>
                    <th className="px-6 py-3 text-slate-500 font-medium text-sm">Trained</th>
                    <th className="px-6 py-3 text-slate-500 font-medium text-sm">Notes</th>
                  </tr>
                </thead>
                <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                  {modelRuns.map(run => (
                    <motion.tr
                      key={run.id}
                      variants={rowVariants}
                      className={`border-b border-slate-200 ${
                        run.is_active ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        {run.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                            Historical
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-slate-900 font-medium">
                          {run.model_version}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-slate-600 text-sm truncate max-w-[150px]"
                            title={run.dataset_hash}
                          >
                            {truncateHash(run.dataset_hash)}
                          </span>
                          <button
                            onClick={() => handleCopyHash(run.dataset_hash, `run-${run.id}`)}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Copy hash"
                          >
                            {copiedHash === `run-${run.id}` ? (
                              <CheckCircle size={12} className="text-emerald-500" />
                            ) : (
                              <Copy size={12} className="text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-slate-600 text-sm">
                            {new Date(run.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-slate-400 text-xs">
                            {new Date(run.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-500 text-sm max-w-[200px] truncate">
                          {run.notes || '—'}
                        </p>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50/50">
              <p className="text-slate-500 text-sm">
                Showing {showingFrom} to {showingTo} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-slate-900 text-sm px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ModelTraceability;