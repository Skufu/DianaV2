import { useState, useMemo } from 'react';
import { AlertCircle, Lock, Mail, Eye, EyeOff, Activity, ShieldCheck, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoIcon from '../../assets/logo-icon.png';
import Button from '../common/Button';
import { fadeIn, getInputFocusVariants, useReducedMotion } from '../../utils/animations';
import { LoginFormSkeleton } from '../common/Skeleton';

const Login = ({ onLogin, onShowSignup, onShowForgotPassword, onShowVerify, error: errorProp }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useMemo(() => getInputFocusVariants(isReduced), [isReduced]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const displayError = errorProp?.message || errorProp || error;
  const shouldShowVerify = errorProp?.code === 'EMAIL_NOT_VERIFIED' || errorProp?.message === 'Email not verified';

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-slate-50 overflow-hidden font-sans selection:bg-diana-teal/20 selection:text-diana-teal-dark p-4 sm:p-6 lg:p-8">

      {/* Calm, Accessible Background Elements */}
      {/* 1. Subtle Background Grid (Softer for light mode) */}
      <div className="absolute inset-0 z-0 opacity-[0.4]">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <pattern id="light-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#light-grid)" />
        </svg>
        {/* Soft radial fade out for the grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#f8fafc_90%)]" />
      </div>

      {/* Main Content Container (Clean, structured card without excessive blur) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[1050px] flex flex-col lg:flex-row shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-2xl overflow-hidden z-10 relative bg-white border border-slate-200"
      >

        {/* Left Side: Clinical Value Prop (Trustworthy primary blue) */}
        <div className="w-full lg:w-[460px] p-10 lg:p-14 flex flex-col justify-between relative bg-gradient-to-br from-diana-forest to-[#152865] overflow-hidden">
          {/* Subtle medical pattern overlay */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay" />

          <div className="relative z-10 flex items-center gap-3 mb-10">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
              <Activity className="text-white h-6 w-6" />
            </div>
            <span className="text-white font-bold tracking-[0.15em] text-lg mt-0.5 uppercase">DIANA</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="space-y-6 relative z-10"
          >
            <h2 className="text-3xl lg:text-4xl text-white font-semibold leading-[1.2] tracking-tight">
              Clinical insights for <br />
              <span className="text-teal-100 font-serif italic pr-2 font-medium">menopausal care.</span>
            </h2>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
              className="pt-8 flex flex-col gap-4"
            >
              <div className="flex items-center gap-4 text-[15px] text-white bg-white/10 p-4 rounded-xl border border-white/10 shadow-sm">
                <Database className="h-6 w-6 text-teal-300 shrink-0" />
                <span className="font-medium tracking-wide">Trained on NHANES dataset</span>
              </div>
            </motion.div>
          </motion.div>

          <div className="mt-14 lg:mt-0 relative z-10">
            <p className="text-blue-200/80 text-[11px] font-bold tracking-[0.15em] uppercase">clinical decision support system</p>
          </div>
        </div>

        {/* Right Side: High-Contrast Login Form (Clean White) */}
        <div className="w-full lg:flex-1 p-10 sm:p-12 lg:p-16 bg-white relative flex flex-col justify-center">
          <div className="max-w-[420px] w-full mx-auto space-y-8">

            {/* Mobile-only branding backup (if stacked) */}
            <div className="lg:hidden flex items-center gap-3 mb-4">
              <div className="bg-diana-forest p-2 rounded-lg">
                <Activity className="text-white h-5 w-5" />
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col mb-8">
              <motion.div variants={fadeIn} initial="hidden" animate="visible">
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Sign in</h1>
              </motion.div>
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
                  <LoginFormSkeleton />
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Email Field */}
                    <div className="space-y-2">
                      <label htmlFor="login-email" className="text-[14px] font-semibold text-slate-700">Email Address</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                          <Mail size={20} />
                        </div>
                          <motion.input
                            whileFocus="focus"
                            variants={inputFocusVariants}
                            type="email"
                            id="login-email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-[16px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                          placeholder="doctor@clinic.com"
                          required
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                          <label htmlFor="login-password" className="text-[14px] font-semibold text-slate-700">Password</label>
                        <button
                          type="button"
                          onClick={() => onShowForgotPassword?.(email)}
                          className="text-[14px] font-semibold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                          <Lock size={20} />
                        </div>
                        <motion.input
                          whileFocus="focus"
                          variants={inputFocusVariants}
                          type={showPassword ? "text" : "password"}
                          id="login-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="block w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-[16px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 focus:bg-white transition-all shadow-sm"
                          placeholder="••••••••"
                          required
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center pt-2 pb-2">
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="h-5 w-5 text-blue-600 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-600/20 focus:ring-offset-0 cursor-pointer transition-all"
                      />
                      <label htmlFor="remember-me" className="ml-3 block text-[15px] font-medium text-slate-600 cursor-pointer select-none">
                        Keep me signed in
                      </label>
                    </div>

                    {/* Error Display */}
                    <AnimatePresence>
                      {displayError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          className="p-4 text-[14px] text-red-700 bg-red-50 border border-red-200 rounded-xl flex flex-col gap-2" role="alert"
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
                            <span className="font-medium">{displayError}</span>
                          </div>
                          {shouldShowVerify && (
                            <button
                              type="button"
                              onClick={() => onShowVerify?.(email)}
                              className="text-left text-[14px] font-semibold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none ml-6"
                            >
                              Resend verification email
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <Button
                        type="submit"
                        data-testid="login-submit-button"
                        isLoading={loading}
                        fullWidth
                        variant="blue"
                        className="py-4 shadow-sm text-[16px] font-semibold bg-blue-600 hover:bg-blue-700 text-white focus:ring-4 focus:ring-offset-1 focus:ring-blue-600/30 transition-all h-[54px] rounded-xl"
                      >
                        Sign in to Dashboard
                      </Button>
                    </div>
                  </form>

                  {/* Divider */}
                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-4 text-slate-500 font-semibold tracking-wider uppercase text-[11px]">Or continue with</span>
                    </div>
                  </div>

                  {/* SSO Button */}
                  <button
                    type="button"
                    className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-[15px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all h-[54px]"
                  >
                    <Activity className="h-5 w-5 text-slate-500" />
                    <span>Institutional SSO</span>
                  </button>

                  {/* Signup Link */}
                  <p className="mt-8 text-center text-[15px] text-slate-500 font-medium">
                    Not registered yet?{' '}
                    <button
                      type="button"
                      onClick={onShowSignup}
                      className="font-bold text-blue-600 hover:text-blue-700 transition-colors focus:outline-none"
                    >
                      Request clinical access
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Login;
