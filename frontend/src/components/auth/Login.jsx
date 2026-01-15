// Login: Clinical Precision auth screen with biological network background
import React, { useEffect, useState } from 'react';
import BiologicalNetwork from '../layout/BiologicalNetwork';
import { Activity } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError('Invalid credentials or server unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #1E293B 100%)' }}>

      {/* Animated Background */}
      <BiologicalNetwork
        nodeCount={80}
        connectionDistance={180}
        speed={0.25}
      />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-900/10 via-transparent to-cyan-900/10" />

      {/* Login Card */}
      <div className={`relative z-10 w-full max-w-md mx-4 transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/logo.png" alt="DIANA Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <span className="text-4xl font-bold text-gradient tracking-tight">DIANA</span>
          </div>
          <p className="text-slate-400 text-sm">Diabetes Identification & Analysis</p>
        </div>

        {/* Glass Card */}
        <div className="glass rounded-3xl p-8 border-glow">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-slate-400 text-sm">Enter your credentials to access patient data</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl 
                         focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 
                         transition-all placeholder-slate-500"
                placeholder="doctor@clinic.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-slate-300 text-sm font-medium ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700/50 text-white p-4 rounded-xl 
                         focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 
                         transition-all placeholder-slate-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-300
                         bg-gradient-to-r from-teal-500 to-cyan-500 
                         hover:from-teal-400 hover:to-cyan-400 
                         hover:shadow-lg hover:shadow-teal-500/25
                         active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            For menopausal women diabetes risk assessment
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;


