// ClinicDashboard: Aggregate statistics for clinic administrators
import React, { useEffect, useState, useMemo } from 'react';
import { fetchUserClinicsApi, fetchClinicDashboardApi } from '../../api';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Building2, Users, Activity, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import { shouldAnimateCharts } from '../../utils/deviceCapabilities';

const COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#F43F5E', '#6366F1'];

const ClinicDashboard = ({ token }) => {
    const [clinics, setClinics] = useState([]);
    const [selectedClinic, setSelectedClinic] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const animateCharts = useMemo(() => shouldAnimateCharts(), []);

    // Load user's clinics
    useEffect(() => {
        if (!token) return;
        const loadClinics = async () => {
            try {
                const data = await fetchUserClinicsApi(token);
                setClinics(data || []);
                // Auto-select first clinic where user is admin
                const adminClinic = data?.find(c => c.role === 'clinic_admin');
                if (adminClinic) {
                    setSelectedClinic(adminClinic.id);
                } else if (data?.length > 0) {
                    setSelectedClinic(data[0].id);
                }
            } catch (err) {
                console.error('Failed to load clinics:', err);
            }
        };
        loadClinics();
    }, [token]);

    // Load selected clinic's dashboard
    useEffect(() => {
        if (!token || !selectedClinic) return;
        const loadDashboard = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchClinicDashboardApi(token, selectedClinic);
                setDashboard(data);
            } catch (err) {
                if (err.message?.includes('403')) {
                    setError('Access denied. You need clinic_admin role for this clinic.');
                } else {
                    setError('Failed to load clinic dashboard');
                }
                setDashboard(null);
            } finally {
                setLoading(false);
            }
        };
        loadDashboard();
    }, [token, selectedClinic]);

    if (clinics.length === 0 && !loading) {
        return (
            <div className="glass-card p-12 text-center">
                <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">No Clinics Found</h2>
                <p className="text-slate-400">You are not a member of any clinics yet.</p>
            </div>
        );
    }

    const stats = dashboard?.stats || {};
    const clusterDist = dashboard?.cluster_distribution || [];
    const currentClinic = clinics.find(c => c.id === selectedClinic);
    const isClinicAdmin = currentClinic?.role === 'clinic_admin';

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="text-teal-400" size={28} />
                        <h4 className="text-slate-400 font-medium text-sm">Clinic Administration</h4>
                    </div>
                    <h2 className="text-3xl font-bold text-white">Clinic Dashboard</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Aggregate statistics for your clinic
                    </p>
                </div>

                {/* Clinic Selector */}
                {clinics.length > 1 && (
                    <div className="relative">
                        <select
                            value={selectedClinic || ''}
                            onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
                            className="bg-slate-700/50 text-white border border-slate-600 rounded-xl px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                        >
                            {clinics.map(clinic => (
                                <option key={clinic.id} value={clinic.id}>
                                    {clinic.name} {clinic.role === 'clinic_admin' ? '(Admin)' : ''}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                    </div>
                )}
            </header>

            {loading && (
                <div className="glass-card p-12 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-slate-400">Loading clinic data...</p>
                </div>
            )}

            {error && !loading && (
                <div className="glass-card p-6 border border-rose-500/30 text-rose-400">
                    {error}
                </div>
            )}

            {!loading && !error && dashboard && (
                <>
                    {/* Role indicator */}
                    {!isClinicAdmin && (
                        <div className="glass-card p-4 border border-amber-500/30 text-amber-400 text-sm">
                            You are viewing as a member. Full admin features require clinic_admin role.
                        </div>
                    )}

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <Users className="text-violet-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{stats.total_patients || 0}</h3>
                            <p className="text-slate-400 text-sm mt-1">Total Patients</p>
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center">
                                    <Activity className="text-teal-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{stats.total_assessments || 0}</h3>
                            <p className="text-slate-400 text-sm mt-1">Total Assessments</p>
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                                    <TrendingUp className="text-cyan-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{(stats.avg_risk_score || 0).toFixed(1)}%</h3>
                            <p className="text-slate-400 text-sm mt-1">Avg Risk Score</p>
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
                                    <AlertTriangle className="text-rose-400" size={24} />
                                </div>
                            </div>
                            <h3 className="text-3xl font-bold text-white">{stats.high_risk_count || 0}</h3>
                            <p className="text-slate-400 text-sm mt-1">High Risk Patients</p>
                            <p className="text-emerald-400 text-xs mt-2">+{stats.assessments_this_month || 0} assessments this month</p>
                        </div>
                    </div>

                    {/* Cluster Distribution */}
                    <div className="glass-card p-8">
                        <h3 className="text-2xl font-bold text-white mb-6">T2DM Cluster Distribution</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            {clusterDist.length > 0 ? (
                                <BarChart data={clusterDist} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                    <XAxis dataKey="cluster" stroke="#94A3B8" />
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
                                    <Bar dataKey="count" name="Patient Count" radius={[8, 8, 0, 0]} isAnimationActive={animateCharts}>
                                        {clusterDist.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    No cluster data available. Complete patient assessments to see distribution.
                                </div>
                            )}
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </div>
    );
};

export default ClinicDashboard;
