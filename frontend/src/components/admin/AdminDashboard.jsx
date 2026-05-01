// AdminDashboard: System administration with tabbed subviews
import React, { useState, useMemo, lazy, Suspense } from 'react';
import Insights from '../insights/Insights';
import { useAdminDashboard, useClinicComparison, useUserProfile } from '../../api';
import { shouldDisableHeavyEffects } from '../../utils/deviceCapabilities';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Shield,
  Users,
  Activity,
  Building2,
  TrendingUp,
  AlertTriangle,
  FileText,
  Cpu,
  LayoutDashboard,
  Wifi,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  staggerContainer,
  fadeIn,
  cardVariants,
  slideUp,
  useReducedMotion,
  breathing,
} from '../../utils/animations';

// Lazy load subviews for code splitting
const UserManagement = lazy(() => import('./UserManagement'));
const AuditLogViewer = lazy(() => import('./AuditLogViewer'));
const ModelTraceability = lazy(() => import('./ModelTraceability'));
const AssessmentForm = lazy(() => import('../user/AssessmentForm'));
const AuthEventLogViewer = lazy(() => import('./AuthEventLogViewer'));
const ModelRationale = lazy(() => import('./ModelRationale'));


const PREMIUM_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#F43F5E'];

// activeView and setActiveView are now passed from App.jsx
// Navigation is handled by AdminSidebar
const AdminDashboard = ({ userRole, activeView = 'overview' }) => {
  const isReduced = useReducedMotion();

  const canViewAdminData = userRole === 'admin';
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useAdminDashboard({ enabled: canViewAdminData });
  const { data: clinicsData } = useClinicComparison({ enabled: canViewAdminData });
  const { data: profile } = useUserProfile(true);
  const canViewAuditData = userRole === 'admin' || userRole === 'doctor';
  const clinics = clinicsData ?? [];

if (userRole !== 'admin' && userRole !== 'doctor') {
    return <AccessDenied message="Admin or Doctor role required to view this dashboard." />;
  }

  const ADMIN_ONLY_VIEWS = ['overview', 'users', 'audit', 'auth-events', 'models'];
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
      case 'auth-events':
        if (!canViewAuditData) {
          return <AccessDenied message="Admin role required to view auth events." />;
        }
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <AuthEventLogViewer />
          </Suspense>
        );
      case 'insights':
        return <Insights />;
      default:
        return renderOverview();
    }
  };

  const renderOverview = () => {
    // If we have a token and data is loading, show spinner
    // If we don't have a token yet, we might be in a transitional state (handled by App.jsx usually),
    // but we shouldn't block rendering if we just want to show the shell.
    // However, for data-dependent views, we do need data.
    // React Query's isLoading is true for initial fetch. isPending is better in v5.
    // Assuming v4/v5, safely check loading state only when we expect it to load.
    if (isLoading) {
      return <LoadingSpinner />;
    }

    if (error) {
      return (
        <div className="glass-card p-6 border border-rose-200 text-rose-600 bg-white/80">
          {error.message || 'Failed to load dashboard data'}
        </div>
      );
    }

    const stats = dashboardData?.stats || {};
    const clusterDist = dashboardData?.cluster_distribution || null;
    const trends = dashboardData?.trends || null;

    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-6 bg-white/80 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/20 flex items-center justify-center">
                <Users className="text-white" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{stats.total_users || 0}</h3>
            <p className="text-slate-500 text-sm mt-1">Total Users</p>
            <p className="text-emerald-600 text-xs mt-2">
              +{stats.new_users_this_month || 0} this month
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-6 bg-white/80 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/20 flex items-center justify-center">
                <Activity className="text-white" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{stats.total_patients || 0}</h3>
            <p className="text-slate-500 text-sm mt-1">Total Patients</p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-6 bg-white/80 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-teal-500/20 flex items-center justify-center">
                <TrendingUp className="text-white" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{stats.total_assessments || 0}</h3>
            <p className="text-slate-500 text-sm mt-1">Total Assessments</p>
            <p className="text-emerald-600 text-xs mt-2">
              +{stats.assessments_this_month || 0} this month
            </p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-6 bg-white/80 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-red-500 shadow-lg shadow-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="text-white" size={24} />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-slate-900">{stats.high_risk_count || 0}</h3>
            <p className="text-slate-500 text-sm mt-1">High Risk Patients</p>
            <p className="text-slate-500 text-xs mt-2">
              Avg Risk: {(stats.avg_risk_score || 0).toFixed(1)}%
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cluster Distribution */}
          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-8 bg-white/80 shadow-sm border border-slate-200/50"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">T2DM Cluster Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              {clusterDist && clusterDist.length > 0 ? (
                <PieChart>
                  <Pie
                    data={clusterDist}
                    dataKey="count"
                    nameKey="cluster"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    cornerRadius={6}
                    stroke="none"
                    label={({ cluster, count }) => `${cluster} (${count})`}
                    labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                    isAnimationActive={!shouldDisableHeavyEffects()}
                  >
                    {clusterDist.map(c => (
                      <Cell key={c.cluster} fill={PREMIUM_COLORS[clusterDist.indexOf(c) % PREMIUM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(27, 37, 89, 0.9)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No cluster data available
                </div>
              )}
            </ResponsiveContainer>
          </motion.div>

          {/* Biomarker Trends */}
          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-8 bg-white/80 shadow-sm border border-slate-200/50"
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Biomarker Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              {trends && trends.length > 0 ? (
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorBmi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      color: '#0f172a',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Area
                    type="monotone"
                    dataKey="risk_score"
                    name="Avg Risk Score"
                    stroke="#F43F5E"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRisk)"
                    isAnimationActive={!shouldDisableHeavyEffects()}
                  />
                  <Area
                    type="monotone"
                    dataKey="bmi"
                    name="Avg BMI"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorBmi)"
                    isAnimationActive={!shouldDisableHeavyEffects()}
                  />
                </AreaChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  No trend data available
                </div>
              )}
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Clinic Comparison Table */}
        {clinics.length > 0 && (
          <motion.div
            variants={cardVariants}
            initial="offscreen"
            whileInView="onscreen"
            viewport={{ once: true, amount: 0.3 }}
            whileHover="hover"
            className="glass-card p-8 overflow-x-auto bg-white/80 shadow-sm border border-slate-200/50"
          >
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="text-teal-600" size={24} />
              <h3 className="text-2xl font-bold text-slate-900">Clinic Comparison</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="text-left py-3 px-4">Clinic</th>
                  <th className="text-right py-3 px-4">Patients</th>
                  <th className="text-right py-3 px-4">Assessments</th>
                  <th className="text-right py-3 px-4">Avg Risk</th>
                  <th className="text-right py-3 px-4">High Risk</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map(clinic => (
                  <tr
                    key={clinic.clinic_id}
                    className="border-b border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: PREMIUM_COLORS[clinics.indexOf(clinic) % PREMIUM_COLORS.length] }}
                      />
                      {clinic.clinic_name}
                    </td>
                    <td className="text-right py-3 px-4">{clinic.patient_count}</td>
                    <td className="text-right py-3 px-4">{clinic.assessment_count}</td>
                    <td className="text-right py-3 px-4">
                      {clinic.avg_risk_score?.toFixed(1) || 'N/A'}%
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={clinic.high_risk_count > 0 ? 'text-rose-600' : ''}>
                        {clinic.high_risk_count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
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
