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
                {step === 0 && 'Learn about DIANA and how it can help you understand your diabetes risk.'}
                {step === 1 && 'We need a few basic details to personalize your risk assessment.'}
                {step === 2 && 'Understanding where you are in your menopause journey helps us tailor recommendations.'}
                {step === 3 && 'This information creates the baseline for your clinical risk assessment.'}
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
                    <h2 className="text-lg font-semibold text-diana-midnight mb-3 flex items-center gap-2">
                      <Heart className="text-diana-forest-light" size={20} />
                      What is DIANA?
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                      DIANA is a screening tool for <strong>postmenopausal women</strong> aged 45-60.
                    </p>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      We use basic clinical biomarkers to estimate your risk of developing Type 2 Diabetes, which increases significantly during and after menopause.
                    </p>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="text-amber-600" size={20} />
                      Important Disclaimer
                    </h2>
                    <ul className="text-amber-900 text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span><strong>DIANA is a screening tool, NOT a diagnostic device.</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>Results should be reviewed with a qualified healthcare provider.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>This tool does not replace clinical judgment or confirmatory testing.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span>
                        <span>Always consult your doctor before making health decisions.</span>
                      </li>
                    </ul>
                  </motion.div>

                  <motion.div variants={fadeIn} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <h2 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Info className="text-slate-500" size={20} />
                      <Info className="text-slate-500" size={20} />
                      What You&apos;ll Need
                    </h2>
                    <p className="text-slate-600 text-sm mb-3">
                      To get the most accurate assessment, have these from your recent health checkup:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 size={14} className="text-diana-forest-light" />
                        <span>BMI (Body Mass Index)</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 size={14} className="text-diana-forest-light" />
                        <span>Triglycerides</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 size={14} className="text-diana-forest-light" />
                        <span>LDL Cholesterol</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 size={14} className="text-diana-forest-light" />
                        <span>HDL Cholesterol</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 size={14} className="text-diana-forest-light" />
                        <span>Waist Circumference</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 size={14} className="text-diana-forest-light" />
                        <span>HbA1c or Fasting Glucose</span>
                      </div>
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
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label
                        htmlFor="onboarding-smoking-status"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        Smoking Status
                      </label>
                      <div className="relative">
                        <select
                          id="onboarding-smoking-status"
                          name="smoking_status"
                          value={formData.smoking_status}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="never">Never Smoked</option>
                          <option value="former">Former Smoker</option>
                          <option value="current">Current Smoker</option>
                          <option value="unknown">Unknown</option>
                        </select>
                        <ChevronRight
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90"
                          size={16}
                        />
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label
                        htmlFor="onboarding-physical-activity"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        Physical Activity
                      </label>
                      <div className="relative">
                        <select
                          id="onboarding-physical-activity"
                          name="physical_activity"
                          value={formData.physical_activity}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="Active">Active (4+ days/week)</option>
                          <option value="Moderate">Moderate (1-3 days/week)</option>
                          <option value="Sedentary">Sedentary (little/no exercise)</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                        <ChevronRight
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90"
                          size={16}
                        />
                      </div>
                    </motion.div>

                    <motion.div variants={fadeIn} className="group space-y-1.5">
                      <label
                        htmlFor="onboarding-alcohol"
                        className="block text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        Alcohol Use
                      </label>
                      <div className="relative">
                        <select
                          id="onboarding-alcohol"
                          name="alcohol"
                          value={formData.alcohol}
                          onChange={handleInputChange}
                          className="block w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-diana-forest-light focus:ring-1 focus:ring-diana-forest-light transition-all shadow-sm appearance-none"
                        >
                          <option value="">Select...</option>
                          <option value="None">None</option>
                          <option value="Light">Light</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Heavy">Heavy</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                        <ChevronRight
                          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 rotate-90"
                          size={16}
                        />
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Consent */}
              {step === 4 && (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {[
                    {
                      name: 'consent_personal_data',
                      label: 'I Agree to the Data Usage Agreement',
                      sub: 'Required for secure processing of your health data for the clinical risk assessment.',
                      required: true,
                    },
                    {
                      name: 'consent_research_participation',
                      label: 'Research Participation',
                      sub: 'Allow anonymized data to be contributed to diabetes research. (Optional)',
                    },
                    {
                      name: 'consent_email_updates',
                      label: 'Email Communications',
                      sub: 'Receive health tips and platform updates from DIANA. (Optional)',
                    },
                    {
                      name: 'consent_analytics',
                      label: 'Analytics',
                      sub: 'Help us improve DIANA by sharing anonymous usage data. (Optional)',
                    },
                  ].map(item => (
                    <label
                      key={item.name}
                      className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-diana-forest-light/30 cursor-pointer transition-all group"
                    >
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
                          <CheckCircle2
                            size={10}
                            className="text-white opacity-0 peer-checked:opacity-100"
                            strokeWidth={3}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium transition-colors ${formData[item.name] ? 'text-diana-forest-light' : 'text-slate-700'}`}
                          >
                            {item.label}
                          </span>
                          {item.required && (
                            <span className="text-[10px] font-bold text-diana-forest-light/60 bg-diana-forest-light/5 px-1.5 py-0.5 rounded uppercase">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                      </div>
                    </label>
                  ))}

                  <motion.div variants={fadeIn} className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-xs text-amber-800 leading-relaxed">
                      <strong>Reminder:</strong> DIANA provides screening results only. 
                      All findings should be discussed with a qualified healthcare provider. 
                      This tool does not replace professional medical advice, diagnosis, or treatment.
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