import React, { useEffect, useState } from 'react';
import Button from './Button';

const THEME = {
  colors: {
    sidebarGradient: 'linear-gradient(180deg, #0B1437 0%, #111C44 100%)',
  },
};

const Login = ({ onLogin }) => {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('clinician@example.com');
  const [password, setPassword] = useState('password123');
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
    <div className="min-h-screen w-full flex relative overflow-hidden bg-[#F4F7FE]">
      <div
        className={`hidden lg:flex flex-col justify-between w-5/12 p-12 relative z-10 transition-all duration-1000 transform ${
          mounted ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
        }`}
        style={{ background: THEME.colors.sidebarGradient }}
      >
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#4318FF] opacity-20 blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#6AD2FF] opacity-10 blur-3xl"></div>
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#0B1437] font-bold text-xl shadow-lg">D</div>
            <span className="text-3xl text-white font-bold tracking-tight">DIANA</span>
          </div>
          <h1 className="text-5xl font-bold leading-tight text-white mb-6">Predictive Model-Based Application</h1>
          <p className="text-[#A3AED0] text-lg max-w-md leading-relaxed">
            Using selected blood biomarkers for identifying menopausal women at risk of Type 2 Diabetes.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-7/12 flex items-center justify-center p-8 relative z-10">
        <div className={`w-full max-w-md p-8 transition-all duration-1000 delay-300 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-[#1B2559] mb-3">Sign In</h2>
            <p className="text-[#A3AED0]">Enter your medical credentials to access patient data.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[#1B2559] text-sm font-bold ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-[#E0E5F2] text-[#1B2559] p-4 rounded-2xl focus:outline-none focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 transition-all shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[#1B2559] text-sm font-bold ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-[#E0E5F2] text-[#1B2559] p-4 rounded-2xl focus:outline-none focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 transition-all shadow-sm"
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <Button fullWidth onClick={handleSubmit} className={loading ? 'opacity-70' : ''}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

