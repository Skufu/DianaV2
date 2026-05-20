// UserManagement: Admin user CRUD with pagination
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchAdminUsersApi,
  createAdminUserApi,
  updateAdminUserApi,
  deactivateAdminUserApi,
  activateAdminUserApi,
  getErrorMessage,
} from '../../api';
import {
  Users,
  Plus,
  Edit2,
  UserX,
  UserCheck,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  staggerContainer,
  fadeIn,
  slideUp,
  cardVariants,
  useReducedMotion,
} from '../../utils/animations';

const UserManagement = () => {
  const isReduced = useReducedMotion();
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
  const [formData, setFormData] = useState({ email: '', password: '', role: 'user' });
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

      const response = await fetchAdminUsersApi(params);
      const loadedUsers = Array.isArray(response?.data) ? response.data : [];
      const loadedTotal = Number.isFinite(response?.total) ? response.total : loadedUsers.length;
      const loadedTotalPagesRaw = Number.isFinite(response?.total_pages)
        ? response.total_pages
        : Math.ceil((loadedTotal || 0) / pageSize);
      const loadedTotalPages = Math.max(1, loadedTotalPagesRaw || 1);

      setUsers(loadedUsers);
      setTotal(loadedTotal);
      setTotalPages(loadedTotalPages);

      if (loadedTotal > 0 && page > loadedTotalPages) {
        setPage(loadedTotalPages);
      }
      if (loadedTotal === 0 && page !== 1) {
        setPage(1);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleFilter, activeFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = e => {
    e.preventDefault();
    if (page !== 1) {
      setPage(1);
      return;
    }
    loadUsers();
  };

  const handleCreateUser = async e => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createAdminUserApi(formData);
      setSuccess('User created successfully');
      setShowCreateModal(false);
      setFormData({ email: '', password: '', role: 'user' });
      loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to create user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async e => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await updateAdminUserApi(selectedUser.id, {
        email: formData.email,
        role: formData.role,
      });
      setSuccess('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to update user'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async user => {
    if (!confirm(`Deactivate user ${user.email}?`)) return;

    try {
      await deactivateAdminUserApi(user.id);
      setSuccess('User deactivated');
      loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to deactivate user'));
    }
  };

  const handleActivate = async user => {
    try {
      await activateAdminUserApi(user.id);
      setSuccess('User activated');
      loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to activate user'));
    }
  };

  const openEditModal = user => {
    setSelectedUser(user);
    setFormData({ email: user.email, role: user.role, password: '' });
    setFormError(null);
    setShowEditModal(true);
  };

  const rowVariants = {
    hidden: { opacity: 0, x: isReduced ? 0 : -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
    exit: {
      opacity: 0,
      scale: isReduced ? 1 : 0.95,
      x: isReduced ? 0 : 20,
      transition: { duration: 0.2 },
    },
  };

  const showingFrom = useMemo(() => {
    if (total === 0 || users.length === 0) return 0;
    return (page - 1) * pageSize + 1;
  }, [page, pageSize, total, users.length]);

  const showingTo = useMemo(() => {
    if (total === 0 || users.length === 0) return 0;
    return Math.min(page * pageSize, total);
  }, [page, pageSize, total, users.length]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeIn}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-indigo-500/20">
            <Users size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500">Manage user accounts, roles, and permissions</p>
          </div>
        </div>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={fadeIn} className="flex items-center justify-between px-1">
          <p className="text-slate-500 text-sm">
            Showing {showingFrom} to {showingTo} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-slate-900 text-sm">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Create User Button */}
      <motion.div variants={fadeIn} className="mb-6">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
        >
          <Plus size={20} />
          <span>Create User</span>
        </motion.button>
      </motion.div>

      {/* Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center gap-2 mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg"
            role="status"
            aria-live="polite"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-emerald-600" />
            </div>
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center gap-2 mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-rose-600" />
            </div>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="user-search" className="text-slate-600 text-sm block mb-1">
              Search
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                id="user-search"
                name="search"
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="user-role-filter" className="text-slate-600 text-sm block mb-1">
              Role
            </label>
            <select
              id="user-role-filter"
              name="roleFilter"
              value={roleFilter}
              onChange={e => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctor</option>
            </select>
          </div>
          <div>
            <label htmlFor="user-status-filter" className="text-slate-600 text-sm block mb-1">
              Status
            </label>
            <select
              id="user-status-filter"
              name="activeFilter"
              value={activeFilter}
              onChange={e => {
                setActiveFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:border-teal-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="px-4 py-2 bg-teal-500/20 text-teal-400 rounded-lg hover:bg-teal-500/30 transition-colors"
          >
            Apply
          </motion.button>
        </form>
      </motion.div>

      {/* Users Table */}
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-slate-500 font-medium">Email</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Role</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Last Login</th>
                  <th className="px-4 py-3 text-slate-500 font-medium">Created</th>
                  <th className="px-4 py-3 text-slate-500 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={staggerContainer} initial="hidden" animate="visible">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <motion.tr
                      key={user.id}
                      variants={rowVariants}
                      layout
                      className="border-b border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-slate-900">{user.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin'
                              ? 'bg-violet-100 text-violet-600'
                              : 'bg-teal-100 text-teal-600'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.is_active !== false
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {user.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Edit2 size={16} />
                          </button>
                          {user.is_active !== false ? (
                            <button
                              onClick={() => handleDeactivate(user)}
                              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Deactivate user"
                            >
                              <UserX size={16} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(user)}
                              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Activate user"
                            >
                              <UserCheck size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </motion.tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Create New User</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="create-email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="create-email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-password"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="create-password"
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label
                    htmlFor="create-role"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="create-role"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create User
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Edit User</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
                    <AlertCircle size={16} />
                    {formError}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="edit-email"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-role"
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    Role
                  </label>
                  <select
                    id="edit-role"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit2 size={16} />
                        Update User
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserManagement;
