import { useEffect, useMemo, useState, useRef } from 'react';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoIcon from '../../assets/logo-icon.png';
import Button from '../common/Button';
import {
  cardVariants,
  slideUp,
  fadeIn,
  getInputFocusVariants,
  useReducedMotion,
} from '../../utils/animations';
import { getErrorMessage, useForgotPassword } from '../../api';

const ForgotPassword = ({ onShowLogin, initialEmail = '' }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useMemo(() => getInputFocusVariants(isReduced), [isReduced]);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const forgotPasswordMutation = useForgotPassword();

  // Field validation state
  const [fieldError, setFieldError] = useState('');
  const [touched, setTouched] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const validateEmail = value => {
    if (!value.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
    return '';
  };

  const handleChange = e => {
    const value = e.target.value;
    setEmail(value);
    if (touched && fieldError) {
      setFieldError(validateEmail(value));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    setFieldError(validateEmail(email));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const err = validateEmail(email);
    setFieldError(err);
    setTouched(true);

    if (err) {
      emailRef.current?.focus();
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync({ email });
      setSuccess("If an account exists for this email, you'll receive a reset link shortly.");
    } catch (err) {
      if (err.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(getErrorMessage(err, 'Unable to send reset link. Please try again.'));
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 font-sans text-slate-900 selection:bg-diana-forest-light/20 selection:text-diana-forest-light">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={slideUp}
        className="w-full max-w-[440px] px-6"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div variants={fadeIn} className="flex items-center gap-3 mb-6">
            <img src={logoIcon} alt="DIANA Logo" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold text-diana-navy tracking-tight">DIANA</span>
          </motion.div>
          <motion.h1
            variants={fadeIn}
            className="text-2xl font-semibold text-diana-midnight tracking-tight text-center"
          >
            Forgot your password?
          </motion.h1>
          <motion.p variants={fadeIn} className="text-sm text-slate-500 mt-2 text-center">
            We&apos;ll email you a secure reset link.
          </motion.p>
        </div>

        <motion.div
          variants={cardVariants}
          initial="offscreen"
          animate="onscreen"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8"
        >
          <motion.form onSubmit={handleSubmit} className="space-y-5" initial={false} noValidate>
            <div className="space-y-1.5">
              <label
                htmlFor="forgot-email"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
              >
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                  <Mail size={18} />
                </div>
                <motion.input
                  ref={emailRef}
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type="email"
                  id="forgot-email"
                  value={email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`block w-full pl-10 pr-3 py-3 bg-white border ${touched && fieldError ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                  placeholder="Enter your email"
                  autoComplete="email"
                  aria-invalid={touched && fieldError ? 'true' : 'false'}
                  aria-describedby={fieldError ? 'forgot-email-error' : undefined}
                />
              </div>
              <AnimatePresence>
                {touched && fieldError && (
                  <motion.p
                    id="forgot-email-error"
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    className="text-[13px] text-red-600 font-medium flex items-center gap-1.5 pl-1"
                    role="alert"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    {fieldError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

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

            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg flex items-start gap-2"
                  role="status"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span className="font-medium">{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              isLoading={forgotPasswordMutation.isPending}
              fullWidth
              variant="primary"
              className="bg-diana-navy hover:bg-diana-midnight"
            >
              Send reset link
            </Button>
          </motion.form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Remembered it?{' '}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onShowLogin}
                className="font-semibold text-diana-forest-light hover:text-diana-forest-light-dark hover:underline transition-all focus:outline-none"
              >
                Back to sign in
              </motion.button>
            </p>
          </div>
        </motion.div>

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

export default ForgotPassword;
