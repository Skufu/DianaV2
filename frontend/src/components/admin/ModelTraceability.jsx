// ModelTraceability: Display ML model version history
import React, { useEffect, useState } from 'react';
import { fetchModelRunsApi, fetchActiveModelApi } from '../../api';
import { Cpu, Clock, Hash, FileText, CheckCircle, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeIn, slideUp, cardVariants, useReducedMotion } from '../../utils/animations';

const ModelTraceability = ({ token }) => {
  const isReduced = useReducedMotion();
  const [activeModel, setActiveModel] = useState(null);
  const [modelRuns, setModelRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    const load = async () => {
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
    };
    load();
  }, [token, page, pageSize]);

  if (loading) {
    return (
      <div className="glass-card p-12 text-center bg-white/80 shadow-sm border border-slate-200/50">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-500">Loading model information...</p>
      </div>
    );
  }

  if (error) {
    return <div className="glass-card p-6 border border-rose-200 text-rose-600 bg-white/80">{error}</div>;
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeIn}>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Cpu className="text-violet-600" size={24} />
          Model Traceability
        </h3>
        <p className="text-slate-500 text-sm mt-1">ML model version history and dataset tracking</p>
      </motion.div>

      {/* Active Model Card */}
      {activeModel && (
        <motion.div
          variants={cardVariants}
          initial="offscreen"
          whileInView="onscreen"
          viewport={{ once: true, amount: 0.3 }}
          whileHover="hover"
          className="glass-card p-6 border border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 bg-white/80 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle className="text-emerald-600" size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Currently Active Model</h4>
              <p className="text-slate-500 text-sm">In production use for predictions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Cpu size={14} />
                Version
              </div>
              <p className="text-slate-900 font-mono text-lg">{activeModel.model_version}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Hash size={14} />
                Dataset Hash
              </div>
              <p className="text-slate-900 font-mono text-sm truncate" title={activeModel.dataset_hash}>
                {activeModel.dataset_hash || 'N/A'}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <Clock size={14} />
                Trained
              </div>
              <p className="text-slate-900">{new Date(activeModel.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {activeModel.notes && (
            <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
                <FileText size={14} />
                Notes
              </div>
              <p className="text-slate-700">{activeModel.notes}</p>
            </div>
          )}
        </motion.div>

      )}

      {/* Model History */}
      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="glass-card overflow-hidden bg-white/80 shadow-sm border border-slate-200/50"
      >
        <div className="px-6 py-4 border-b border-slate-200">
          <h4 className="text-lg font-semibold text-slate-900">Training History</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="px-6 py-3 text-slate-500 font-medium">Version</th>
                <th className="px-6 py-3 text-slate-500 font-medium">Dataset Hash</th>
                <th className="px-6 py-3 text-slate-500 font-medium">Trained</th>
                <th className="px-6 py-3 text-slate-500 font-medium">Notes</th>
                <th className="px-6 py-3 text-slate-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {modelRuns.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    No model runs recorded
                  </td>
                </tr>
              ) : (
                <motion.tbody
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                >
                  {modelRuns.map(run => (
                    <motion.tr
                      key={run.id}
                      variants={{
                        hidden: { opacity: 0, x: isReduced ? 0 : -20 },
                        visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
                      }}
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-slate-900">{run.model_version}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="font-mono text-slate-500 text-sm truncate block max-w-[200px]"
                          title={run.dataset_hash}
                        >
                          {run.dataset_hash || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(run.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-[300px] truncate">
                        {run.notes || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {run.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-medium">
                            <CheckCircle size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-xs font-medium">
                            Historical
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200">
            <p className="text-slate-500 text-sm">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-slate-900">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ModelTraceability;
