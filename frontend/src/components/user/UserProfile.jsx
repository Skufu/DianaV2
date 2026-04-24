import { useState, useEffect } from 'react';
import { User, Calendar, Shield, Save, AlertTriangle, ArrowLeft, Activity, Type } from 'lucide-react';
import { useUserProfile, useUpdateProfile, useDeleteAccount } from '../../api';
import { FONT_SCALE_OPTIONS } from '../../utils/accessibilityPreferences';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button';
import {
  staggerContainer,
  fadeIn,
  slideUp,
  useInputFocusVariants,
} from '../../utils/animations';

const UserProfile = ({ setActiveTab, onStartAssessment, fontScale, onFontScaleChange }) => {
  const inputFocusVariants = useInputFocusVariants();
  const { data: profileData = {}, isLoading, error, refetch } = useUserProfile();
  const updateProfileMutation = useUpdateProfile();
  const deleteAccountMutation = useDeleteAccount();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (profileData && Object.keys(profileData).length > 0) {
      const displayData = { ...profileData };
      if (profileData.date_of_birth) {
        const birthDate = new Date(profileData.date_of_birth);
        if (!isNaN(birthDate.getTime())) {
          const currentYear = new Date().getFullYear();
          displayData.age = currentYear - birthDate.getFullYear();
        }
      }
      setFormData(displayData);
    }
  }, [profileData]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError(null);
    try {
      const payload = {
        ...formData,
        years_menopause: formData.years_menopause ? parseInt(formData.years_menopause, 10) : 0,
      };

      if (formData.age) {
        const ageNum = parseInt(formData.age, 10);
        if (!isNaN(ageNum) && ageNum > 0 && ageNum < 150) {
          const birthYear = new Date().getFullYear() - ageNum;
          payload.date_of_birth = `${birthYear}-06-15`;
        }
      }

      await updateProfileMutation.mutateAsync(payload);
      setFormData(payload);
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 text-slate-400"
      >
        Loading profile...
      </motion.div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-[32px] p-10 text-center max-w-md mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-rose-600" />
        </div>
        <h3 className="text-xl font-serif font-bold text-slate-900 mb-2">Profile Error</h3>
        <p className="text-slate-600 mb-8 font-medium">
          Failed to load your profile data. Please try again.
        </p>
        <Button
          onClick={() => refetch()}
          variant="blue"
          className="shadow-lg shadow-blue-600/20 px-8"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="max-w-4xl mx-auto space-y-6 pt-4 lg:pt-0"
    >
      <motion.div
        variants={slideUp}
        className="bg-gradient-to-r from-diana-forest to-diana-forest-light rounded-3xl p-6 sm:p-8 shadow-lg text-white"
      >
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
            <p className="text-blue-100 text-base leading-relaxed max-w-2xl">
              Manage your health profile, account details, and reading preferences in one place.
            </p>
          </div>
          <Button
            onClick={onStartAssessment}
            className="!bg-white !text-diana-forest hover:!bg-blue-50 shadow-sm"
          >
            Log Assessment
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {formError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700 flex items-center gap-3 shadow-sm"
          >
            <AlertTriangle size={18} className="shrink-0" />
            <span className="font-medium">{formError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={slideUp}
        className="glass-card p-5 sm:p-6 md:p-8 bg-white"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-2 flex items-center gap-3 border-b border-diana-sand pb-4">
              <Type size={24} className="text-diana-forest" />
              Display & Accessibility
            </h2>
            <p className="text-diana-text-secondary leading-relaxed mt-4">
              Choose the text size that feels most comfortable. Your preference applies across the
              app and saves automatically for future visits.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
            {FONT_SCALE_OPTIONS.map(option => {
              const isSelected = fontScale === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFontScaleChange(option.value)}
                  aria-pressed={isSelected}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-diana-forest/30 ${
                    isSelected
                      ? 'border-diana-forest bg-blue-50 shadow-sm'
                      : 'border-diana-sand bg-white hover:border-diana-forest-light hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-base font-semibold text-diana-text-primary">
                    {option.label}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-diana-text-secondary">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass-card p-5 sm:p-6 md:p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <User size={24} className="text-diana-forest" />
            Personal Information
          </h2>
          <p className="text-diana-text-secondary mb-6 leading-relaxed">
            Keep the details used across your account and reports up to date.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'First Name', name: 'first_name', type: 'text' },
              { label: 'Last Name', name: 'last_name', type: 'text' },
              { label: 'Age', name: 'age', type: 'number', min: 45, max: 80 },
            ].map(field => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
                >
                  {field.label}
                </label>
                <motion.input
                  id={field.name}
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type={field.type}
                  name={field.name}
                  value={
                    field.valueTransform
                      ? field.valueTransform(formData[field.name])
                      : formData[field.name] || ''
                  }
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest transition-all"
                />
              </div>
            ))}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                readOnly
                value={formData.email || ''}
                className="w-full px-4 py-3 bg-diana-stone/30 border border-diana-sand/50 rounded-xl text-diana-text-secondary cursor-not-allowed"
                title="Email addresses cannot be changed after registration"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass-card p-5 sm:p-6 md:p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <Calendar size={24} className="text-diana-lime-dark" />
            Menopausal Health
          </h2>
          <p className="text-diana-text-secondary mb-6 leading-relaxed">
            Update the menopause details that support your assessments and personalized insights.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="menopause_status"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Menopause Status
              </label>
              <select
                id="menopause_status"
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <label
                  htmlFor="menopause_type"
                  className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
                >
                  Menopause Type
                </label>
                <select
                  id="menopause_type"
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
              <label
                htmlFor="years_menopause"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Years Post-Menopause
              </label>
              <motion.input
                id="years_menopause"
                whileFocus="focus"
                variants={inputFocusVariants}
                type="number"
                name="years_menopause"
                value={formData.years_menopause || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest transition-all"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass-card p-5 sm:p-6 md:p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <Activity size={24} className="text-diana-forest-light" />
            Lifestyle Habits
          </h2>
          <p className="text-diana-text-secondary mb-6 leading-relaxed">
            Share the routines that help contextualize your health profile.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="physical_activity"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Physical Activity Level
              </label>
              <select
                id="physical_activity"
                name="physical_activity"
                value={formData.physical_activity || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary (Little to no exercise)</option>
                <option value="light">Lightly Active (1-3 days/week)</option>
                <option value="moderate">Moderately Active (3-5 days/week)</option>
                <option value="active">Very Active (6-7 days/week)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="alcohol"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Alcohol Consumption
              </label>
              <select
                id="alcohol"
                name="alcohol"
                value={formData.alcohol || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-diana-stone/50 border border-diana-sand rounded-xl text-diana-text-primary focus:outline-none focus:border-diana-forest focus:ring-1 focus:ring-diana-forest transition-all"
              >
                <option value="">Select frequency</option>
                <option value="never">Never or rarely</option>
                <option value="occasional">Occasionally (1-2 drinks/week)</option>
                <option value="moderate">Moderately (3-6 drinks/week)</option>
                <option value="heavy">Regularly (7+ drinks/week)</option>
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeIn}
          whileHover={{ scale: 1.02 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="glass-card p-5 sm:p-6 md:p-8 bg-white"
        >
          <h2 className="text-xl font-serif font-bold text-diana-text-primary mb-6 flex items-center gap-3 border-b border-diana-sand pb-4">
            <Shield size={24} className="text-amber-500" />
            Medical History
          </h2>
          <p className="text-diana-text-secondary mb-6 leading-relaxed">
            Review the medical history fields that can affect your risk assessments.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="hypertension"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Hypertension
              </label>
              <select
                id="hypertension"
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
              <label
                htmlFor="heart_disease"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Heart Disease
              </label>
              <select
                id="heart_disease"
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

            {/* Family history removed based on gap analysis */}

            <div>
              <label
                htmlFor="smoking_status"
                className="block text-sm font-bold text-diana-text-secondary uppercase tracking-wider mb-2"
              >
                Smoking Status
              </label>
              <select
                id="smoking_status"
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

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            isLoading={updateProfileMutation.isPending}
            variant="blue"
            className="px-8 py-4 shadow-lg shadow-blue-600/20"
            icon={!updateProfileMutation.isPending ? Save : undefined}
          >
            {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      <motion.div
        variants={slideUp}
        className="bg-white rounded-[32px] p-6 sm:p-8 shadow-sm border border-rose-100"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} className="text-rose-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600 mb-2">
              Danger Zone
            </p>
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-2">Delete Account</h2>
            <p className="text-slate-500 text-base mb-6 leading-relaxed">
              Deleting your account will permanently remove all your health data and activity logs.
              This action is irreversible.
            </p>
            <Button
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
              className="!px-6 !py-3 shadow-lg shadow-rose-600/20"
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
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full mx-4 border border-slate-100 shadow-2xl"
            >
              <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center mb-6">
                <AlertTriangle size={32} className="text-rose-600" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-slate-900 mb-2">
                Confirm Deletion
              </h3>
              <p className="text-slate-500 text-base mb-8 leading-relaxed">
                Are you absolutely sure? This will permanently erase your health records and cannot
                be undone.
              </p>
              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 !bg-slate-100 hover:!bg-slate-200 !text-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteAccount}
                  className="flex-1 shadow-lg shadow-rose-600/20"
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
