// AuditLogViewer: Paginated, searchable audit event log viewer
import React, { useEffect, useState, useCallback } from 'react';
import { fetchAuditLogsApi } from '../../api';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, fadeIn, slideUp, cardVariants, useReducedMotion } from '../../utils/animations';

const AuditLogViewer = ({ token }) => {
  const isReduced = useReducedMotion();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Filters
  const [actor, setActor] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState(new Set());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, page_size: pageSize };
      if (actor) params.actor = actor;
      if (action) params.action = action;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const response = await fetchAuditLogsApi(token, params);
      setEvents(response.data || []);
      setTotal(response.total || 0);
      setTotalPages(response.total_pages || 1);
    } catch (err) {
      setError('Failed to load audit logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, actor, action, startDate, endDate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleSearch = e => {
    e.preventDefault();
    setPage(1);
    loadEvents();
  };

  const toggleExpand = id => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatAction = action => {
    const colors = {
      'user.create': 'text-emerald-600',
      'user.update': 'text-blue-600',
      'user.deactivate': 'text-rose-600',
      'user.activate': 'text-teal-600',
    };
    return <span className={colors[action] || 'text-slate-500'}>{action}</span>;
  };

  const rowVariants = {
    hidden: { opacity: 0, x: isReduced ? 0 : -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } }
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeIn}>
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="text-cyan-600" size={24} />
          Audit Logs
        </h3>
        <p className="text-slate-500 text-sm mt-1">System activity and admin action history</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="glass-card p-4 bg-white/80 shadow-sm border border-slate-200/50"
      >
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label htmlFor="audit-actor-search" className="text-slate-600 text-sm block mb-1">
              Actor
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                id="audit-actor-search"
                name="actor"
                type="text"
                value={actor}
                onChange={e => setActor(e.target.value)}
                placeholder="Search by email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="audit-action-filter" className="text-slate-600 text-sm block mb-1">
              Action
            </label>
            <select
              id="audit-action-filter"
              name="action"
              value={action}
              onChange={e => setAction(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Actions</option>
              <option value="user.create">User Create</option>
              <option value="user.update">User Update</option>
              <option value="user.deactivate">User Deactivate</option>
              <option value="user.activate">User Activate</option>
            </select>
          </div>
          <div>
            <label htmlFor="audit-start-date" className="text-slate-600 text-sm block mb-1">
              From Date
            </label>
            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                id="audit-start-date"
                name="startDate"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="audit-end-date" className="text-slate-600 text-sm block mb-1">
              To Date
            </label>
            <input
              id="audit-end-date"
              name="endDate"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Filter size={16} />
            Apply
          </motion.button>
        </form>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 border border-rose-200 text-rose-600 bg-white/80">{error}</motion.div>
      )}

      {/* Events Table */}
      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="glass-card overflow-hidden bg-white/80 shadow-sm border border-slate-200/50"
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-y-0 relative">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-slate-500 font-medium w-8" />
                  <th className="px-4 py-3 text-slate-500 font-medium">Timestamp</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Actor</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Action</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Target</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {events.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      No audit events found
                    </td>
                  </tr>
                ) : (
                  events.map(event => (
                    <React.Fragment key={event.id}>
                      <motion.tr
                        variants={rowVariants}
                        className="border-b border-slate-200 cursor-pointer"
                        onClick={() => toggleExpand(event.id)}
                        whileHover={{
                          backgroundColor: "#F8FAFC",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          y: -2,
                          zIndex: 10,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        <td className="px-4 py-3 text-slate-500">
                          {event.details &&
                            Object.keys(event.details).length > 0 &&
                            (expandedRows.has(event.id) ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            ))}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-sm">
                          {new Date(event.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-900">{event.actor}</td>
                        <td className="px-4 py-3">{formatAction(event.action)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {event.target_type} #{event.target_id}
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedRows.has(event.id) && event.details && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, transition: { delay: 0.2 } }}
                            className="bg-slate-50"
                          >
                            <td colSpan="5" className="p-0 border-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0, y: -10 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -10 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="overflow-hidden"
                              >
                                <div className="px-8 py-4 text-sm">
                                  <h4 className="text-slate-600 mb-2 font-medium">Details:</h4>
                                  <pre className="bg-slate-100 p-3 rounded text-slate-700 overflow-x-auto text-xs border border-slate-200">
                                    {JSON.stringify(event.details, null, 2)}
                                  </pre>
                                </div>
                              </motion.div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
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

export default AuditLogViewer;
