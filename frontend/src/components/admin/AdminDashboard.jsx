// AdminDashboard: System administration with tabbed subviews
import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { fetchAdminDashboardApi, fetchClinicComparisonApi } from '../../api';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Shield, Users, Activity, Building2, TrendingUp, AlertTriangle, FileText, Cpu, LayoutDashboard } from 'lucide-react';
import { shouldAnimateCharts } from '../../utils/deviceCapabilities';

// Lazy load subviews for code splitting
const UserManagement = lazy(() => import('./UserManagement'));
const AuditLogViewer = lazy(() => import('./AuditLogViewer'));
const ModelTraceability = lazy(() => import('./ModelTraceability'));

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#6366F1'];

const AdminDashboard = ({ token, userRole }) => {
    const [activeView, setActiveView] = useState('overview');
    const [data, setData] = useState(null);
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const animateCharts = useMemo(() => shouldAnimateCharts(), []);

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'audit', label: 'Audit Logs', icon: FileText },
        { id: 'models', label: 'Model Tracking', icon: Cpu },
    ];

    useEffect(() => {
        if (!token || userRole !== 'admin' || activeView !== 'overview') return;

        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const [dashboard, comparison] = await Promise.all([
                    fetchAdminDashboardApi(token),
                    fetchClinicComparisonApi(token).catch(() => [])
                ]);
                setData(dashboard);
                setClinics(comparison || []);
            } catch (err) {
                setError('Failed to load admin dashboard');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token, userRole, activeView]);

    if (userRole !== 'admin') {
        return (
            <div className="glass-card p-12 text-center">
                <Shield className="w-16 h-16 text-rose-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                <p className="text-slate-400">Admin role required to view this dashboard.</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeView) {
            case 'users':
                return (
                    <Suspense fallback={<LoadingSpinner />}>
                        <UserManagement token={token} />
                    </Suspense>
                );
            case 'audit':
                return (
                    <Suspense fallback={<LoadingSpinner />}>
                        <AuditLogViewer token={token} />
                    </Suspense>
                );
            case 'models':
                return (
                    <Suspense fallback={<LoadingSpinner />}>
                        <ModelTraceability token={token} />
                    </Suspense>
                );
            default:
                return renderOverview();
        }
    };

    const renderOverview = () => {
        if (loading) {
            return <LoadingSpinner />;
        }

        if (error) {
            return (
                <div className="glass-card p-6 border border-rose-500/30 text-rose-400">
                    {error}
                </div>
            );
        }

        const stats = data?.stats || {};
        const clusterDist = data?.cluster_distribution || [];
        const trends = data?.trends || [];

        return (
            <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                                <Users className="text-violet-400" size={24} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{stats.total_users || 0}</h3>
                        <p className="text-slate-400 text-sm mt-1">Total Users</p>
                        <p className="text-emerald-400 text-xs mt-2">+{stats.new_users_this_month || 0} this month</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
                                <Activity className="text-teal-400" size={24} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{stats.total_patients || 0}</h3>
                        <p className="text-slate-400 text-sm mt-1">Total Patients</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                <TrendingUp className="text-cyan-400" size={24} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{stats.total_assessments || 0}</h3>
                        <p className="text-slate-400 text-sm mt-1">Total Assessments</p>
                        <p className="text-emerald-400 text-xs mt-2">+{stats.assessments_this_month || 0} this month</p>
                    </div>

                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                                <AlertTriangle className="text-rose-400" size={24} />
                            </div>
                        </div>
                        <h3 className="text-3xl font-bold text-white">{stats.high_risk_count || 0}</h3>
                        <p className="text-slate-400 text-sm mt-1">High Risk Patients</p>
                        <p className="text-slate-500 text-xs mt-2">Avg Risk: {(stats.avg_risk_score || 0).toFixed(1)}%</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cluster Distribution */}
                    <div className="glass-card p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">T2DM Cluster Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            {clusterDist.length > 0 ? (
                                <PieChart>
                                    <Pie
                                        data={clusterDist}
                                        dataKey="count"
                                        nameKey="cluster"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={({ cluster, count }) => `${cluster}: ${count}`}
                                        isAnimationActive={animateCharts}
                                    >
                                        {clusterDist.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1B2559',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#fff'
                                        }}
                                    />
                                </PieChart>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    No cluster data available
                                </div>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* Biomarker Trends */}
                    <div className="glass-card p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">Biomarker Trends</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            {trends.length > 0 ? (
                                <LineChart data={trends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                    <XAxis dataKey="label" stroke="#94A3B8" style={{ fontSize: '12px' }} />
                                    <YAxis stroke="#94A3B8" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1B2559',
                                            border: 'none',
                                            borderRadius: '12px',
                                            color: '#fff'
                                        }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="hba1c" name="HbA1c" stroke="#7C3AED" strokeWidth={2} isAnimationActive={animateCharts} />
                                    <Line type="monotone" dataKey="fbs" name="FBS" stroke="#06B6D4" strokeWidth={2} isAnimationActive={animateCharts} />
                                </LineChart>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    No trend data available
                                </div>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Clinic Comparison Table */}
                {clinics.length > 0 && (
                    <div className="glass-card p-8 overflow-x-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <Building2 className="text-teal-400" size={24} />
                            <h3 className="text-2xl font-bold text-white">Clinic Comparison</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-400 border-b border-slate-600/50">
                                    <th className="text-left py-3 px-4">Clinic</th>
                                    <th className="text-right py-3 px-4">Patients</th>
                                    <th className="text-right py-3 px-4">Assessments</th>
                                    <th className="text-right py-3 px-4">Avg Risk</th>
                                    <th className="text-right py-3 px-4">High Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clinics.map((clinic, i) => (
                                    <tr key={clinic.clinic_id} className="border-b border-slate-700/50 text-white hover:bg-slate-700/30">
                                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                            />
                                            {clinic.clinic_name}
                                        </td>
                                        <td className="text-right py-3 px-4">{clinic.patient_count}</td>
                                        <td className="text-right py-3 px-4">{clinic.assessment_count}</td>
                                        <td className="text-right py-3 px-4">{clinic.avg_risk_score?.toFixed(1) || 'N/A'}%</td>
                                        <td className="text-right py-3 px-4">
                                            <span className={clinic.high_risk_count > 0 ? 'text-rose-400' : ''}>
                                                {clinic.high_risk_count}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            {/* Header */}
            <header>
                <div className="flex items-center gap-3 mb-2">
                    <Shield className="text-violet-400" size={28} />
                    <h4 className="text-slate-400 font-medium text-sm">System Administration</h4>
                </div>
                <h2 className="text-3xl font-bold text-white">Admin Dashboard</h2>
            </header>

            {/* Tab Navigation */}
            <div className="glass-card p-1 flex flex-wrap gap-1">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeView === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveView(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-teal-500/20 text-teal-400'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                }`}
                        >
                            <Icon size={18} />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {renderContent()}
        </div>
    );
};

// Loading spinner component
const LoadingSpinner = () => (
    <div className="glass-card p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-400">Loading...</p>
    </div>
);

export default AdminDashboard;
