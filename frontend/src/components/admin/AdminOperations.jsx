import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  FileText,
  HardDrive,
  RefreshCw,
  Search,
  Server,
  XCircle,
} from 'lucide-react';
import { getErrorMessage, useOperationsHealth, useSystemLogs } from '../../api';

const statusStyles = {
  healthy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  degraded: 'bg-amber-50 text-amber-700 border-amber-200',
  unhealthy: 'bg-rose-50 text-rose-700 border-rose-200',
  unknown: 'bg-slate-50 text-slate-600 border-slate-200',
};

const levelStyles = {
  debug: 'bg-slate-100 text-slate-600',
  info: 'bg-blue-50 text-blue-700',
  warn: 'bg-amber-50 text-amber-700',
  error: 'bg-rose-50 text-rose-700',
  fatal: 'bg-rose-100 text-rose-800',
  panic: 'bg-rose-100 text-rose-800',
};

const serviceIcons = {
  backend: Server,
  database: Database,
  ml: Activity,
};

const formatBytes = bytes => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatTime = value => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getStatusIcon = status => {
  if (status === 'healthy') return CheckCircle;
  if (status === 'unhealthy') return XCircle;
  if (status === 'degraded') return AlertTriangle;
  return Clock;
};

const StatusBadge = ({ status }) => {
  const Icon = getStatusIcon(status);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.unknown
      }`}
    >
      <Icon size={13} />
      {status || 'unknown'}
    </span>
  );
};

const AdminOperations = () => {
  const [service, setService] = useState('backend');
  const [level, setLevel] = useState('');
  const [limit, setLimit] = useState('200');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const logParams = useMemo(() => {
    const params = { service, limit };
    if (level) params.level = level;
    if (appliedSearch) params.q = appliedSearch;
    return params;
  }, [service, level, limit, appliedSearch]);

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useOperationsHealth({ refetchInterval: 30000 });

  const {
    data: logs,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
    isFetching: logsFetching,
  } = useSystemLogs(logParams);

  const services = health?.services ?? [];
  const logSources = health?.log_sources ?? [];
  const entries = logs?.data ?? [];

  const handleSearch = event => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const refreshAll = () => {
    refetchHealth();
    refetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Activity className="text-indigo-600" size={26} />
            Operations
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Secure app health and application logs for admin review
          </p>
        </div>
        <button
          type="button"
          onClick={refreshAll}
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw size={16} className={logsFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {healthError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {getErrorMessage(healthError, 'Failed to load operations health')}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {healthLoading
          ? ['backend', 'database', 'ml'].map(serviceName => (
              <div
                key={serviceName}
                className="glass-card min-h-[132px] animate-pulse border border-slate-200/50 bg-white/80 p-5"
              />
            ))
          : services.map(item => {
              const Icon = serviceIcons[item.name] || Server;
              return (
                <div
                  key={item.name}
                  className="glass-card border border-slate-200/50 bg-white/80 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold capitalize text-slate-900">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{item.detail || 'N/A'}</p>
                      </div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {typeof item.latency_ms === 'number' && (
                    <p className="mt-4 text-xs text-slate-500">{item.latency_ms} ms latency</p>
                  )}
                </div>
              );
            })}
      </section>

      <section className="glass-card border border-slate-200/50 bg-white/80 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <HardDrive size={18} className="text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Log Sources</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {logSources.map(source => (
            <div
              key={source.service}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold capitalize text-slate-800">
                  {source.service}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    source.available
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {source.available ? 'Available' : 'Waiting'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {source.available
                  ? `${formatBytes(source.size_bytes)} · Updated ${formatTime(source.modified_at)}`
                  : source.detail || 'No log file yet'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card overflow-hidden border border-slate-200/50 bg-white/80 shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <FileText size={20} className="text-cyan-600" />
                Application Logs
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Latest redacted backend and ML application logs
              </p>
            </div>
            {logs?.truncated && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                Tail view
              </span>
            )}
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <select
              value={service}
              onChange={event => setService(event.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none lg:col-span-2"
            >
              <option value="backend">Backend</option>
              <option value="ml">ML</option>
            </select>
            <select
              value={level}
              onChange={event => setLevel(event.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none lg:col-span-2"
            >
              <option value="">All levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="fatal">Fatal</option>
            </select>
            <select
              value={limit}
              onChange={event => setLimit(event.target.value)}
              className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none lg:col-span-2"
            >
              <option value="100">100 lines</option>
              <option value="200">200 lines</option>
              <option value="500">500 lines</option>
              <option value="1000">1000 lines</option>
            </select>
            <div className="relative lg:col-span-5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={searchInput}
                onChange={event => setSearchInput(event.target.value)}
                placeholder="Search message, request ID, or JSON field"
                className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="min-h-[40px] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 lg:col-span-1"
            >
              Apply
            </button>
          </form>
        </div>

        {logsError && (
          <div className="border-b border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            {getErrorMessage(logsError, 'Failed to load application logs')}
          </div>
        )}

        {logsLoading ? (
          <div className="p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          </div>
        ) : !logs?.available ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Logs are not available yet. Confirm the deployment has `DIANA_LOG_DIR` configured.
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No log entries found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {entries.map(entry => (
              <article
                key={`${entry.service}-${entry.timestamp || entry.request_id || entry.raw.slice(0, 80)}`}
                className="p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      levelStyles[entry.level] || levelStyles.info
                    }`}
                  >
                    {entry.level || 'log'}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {entry.service}
                  </span>
                  <span className="text-xs text-slate-500">{formatTime(entry.timestamp)}</span>
                  {entry.request_id && (
                    <span className="rounded bg-cyan-50 px-2 py-1 font-mono text-xs text-cyan-700">
                      {entry.request_id}
                    </span>
                  )}
                </div>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100">
                  {entry.raw}
                </pre>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminOperations;
