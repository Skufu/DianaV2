import React, { memo, useState } from 'react';
import { LayoutDashboard, User, Download, Plus, LogOut, BookOpen, Shield, TrendingUp, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { navLabelVariants } from '../../utils/animations';

const Sidebar = ({ activeTab, setActiveTab, onStartAssessment, onLogout, isAdmin, isCollapsed, setIsCollapsed }) => {
  // Admin users get a completely different navigation
  const adminNavItems = [
    { id: 'admin', icon: Shield, label: 'Overview' },
  ];

  // Regular user navigation
  const userNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'profile', icon: User, label: 'My Profile' },
    { id: 'trends', icon: TrendingUp, label: 'Health Trends' },
    { id: 'education', icon: BookOpen, label: 'Education' },
    { id: 'export', icon: FileText, label: 'Health Report' },
  ];

  const [hoveredTab, setHoveredTab] = useState(null);

  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-screen fixed left-0 top-0 flex flex-col z-50 bg-white border-r border-diana-sand shadow-sm"
    >
      {/* Collapse Toggle Button (Desktop only) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 bg-white border border-diana-sand rounded-full p-1.5 shadow-sm text-diana-forest hover:bg-diana-stone hidden lg:flex items-center justify-center z-[60]"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo Area */}
      <div className={`p-6 lg:p-8 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'} gap-3`}>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              variants={navLabelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="text-2xl font-serif font-bold text-diana-forest hidden lg:block tracking-tight whitespace-nowrap overflow-hidden"
            >
              DIANA
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* New Assessment Button - only for regular users */}
      {!isAdmin && (
        <div className="px-4 lg:px-6 mb-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartAssessment}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'} gap-3 py-3.5 px-4 rounded-xl font-bold text-white
                       bg-diana-forest hover:bg-diana-forest-light hover:shadow-md
                       bg-diana-forest hover:bg-diana-forest-light hover:shadow-md
                       transition-colors duration-200`}
          >
            <Plus size={20} className="stroke-[3px]" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  variants={navLabelVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="hidden lg:inline whitespace-nowrap overflow-hidden"
                >
                  Log Assessment
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3 lg:px-4'} space-y-1 mt-4`}
        onMouseLeave={() => setHoveredTab(null)}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isHovered = hoveredTab === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              onMouseEnter={() => setHoveredTab(item.id)}
              whileTap={{ scale: 0.98 }}
              whileFocus={{ x: 4, backgroundColor: "rgba(16, 185, 129, 0.1)" }}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} gap-4 p-4 rounded-xl relative
                ${isActive
                  ? 'text-diana-forest'
                  : 'text-diana-text-secondary hover:text-diana-forest'}`}
            >
              {/* Active Background */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-diana-forest/5 rounded-xl z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              {/* Hover Background (Gliding Pill) */}
              {isHovered && (
                <motion.div
                  layoutId="sidebar-hover"
                  className="absolute inset-0 bg-diana-stone rounded-xl z-0"
                  animate={{ opacity: isActive ? 0 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className="relative z-20 flex items-center gap-4">
                <Icon
                  size={22}
                  className={isActive ? 'text-diana-forest' : 'text-diana-text-muted group-hover:text-diana-forest transition-colors'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      variants={navLabelVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className={`hidden lg:block font-medium ${isActive ? 'font-bold' : ''} whitespace-nowrap overflow-hidden`}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Active Indicator Pips */}
              {isActive && !isCollapsed && (
                <motion.div
                  layoutId="sidebar-pip"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-diana-forest rounded-r-full hidden lg:block z-30"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={`p-4 ${isCollapsed ? 'lg:p-4' : 'lg:p-6'} border-t border-diana-sand`}>
        <motion.button
          whileHover={{ x: isCollapsed ? 0 : 5, color: "#e11d48", backgroundColor: "#fff1f2" }} // rose-600, rose-50
          onClick={onLogout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center lg:justify-start'} gap-4 p-4 rounded-xl text-diana-text-muted transition-all duration-200`}
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

export default memo(Sidebar);
