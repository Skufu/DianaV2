// UserManagement: Admin user CRUD with pagination
import React, { useEffect, useState, useCallback } from 'react';
import {
    fetchAdminUsersApi,
    createAdminUserApi,
    updateAdminUserApi,
    deactivateAdminUserApi,
    activateAdminUserApi
} from '../../api';
import {
    Users, Plus, Edit2, UserX, UserCheck, Search, X, ChevronLeft, ChevronRight,
    AlertCircle, CheckCircle
} from 'lucide-react';

const UserManagement = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState({ email: '', password: '', role: 'clinician' });
    const [formError, setFormError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = { page, page_size: pageSize };
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            if (activeFilter !== '') params.is_active = activeFilter === 'active';

            const response = await fetchAdminUsersApi(token, params);
            setUsers(response.data || []);
            setTotal(response.total || 0);
            setTotalPages(response.total_pages || 1);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, page, pageSize, search, roleFilter, activeFilter]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        loadUsers();
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            await createAdminUserApi(token, formData);
            setSuccess('User created successfully');
            setShowCreateModal(false);
            setFormData({ email: '', password: '', role: 'clinician' });
            loadUsers();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setFormError(err.message || 'Failed to create user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);

        try {
            await updateAdminUserApi(token, selectedUser.id, {
                email: formData.email,
                role: formData.role,
            });
            setSuccess('User updated successfully');
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setFormError(err.message || 'Failed to update user');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeactivate = async (user) => {
        if (!confirm(`Deactivate user ${user.email}?`)) return;

        try {
            await deactivateAdminUserApi(token, user.id);
            setSuccess('User deactivated');
            loadUsers();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message || 'Failed to deactivate user');
        }
    };

    const handleActivate = async (user) => {
        try {
            await activateAdminUserApi(token, user.id);
            setSuccess('User activated');
            loadUsers();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message || 'Failed to activate user');
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({ email: user.email, role: user.role, password: '' });
        setFormError(null);
        setShowEditModal(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Users className="text-teal-400" size={24} />
                        User Management
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Manage clinician and admin accounts</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({ email: '', password: '', role: 'clinician' });
                        setFormError(null);
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white rounded-lg transition-colors"
                >
                    <Plus size={18} />
                    <span>Add User</span>
                </button>
            </div>

            {/* Alerts */}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                    <CheckCircle size={18} />
                    {success}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400">
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="glass-card p-4">
                <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="user-search" className="text-slate-400 text-sm block mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                id="user-search"
                                name="search"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by email..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="user-role-filter" className="text-slate-400 text-sm block mb-1">Role</label>
                        <select
                            id="user-role-filter"
                            name="roleFilter"
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                        >
                            <option value="">All Roles</option>
                            <option value="clinician">Clinician</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="user-status-filter" className="text-slate-400 text-sm block mb-1">Status</label>
                        <select
                            id="user-status-filter"
                            name="activeFilter"
                            value={activeFilter}
                            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
                    >
                        Apply
                    </button>
                </form>
            </div>

            {/* Users Table */}
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
                                    <th className="px-4 py-3 text-slate-400 font-medium">Email</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Role</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Status</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Last Login</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium">Created</th>
                                    <th className="px-4 py-3 text-slate-400 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                                            No users found
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                            <td className="px-4 py-3 text-white">{user.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'admin'
                                                        ? 'bg-violet-500/20 text-violet-400'
                                                        : 'bg-teal-500/20 text-teal-400'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_active !== false
                                                        ? 'bg-emerald-500/20 text-emerald-400'
                                                        : 'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                    {user.is_active !== false ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-sm">
                                                {user.last_login_at
                                                    ? new Date(user.last_login_at).toLocaleDateString()
                                                    : 'Never'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-sm">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                                        title="Edit user"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    {user.is_active !== false ? (
                                                        <button
                                                            onClick={() => handleDeactivate(user)}
                                                            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                                            title="Deactivate user"
                                                        >
                                                            <UserX size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleActivate(user)}
                                                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/50 rounded-lg transition-colors"
                                                            title="Activate user"
                                                        >
                                                            <UserCheck size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
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

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-6 w-full max-w-md m-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">Create User</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label htmlFor="create-user-email" className="text-slate-300 text-sm block mb-1">Email</label>
                                <input
                                    id="create-user-email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="create-user-password" className="text-slate-300 text-sm block mb-1">Password</label>
                                <input
                                    id="create-user-password"
                                    name="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                                />
                                <p className="text-slate-500 text-xs mt-1">Minimum 8 characters</p>
                            </div>
                            <div>
                                <label htmlFor="create-user-role" className="text-slate-300 text-sm block mb-1">Role</label>
                                <select
                                    id="create-user-role"
                                    name="role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                                >
                                    <option value="clinician">Clinician</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-card p-6 w-full max-w-md m-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white">Edit User</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {formError && (
                            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div>
                                <label htmlFor="edit-user-email" className="text-slate-300 text-sm block mb-1">Email</label>
                                <input
                                    id="edit-user-email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="edit-user-role" className="text-slate-300 text-sm block mb-1">Role</label>
                                <select
                                    id="edit-user-role"
                                    name="role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white focus:border-teal-500 focus:outline-none"
                                >
                                    <option value="clinician">Clinician</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
