// Sidebar: navigation shell and new assessment shortcut.
import React from 'react';
import { LayoutDashboard, Users, Activity, Download, Plus, LogOut } from 'lucide-react';
import Button from './Button';

const THEME = {
  colors: {
    sidebarGradient: 'linear-gradient(180deg, #0B1437 0%, #111C44 100%)',
  },
};

const Sidebar = ({ activeTab, setActiveTab, onStartAssessment, onLogout }) => {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'patients', icon: Users, label: 'Assessments' },
    { id: 'analytics', icon: Activity, label: 'Analytics' },
    { id: 'export', icon: Download, label: 'Export Data' },
  ];
  return (
    <div
      className="w-20 lg:w-72 h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300 shadow-2xl"
      style={{ background: THEME.colors.sidebarGradient }}
    >
      <div className="p-8 flex items-center justify-center lg:justify-start gap-3 border-b border-white/10">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg" aria-label="DIANA logo">
          <span className="text-[#0B1437] font-bold">D</span>
        </div>
        <span className="text-2xl text-white font-bold hidden lg:block tracking-wide">DIANA</span>
      </div>
      <div className="p-6">
        <Button
          fullWidth
          onClick={onStartAssessment}
          className="bg-[#4318FF] text-white hover:bg-[#2B3674] shadow-lg border-none py-4 transform hover:scale-105 transition-transform"
          icon={Plus}
        >
          <span className="hidden lg:inline">New Assessment</span>
        </Button>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group relative
                ${isActive ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm' : 'text-[#A3AED0] hover:text-white hover:bg-white/5'}`}
            aria-label={item.label}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-[#A3AED0] group-hover:text-white'} />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#4318FF] rounded-l-full hidden lg:block" />}
            </button>
          );
        })}
      </nav>
      <div className="p-8">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 mt-8 text-[#A3AED0] hover:text-white transition-colors lg:pl-4"
        >
          <LogOut size={20} />
          <span className="hidden lg:block font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

