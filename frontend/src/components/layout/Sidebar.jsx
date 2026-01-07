// Sidebar: Clinical Precision navigation with teal accents
import React from 'react';
import { LayoutDashboard, Users, Activity, Download, Plus, LogOut, BookOpen, Shield } from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onStartAssessment, onLogout, userRole }) => {
  // Build nav items with optional admin tab
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'patients', icon: Users, label: 'Assessments' },
    { id: 'analytics', icon: Activity, label: 'Analytics' },
    { id: 'education', icon: BookOpen, label: 'Education' },
    { id: 'export', icon: Download, label: 'Export Data' },
    // Admin-only navigation item
    ...(userRole === 'admin' ? [{ id: 'admin', icon: Shield, label: 'Admin Panel' }] : []),
  ];

  return (
    <div
      className="w-20 lg:w-72 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300"
      style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}
    >
      {/* Logo */}
      <div className="p-6 lg:p-8 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-700/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
          <Activity size={20} className="text-white" />
        </div>
        <span className="text-2xl text-white font-bold hidden lg:block tracking-wide">DIANA</span>
      </div>

      {/* New Assessment Button */}
      <div className="p-4 lg:p-6">
        <button
          onClick={onStartAssessment}
          className="w-full flex items-center justify-center lg:justify-start gap-3 py-4 px-4 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-teal-500 to-cyan-500 
                     hover:from-teal-400 hover:to-cyan-400 
                     hover:shadow-lg hover:shadow-teal-500/25
                     transition-all duration-300 active:scale-[0.98]"
        >
          <Plus size={20} />
          <span className="hidden lg:inline">New Assessment</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-slate-700/50 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Icon
                size={20}
                className={isActive ? 'text-teal-400' : 'text-slate-500 group-hover:text-slate-300'}
              />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-400 rounded-l-full hidden lg:block" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 lg:p-6 border-t border-slate-700/50">
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

export default Sidebar;


