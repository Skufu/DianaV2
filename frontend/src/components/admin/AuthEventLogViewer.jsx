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
} from 'lucide-react';

const AuthEventLogViewer = ({ token }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    eventType: '', // login, logout, failed_login, token_refresh
    user: '',
    dateFrom: '',
    dateTo: '',
  });
  const [showFilters, setShowFilters] = useState(true);

  const eventSourceRef = useRef(null);
  const eventsEndRef = useRef(null);
  const eventBufferRef = useRef([]);

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

    const url = new URL(
      `${import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1'}/admin/auth/events/stream`
    );
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

      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        if (!connected) {
          connectEventSource();
        }
      }, 5000);
    };

    eventSourceRef.current.addEventListener('auth_event', e => {
      try {
        const newEvent = JSON.parse(e.data);
        eventBufferRef.current.push(newEvent);

        // Process buffer every 100ms to batch updates
        setTimeout(() => {
          if (eventBufferRef.current.length > 0) {
            setEvents(prev => [...eventBufferRef.current, ...prev].slice(0, 200)); // Keep last 200 events
            eventBufferRef.current = [];
          }
        }, 100);
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
      }
    };
  }, [token, connected]);

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
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/20',
      },
      logout: {
        label: 'Logout',
        icon: XCircle,
        color: 'text-amber-400',
        bg: 'bg-amber-500/20',
      },
      failed_login: {
        label: 'Failed Login',
        icon: AlertCircle,
        color: 'text-rose-400',
        bg: 'bg-rose-500/20',
      },
      token_refresh: {
        label: 'Token Refresh',
        icon: RefreshCw,
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
      },
    };

    const conf = config[type] || {
      label: type,
      icon: Shield,
      color: 'text-slate-400',
      bg: 'bg-slate-500/20',
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
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-violet-400" size={24} />
            Real-time Auth Events
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Live authentication activity and security events
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            {connected ? (
              <>
                <Wifi className="text-emerald-400" size={16} />
                <span className="text-emerald-400 text-sm font-medium">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="text-rose-400" size={16} />
                <span className="text-rose-400 text-sm font-medium">Disconnected</span>
              </>
            )}
          </div>
          <button
            onClick={exportEvents}
            className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm"
          >
            Export CSV
          </button>
          <button
            onClick={clearEvents}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30 transition-colors text-sm"
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 border border-rose-500/30 text-rose-400 flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="glass-card p-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <Filter size={16} />
          <span className="text-sm font-medium">Filters</span>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="event-type-filter" className="text-slate-400 text-sm block mb-1">
                Event Type
              </label>
              <select
                id="event-type-filter"
                value={filters.eventType}
                onChange={e => setFilters({ ...filters, eventType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
              >
                <option value="">All Events</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed_login">Failed Login</option>
                <option value="token_refresh">Token Refresh</option>
              </select>
            </div>
            <div>
              <label htmlFor="event-user-filter" className="text-slate-400 text-sm block mb-1">
                User Email
              </label>
              <input
                id="event-user-filter"
                type="text"
                value={filters.user}
                onChange={e => setFilters({ ...filters, user: e.target.value })}
                placeholder="Search by email..."
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="event-from-date" className="text-slate-400 text-sm block mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  size={16}
                />
                <input
                  id="event-from-date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="event-to-date" className="text-slate-400 text-sm block mb-1">
                To Date
              </label>
              <input
                id="event-to-date"
                type="date"
                value={filters.dateTo}
                onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between glass-card px-4 py-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-slate-400 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={e => setAutoScroll(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 text-teal-500 focus:ring-teal-500 bg-slate-800"
            />
            <span>Auto-scroll to new events</span>
          </label>
        </div>
        <div className="text-slate-400 text-sm">Showing {filteredEvents.length} events</div>
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Connecting to event stream...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>No auth events yet</p>
            <p className="text-sm mt-2">Waiting for authentication activity...</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <div className="divide-y divide-slate-700/30">
              {filteredEvents.map((event, index) => {
                const eventKey = event.id || `${event.event_type}-${event.timestamp || event.created_at}-${event.email || event.user_email || 'unknown'}`;
                return (
                  <React.Fragment key={eventKey}>
                    <div
                      className="px-4 py-3 hover:bg-slate-700/20 transition-colors"
                      style={{
                        animation: 'fadeIn 0.3s ease-out',
                        animationDelay: `${Math.min(index * 0.05, 0.5)}s`,
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleExpand(eventKey)}
                          className="text-slate-500 hover:text-slate-300 mt-1"
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
                          <span className="text-white font-medium truncate">
                            {event.email || event.user_email || 'Unknown User'}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {new Date(event.timestamp || event.created_at).toLocaleString()}
                          </span>
                          {event.success === false && (
                            <span className="text-rose-400 text-xs font-medium">FAILED</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm">
                          {event.ip_address || event.remote_ip ? (
                            <div className="flex items-center gap-1 text-slate-400">
                              <MapPin size={14} />
                              <span className="font-mono text-xs">
                                {event.ip_address || event.remote_ip}
                              </span>
                            </div>
                          ) : null}
                        </div>

                        {expandedRows.has(eventKey) && (
                          <div className="mt-3 bg-slate-800/50 rounded-lg p-3">
                            <h4 className="text-slate-400 text-sm font-medium mb-2">
                              Event Details:
                            </h4>
                            <pre className="text-xs text-slate-300 overflow-x-auto">
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
                  </div>
                </React.Fragment>
                );
              })}
            </div>
            <div ref={eventsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthEventLogViewer;
