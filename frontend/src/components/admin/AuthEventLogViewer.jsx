// AuthEventLogViewer: Real-time authentication event stream viewer
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Shield,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Filter,
  Calendar,
  UserPlus,
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  staggerContainer,
  fadeIn,
  slideUp,
  cardVariants,
  useReducedMotion,
} from '../../utils/animations';
import { API_BASE } from '../../api';

const AuthEventLogViewer = ({ token }) => {
  const isReduced = useReducedMotion();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    eventType: '', // login, logout, failed_login, token_refresh, user_created
    user: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(true);

  const eventSourceRef = useRef(null);
  const eventsEndRef = useRef(null);
  const eventBufferRef = useRef([]);
  const timeoutRef = useRef([]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && eventsEndRef.current) {
      eventsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  const connectEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL(`${API_BASE}/admin/events/stream`, window.location.origin);
    if (token) {
      url.searchParams.append('token', token);
    }

    eventSourceRef.current = new EventSource(url);

    eventSourceRef.current.onopen = () => {
      setConnected(true);
      setError(null);
      setLoading(false);
    };

    eventSourceRef.current.onerror = err => {
      console.error('EventSource error:', err);
      setConnected(false);
    };

    eventSourceRef.current.addEventListener('auth_event', e => {
      try {
        const newEvent = JSON.parse(e.data);
        eventBufferRef.current.push(newEvent);

        const timeoutId = setTimeout(() => {
          if (eventBufferRef.current.length > 0) {
            setEvents(prev => [...eventBufferRef.current, ...prev].slice(0, 200));
            eventBufferRef.current = [];
          }
        }, 100);
        timeoutRef.current.push(timeoutId);
      } catch (err) {
        console.error('Failed to parse event:', err);
      }
    });

    eventSourceRef.current.addEventListener('error', e => {
      try {
        const errorData = JSON.parse(e.data);
        setError(errorData.message || 'Connection error');
      } catch {
        setError('Connection error');
      }
      setConnected(false);
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      timeoutRef.current.forEach(clearTimeout);
      timeoutRef.current = [];
    };
  }, [token]);

  useEffect(() => {
    const cleanup = connectEventSource();
    return cleanup;
  }, [connectEventSource]);

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

  const formatEventType = type => {
    const config = {
      login: {
        label: 'Login',
        icon: CheckCircle,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
      },
      logout: {
        label: 'Logout',
        icon: XCircle,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
      },
      failed_login: {
        label: 'Failed Login',
        icon: AlertCircle,
        color: 'text-rose-600',
        bg: 'bg-rose-100',
      },
      token_refresh: {
        label: 'Token Refresh',
        icon: RefreshCw,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
      },
      user_created: {
        label: 'User Created',
        icon: UserPlus,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
      },
    };

    const conf = config[type] || {
      label: type,
      icon: Shield,
      color: 'text-slate-500',
      bg: 'bg-slate-100',
    };
    const Icon = conf.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${conf.bg} ${conf.color}`}
      >
        <Icon size={12} />
        {conf.label}
      </span>
    );
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const exportEvents = () => {
    const csvContent = [
      ['Timestamp', 'Event Type', 'Email', 'IP Address', 'User Agent', 'Success'],
      ...events.map(e => [
        e.timestamp || new Date(e.created_at).toISOString(),
        e.event_type,
        e.email || e.user_email || 'N/A',
        e.ip_address || e.remote_ip || 'N/A',
        e.user_agent || 'N/A',
        e.success !== false ? 'Yes' : 'No',
      ]),
    ]
      .map(row => row.map(cell => `"${cell || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auth_events_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredEvents = events.filter(event => {
    if (filters.eventType && event.event_type !== filters.eventType) return false;
    if (filters.user) {
      const email = (event.email || event.user_email || '').toLowerCase();
      if (!email.includes(filters.user.toLowerCase())) return false;
    }
    if (filters.dateFrom) {
      const eventDate = new Date(event.timestamp || event.created_at);
      if (eventDate < new Date(filters.dateFrom)) return false;
    }
    if (filters.dateTo) {
      const eventDate = new Date(event.timestamp || event.created_at);
      if (eventDate > new Date(filters.dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-violet-600" size={24} />
            Real-time Auth Events
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Live authentication activity and security events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-sm">
            {connected ? (
              <>
                <Wifi className="text-emerald-500" size={16} />
                <span className="text-emerald-600 text-sm font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="text-rose-500" size={16} />
                <span className="text-rose-600 text-sm font-medium">Disconnected</span>
              </>
            )}
          </div>
          <button
            onClick={exportEvents}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-sm shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={clearEvents}
            className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 border border-rose-200 text-rose-600 flex items-center gap-2 bg-white/80">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="glass-card p-4 bg-white/80 shadow-sm border border-slate-200/50"
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <Filter size={16} />
          <span className="text-sm font-medium">Filters</span>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="event-type-filter" className="text-slate-600 text-sm block mb-1">
                Event Type
              </label>
              <select
                id="event-type-filter"
                value={filters.eventType}
                onChange={e => setFilters({ ...filters, eventType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
              >
                <option value="">All Events</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed_login">Failed Login</option>
                <option value="token_refresh">Token Refresh</option>
                <option value="user_created">User Created</option>
              </select>
            </div>
            <div>
              <label htmlFor="event-user-filter" className="text-slate-600 text-sm block mb-1">
                User Email
              </label>
              <input
                id="event-user-filter"
                type="text"
                value={filters.user}
                onChange={e => setFilters({ ...filters, user: e.target.value })}
                placeholder="Search by email..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="event-from-date" className="text-slate-600 text-sm block mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  id="event-from-date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="event-to-date" className="text-slate-600 text-sm block mb-1">
                To Date
              </label>
              <input
                id="event-to-date"
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="flex items-center justify-between glass-card px-4 py-3 bg-white/80 shadow-sm border border-slate-200/50"
      >
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-slate-500 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500 bg-slate-50"
            />
            <span>Auto-scroll to new events</span>
          </label>
        </div>
        <div className="text-slate-500 text-sm">Showing {filteredEvents.length} events</div>
      </motion.div>

      <motion.div
        variants={cardVariants}
        initial="offscreen"
        whileInView="onscreen"
        viewport={{ once: true, amount: 0.3 }}
        whileHover="hover"
        className="glass-card overflow-hidden bg-white/80 shadow-sm border border-slate-200/50"
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading-state"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15, delayChildren: 0.2 },
                },
                exit: { opacity: 0, transition: { duration: 0.2 } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="p-16 text-center"
            >
              <motion.div
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: {
                    opacity: 1,
                    scale: 1,
                    transition: { type: 'spring', stiffness: 200, damping: 20 },
                  },
                }}
                className="relative mb-8 w-20 h-20 mx-auto"
              >
                {/* Outer Spinning Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0 border-4 border-teal-500/20 border-t-teal-500 rounded-full"
                />

                {/* Inner Pulsing Wifi Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Wifi size={24} className="text-teal-500" />
                  </motion.div>
                </div>
              </motion.div>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="text-slate-900 text-lg font-bold mb-2"
              >
                Connecting to event stream...
              </motion.p>

              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                className="text-slate-500"
              >
                Waiting for authentication events
              </motion.p>

              <motion.div
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 },
                }}
                className="mt-6 flex justify-center gap-1.5"
              >
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    animate={{
                      y: [0, -8, 0],
                      opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                    className="w-2.5 h-2.5 bg-teal-500 rounded-full shadow-sm shadow-teal-500/20"
                  />
                ))}
              </motion.div>
            </motion.div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No auth events yet</p>
              <p className="text-sm mt-2">Waiting for authentication activity...</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="divide-y divide-slate-200"
              >
                <AnimatePresence initial={false}>
                  {filteredEvents.map((event, index) => {
                    const eventKey =
                      event.id ||
                      `${event.event_type}-${event.timestamp || event.created_at}-${event.email || event.user_email || 'unknown'}`;
                    return (
                      <motion.div
                        key={eventKey}
                        variants={fadeIn}
                        layout
                        className="px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleExpand(eventKey)}
                            className="text-slate-400 hover:text-slate-600 mt-1"
                          >
                            {expandedRows.has(eventKey) ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap">
                              {formatEventType(event.event_type)}
                              <span className="text-slate-900 font-medium truncate">
                                {event.email || event.user_email || 'Unknown User'}
                              </span>
                              <span className="text-slate-500 text-xs">
                                {new Date(event.timestamp || event.created_at).toLocaleString()}
                              </span>
                              {event.success === false && (
                                <span className="text-rose-600 text-xs font-medium">FAILED</span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 mt-1 text-sm">
                              {event.ip_address || event.remote_ip ? (
                                <div className="flex items-center gap-1 text-slate-500">
                                  <MapPin size={14} />
                                  <span className="font-mono text-xs">
                                    {event.ip_address || event.remote_ip}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            {expandedRows.has(eventKey) && (
                              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <h4 className="text-slate-500 text-sm font-medium mb-2">
                                  Event Details:
                                </h4>
                                <pre className="text-xs text-slate-600 overflow-x-auto">
                                  {JSON.stringify(
                                    {
                                      event_type: event.event_type,
                                      timestamp: event.timestamp || event.created_at,
                                      email: event.email || event.user_email,
                                      ip_address: event.ip_address || event.remote_ip,
                                      user_agent: event.user_agent,
                                      success: event.success !== false,
                                      ...(event.device_info && { device_info: event.device_info }),
                                      ...(event.location && { location: event.location }),
                                      ...(event.metadata && { metadata: event.metadata }),
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
              <div ref={eventsEndRef} />
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AuthEventLogViewer;
