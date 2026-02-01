import { useState, useEffect } from 'react';
import { User, Calendar, Shield, Mail, Save, AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import { useUserProfile, useUpdateProfile, useDeleteAccount } from '../../api';
import AssessmentForm from './AssessmentForm';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button';
import { staggerContainer, fadeIn, slideUp, useInputFocusVariants, useReducedMotion } from '../../utils/animations';

const UserProfile = ({ setActiveTab }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useInputFocusVariants();
  const { data: profileData = {}, isLoading, error, refetch } = useUserProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteAccountMutation = useDeleteAccount();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState(null);

  // Sync form data with profile data from React Query
  useEffect(() => {
    if (profileData && Object.keys(profileData).length > 0) {
      setFormData(profileData);
    }
  }, [profileData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = {
        ...formData,
        years_menopause: formData.years_menopause ? parseInt(formData.years_menopause, 10) : 0,
        assessment_frequency_months: formData.assessment_frequency_months ? parseInt(formData.assessment_frequency_months, 10) : 3,
        reminder_email: !!formData.reminder_email,
        family_history_diabetes: !!formData.family_history_diabetes,
      };

      await updateProfileMutation.mutateAsync(payload);
      setFormData(payload);
      // Removed alert, prefer toast in real app, but for now just no throw
    } catch (err) {
      setFormError(err.message || 'Failed to update profile');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation.mutateAsync();
      window.location.href = '/login';
    } catch (err) {
      alert('Failed to delete account. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-slate-400">
        Loading profile...
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-6 text-rose-400 max-w-md mx-auto">
          <AlertTriangle size={20} className="mx-auto mb-2" />
          <p>Failed to load profile</p>
          <Button
            onClick={() => refetch()}
            variant="danger"
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
      <motion.div variants={slideUp} className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-8 shadow-lg text-white">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('dashboard')}
            className="!p-2 !bg-white/10 hover:!bg-white/20 !text-white"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-serif font-bold text-white">My Profile</h1>
            <p className="text-blue-100">Manage your personal information and preferences</p>
          </div>
          <Button
            onClick={() => setShowAssessmentForm(!showAssessmentForm)}
            className="!bg-white !text-diana-forest hover:!bg-blue-50 shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Log Assessment
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAssessmentForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AssessmentForm
              onSubmit={() => {
                setShowAssessmentForm(false);
              }}
              onCancel={() => setShowAssessmentForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400"
          >
            {formError}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <User size={24} className="text-diana-forest" />
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'First Name', name: 'first_name', type: 'text' },
              { label: 'Last Name', name: 'last_name', type: 'text' },
              { label: 'Email Address', name: 'email', type: 'email' },
              { label: 'Date of Birth', name: 'date_of_birth', type: 'date', valueTransform: (val) => val ? new Date(val).toISOString().split('T')[0] : '' },
              { label: 'Phone Number', name: 'phone', type: 'tel' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">{field.label}</label>
                <motion.input
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type={field.type}
                  name={field.name}
                  value={field.valueTransform ? field.valueTransform(formData[field.name]) : (formData[field.name] || '')}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none transition-all"
                />
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Address</label>
            <motion.textarea
              whileFocus="focus"
              variants={inputFocusVariants}
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none transition-all"
            />
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <Calendar size={24} className="text-diana-lime-dark" />
            Menopausal Health
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Menopause Status</label>
              <select
                name="menopause_status"
                value={formData.menopause_status || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="">Select status</option>
                <option value="pre">Premenopausal</option>
                <option value="peri">Perimenopausal</option>
                <option value="post">Postmenopausal</option>
                <option value="surgical">Surgical Menopause</option>
              </select>
            </div>

            {formData.menopause_status === 'post' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Menopause Type</label>
                <select
                  name="menopause_type"
                  value={formData.menopause_type || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
                >
                  <option value="">Select type</option>
                  <option value="natural">Natural</option>
                  <option value="surgical">Surgical</option>
                </select>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Years Post-Menopause</label>
              <motion.input
                whileFocus="focus"
                variants={inputFocusVariants}
                type="number"
                name="years_menopause"
                value={formData.years_menopause || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <Shield size={24} className="text-amber-500" />
            Medical History
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Hypertension</label>
              <select
                name="hypertension"
                value={formData.hypertension || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="">Select</option>
                <option value="no">No</option>
                <option value="controlled">Yes (Controlled)</option>
                <option value="uncontrolled">Yes (Uncontrolled)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Heart Disease</label>
              <select
                name="heart_disease"
                value={formData.heart_disease || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="">Select</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Family History of Diabetes</label>
              <select
                name="family_history_diabetes"
                value={formData.family_history_diabetes ? 'yes' : 'no'}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  family_history_diabetes: e.target.value === 'yes'
                }))}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Smoking Status</label>
              <select
                name="smoking_status"
                value={formData.smoking_status || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="">Select</option>
                <option value="never">Never</option>
                <option value="former">Former</option>
                <option value="current">Current</option>
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="glass-card p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <Mail size={24} className="text-diana-forest" />
            Settings
          </h2>

          <div>
            <label className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2">Assessment Reminder Frequency</label>
            <select
              name="assessment_frequency_months"
              value={formData.assessment_frequency_months || 1}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all mb-6"
            >
              <option value="1">Monthly</option>
              <option value="3">Quarterly (Every 3 months)</option>
              <option value="6">Biannually (Every 6 months)</option>
              <option value="12">Annually (Every 12 months)</option>
            </select>

            <motion.label
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border border-diana-sand hover:bg-diana-stone/30 transition-colors"
            >
              <input
                type="checkbox"
                name="reminder_email"
                checked={formData.reminder_email || false}
                onChange={handleChange}
                className="w-5 h-5 rounded border-diana-forest text-diana-forest focus:ring-diana-forest focus:ring-offset-0"
              />
              <span className="text-sm font-medium text-diana-text-primary">Receive email reminders for your next assessment</span>
            </motion.label>
          </div>
        </motion.div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            isLoading={updateProfileMutation.isPending}
            variant="primary"
            className="px-8 py-4 bg-diana-forest hover:bg-diana-forest-light shadow-lg shadow-diana-forest/20"
            icon={!updateProfileMutation.isPending ? Save : undefined}
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <motion.div variants={fadeIn} className="bg-rose-500/10 backdrop-blur-sm rounded-2xl border border-rose-500/20 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-rose-400 mt-1" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-rose-400 mb-2">Delete Account</h2>
            <p className="text-slate-400 text-sm mb-4">
              Deleting your account will permanently remove all your data. This action cannot be undone.
            </p>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="!px-4 !py-2 !text-sm"
            >
              Delete My Account
            </Button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-700"
            >
              <h3 className="text-xl font-bold text-white mb-2">Confirm Account Deletion</h3>
              <p className="text-slate-400 mb-6">
                Are you sure you want to permanently delete your account? All your health data will be lost.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 !bg-slate-700 hover:!bg-slate-600 !text-white"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  className="flex-1"
                >
                  Delete Account
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UserProfile;
