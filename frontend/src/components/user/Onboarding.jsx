import React, { useState } from 'react';
import { User, Heart, Shield, FileText, Activity, Check } from 'lucide-react';
import { completeOnboardingApi } from '../../api';

const Onboarding = ({ token, userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    dob: '',
    password: '',
    menopauseStatus: '',
    menopauseType: '',
    yearsMenopause: '',
    hypertension: '',
    heartDisease: '',
    familyHistory: '',
    smoking: '',
    consentResearch: false,
    consentEmail: false,
    consentMarketing: false,
    consentDataUsage: false,
    assessmentFrequency: 'monthly',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await completeOnboardingApi(formData);
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to DIANA</h1>
        <p className="text-slate-400 mb-8">Let's set up your health profile</p>

        {error && (
          <div className="text-rose-400 text-sm mb-4 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <User size={24} className="text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Personal Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="Create a secure password"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Heart size={24} className="text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Menopausal Health</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Menopause Status</label>
                <select
                  name="menopauseStatus"
                  value={formData.menopauseStatus}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select status</option>
                  <option value="premenopausal">Premenopausal</option>
                  <option value="perimenopausal">Perimenopausal</option>
                  <option value="postmenopausal">Postmenopausal</option>
                  <option value="surgical">Surgical Menopause</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Type (if postmenopausal)</label>
                <select
                  name="menopauseType"
                  value={formData.menopauseType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select type</option>
                  <option value="natural">Natural</option>
                  <option value="hormonal">Hormonal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Years Post-Menopause</label>
                <input
                  type="number"
                  name="yearsMenopause"
                  value={formData.yearsMenopause}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="Number of years"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Shield size={24} className="text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Medical History</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Hypertension</label>
                <select
                  name="hypertension"
                  value={formData.hypertension}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Heart Disease</label>
                <select
                  name="heartDisease"
                  value={formData.heartDisease}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Family History of Diabetes</label>
                <select
                  name="familyHistory"
                  value={formData.familyHistory}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Smoking Status</label>
                <select
                  name="smoking"
                  value={formData.smoking}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select</option>
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <FileText size={24} className="text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Assessment Reminder Frequency</label>
                <select
                  name="assessmentFrequency"
                  value={formData.assessmentFrequency}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="none">No Reminders</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <Shield size={24} className="text-teal-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Consent Preferences</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentResearch"
                  checked={formData.consentResearch}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Research Participation</p>
                  <p className="text-xs text-slate-400 mt-1">Allow anonymized health data to contribute to menopausal diabetes research</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentEmail"
                  checked={formData.consentEmail}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Email Communications</p>
                  <p className="text-xs text-slate-400 mt-1">Receive health tips, reminders, and research updates via email</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentMarketing"
                  checked={formData.consentMarketing}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Marketing Communications</p>
                  <p className="text-xs text-slate-400 mt-1">Receive promotional offers and product updates</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consentDataUsage"
                  checked={formData.consentDataUsage}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Data Usage Agreement</p>
                  <p className="text-xs text-slate-400 mt-1">I understand my health data will be stored securely and used according to the privacy policy</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mb-6">
              <Check size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
            <p className="text-slate-400 mb-8">Your health profile has been created. You can now log your first assessment.</p>
          </div>
        )}

        <div className="flex justify-between mt-8">
          {step > 1 && step < 6 && (
            <button
              onClick={prevStep}
              className="px-6 py-3 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
            >
              Back
            </button>
          )}

          {step < 5 && (
            <button
              onClick={nextStep}
              className="ml-auto px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all"
            >
              Next
            </button>
          )}

          {step === 5 && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="ml-auto px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Complete Setup'}
            </button>
          )}

          {step === 6 && (
            <button
              onClick={onComplete}
              className="ml-auto px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 transition-all"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
