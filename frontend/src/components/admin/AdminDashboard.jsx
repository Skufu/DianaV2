// AdminDashboard: System administration with tabbed subviews
import React, { lazy, Suspense } from 'react';
import {
  getErrorMessage,
  useActiveModel,
  useAdminDashboard,
  useOperationsHealth,
  useUserProfile,
} from '../../api';
import {
  Shield,
  Users,
  Activity,
  FileText,
  Cpu,
  LayoutDashboard,
  Wifi,
  UserCheck,
  Server,
  Database,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  cardVariants,
  useReducedMotion,
  breathing,
} from '../../utils/animations';

// Lazy load subviews for code splitting
const UserManagement = lazy(() => import('./UserManagement'));
const AuditLogViewer = lazy(() => import('./AuditLogViewer'));
const ModelTraceability = lazy(() => import('./ModelTraceability'));
const AdminOperations = lazy(() => import('./AdminOperations'));
const AssessmentForm = lazy(() => import('../user/AssessmentForm'));
const AuthEventLogViewer = lazy(() => import('./AuthEventLogViewer'));
const ModelRationale = lazy(() => import('./ModelRationale'));

// activeView and setActiveView are now passed from App.jsx
// Navigation is handled by AdminSidebar
const AdminDashboard = ({ userRole, activeView = 'overview', setActiveView }) => {
  const isReduced = useReducedMotion();

  const canViewAdminData = userRole === 'admin';
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useAdminDashboard({ enabled: canViewAdminData });
  const { data: operationsData, isLoading: operationsLoading } = useOperationsHealth({
    enabled: canViewAdminData,
    refetchInterval: 60_000,
    retry: false,
  });
  const { data: activeModel } = useActiveModel({
    enabled: canViewAdminData,
    retry: false,
  });
  const { data: profile } = useUserProfile(true);
  const canViewAuditData = userRole === 'admin' || userRole === 'doctor';

  if (userRole !== 'admin' && userRole !== 'doctor') {
    return <AccessDenied message="Admin or Doctor role required to view this dashboard." />;
  }

  const ADMIN_ONLY_VIEWS = ['overview', 'users', 'audit', 'auth-events', 'models', 'operations'];
  const DOCTOR_ALLOWED_VIEWS = ['assessment', 'rationale'];

  const isAdminViewAllowed = userRole !== 'admin' || ADMIN_ONLY_VIEWS.includes(activeView);
  const isDoctorViewAllowed = userRole !== 'doctor' || DOCTOR_ALLOWED_VIEWS.includes(activeView);

  if (!isAdminViewAllowed || !isDoctorViewAllowed) {
    const deniedView = !isAdminViewAllowed ? 'Admin' : 'Doctor';
    return (
      <AccessDenied
        message={`${deniedView} role cannot access the "${activeView}" view. This view is for ${
          deniedView === 'Admin' ? 'doctor clinical workflows' : 'admin governance'
        }.`}
      />
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'assessment':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AssessmentForm
              initialData={profile}
              showModelSelector={userRole === 'admin'}
              lockedModelType={userRole === 'doctor' ? 'binary_v2_no_bp' : null}
              isClinicalView={true}
            />
          </Suspense>
        );
      case 'rationale':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ModelRationale />
          </Suspense>
        );

      case 'users':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <UserManagement />
          </Suspense>
        );
      case 'audit':
        if (!canViewAuditData) {
          return <AccessDenied message="Admin role required to view audit logs." />;
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AuditLogViewer />
          </Suspense>
        );
      case 'models':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ModelTraceability />
          </Suspense>
        );
      case 'operations':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AdminOperations />
          </Suspense>
        );
      case 'auth-events':
        if (!canViewAuditData) {
          return <AccessDenied message="Admin role required to view auth events." />;
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AuthEventLogViewer />
          </Suspense>
        );
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => {
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="glass-card p-6 border border-rose-200 text-rose-600 bg-white/80">
          {getErrorMessage(error, 'Failed to load dashboard data')}
        </div>
      );
    }

    const stats = dashboardData?.stats || {};
    const services = operationsData?.services || [];
    const logSources = operationsData?.log_sources || [];
    const healthStatus = operationsData?.status || (operationsLoading ? 'checking' : 'unknown');
    const isHealthy = healthStatus === 'healthy';

    const goTo = view => {
      if (typeof setActiveView === 'function') {
        setActiveView(view);
      }
    };

    const summaryCards = [
      {
        label: 'User Accounts',
        value: stats.total_users || 0,
        detail: `+${stats.new_users_this_month || 0} this month`,
        icon: Users,
        action: 'Manage users',
        view: 'users',
      },
      {
        label: 'New Signups',
        value: stats.new_users_this_month || 0,
        detail: 'Review access and onboarding',
        icon: UserCheck,
        action: 'Open users',
        view: 'users',
      },
      {
        label: 'Assessment Activity',
        value: stats.total_assessments || 0,
        detail: `+${stats.assessments_this_month || 0} this month`,
        icon: Activity,
        action: 'Review audit trail',
        view: 'audit',
      },
      {
        label: 'System Health',
        value: healthStatus,
        detail: isHealthy ? 'Backend, DB, and ML responding' : 'Open operations to inspect',
        icon: Server,
        action: 'Open operations',
        view: 'operations',
      },
    ];

    const taskCards = [
      {
        title: 'Access Control',
        description: 'Create accounts, change roles, deactivate users, and confirm admin access.',
        icon: Users,
        view: 'users',
        action: 'Manage Users',
      },
      {
        title: 'Audit Review',
        description: 'Check administrative changes and authentication activity for accountability.',
        icon: FileText,
        view: 'audit',
        action: 'Open Audit Logs',
      },
      {
        title: 'Live Auth Monitoring',
        description: 'Watch successful and failed login events during demos or security checks.',
        icon: Wifi,
        view: 'auth-events',
        action: 'Open Auth Events',
      },
      {
        title: 'Operations Checks',
        description: 'Confirm service health and inspect backend or ML logs without SSH.',
        icon: Server,
        view: 'operations',
        action: 'Open Operations',
      },
      {
        title: 'Model Registry',
        description: 'Verify the active model version, dataset lineage, and sync status.',
        icon: Cpu,
        view: 'models',
        action: 'Open Model Tracking',
      },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryCards.map(card => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.label}
                type="button"
                variants={cardVariants}
                initial="offscreen"
                whileInView="onscreen"
                viewport={{ once: true, amount: 0.3 }}
                whileHover={isReduced ? undefined : { y: -2 }}
                onClick={() => goTo(card.view)}
                className="glass-card min-h-[168px] rounded-lg border border-slate-200/70 bg-white/90 p-5 text-left shadow-sm transition-colors hover:border-indigo-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:ring-offset-2"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Icon size={21} />
                  </span>
                  <ArrowRight size={17} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <h3 className="mt-1 text-2xl font-bold capitalize text-slate-950">{card.value}</h3>
                <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
                <p className="mt-4 text-sm font-semibold text-indigo-600">{card.action}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            className="glass-card rounded-lg border border-slate-200/70 bg-white/90 p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Admin Work Queue
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">Primary Responsibilities</h3>
              </div>
              <LayoutDashboard className="text-slate-400" size={22} />
            </div>
            <div className="space-y-3">
              {taskCards.map(task => {
                const Icon = task.icon;
                return (
                  <button
                    key={task.title}
                    type="button"
                    onClick={() => goTo(task.view)}
                    className="flex w-full items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:ring-offset-2"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-950">
                        {task.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-slate-500">
                        {task.description}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600">
                        {task.action}
                        <ArrowRight size={14} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            className="glass-card rounded-lg border border-slate-200/70 bg-white/90 p-6 shadow-sm"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Production Status
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-950">System Snapshot</h3>
              </div>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                  isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {healthStatus}
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Server size={18} className="text-slate-500" />
                  <h4 className="font-semibold text-slate-950">Services</h4>
                </div>
                <div className="space-y-2">
                  {services.length > 0 ? (
                    services.map(service => (
                      <div
                        key={service.name}
                        className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2"
                      >
                        <span className="text-sm font-medium capitalize text-slate-700">
                          {service.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                            service.status === 'healthy' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <CheckCircle size={14} />
                          {service.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Service health has not loaded yet.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <Cpu size={16} />
                    <span className="text-sm font-medium">Active Model</span>
                  </div>
                  <p className="truncate text-lg font-bold text-slate-950">
                    {activeModel?.model_version || 'Not registered'}
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo('models')}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"
                  >
                    View registry
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-2 flex items-center gap-2 text-slate-500">
                    <Database size={16} />
                    <span className="text-sm font-medium">Log Sources</span>
                  </div>
                  <p className="text-lg font-bold text-slate-950">
                    {logSources.filter(source => source.available).length}/{logSources.length || 2}
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo('operations')}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600"
                  >
                    Check logs
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={cardVariants}
          initial="offscreen"
          whileInView="onscreen"
          viewport={{ once: true, amount: 0.3 }}
          className="glass-card rounded-lg border border-slate-200/70 bg-white/90 p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Admin Boundary
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">
                Clinical analytics moved out of Admin
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Cluster distribution, biomarker trends, and high-risk patient review belong to
                clinical or research views. Admin stays focused on access, auditability, deployment
                health, logs, and model governance.
              </p>
            </div>
            <Clock className="hidden text-slate-300 md:block" size={36} />
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-violet-600" size={28} />
          <h4 className="text-violet-600 font-medium text-sm">
            {userRole === 'doctor' ? 'Clinical Review' : 'System Administration'}
          </h4>
        </div>
        <h2 className="text-3xl font-bold text-slate-900">
          {userRole === 'doctor' ? 'Doctor Dashboard' : 'Admin Dashboard'}
        </h2>
      </header>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

// Loading spinner component with purple theme
const LoadingSpinner = () => (
  <motion.div
    variants={breathing}
    animate="animate"
    className="glass-card p-12 text-center bg-white/80"
  >
    <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4" />
    <p className="text-slate-500">Loading...</p>
  </motion.div>
);

const AccessDenied = ({ message = 'Admin role required to view this dashboard.' }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
    className="glass-card p-12 text-center bg-white/80"
  >
    <Shield className="w-16 h-16 text-rose-500 mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
    <p className="text-slate-500">{message}</p>
  </motion.div>
);

export default AdminDashboard;
