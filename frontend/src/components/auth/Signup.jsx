// Signup: Create new account for DIANA platform
import { useEffect, useState } from 'react';
import BiologicalNetwork from '../layout/BiologicalNetwork';
import { User, Eye, EyeOff, Shield, AlertCircle, CheckCircle } from 'lucide-react';

const Signup = ({ onSignup, onShowLogin }) => {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailValid, setEmailValid] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [passwordsMatch, setPasswordsMatch] = useState(null);

  useEffect(() => setMounted(true), []);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const checkPasswordStrength = (password) => {
    if (password.length < 8) return { valid: false, text: 'Too short' };
    if (password.length < 12) return { valid: true, text: 'Good' };
    return { valid: true, text: 'Strong' };
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailValid(value.length > 0 ? validateEmail(value) : null);
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordStrength(value.length > 0 ? checkPasswordStrength(value) : null);
    setPasswordsMatch(confirmPassword.length > 0 ? value === confirmPassword : null);
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordsMatch(password.length > 0 ? password === value : null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { signupApi } = await import('../../api');
      const res = await signupApi(email, password, firstName, lastName);
      await onSignup(res);
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1E293B 100%)' }}
    >
      <BiologicalNetwork nodeCount={55} connectionDistance={180} speed={0.25} />

      <div className="absolute inset-0 bg-gradient-to-br from-teal-900/5 via-transparent to-cyan-900/5" />

      <div
        className={`relative z-10 w-full max-w-md mx-4 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="DIANA Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <span className="text-4xl font-bold text-gradient tracking-tight">DIANA</span>
          </div>
          <p className="text-slate-300 text-sm font-medium">Join the menopausal diabetes platform</p>
        </div>

        <div className="glass rounded-3xl p-10 border-glow hover-lift">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-slate-300 text-sm">Enter your details to get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium ml-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-slate-600/60 text-white p-4 rounded-xl
                           focus:outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/30
                           transition-all duration-300 placeholder-slate-500"
                  placeholder="Jane"
                />
              </div>
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium ml-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full bg-slate-800/50 border border-slate-600/60 text-white p-4 rounded-xl
                           focus:outline-none focus:border-teal-400/70 focus:ring-2 focus:ring-teal-400/30
                           transition-all duration-300 placeholder-slate-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-slate-300 text-sm font-medium">Email</label>
                {emailValid === true && (
                  <CheckCircle size={16} className="text-emerald-400" />
                )}
                {emailValid === false && (
                  <AlertCircle size={16} className="text-rose-400" />
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  className={`w-full bg-slate-800/50 text-white p-4 rounded-xl
                           focus:outline-none focus:ring-2
                           transition-all duration-300 placeholder-slate-500 pr-10
                           ${emailValid === false ? 'border-rose-500/60 border focus:border-rose-400 focus:ring-rose-400/30' :
                      emailValid === true ? 'border-emerald-500/60 border focus:border-emerald-400 focus:ring-emerald-400/30' :
                        'border-slate-600/60 focus:border-teal-400/70 focus:ring-teal-400/30'}`}
                  placeholder="doctor@clinic.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-slate-300 text-sm font-medium">Password</label>
                {passwordStrength && (
                  <span className={`text-xs font-medium ${passwordStrength.valid ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {passwordStrength.text}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  className={`w-full bg-slate-800/50 text-white p-4 rounded-xl pr-12
                           focus:outline-none focus:ring-2
                           transition-all duration-300 placeholder-slate-500
                           ${passwordStrength && !passwordStrength.valid ? 'border-amber-500/60 border focus:border-amber-400 focus:ring-amber-400/30' :
                      passwordStrength && passwordStrength.valid ? 'border-emerald-500/60 border focus:border-emerald-400 focus:ring-emerald-400/30' :
                        'border-slate-600/60 focus:border-teal-400/70 focus:ring-teal-400/30'}`}
                  placeholder="•••••••"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-slate-300 text-sm font-medium">Confirm Password</label>
                {passwordsMatch === true && (
                  <CheckCircle size={16} className="text-emerald-400" />
                )}
                {passwordsMatch === false && (
                  <AlertCircle size={16} className="text-rose-400" />
                )}
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  minLength={8}
                  className={`w-full bg-slate-800/50 text-white p-4 rounded-xl pr-12
                           focus:outline-none focus:ring-2
                           transition-all duration-300 placeholder-slate-500
                           ${passwordsMatch === false ? 'border-rose-500/60 border focus:border-rose-400 focus:ring-rose-400/30' :
                      passwordsMatch === true ? 'border-emerald-500/60 border focus:border-emerald-400 focus:ring-emerald-400/30' :
                        'border-slate-600/60 focus:border-teal-400/70 focus:ring-teal-400/30'}`}
                  placeholder="•••••••"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-300
                         bg-gradient-to-r from-teal-500 to-cyan-500
                         hover:from-teal-400 hover:to-cyan-400
                         hover:shadow-xl hover:shadow-teal-500/40 hover:-translate-y-0.5
                         active:scale-[0.98] active:translate-y-0
                         disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none
                         disabled:translate-y-0 flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating Account...
                </>
              ) : (
                <>
                  <User size={20} />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onShowLogin}
              className="text-slate-300 text-sm hover:text-white transition-colors font-medium"
            >
              Already have an account? Sign In
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Shield size={14} className="text-teal-400" />
                <span>HIPAA Compliant</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-teal-400" />
                <span>256-bit Encryption</span>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs mt-6">
            For menopausal women diabetes risk assessment
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
