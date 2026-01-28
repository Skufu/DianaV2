import { useState } from 'react';
import { User, Heart, Shield, FileText, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useCompleteOnboarding } from '../../api';

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const completeOnboardingMutation = useCompleteOnboarding();

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
      await completeOnboardingMutation.mutateAsync(payload);
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding');
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
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl p-8 transform transition-all duration-300">

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-8 px-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2 relative z-10">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                  ${s === step
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white ring-4 ring-teal-500/20 shadow-lg scale-110'
                    : s < step
                      ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                      : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                  }`}
              >
                {s < step ? <Check size={14} /> : s}
              </div>
              <span className={`text-xs font-medium transition-colors duration-300 ${s === step ? 'text-teal-400' : 'text-slate-600'}`}>
                {s === 1 ? 'Personal' : s === 2 ? 'Health' : s === 3 ? 'History' : s === 4 ? 'Settings' : 'Consent'}
              </span>
            </div>
          ))}
          {/* Progress Bar Background */}
          <div className="absolute top-[4.5rem] left-0 w-full px-12 h-0.5 -z-0 hidden md:block">
            <div className="w-full h-full bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500 ease-out"
                style={{ width: `${((step - 1) / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-2">
            Welcome to DIANA
          </h1>
          <p className="text-slate-400">
            Let's set up your health profile{formData.first_name ? `, ${formData.first_name}` : ''}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="min-h-[320px]">
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <User size={20} className="text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                  <p className="text-sm text-slate-500">Basic details to personalize your experience</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="group">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">First Name</label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="e.g. Jane"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Last Name</label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                      placeholder="e.g. Doe"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Heart size={20} className="text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Menopausal Health</h2>
                  <p className="text-sm text-slate-500">Understanding your current stage</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Menopause Status</label>
                  <select
                    name="menopause_status"
                    value={formData.menopause_status}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all appearance-none"
                  >
                    <option value="">Select status...</option>
                    <option value="pre">Premenopausal</option>
                    <option value="peri">Perimenopausal</option>
                    <option value="post">Postmenopausal</option>
                    <option value="surgical">Surgical Menopause</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Years Since Menopause</label>
                  <input
                    type="number"
                    name="years_menopause"
                    value={formData.years_menopause}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                    placeholder="Enter 0 if not applicable"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Shield size={20} className="text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Medical History</h2>
                  <p className="text-sm text-slate-500">Important health context</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Hypertension</label>
                  <select
                    name="hypertension"
                    value={formData.hypertension}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  >
                    <option value="">Select...</option>
                    <option value="no">No</option>
                    <option value="controlled">Controlled</option>
                    <option value="uncontrolled">Uncontrolled</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Heart Disease</label>
                  <select
                    name="heart_disease"
                    value={formData.heart_disease}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  >
                    <option value="">Select...</option>
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Family History of Diabetes</label>
                  <select
                    name="family_history_diabetes"
                    value={formData.family_history_diabetes ? 'true' : 'false'}
                    onChange={e => setFormData(prev => ({ ...prev, family_history_diabetes: e.target.value === 'true' }))}
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Smoking Status</label>
                  <select
                    name="smoking_status"
                    value={formData.smoking_status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
                  >
                    <option value="">Select...</option>
                    <option value="never">Never</option>
                    <option value="former">Former</option>
                    <option value="current">Current</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <FileText size={20} className="text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Settings</h2>
                  <p className="text-sm text-slate-500">Configure your reminders</p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="group">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 group-focus-within:text-teal-400 transition-colors">Assessment Reminder Frequency</label>
                  <select
                    name="assessment_frequency_months"
                    value={formData.assessment_frequency_months}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 transition-all"
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
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center gap-3 mb-6 p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Shield size={20} className="text-teal-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Consent Preferences</h2>
                  <p className="text-sm text-slate-500">How we handle your data</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'consent_research_participation', label: 'Research Participation', sub: 'Allow anonymized health data to contribute to menopausal diabetes research' },
                  { name: 'consent_email_updates', label: 'Email Communications', sub: 'Receive health tips, reminders, and research updates via email' },
                  { name: 'consent_analytics', label: 'Analytics & Usage Data', sub: 'Allow anonymized usage analytics to help improve the platform' },
                  { name: 'consent_personal_data', label: 'Data Usage Agreement (Required)', sub: 'I understand my health data will be stored securely and used according to privacy policy', required: true }
                ].map((item) => (
                  <label key={item.name} className="flex items-start gap-4 p-4 rounded-xl bg-slate-900/30 border border-slate-700/30 cursor-pointer hover:bg-slate-900/50 transition-colors group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        name={item.name}
                        checked={formData[item.name]}
                        onChange={handleInputChange}
                        required={item.required}
                        className="peer sr-only"
                      />
                      <div className="w-5 h-5 rounded border border-slate-600 bg-slate-950 flex items-center justify-center peer-checked:bg-teal-500 peer-checked:border-teal-500 transition-all">
                        <Check size={12} className="text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium transition-colors ${formData[item.name] ? 'text-white' : 'text-slate-300'}`}>{item.label}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-700/50">
          <button
            onClick={onComplete}
            className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors px-4 py-2 rounded-lg hover:bg-slate-800/50"
          >
            Skip for now
          </button>

          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={prevStep}
                className="px-6 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            {step < 5 && (
              <button
                onClick={nextStep}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 active:scale-95"
              >
                Next Step
                <ChevronRight size={16} />
              </button>
            )}

            {step === 5 && (
              <button
                onClick={handleSubmit}
                disabled={completeOnboardingMutation.isPending}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {completeOnboardingMutation.isPending ? 'Submitting...' : 'Complete Setup'}
                {!completeOnboardingMutation.isPending && <Check size={16} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
