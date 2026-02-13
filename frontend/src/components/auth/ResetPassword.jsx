import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoIcon from '../../assets/logo-icon.png';
import Button from '../common/Button';
import { cardVariants, slideUp, fadeIn, getInputFocusVariants, useReducedMotion } from '../../utils/animations';
import { useResetPassword } from '../../api';

const ResetPassword = ({ onShowLogin, initialToken = '' }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useMemo(() => getInputFocusVariants(isReduced), [isReduced]);
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const resetPasswordMutation = useResetPassword();

  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token.trim()) {
      setError('Please enter your reset token.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ token: token.trim(), password });
      setSuccess('Password updated. You can now sign in with your new credentials.');
    } catch (err) {
      setError(err.message || 'Unable to reset password. Please try again.');
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
          <motion.h1 variants={fadeIn} className="text-2xl font-semibold text-diana-midnight tracking-tight text-center">Reset your password</motion.h1>
          <motion.p variants={fadeIn} className="text-sm text-slate-500 mt-2 text-center">Enter the token from your email and a new password.</motion.p>
        </div>

        <motion.div
          variants={cardVariants}
          initial="offscreen"
          animate="onscreen"
          className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8"
        >
          <motion.form onSubmit={handleSubmit} className="space-y-5" initial={false}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1">Reset Token</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                  <KeyRound size={18} />
                </div>
                <motion.input
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm"
                  placeholder="Enter your reset token"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1">New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                  <Lock size={18} />
                </div>
                <motion.input
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm"
                  placeholder="Create a new password"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 ml-1">Confirm New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-diana-forest-light transition-colors">
                  <Lock size={18} />
                </div>
                <motion.input
                  whileFocus="focus"
                  variants={inputFocusVariants}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all shadow-sm"
                  placeholder="Confirm your new password"
                  required
                />
              </div>
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
            <a href="#" className="hover:text-diana-forest-light transition-colors">Privacy</a>
            <span className="text-slate-300">•</span>
            <a href="#" className="hover:text-diana-forest-light transition-colors">Help</a>
          </div>
          <p className="text-[10px] text-slate-300">© 2026 DIANA</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
