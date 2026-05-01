import { useState } from 'react';
import {
  User,
  Heart,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useCompleteOnboarding } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button';
import {
  slideUp,
  fadeIn,
  staggerContainer,
  useReducedMotion,
  SPRING_GENTLE,
} from '../../utils/animations';

const Onboarding = ({ onComplete }) => {
  const isReduced = useReducedMotion();
  const [step, setStep] = useState(0);
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
    smoking_status: '',
    physical_activity: '',
    alcohol: '',
    consent_research_participation: false,
    consent_email_updates: false,
    consent_analytics: false,
    consent_personal_data: false,
  });

  const handleInputChange = e => {
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
      const computedDateOfBirth = validAge ? `${new Date().getFullYear() - ageNum}-06-15` : null;

      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: computedDateOfBirth,
        menopause_status: formData.menopause_status,
        years_menopause: parseInt(formData.years_menopause, 10) || 0,
        hypertension: formData.hypertension,
        heart_disease: formData.heart_disease,
        smoking_status: formData.smoking_status,
        physical_activity: formData.physical_activity,
        alcohol: formData.alcohol,
        consent_personal_data: formData.consent_personal_data,
        consent_research_participation: formData.consent_research_participation,
        consent_email_updates: formData.consent_email_updates,
        consent_analytics: formData.consent_analytics,
      };
      await completeOnboardingMutation.mutateAsync(payload);
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    }
  };

  const validateStep = stepNum => {
    switch (stepNum) {
      case 1: {
        if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.age) {
          setError('Please fill in all required fields.');
          return false;
        }
        const ageNum = parseInt(formData.age, 10);
        if (isNaN(ageNum) || ageNum < 45 || ageNum > 60) {
          setError('Age must be between 45 and 60 years. DIANA is designed for menopausal women.');
          return false;
        }
        break;
      }
      case 2: {
        if (!formData.menopause_status) {
          setError('Please select your menopause status.');
          return false;
        }
        break;
      }
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
    setStep(prev => prev - 1);
  };

  const steps = [
    { title: 'Welcome', icon: Heart },
    { title: 'Personal', icon: User },
    { title: 'Menopause', icon: Activity },
    { title: 'History', icon: Shield },
    { title: 'Consent', icon: CheckCircle2 },
  ];

  const stepVariants = {
    enter: direction => ({
      x: isReduced ? 0 : direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: SPRING_GENTLE,
        opacity: { duration: 0.2 },
      },
    },
    exit: direction => ({
      x: isReduced ? 0 : direction > 0 ? -50 : 50,
      opacity: 0,
      transition: {
        x: SPRING_GENTLE,
        opacity: { duration: 0.2 },
      },
    }),
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 font-sans text-slate-900 selection:bg-diana-forest-light/20 selection:text-diana-forest-light">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={slideUp}
        className="w-full max-w-2xl bg-white shadow-xl border border-slate-200 rounded-2xl p-6 md:p-10"
      >
        {/* Header & Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Step {step + 1} of 5
            </span>
            <motion.span
              key={step}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold uppercase tracking-wider text-diana-forest-light"
            >
              {steps[step].title}
            </motion.span>
          </div>

          {/* Progress Bar */}
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mb-8">
            <motion.div
              layout
              className="h-full bg-diana-navy"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / 5) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
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
                {step === 0 && 'Welcome to DIANA'}
                {step === 1 && 'Start your clinical profile'}
                {step === 2 && 'Menopausal health status'}
                {step === 3 && 'Medical history overview'}
                {step === 4 && 'Privacy & Consent'}
              </h1>
              <p className="text-slate-500">
                {step === 0 && 'Get started in a few simple steps.'}
                {step === 1 && 'We need a few basic details to personalize your risk assessment.'}
                {step === 2 && 'Understanding where you are in your menopause journey helps us tailor recommendations.'}
                {step === 3 && 'Optional context for your risk profile and PDF reports.'}
                {step === 4 && 'Please review how your data will be used and protected.'}
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
              {/* STEP 0: Welcome / Intro */}
              {step === 0 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <motion.div variants={fadeIn} className="bg-diana-forest-light/5 border border-diana-forest-light/20 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="text-diana-forest-light" size={20} />
                      <h2 className="text-lg font-semibold text-diana-midnight">Diabetes risk screening for women aged 45–60</h2>
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      DIANA uses your clinical biomarkers to estimate Type 2 Diabetes risk during the menopausal transition.
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-amber-50/60 border border-amber-200/80 rounded-xl px-5 py-3.5 flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={16} />
                    <p className="text-amber-900 text-sm leading-relaxed">
                      <strong>Screening only</strong> — not a diagnosis. Always review results with your doctor.
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Info className="text-slate-400" size={14} />
                      Have these ready from a recent checkup
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-slate-600">
                      {['BMI', 'Triglycerides', 'LDL Cholesterol', 'HDL Cholesterol', 'Waist Circumference', 'HbA1c or Fasting Glucose'].map(item => (
                        <div key={item} className="flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-diana-forest-light shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 1: Personal Info */}
              {step === 1 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label
                        htmlFor="onboarding-first-name"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        First Name
                      </label>
                      <input
                        type="text"
                        id="onboarding-first-name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                        placeholder="Jane"
                      />
                    </motion.div>
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label
                        htmlFor="onboarding-last-name"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="onboarding-last-name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                        placeholder="Doe"
                      />
                    </motion.div>
                  </div>

                  <motion.div variants={fadeIn} className="group space-y-1.5">
                    <label
                      htmlFor="onboarding-age"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      Age
                    </label>
                    <input
                      type="number"
                      id="onboarding-age"
                      name="age"
                      min="45"
                      max="60"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                      placeholder="Enter your age (45-60)"
                    />
                    <p className="text-[10px] text-slate-400">
                      DIANA focuses on the menopausal transition period (ages 45-60).
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      <strong>Why age 45-60?</strong> Hormonal changes during this window increase the risk of Type 2 Diabetes.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 2: Menopause Status */}
              {step === 2 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                  <motion.div variants={fadeIn} className="group space-y-1.5">
                    <label
                      htmlFor="onboarding-menopause-status"
                      className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                    >
                      Menopause Status
                    </label>
                    <div className="relative">
                      <select
                        id="onboarding-menopause-status"
                        name="menopause_status"
                        value={formData.menopause_status}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="">Select status...</option>
                        <option value="pre">Premenopausal (Periods are regular)</option>
                        <option value="peri">Perimenopausal (Periods are irregular)</option>
                        <option value="post">Postmenopausal (No period for 12+ months)</option>
                        <option value="surgical">Surgical Menopause (Ovaries removed)</option>
                      </select>
                      <ChevronRight
                        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90"
                        size={16}
                      />
                    </div>
                  </motion.div>

                  {(formData.menopause_status === 'post' ||
                    formData.menopause_status === 'surgical') && (
                    <motion.div
                      variants={fadeIn}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="group space-y-1.5"
                    >
                      <label
                        htmlFor="onboarding-years-menopause"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        Years Since Menopause
                      </label>
                      <input
                        type="number"
                        id="onboarding-years-menopause"
                        name="years_menopause"
                        min="0"
                        max="40"
                        value={formData.years_menopause}
                        onChange={handleInputChange}
                        className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm"
                        placeholder="How many years?"
                      />
                      <p className="text-[10px] text-slate-400">
                        Diabetes risk increases with time since menopause due to cumulative metabolic changes.
                      </p>
                    </motion.div>
                  )}

                  <motion.div variants={fadeIn} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      <strong>Did you know?</strong> Lower estrogen levels after menopause can act as a catalyst for metabolic changes, raising the likelihood of developing Type 2 Diabetes.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 3: Medical History */}
              {step === 3 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {[
                      {
                        id: 'onboarding-hypertension',
                        name: 'hypertension',
                        label: 'Hypertension',
                        value: formData.hypertension,
                        options: [
                          { value: '', label: 'Select...' },
                          { value: 'no', label: 'No' },
                          { value: 'controlled', label: 'Controlled' },
                          { value: 'uncontrolled', label: 'Uncontrolled' },
                        ],
                      },
                      {
                        id: 'onboarding-heart-disease',
                        name: 'heart_disease',
                        label: 'Heart Disease',
                        value: formData.heart_disease,
                        options: [
                          { value: '', label: 'Select...' },
                          { value: 'no', label: 'No' },
                          { value: 'yes', label: 'Yes' },
                        ],
                      },
                      {
                        id: 'onboarding-smoking-status',
                        name: 'smoking_status',
                        label: 'Smoking Status',
                        value: formData.smoking_status,
                        options: [
                          { value: '', label: 'Select...' },
                          { value: 'never', label: 'Never Smoked' },
                          { value: 'former', label: 'Former Smoker' },
                          { value: 'current', label: 'Current Smoker' },
                        ],
                      },
                      {
                        id: 'onboarding-physical-activity',
                        name: 'physical_activity',
                        label: 'Physical Activity',
                        value: formData.physical_activity,
                        options: [
                          { value: '', label: 'Select...' },
                          { value: 'Active', label: 'Active (4+ days/week)' },
                          { value: 'Moderate', label: 'Moderate (1-3 days/week)' },
                          { value: 'Sedentary', label: 'Sedentary (little/no exercise)' },
                        ],
                      },
                      {
                        id: 'onboarding-alcohol',
                        name: 'alcohol',
                        label: 'Alcohol Use',
                        value: formData.alcohol,
                        options: [
                          { value: '', label: 'Select...' },
                          { value: 'None', label: 'None' },
                          { value: 'Light', label: 'Light' },
                          { value: 'Moderate', label: 'Moderate' },
                          { value: 'Heavy', label: 'Heavy' },
                        ],
                      },
                    ].map(field => (
                      <motion.div key={field.name} variants={fadeIn} className="group space-y-1.5">
                        <label
                          htmlFor={field.id}
                          className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                        >
                          {field.label}
                        </label>
                        <div className="relative">
                          <select
                            id={field.id}
                            name={field.name}
                            value={field.value}
                            onChange={handleInputChange}
                            className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none cursor-pointer"
                          >
                            {field.options.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronRight
                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90"
                            size={16}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div variants={fadeIn} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      <strong>All fields are optional.</strong> This info helps contextualize your risk profile and is included in PDF reports.
                    </p>
                  </motion.div>
                </motion.div>
              )}

              {/* STEP 4: Consent */}
              {step === 4 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {[
                    {
                      name: 'consent_personal_data',
                      label: 'Data Usage Agreement',
                      sub: 'Required to process your health data for risk assessment.',
                      required: true,
                    },
                    {
                      name: 'consent_research_participation',
                      label: 'Research Participation',
                      sub: 'Contribute anonymized data to diabetes research.',
                    },
                    {
                      name: 'consent_email_updates',
                      label: 'Email Updates',
                      sub: 'Health tips and platform updates from DIANA.',
                    },
                    {
                      name: 'consent_analytics',
                      label: 'Analytics',
                      sub: 'Help improve DIANA with anonymous usage data.',
                    },
                  ].map(item => (
                    <motion.label
                      key={item.name}
                      variants={fadeIn}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
                        formData[item.name]
                          ? 'border-diana-forest-light/40 bg-diana-forest-light/5'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name={item.name}
                        checked={formData[item.name]}
                        onChange={handleInputChange}
                        required={item.required}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        formData[item.name]
                          ? 'bg-diana-forest-light border-diana-forest-light'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {formData[item.name] && (
                          <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium transition-colors ${
                            formData[item.name] ? 'text-diana-forest-light' : 'text-slate-700'
                          }`}>
                            {item.label}
                          </span>
                          {item.required && (
                            <span className="text-[10px] font-bold text-red-500/80 bg-red-50 px-1.5 py-0.5 rounded uppercase">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                      </div>
                    </motion.label>
                  ))}

                  <motion.div variants={fadeIn} className="mt-2 bg-amber-50/60 border border-amber-200/80 rounded-lg px-4 py-3 flex items-start gap-2.5">
                    <AlertTriangle className="text-amber-500 mt-0.5 shrink-0" size={14} />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Screening only</strong> — results should be discussed with a qualified healthcare provider.
                    </p>
                  </motion.div>
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
            {step > 0 && (
              <Button variant="ghost" onClick={prevStep} icon={ChevronLeft}>
                Back
              </Button>
            )}

            {step < 4 ? (
              <Button variant="blue" onClick={nextStep}>
                Next Step
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="blue"
                onClick={handleSubmit}
                isLoading={completeOnboardingMutation.isPending}
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