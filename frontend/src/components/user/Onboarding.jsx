import { useState } from 'react';
import { User, Heart, Shield, FileText, Check } from 'lucide-react';
import { completeOnboardingApi } from '../../api';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    menopause_status: '',
    years_menopause: '',
    hypertension: '',
    heart_disease: '',
    family_history_diabetes: false,
    smoking_status: '',
    consent_research_participation: false,
    consent_email_updates: false,
    consent_analytics: false,
    consent_personal_data: false,
    assessment_frequency_months: '3',
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.consent_personal_data) {
      setError('You must agree to Data Usage Agreement to continue');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth,
        menopause_status: formData.menopause_status,
        years_menopause: parseInt(formData.years_menopause, 10) || 0,
        hypertension: formData.hypertension,
        heart_disease: formData.heart_disease,
        family_history_diabetes: formData.family_history_diabetes || false,
        smoking_status: formData.smoking_status,
        consent_personal_data: formData.consent_personal_data,
        consent_research_participation: formData.consent_research_participation,
        consent_email_updates: formData.consent_email_updates,
        consent_analytics: formData.consent_analytics,
        assessment_frequency_months: parseInt(formData.assessment_frequency_months, 10) || 3,
        reminder_email: true,
      };
      await completeOnboardingApi(payload);
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (stepNum) => {
    switch (stepNum) {
      case 1:
        if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.date_of_birth) {
          setError('Please fill in all required fields (First Name, Last Name, Date of Birth)');
          return false;
        }
        break;
      case 2:
        if (!formData.menopause_status) {
          setError('Please select your menopause status');
          return false;
        }
        break;
      default:
        break;
    }
    setError(null);
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1);
    }
  };
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Welcome to DIANA</h1>
        <p className="text-slate-400 mb-8">Let's set up your health profile{formData.first_name ? `, ${formData.first_name}` : ''}</p>

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    placeholder="Jane"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
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
                  name="menopause_status"
                  value={formData.menopause_status}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select status</option>
                  <option value="pre">Premenopausal</option>
                  <option value="peri">Perimenopausal</option>
                  <option value="post">Postmenopausal</option>
                  <option value="surgical">Surgical Menopause</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Years Since Menopause</label>
                <input
                  type="number"
                  name="years_menopause"
                  value={formData.years_menopause}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                  placeholder="0"
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
                  <option value="no">No</option>
                  <option value="controlled">Controlled</option>
                  <option value="uncontrolled">Uncontrolled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Heart Disease</label>
                <select
                  name="heart_disease"
                  value={formData.heart_disease}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="">Select</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Family History of Diabetes</label>
                <select
                  name="family_history_diabetes"
                  value={formData.family_history_diabetes ? 'true' : 'false'}
                  onChange={e => setFormData(prev => ({ ...prev, family_history_diabetes: e.target.value === 'true' }))}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Smoking Status</label>
                <select
                  name="smoking_status"
                  value={formData.smoking_status}
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
                <label className="block text-sm font-medium text-slate-300 mb-2">Assessment Reminder Frequency (Months)</label>
                <select
                  name="assessment_frequency_months"
                  value={formData.assessment_frequency_months}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 transition-colors"
                >
                  <option value="1">Monthly</option>
                  <option value="3">Quarterly (3 Months)</option>
                  <option value="6">Semi-Annually (6 Months)</option>
                  <option value="12">Annually (12 Months)</option>
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
                  name="consent_research_participation"
                  checked={formData.consent_research_participation}
                  onChange={handleInputChange}
                  required
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
                  name="consent_email_updates"
                  checked={formData.consent_email_updates}
                  onChange={handleInputChange}
                  required
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
                  name="consent_analytics"
                  checked={formData.consent_analytics}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Analytics & Usage Data</p>
                  <p className="text-xs text-slate-400 mt-1">Allow anonymized usage analytics to help improve the platform</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="consent_personal_data"
                  checked={formData.consent_personal_data}
                  onChange={handleInputChange}
                  required
                  className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-900/50 text-teal-500 focus:ring-teal-500 focus:ring-offset-0"
                />
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">Data Usage Agreement (Required)</p>
                  <p className="text-xs text-slate-400 mt-1">I understand my health data will be stored securely and used according to privacy policy</p>
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
