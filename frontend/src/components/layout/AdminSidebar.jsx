// AdminSidebar: Dedicated navigation for Admin module with Indigo accents
import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Shield,
  LogOut,
  Cpu,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Activity,
  BookOpen,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { navLabelVariants } from '../../utils/animations';

const AdminSidebar = ({
  activeView,
  setActiveView,
  onLogout,
  isCollapsed,
  setIsCollapsed,
  userRole,
}) => {
  const [hoveredView, setHoveredView] = React.useState(null);

  // Admin-only governance items - NO clinical workflows
  const adminNavItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'users', icon: Users, label: 'User Management' },
    { id: 'audit', icon: FileText, label: 'Audit Logs' },
    { id: 'auth-events', icon: Wifi, label: 'Auth Events' },
    { id: 'models', icon: Cpu, label: 'Model Tracking' },
  ];

  // Doctor clinical workflow items - focused on patient care tools
  const doctorNavItems = [
    { id: 'assessment', icon: FileText, label: 'Log Assessment' },
    { id: 'explainability', icon: Brain, label: 'Clinical Explainability' },
    { id: 'insights', icon: Activity, label: 'Insights' },
    { id: 'rationale', icon: BookOpen, label: 'Model Rationale' },
  ];

  // Role-based navigation selection
  // Admin sees governance items, Doctor sees clinical tools
  const navItems = userRole === 'doctor' ? doctorNavItems : adminNavItems;

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="h-screen fixed left-0 top-0 flex flex-col z-50 bg-white border-r border-slate-200 shadow-sm"
    >
      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm text-indigo-600 hover:bg-slate-50 hidden lg:flex items-center justify-center z-[60]"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div
        className={`p-6 lg:p-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'} gap-3 border-b border-slate-200`}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <Shield size={20} className="text-white" />
        </div>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              variants={navLabelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="hidden lg:block overflow-hidden"
            >
              <span className="text-xl text-slate-900 font-bold tracking-wide">DIANA</span>
              <div className="text-xs text-indigo-600 font-medium tracking-wider">
                {userRole === 'doctor' ? 'DOCTOR' : 'ADMIN'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3 lg:px-4'} space-y-1 mt-6`}
        onMouseLeave={() => setHoveredView(null)}
      >
        {navItems.map(item => {
          const isActive = activeView === item.id;
          const isHovered = hoveredView === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onMouseEnter={() => setHoveredView(item.id)}
              whileTap={{ scale: 0.98 }}
              whileFocus={{ x: isCollapsed ? 0 : 4, backgroundColor: 'rgba(79, 70, 229, 0.1)' }}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} gap-4 p-4 rounded-xl relative
                ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {isActive && (
                <motion.div
                  layoutId="admin-sidebar-active"
                  className="absolute inset-0 bg-indigo-50 rounded-xl z-10"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              {isHovered && (
                <motion.div
                  layoutId="admin-sidebar-hover"
                  className="absolute inset-0 bg-slate-50 rounded-xl z-0"
                  animate={{ opacity: isActive ? 0 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative z-20 flex items-center gap-4">
                <Icon
                  size={20}
                  className={
                    isActive
                      ? 'text-indigo-600'
                      : 'text-slate-400 group-hover:text-slate-600 transition-colors'
                  }
                />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      variants={navLabelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="hidden lg:block font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="admin-sidebar-pip"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full hidden lg:block z-30"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`p-4 ${isCollapsed ? 'lg:p-4' : 'lg:p-6'} border-t border-slate-200`}>
        <motion.button
          whileHover={{ x: isCollapsed ? 0 : 5, color: '#e11d48', backgroundColor: '#fff1f2' }}
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'} gap-4 p-4 rounded-xl text-slate-500 transition-all duration-200`}
        >
          <LogOut size={20} />
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.span
                variants={navLabelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="hidden lg:block font-medium whitespace-nowrap overflow-hidden"
              >
                Log Out
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default AdminSidebar;
