import React, { useMemo } from 'react';
import { Menu, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../utils/animations';

const AdminMobileHeader = ({ activeView, userRole, isOpen, onOpen }) => {
  const isReduced = useReducedMotion();
  const adminNavItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'User Management' },
    { id: 'audit', label: 'Audit Logs' },
    { id: 'auth-events', label: 'Auth Events' },
    { id: 'models', label: 'Model Tracking' },
    { id: 'insights', label: 'Insights' },
    { id: 'rationale', label: 'Model Rationale' },
    { id: 'assessment', label: 'Log Assessment' },
    { id: 'explainability', label: 'Clinical Explainability' },
  ];

  const doctorNavItems = [
    { id: 'assessment', label: 'Log Assessment' },
    { id: 'explainability', label: 'Clinical Explainability' },
    { id: 'rationale', label: 'Model Rationale' },
  ];

  const navItems = userRole === 'doctor' ? doctorNavItems : adminNavItems;
  const activeLabel = useMemo(() => {
    return navItems.find(item => item.id === activeView)?.label ?? 'Overview';
  }, [activeView, navItems]);
  const roleLabel = userRole === 'doctor' ? 'Doctor' : 'Admin';

  return (
    <header className="lg:hidden sticky top-0 z-40">
      <div
        className="absolute inset-0 bg-white/90 backdrop-blur-xl border-b border-indigo-100"
        aria-hidden="true"
      />
      <div className="relative px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.3em] text-indigo-600 font-semibold">
              {roleLabel}
            </span>
            <span className="text-sm font-semibold text-slate-900">{activeLabel}</span>
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onOpen}
          whileHover={isReduced ? undefined : { scale: 1.05, rotate: 90 }}
          whileTap={isReduced ? undefined : { scale: 0.95 }}
          className="min-h-[44px] min-w-[44px] rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-sm flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:ring-offset-2"
          aria-label="Open admin navigation"
          aria-controls="admin-mobile-drawer"
          aria-expanded={isOpen}
        >
          <Menu size={20} />
        </motion.button>
      </div>
    </header>
  );
};

export default AdminMobileHeader;
