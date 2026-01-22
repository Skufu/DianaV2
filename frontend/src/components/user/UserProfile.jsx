import { useEffect, useState } from 'react';
import { User, Calendar, Shield, Mail, Save, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { getUserProfileApi, updateUserProfileApi, deleteAccountApi } from '../../api';
import AssessmentForm from './AssessmentForm';

const UserProfile = ({ token, setActiveTab }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getUserProfileApi();
        setFormData(data || {});
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        years_menopause: formData.years_menopause ? parseInt(formData.years_menopause, 10) : 0,
        assessment_frequency_months: formData.assessment_frequency_months ? parseInt(formData.assessment_frequency_months, 10) : 3,
        reminder_email: !!formData.reminder_email,
        family_history_diabetes: !!formData.family_history_diabetes,
      };

      await updateUserProfileApi(payload);
      setFormData(payload);
      alert('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteAccountApi(token);
      localStorage.removeItem('diana_token');
      localStorage.removeItem('diana_refresh_token');
      window.location.href = '/login';
    } catch (err) {
      alert('Failed to delete account. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-slate-400">Manage your personal information and preferences</p>
          </div>
          <button
            onClick={() => setShowAssessmentForm(!showAssessmentForm)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Log Assessment
          </button>
        </div>
      </div>

      {showAssessmentForm && (
        <AssessmentForm
          token={token}
          onSubmit={() => {
            setShowAssessmentForm(false);
            setRefreshKey(prev => prev + 1);
          }}
          onCancel={() => setShowAssessmentForm(false)}
        />
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User size={20} className="text-teal-400" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-teal-400" />
            Menopausal Health
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Menopause Status</label>
              <select
                name="menopause_status"
                value={formData.menopause_status || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select status</option>
                <option value="pre">Premenopausal</option>
                <option value="peri">Perimenopausal</option>
                <option value="post">Postmenopausal</option>
                <option value="surgical">Surgical Menopause</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Type (if postmenopausal)</label>
              <select
                name="menopause_type"
                value={formData.menopause_type || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select type</option>
                <option value="natural">Natural</option>
                <option value="surgical">Surgical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Years Post-Menopause</label>
              <input
                type="number"
                name="years_menopause"
                value={formData.years_menopause || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield size={20} className="text-teal-400" />
            Medical History
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Hypertension</label>
              <select
                name="hypertension"
                value={formData.hypertension || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select</option>
                <option value="no">No</option>
                <option value="controlled">Yes (Controlled)</option>
                <option value="uncontrolled">Yes (Uncontrolled)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Heart Disease</label>
              <select
                name="heart_disease"
                value={formData.heart_disease || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Family History of Diabetes</label>
              <select
                name="family_history_diabetes"
                value={formData.family_history_diabetes ? 'yes' : 'no'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  family_history_diabetes: e.target.value === 'yes'
                }))}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Smoking Status</label>
              <select
                name="smoking_status"
                value={formData.smoking_status || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail size={20} className="text-teal-400" />
            Settings
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Assessment Reminder Frequency</label>
            <select
              name="assessment_frequency_months"
              value={formData.assessment_frequency_months || 1}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 mb-4"
            >
              <option value="1">Monthly</option>
              <option value="3">Quarterly (Every 3 months)</option>
              <option value="6">Biannually (Every 6 months)</option>
              <option value="12">Annually (Every 12 months)</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="reminder_email"
                checked={formData.reminder_email || false}
                onChange={handleChange}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
              />
              <span className="text-sm text-slate-300">Receive email reminders</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="bg-rose-500/10 backdrop-blur-sm rounded-2xl border border-rose-500/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-400 mt-1" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-rose-400 mb-2">Delete Account</h2>
            <p className="text-slate-400 text-sm mb-4">
              Deleting your account will permanently remove all your data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-2">Confirm Account Deletion</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to permanently delete your account? All your health data will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
