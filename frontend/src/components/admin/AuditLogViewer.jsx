// AuditLogViewer: Paginated, searchable audit event log viewer
import React, { useEffect, useState, useCallback } from 'react';
import { fetchAuditLogsApi } from '../../api';
import {
    FileText, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
    Calendar, Filter
} from 'lucide-react';

const AuditLogViewer = ({ token }) => {
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

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadEvents();
    };

    const toggleExpand = (id) => {
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

    const formatAction = (action) => {
        const colors = {
            'user.create': 'text-emerald-400',
            'user.update': 'text-blue-400',
            'user.deactivate': 'text-rose-400',
            'user.activate': 'text-teal-400',
        };
        return (
            <span className={colors[action] || 'text-slate-300'}>
                {action}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-cyan-400" size={24} />
                    Audit Logs
                </h3>
                <p className="text-slate-400 text-sm mt-1">System activity and admin action history</p>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[150px]">
                        <label className="text-slate-400 text-sm block mb-1">Actor</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                value={actor}
                                onChange={(e) => setActor(e.target.value)}
                                placeholder="Search by email..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-slate-400 text-sm block mb-1">Action</label>
                        <select
                            value={action}
                            onChange={(e) => setAction(e.target.value)}
                            className="px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                        >
                            <option value="">All Actions</option>
                            <option value="user.create">User Create</option>
                            <option value="user.update">User Update</option>
                            <option value="user.deactivate">User Deactivate</option>
                            <option value="user.activate">User Activate</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-slate-400 text-sm block mb-1">From Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-slate-400 text-sm block mb-1">To Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                    >
                        <Filter size={16} />
                        Apply
                    </button>
                </form>
            </div>

            {/* Error State */}
            {error && (
                <div className="glass-card p-4 border border-rose-500/30 text-rose-400">
                    {error}
                </div>
            )}

            {/* Events Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700/50 text-left">
                                    <th className="px-4 py-3 text-slate-400 font-medium w-8"></th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Timestamp</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Actor</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Action</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {events.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                            No audit events found
                                        </td>
                                    </tr>
                                ) : (
                                    events.map((event) => (
                                        <React.Fragment key={event.id}>
                                            <tr
                                                className="border-b border-slate-700/30 hover:bg-slate-700/20 cursor-pointer"
                                                onClick={() => toggleExpand(event.id)}
                                            >
                                                <td className="px-4 py-3 text-slate-400">
                                                    {event.details && Object.keys(event.details).length > 0 && (
                                                        expandedRows.has(event.id)
                                                            ? <ChevronUp size={16} />
                                                            : <ChevronDown size={16} />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-300 text-sm">
                                                    {new Date(event.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-white">{event.actor}</td>
                                                <td className="px-4 py-3">{formatAction(event.action)}</td>
                                                <td className="px-4 py-3 text-slate-400">
                                                    {event.target_type} #{event.target_id}
                                                </td>
                                            </tr>
                                            {expandedRows.has(event.id) && event.details && (
                                                <tr className="bg-slate-800/30">
                                                    <td colSpan="5" className="px-8 py-4">
                                                        <div className="text-sm">
                                                            <h4 className="text-slate-400 mb-2 font-medium">Details:</h4>
                                                            <pre className="bg-slate-900/50 p-3 rounded text-slate-300 overflow-x-auto text-xs">
                                                                {JSON.stringify(event.details, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
                        <p className="text-slate-400 text-sm">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
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

export default AuditLogViewer;
