// AdminSidebar: Dedicated navigation for Admin module with Indigo accents
import React from 'react';
import { LayoutDashboard, Users, Activity, FileText, Shield, LogOut, Cpu, Building2 } from 'lucide-react';

const AdminSidebar = ({ activeView, setActiveView, onLogout }) => {
  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'clinics', icon: Building2, label: 'Clinics' },
    { id: 'audit', icon: FileText, label: 'Audit Logs' },
    { id: 'models', icon: Cpu, label: 'Model Tracking' },
  ];

  return (
    <div
      className="w-20 lg:w-72 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)' }} // Darker indigo drift
    >
      {/* Logo */}
      <div className="p-6 lg:p-8 flex items-center justify-center lg:justify-start gap-3 border-b border-indigo-900/30">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <span className="text-xl text-white font-bold hidden lg:block tracking-wide">DIANA</span>
          <span className="text-xs text-indigo-300 hidden lg:block font-medium tracking-wider">ADMIN</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 space-y-1 mt-6">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-indigo-900/50 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Icon
                size={20}
                className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}
              />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full hidden lg:block" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 lg:p-6 border-t border-indigo-900/30">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center lg:justify-start gap-4 p-4 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="hidden lg:block font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default AdminSidebar;
