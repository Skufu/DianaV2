import { useState, useMemo, useRef, useCallback } from 'react';
import {
  AlertCircle,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Check,
  X,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoIcon from '../../assets/logo-icon.png';
import Button from '../common/Button';
import { getErrorMessage, getFieldErrors } from '../../api';
import {
  cardVariants,
  slideUp,
  fadeIn,
  getInputFocusVariants,
  useReducedMotion,
} from '../../utils/animations';
import { SignupFormSkeleton } from '../common/Skeleton';

// Password requirements check
const getPasswordRequirements = password => [
  { key: 'length', label: 'Password must be at least 8 characters', met: password.length >= 8 },
];

const Signup = ({ onSignup, onShowLogin }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useMemo(() => getInputFocusVariants(isReduced), [isReduced]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);

  // Field-level validation
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });

  // Refs for auto-focus
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const validateEmail = email => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : null;

  const validateField = useCallback(
    (field, value) => {
      switch (field) {
        case 'email':
          if (!value.trim()) return 'Please enter your email address';
          if (!validateEmail(value)) return 'Please enter a valid email address';
          return '';
        case 'password':
          if (!value) return 'Please enter a password';
          if (value.length < 8) return 'Password must be at least 8 characters';
          return '';
        case 'confirmPassword':
          if (!value) return 'Please confirm your password';
          if (value !== password) return 'Passwords do not match';
          return '';
        default:
          return '';
      }
    },
    [password]
  );

  const handleFieldChange = (field, value) => {
    switch (field) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        // Also re-validate confirm if touched
        if (touched.confirmPassword && confirmPassword) {
          const confirmErr = value !== confirmPassword ? 'Passwords do not match' : '';
          setFieldErrors(prev => ({ ...prev, confirmPassword: confirmErr }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
    }
    // Clear errors as user types
    if (touched[field] && fieldErrors[field]) {
      const err =
        field === 'confirmPassword'
          ? value && value !== password
            ? 'Passwords do not match'
            : value
              ? ''
              : 'Please confirm your password'
          : validateField(field, value);
      setFieldErrors(prev => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = field => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const value = field === 'email' ? email : field === 'password' ? password : confirmPassword;
    const err = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: err }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    // Validate all fields
    const emailErr = validateField('email', email);
    const passwordErr = validateField('password', password);
    const confirmErr = validateField('confirmPassword', confirmPassword);
    setFieldErrors({ email: emailErr, password: passwordErr, confirmPassword: confirmErr });
    setTouched({ email: true, password: true, confirmPassword: true });

    if (emailErr || passwordErr || confirmErr) {
      if (emailErr) emailRef.current?.focus();
      else if (passwordErr) passwordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const { signupApi } = await import('../../api');
      const res = await signupApi(email, password);
      await onSignup(res);
    } catch (err) {
      // Parse structured backend errors
      if (err.code === 'VALIDATION_ERROR' && err.details) {
        const details = getFieldErrors(err);
        setFieldErrors(prev => ({
          ...prev,
          email: details.email || prev.email,
          password: details.password || prev.password,
        }));
        if (details.email) emailRef.current?.focus();
        else if (details.password) passwordRef.current?.focus();
      } else if (err.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(getErrorMessage(err, 'Failed to create account.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Inline error component
  const FieldError = ({ id, message }) => (
    <AnimatePresence>
      {message && (
        <motion.p
          id={id}
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          className="text-sm sm:text-base font-semibold text-red-600 flex items-center gap-2 pl-1 mt-1"
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans text-slate-900 selection:bg-diana-forest-light/20 selection:text-diana-forest-light py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={slideUp}
        className="w-full max-w-[480px] px-6"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <motion.div variants={fadeIn} className="flex items-center gap-3 mb-6">
            <img src={logoIcon} alt="DIANA Logo" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-diana-navy tracking-tight">DIANA</span>
          </motion.div>
          <motion.h1
            variants={fadeIn}
            className="text-2xl font-semibold text-diana-midnight tracking-tight text-center"
          >
            Create an account
          </motion.h1>
          <motion.p variants={fadeIn} className="text-sm text-slate-500 mt-2 text-center">
            Check whether you may be at risk of Type 2 Diabetes in menopause.
          </motion.p>
        </div>

        {/* Main Card */}
        <motion.div
          variants={cardVariants}
          initial="offscreen"
          animate="onscreen"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 sm:p-6 md:p-8"
        >
          {/* Guided Mode Toggle */}
          <div className="mb-6 p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <span className="text-[14px] font-bold text-amber-900">
                Need Help? Turn on Guided Mode
              </span>
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={guidedMode}
              onClick={() => setGuidedMode(!guidedMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                guidedMode ? 'bg-amber-600' : 'bg-slate-300'
              }`}
              data-testid="guided-mode-toggle"
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${
                  guidedMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <SignupFormSkeleton />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor="signup-email"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
                      >
                        Email Address
                      </label>
                      {touched.email && !fieldErrors.email && email && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 size={14} className="text-diana-forest-light" />
                        </motion.div>
                      )}
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                        <Mail size={18} />
                      </div>
                      <motion.input
                        ref={emailRef}
                        whileFocus="focus"
                        variants={inputFocusVariants}
                        type="email"
                        id="signup-email"
                        value={email}
                        onChange={e => handleFieldChange('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        className={`block w-full pl-10 pr-3 py-3 bg-white border ${touched.email && fieldErrors.email ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                        placeholder="name@example.com"
                        autoComplete="email"
                        aria-invalid={touched.email && fieldErrors.email ? 'true' : 'false'}
                        aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
                      />
                    </div>
                    <FieldError
                      id="signup-email-error"
                      message={touched.email ? fieldErrors.email : ''}
                    />
                    {guidedMode && (
                      <div className="mt-2 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-2.5 shadow-sm">
                        <HelpCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <span className="text-[15px] sm:text-[16px] font-bold text-amber-950 leading-relaxed">
                          Step 1: Enter your email address. (e.g. name@example.com). This acts as
                          your account name.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor="signup-password"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
                      >
                        Password
                      </label>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                        <Lock size={18} />
                      </div>
                      <motion.input
                        ref={passwordRef}
                        whileFocus="focus"
                        variants={inputFocusVariants}
                        type={showPassword ? 'text' : 'password'}
                        id="signup-password"
                        value={password}
                        onChange={e => handleFieldChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        className={`block w-full pl-10 pr-10 py-3 bg-white border ${touched.password && fieldErrors.password ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        aria-invalid={touched.password && fieldErrors.password ? 'true' : 'false'}
                        aria-describedby="signup-password-reqs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FieldError
                      id="signup-password-error"
                      message={touched.password ? fieldErrors.password : ''}
                    />

                    {/* Password Requirements Checklist */}
                    {password.length > 0 && (
                      <motion.div
                        id="signup-password-reqs"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-1.5 pt-1.5"
                      >
                        {passwordRequirements.map(req => (
                          <div
                            key={req.key}
                            className={`flex items-center gap-2 text-sm sm:text-base font-semibold transition-colors ${req.met ? 'text-emerald-600' : 'text-slate-500'}`}
                          >
                            {req.met ? (
                              <Check size={16} className="shrink-0" />
                            ) : (
                              <X size={16} className="shrink-0" />
                            )}
                            {req.label}
                          </div>
                        ))}
                      </motion.div>
                    )}
                    {guidedMode && (
                      <div className="mt-2 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-2.5 shadow-sm">
                        <HelpCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <span className="text-[15px] sm:text-[16px] font-bold text-amber-950 leading-relaxed">
                          Step 2: Enter your password (minimum 8 characters). Tip: Click the eye
                          icon on the right to see your characters and check for spelling errors.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        htmlFor="signup-confirm-password"
                        className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
                      >
                        Confirm Password
                      </label>
                      {passwordsMatch === true && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-500"
                        >
                          Match
                        </motion.span>
                      )}
                      {passwordsMatch === false && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs sm:text-sm font-bold uppercase tracking-wider text-red-500"
                        >
                          Mismatch
                        </motion.span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                        <Lock size={18} />
                      </div>
                      <motion.input
                        ref={confirmPasswordRef}
                        whileFocus="focus"
                        variants={inputFocusVariants}
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="signup-confirm-password"
                        value={confirmPassword}
                        onChange={e => handleFieldChange('confirmPassword', e.target.value)}
                        onBlur={() => handleBlur('confirmPassword')}
                        className={`block w-full pl-10 pr-10 py-3 bg-white border ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-300' : passwordsMatch === false ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        aria-invalid={
                          touched.confirmPassword && fieldErrors.confirmPassword ? 'true' : 'false'
                        }
                        aria-describedby={
                          fieldErrors.confirmPassword ? 'signup-confirm-error' : undefined
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FieldError
                      id="signup-confirm-error"
                      message={touched.confirmPassword ? fieldErrors.confirmPassword : ''}
                    />
                    {guidedMode && (
                      <div className="mt-2 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-2.5 shadow-sm">
                        <HelpCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                        <span className="text-[15px] sm:text-[16px] font-bold text-amber-950 leading-relaxed">
                          Step 3: Type your password again to make sure you didn&apos;t make any
                          spelling mistakes.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Error Display (Banner for non-field errors) */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0, scale: 0.95 }}
                        className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2"
                        role="alert"
                      >
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        <span className="font-medium">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    isLoading={loading}
                    fullWidth
                    variant="blue"
                    className="py-4 shadow-sm text-[16px] font-semibold bg-blue-600 hover:bg-blue-700 text-white focus:ring-4 focus:ring-offset-1 focus:ring-blue-600/30 transition-all h-[54px] rounded-xl mt-2"
                  >
                    Create Account
                  </Button>
                  {guidedMode && (
                    <div className="mt-3 p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-2.5 shadow-sm">
                      <HelpCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                      <span className="text-[15px] sm:text-[16px] font-bold text-amber-950 leading-relaxed">
                        Step 4: Click this button to proceed once your details are entered.
                      </span>
                    </div>
                  )}
                </form>

                {/* Login Link */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-sm text-slate-500">
                    Already have an account?{' '}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={onShowLogin}
                      className="font-semibold text-diana-forest-light hover:text-diana-forest-light-dark hover:underline transition-all focus:outline-none"
                    >
                      Sign in instead
                    </motion.button>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer & Trust */}
        <motion.div variants={fadeIn} className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-4 text-xs text-slate-400 font-medium">
            <a href="#" className="hover:text-diana-forest-light transition-colors">
              Privacy
            </a>
            <span className="text-slate-300">•</span>
            <a href="#" className="hover:text-diana-forest-light transition-colors">
              Help
            </a>
          </div>
          <p className="text-[10px] text-slate-300">© 2026 DIANA</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Signup;
