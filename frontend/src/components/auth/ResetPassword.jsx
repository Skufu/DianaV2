import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Lock, Check, X } from 'lucide-react';
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
import { useResetPassword } from '../../api';

const getPasswordRequirements = password => [
  { key: 'length', label: 'At least 8 characters', met: password.length >= 8 },
  { key: 'upper', label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  { key: 'lower', label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
  { key: 'digit', label: 'Contains a number', met: /\d/.test(password) },
];

const ResetPassword = ({ onShowLogin, initialToken = '' }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useMemo(() => getInputFocusVariants(isReduced), [isReduced]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const resetPasswordMutation = useResetPassword();

  // Field validation state
  const [fieldErrors, setFieldErrors] = useState({ token: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ token: false, password: false, confirmPassword: false });
  const tokenRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const passwordRequirements = useMemo(() => getPasswordRequirements(password), [password]);
  const passwordsMatch = confirmPassword.length > 0 ? password === confirmPassword : null;

  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  const validateField = useCallback(
    (field, value) => {
      switch (field) {
        case 'token':
          if (!value.trim()) return 'Please enter your reset token';
          return '';
        case 'password':
          if (!value) return 'Password is required';
          if (value.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(value)) return 'Must contain an uppercase letter';
          if (!/[a-z]/.test(value)) return 'Must contain a lowercase letter';
          if (!/\d/.test(value)) return 'Must contain a number';
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

  const handleChange = (field, value) => {
    switch (field) {
      case 'token':
        setToken(value);
        break;
      case 'password':
        setPassword(value);
        if (touched.confirmPassword && confirmPassword) {
          setFieldErrors(prev => ({
            ...prev,
            confirmPassword: value !== confirmPassword ? 'Passwords do not match' : '',
          }));
        }
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
    }
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
    const value = field === 'token' ? token : field === 'password' ? password : confirmPassword;
    setFieldErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const tokenErr = validateField('token', token);
    const passwordErr = validateField('password', password);
    const confirmErr = validateField('confirmPassword', confirmPassword);
    setFieldErrors({ token: tokenErr, password: passwordErr, confirmPassword: confirmErr });
    setTouched({ token: true, password: true, confirmPassword: true });

    if (tokenErr || passwordErr || confirmErr) {
      if (tokenErr) tokenRef.current?.focus();
      else if (passwordErr) passwordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ token: token.trim(), password });
      setSuccess('Password updated. You can now sign in with your new credentials.');
    } catch (err) {
      if (err.status === 429) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(err.message || 'Unable to reset password. Please try again.');
      }
    }
  };

  const FieldError = ({ id, message }) => (
    <AnimatePresence>
      {message && (
        <motion.p
          id={id}
          initial={{ opacity: 0, height: 0, y: -4 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -4 }}
          className="text-[13px] text-red-600 font-medium flex items-center gap-1.5 pl-1"
          role="alert"
        >
          <AlertCircle size={14} className="shrink-0" />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );

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
            Reset your password
          </motion.h1>
          <motion.p variants={fadeIn} className="text-sm text-slate-500 mt-2 text-center">
            Enter the token from your email and a new password.
          </motion.p>
        </div>

        <motion.div
          variants={cardVariants}
          initial="offscreen"
          animate="onscreen"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8"
        >
          <motion.form onSubmit={handleSubmit} className="space-y-5" initial={false} noValidate>
            {/* Token Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-token"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
              >
                Reset Token
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                  <KeyRound size={18} />
                </div>
                <motion.input
                  ref={tokenRef}
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type="text"
                  id="reset-token"
                  value={token}
                  onChange={e => handleChange('token', e.target.value)}
                  onBlur={() => handleBlur('token')}
                  className={`block w-full pl-10 pr-3 py-3 bg-white border ${touched.token && fieldErrors.token ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                  placeholder="Enter your reset token"
                  aria-invalid={touched.token && fieldErrors.token ? 'true' : 'false'}
                  aria-describedby={fieldErrors.token ? 'reset-token-error' : undefined}
                />
              </div>
              <FieldError id="reset-token-error" message={touched.token ? fieldErrors.token : ''} />
            </div>

            {/* New Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="reset-password"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
              >
                New Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                  <Lock size={18} />
                </div>
                <motion.input
                  ref={passwordRef}
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type="password"
                  id="reset-password"
                  value={password}
                  onChange={e => handleChange('password', e.target.value)}
                  onBlur={() => handleBlur('password')}
                  className={`block w-full pl-10 pr-3 py-3 bg-white border ${touched.password && fieldErrors.password ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                  placeholder="Create a new password"
                  autoComplete="new-password"
                  aria-invalid={touched.password && fieldErrors.password ? 'true' : 'false'}
                  aria-describedby="reset-password-reqs"
                />
              </div>
              <FieldError
                id="reset-password-error"
                message={touched.password ? fieldErrors.password : ''}
              />

              {/* Password Requirements Checklist */}
              {password.length > 0 && (
                <motion.div
                  id="reset-password-reqs"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1"
                >
                  {passwordRequirements.map(req => (
                    <div
                      key={req.key}
                      className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${req.met ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {req.met ? (
                        <Check size={12} className="shrink-0" />
                      ) : (
                        <X size={12} className="shrink-0" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Confirm New Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="reset-confirm-password"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1"
                >
                  Confirm New Password
                </label>
                {passwordsMatch === true && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-bold uppercase tracking-wider text-emerald-500"
                  >
                    Match
                  </motion.span>
                )}
                {passwordsMatch === false && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[10px] font-bold uppercase tracking-wider text-red-500"
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
                  type="password"
                  id="reset-confirm-password"
                  value={confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  onBlur={() => handleBlur('confirmPassword')}
                  className={`block w-full pl-10 pr-3 py-3 bg-white border ${touched.confirmPassword && fieldErrors.confirmPassword ? 'border-red-300' : passwordsMatch === false ? 'border-red-300' : 'border-slate-200'} rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm`}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  aria-invalid={
                    touched.confirmPassword && fieldErrors.confirmPassword ? 'true' : 'false'
                  }
                  aria-describedby={fieldErrors.confirmPassword ? 'reset-confirm-error' : undefined}
                />
              </div>
              <FieldError
                id="reset-confirm-error"
                message={touched.confirmPassword ? fieldErrors.confirmPassword : ''}
              />
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
              isLoading={resetPasswordMutation.isPending}
              fullWidth
              variant="primary"
              className="bg-diana-navy hover:bg-diana-midnight"
            >
              Update password
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

export default ResetPassword;
