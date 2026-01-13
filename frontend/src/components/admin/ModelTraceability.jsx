// ModelTraceability: Display ML model version history
import React, { useEffect, useState } from 'react';
import { fetchModelRunsApi, fetchActiveModelApi } from '../../api';
import { Cpu, Clock, Hash, FileText, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const ModelTraceability = ({ token }) => {
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
      <div className="glass-card p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400">Loading model information...</p>
      </div>
    );
  }

  if (error) {
    return <div className="glass-card p-6 border border-rose-500/30 text-rose-400">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Cpu className="text-violet-400" size={24} />
          Model Traceability
        </h3>
        <p className="text-slate-400 text-sm mt-1">ML model version history and dataset tracking</p>
      </div>

      {/* Active Model Card */}
      {activeModel && (
        <div className="glass-card p-6 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle className="text-emerald-400" size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Currently Active Model</h4>
              <p className="text-slate-400 text-sm">In production use for predictions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Cpu size={14} />
                Version
              </div>
              <p className="text-white font-mono text-lg">{activeModel.model_version}</p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Hash size={14} />
                Dataset Hash
              </div>
              <p className="text-white font-mono text-sm truncate" title={activeModel.dataset_hash}>
                {activeModel.dataset_hash || 'N/A'}
              </p>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Clock size={14} />
                Trained
              </div>
              <p className="text-white">{new Date(activeModel.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {activeModel.notes && (
            <div className="mt-4 bg-slate-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <FileText size={14} />
                Notes
              </div>
              <p className="text-slate-300">{activeModel.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Model History */}
      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50">
          <h4 className="text-lg font-semibold text-white">Training History</h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-left">
                <th className="px-6 py-3 text-slate-400 font-medium">Version</th>
                <th className="px-6 py-3 text-slate-400 font-medium">Dataset Hash</th>
                <th className="px-6 py-3 text-slate-400 font-medium">Trained</th>
                <th className="px-6 py-3 text-slate-400 font-medium">Notes</th>
                <th className="px-6 py-3 text-slate-400 font-medium">Status</th>
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
                modelRuns.map(run => (
                  <tr key={run.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="px-6 py-4">
                      <span className="font-mono text-white">{run.model_version}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="font-mono text-slate-400 text-sm truncate block max-w-[200px]"
                        title={run.dataset_hash}
                      >
                        {run.dataset_hash || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-400 max-w-[300px] truncate">
                      {run.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      {run.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                          <CheckCircle size={12} />
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs font-medium">
                          Historical
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700/50">
            <p className="text-slate-400 text-sm">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelTraceability;
