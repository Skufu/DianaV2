import React, { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from '../../utils/animations';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  Wifi,
  Cpu,
  Activity,
  BookOpen,
  LogOut,
  X,
} from 'lucide-react';

const AdminMobileDrawer = ({ isOpen, onClose, activeView, setActiveView, onLogout, userRole }) => {
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);
  const isReduced = useReducedMotion();

  const adminNavItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'audit', icon: FileText, label: 'Audit Logs' },
    { id: 'auth-events', icon: Wifi, label: 'Auth Events' },
    { id: 'models', icon: Cpu, label: 'Model Tracking' },
    { id: 'operations', icon: Activity, label: 'Operations' },
  ];

  const doctorNavItems = [
    { id: 'assessment', icon: FileText, label: 'Assessment & Explainability' },
    { id: 'rationale', icon: BookOpen, label: 'Model Rationale' },
  ];

  const navItems = useMemo(() => {
    return userRole === 'doctor' ? doctorNavItems : adminNavItems;
  }, [userRole]);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';
    const focusTarget = panelRef.current?.querySelector('[data-drawer-focus]');
    if (focusTarget) {
      focusTarget.focus();
    }
    return () => {
      document.body.style.overflow = '';
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavigate = viewId => {
    setActiveView(viewId);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-slate-900/40 focus-visible:outline-none"
            aria-label="Close admin navigation"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.aside
            id="admin-mobile-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute left-0 top-0 h-full w-[min(90vw,360px)] bg-white shadow-2xl border-r border-indigo-100 flex flex-col"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={
              isReduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }
            }
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-indigo-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutDashboard size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-indigo-600 font-semibold">
                    {userRole === 'doctor' ? 'Doctor' : 'Admin'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900">Navigation</p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={onClose}
                whileHover={isReduced ? undefined : { scale: 1.1, rotate: 90 }}
                whileTap={isReduced ? undefined : { scale: 0.9 }}
                className="min-h-[44px] min-w-[44px] rounded-xl border border-indigo-100 text-indigo-600 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2"
                aria-label="Close navigation"
                data-drawer-focus
              >
                <X size={18} />
              </motion.button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    whileHover={isReduced ? undefined : { scale: 1.02, x: 4 }}
                    whileTap={isReduced ? undefined : { scale: 0.98 }}
                    className={`w-full min-h-[48px] px-4 py-3 rounded-2xl flex items-center justify-between text-left border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-transparent text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-3 w-full min-w-0">
                      <span
                        className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-semibold truncate w-full">{item.label}</span>
                    </span>
                  </motion.button>
                );
              })}
            </nav>

            <div className="border-t border-indigo-100 p-4">
              <motion.button
                type="button"
                onClick={handleLogout}
                whileHover={isReduced ? undefined : { scale: 1.02 }}
                whileTap={isReduced ? undefined : { scale: 0.98 }}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl flex items-center gap-3 text-left text-rose-600 bg-rose-50 border border-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2"
              >
                <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
                  <LogOut size={18} />
                </span>
                <span className="text-sm font-semibold">Log Out</span>
              </motion.button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdminMobileDrawer;
