import { useState } from 'react';
import { User, Heart, Shield, FileText, Check, ChevronRight, ChevronLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCompleteOnboarding } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button';
import { slideUp, fadeIn, staggerContainer, useReducedMotion, SPRING_GENTLE } from '../../utils/animations';

const Onboarding = ({ onComplete }) => {
  const isReduced = useReducedMotion();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState(null);
  const completeOnboardingMutation = useCompleteOnboarding();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: '',
    menopause_status: '',
    years_menopause: '',
    hypertension: '',
    heart_disease: '',
    family_history_diabetes: false,
    smoking_status: '',
    physical_activity: '',
    alcohol: '',
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
      setError('You must agree to the Data Usage Agreement to continue.');
      return;
    }
    setError(null);
    try {
      const ageNum = parseInt(formData.age, 10);
      const validAge = !isNaN(ageNum) && ageNum > 0 && ageNum < 150;
      const computedDateOfBirth = validAge
        ? `${new Date().getFullYear() - ageNum}-06-15`
        : null;

      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: computedDateOfBirth,
        menopause_status: formData.menopause_status,
        years_menopause: parseInt(formData.years_menopause, 10) || 0,
        hypertension: formData.hypertension,
        heart_disease: formData.heart_disease,
        family_history_diabetes: formData.family_history_diabetes || false,
        smoking_status: formData.smoking_status,
        physical_activity: formData.physical_activity,
        alcohol: formData.alcohol,
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
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    }
  };

  const validateStep = (stepNum) => {
    switch (stepNum) {
      case 1:
        if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.age) {
          setError('Please fill in all required fields.');
          return false;
        }
        const ageNum = parseInt(formData.age, 10);
        if (isNaN(ageNum) || ageNum < 45 || ageNum > 80) {
          setError('Age must be between 45 and 80 years.');
          return false;
        }
        break;
      case 2:
        if (!formData.menopause_status) {
          setError('Please select your menopause status.');
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
      setDirection(1);
      setStep(prev => prev + 1);
    }
  };
  const prevStep = () => {
    setError(null);
    setDirection(-1);
    setStep(prev => prev - 1)
  };

  const steps = [
    { title: 'Personal', icon: User },
    { title: 'Health', icon: Heart },
    { title: 'History', icon: Shield },
    { title: 'Settings', icon: FileText },
    { title: 'Consent', icon: CheckCircle2 },
  ];

  const stepVariants = {
    enter: (direction) => ({
      x: isReduced ? 0 : (direction > 0 ? 50 : -50),
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: SPRING_GENTLE,
        opacity: { duration: 0.2 }
      }
    },
    exit: (direction) => ({
      x: isReduced ? 0 : (direction > 0 ? -50 : 50),
      opacity: 0,
      transition: {
        x: SPRING_GENTLE,
        opacity: { duration: 0.2 }
      }
    })
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 font-sans text-slate-900 selection:bg-diana-forest-light/20 selection:text-diana-forest-light">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={slideUp}
        className="w-full max-w-2xl bg-white shadow-xl border border-slate-200 rounded-2xl p-8 md:p-10"
      >

        {/* Header & Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Step {step} of 5</span>
            <motion.span
              key={step} // Animate text change
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold uppercase tracking-wider text-diana-forest-light"
            >
              {steps[step - 1].title}
            </motion.span>
          </div>

          {/* Minimal Progress Bar */}
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mb-8">
            <motion.div
              layout
              className="h-full bg-diana-navy"
              initial={{ width: 0 }}
              animate={{ width: `${(step / 5) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              aria-live="polite"
            >
              <h1 className="text-2xl font-semibold text-diana-midnight mb-2">
                {step === 1 && "Start your clinical profile"}
                {step === 2 && "Menopausal health status"}
                {step === 3 && "Medical history overview"}
                {step === 4 && "System preferences"}
                {step === 5 && "Privacy & Consent"}
              </h1>
              <p className="text-slate-500">
                {step === 1 && "We need a few basic details to personalize your care plan."}
                {step === 2 && "Understanding where you are in your journey helps us tailor recommendations."}
                {step === 3 && "This information creates the baseline for your clinical risk assessment."}
                {step === 4 && "Customize how often you'd like to check in with the platform."}
                {step === 5 && "Please review how your data will be used and protected."}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-4 rounded-lg bg-red-50 border border-red-100 flex items-start gap-3 text-red-700 overflow-hidden"
            >
              <AlertCircle size={18} className="mt-0.5" />
              <span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="min-h-[300px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {step === 1 && (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">First Name</label>
                      <input
                        type="text"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                        placeholder="Jane"
                      />
                    </motion.div>
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Name</label>
                      <input
                        type="text"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                        placeholder="Doe"
                      />
                    </motion.div>
                  </div>

                  <motion.div variants={fadeIn} className="group space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Age</label>
                    <input
                      type="number"
                      name="age"
                      min="45"
                      max="80"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                      placeholder="Enter your age (45-80)"
                    />
                    <p className="text-[10px] text-slate-400">DIANA is designed for women aged 45-80</p>
                  </motion.div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
                  <motion.div variants={fadeIn} className="group space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Menopause Status</label>
                    <div className="relative">
                      <select
                        name="menopause_status"
                        value={formData.menopause_status}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="">Select status...</option>
                        <option value="pre">Premenopausal (not started)</option>
                        <option value="peri">Perimenopausal (in transition)</option>
                        <option value="post">Postmenopausal (completed)</option>
                        <option value="surgical">Surgical Menopause</option>
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                    </div>
                    <p className="text-[10px] text-slate-400">This helps us understand your hormonal health stage</p>
                  </motion.div>

                  {(formData.menopause_status === 'post' || formData.menopause_status === 'surgical') && (
                    <motion.div
                      variants={fadeIn}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="group space-y-1.5"
                    >
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Years Since Menopause
                      </label>
                      <input
                        type="number"
                        name="years_menopause"
                        min="0"
                        max="40"
                        value={formData.years_menopause}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                        placeholder="How many years?"
                      />
                      <p className="text-[10px] text-slate-400">Time since menopause affects diabetes risk factors</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Hypertension</label>
                      <div className="relative">
                        <select
                          name="hypertension"
                          value={formData.hypertension}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="no">No History</option>
                          <option value="controlled">Yes (Controlled)</option>
                          <option value="uncontrolled">Yes (Uncontrolled)</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Heart Disease</label>
                      <div className="relative">
                        <select
                          name="heart_disease"
                          value={formData.heart_disease}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Diabetes History</label>
                      <div className="relative">
                        <select
                          name="family_history_diabetes"
                          value={formData.family_history_diabetes ? 'true' : 'false'}
                          onChange={e => setFormData(prev => ({ ...prev, family_history_diabetes: e.target.value === 'true' }))}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Smoking Status</label>
                      <div className="relative">
                        <select
                          name="smoking_status"
                          value={formData.smoking_status}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="never">Never Smoked</option>
                          <option value="former">Former Smoker</option>
                          <option value="current">Current Smoker</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Physical Activity</label>
                      <div className="relative">
                        <select
                          name="physical_activity"
                          value={formData.physical_activity}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="Unknown">Unknown</option>
                          <option value="Sedentary">Sedentary (little/no exercise)</option>
                          <option value="Moderate">Moderate (1-3 days/week)</option>
                          <option value="Active">Active (4+ days/week)</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Alcohol Use</label>
                      <div className="relative">
                        <select
                          name="alcohol"
                          value={formData.alcohol}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="Unknown">Unknown</option>
                          <option value="None">None</option>
                          <option value="Light">Light</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Heavy">Heavy</option>
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
                  <motion.div variants={fadeIn} className="group space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Assessment Reminder Frequency</label>
                    <div className="relative">
                      <select
                        name="assessment_frequency_months"
                        value={formData.assessment_frequency_months}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                      >
                        <option value="1">Monthly</option>
                        <option value="3">Quarterly (Recommended)</option>
                        <option value="6">Semi-Annually</option>
                        <option value="12">Annually</option>
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90" size={16} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">We'll send you an email when it's time for your next check-in.</p>
                  </motion.div>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                  {[
                    { name: 'consent_research_participation', label: 'Research Participation', sub: 'Allow anonymized data contribution to diabetes research.' },
                    { name: 'consent_email_updates', label: 'Email Communications', sub: 'Receive health tips and platform updates.' },
                    { name: 'consent_analytics', label: 'Analytics', sub: 'Help us improve by sharing usage data.' },
                    { name: 'consent_personal_data', label: 'Data Usage Agreement', sub: 'I agree to the secure processing of my health data.', required: true }
                  ].map((item) => (
                    <label key={item.name} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-diana-forest-light/30 cursor-pointer transition-all group">
                      <div className="relative flex items-center pt-0.5">
                        <input
                          type="checkbox"
                          name={item.name}
                          checked={formData[item.name]}
                          onChange={handleInputChange}
                          required={item.required}
                          className="peer sr-only"
                        />
                        <div className="w-4 h-4 rounded border border-slate-300 bg-white flex items-center justify-center peer-checked:bg-diana-forest-light peer-checked:border-diana-forest-light transition-all">
                          <Check size={10} className="text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium transition-colors ${formData[item.name] ? 'text-diana-forest-light' : 'text-slate-700'}`}>{item.label}</span>
                          {item.required && <span className="text-[10px] font-bold text-diana-forest-light/60 bg-diana-forest-light/5 px-1.5 py-0.5 rounded uppercase">Required</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                      </div>
                    </label>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
          <Button
            variant="ghost"
            onClick={onComplete}
            className="text-xs font-semibold !text-slate-400 hover:!text-slate-600 px-2 py-2"
          >
            Skip setup
          </Button>

          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={prevStep}
                icon={ChevronLeft}
              >
                Back
              </Button>
            )}

            {step < 5 ? (
              <Button
                variant="primary"
                onClick={nextStep}
                className="bg-diana-navy hover:bg-diana-midnight"
              >
                Next Step
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                isLoading={completeOnboardingMutation.isPending}
                className="bg-diana-navy hover:bg-diana-midnight"
                icon={!completeOnboardingMutation.isPending ? CheckCircle2 : undefined}
              >
                {completeOnboardingMutation.isPending ? 'Completing...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
