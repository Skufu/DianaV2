import { useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, User, Download, Plus, LogOut, BookOpen, TrendingUp, FileText, X } from 'lucide-react';
import { EASE_IN_OUT, useReducedMotion } from '../../utils/animations';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'profile', icon: User, label: 'My Profile' },
  { id: 'trends', icon: TrendingUp, label: 'Health Trends' },
  { id: 'education', icon: BookOpen, label: 'Education' },
  { id: 'export', icon: FileText, label: 'Health Report' },
];

const drawerVariants = (isReduced) => ({
  hidden: { x: '-100%', opacity: isReduced ? 1 : 0 },
  visible: { x: 0, opacity: 1, transition: { duration: isReduced ? 0 : 0.25, ease: EASE_IN_OUT } },
  exit: { x: '-100%', opacity: isReduced ? 1 : 0, transition: { duration: isReduced ? 0 : 0.2, ease: EASE_IN_OUT } },
});

const MobileDrawer = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onStartAssessment,
  onLogout,
  userInitials = 'U',
}) => {
  const isReduced = useReducedMotion();
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const focusableSelectors = useMemo(
    () => 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    []
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll(focusableSelectors);
      if (!focusable || focusable.length === 0) return;
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

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, focusableSelectors]);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleAssessmentClick = () => {
    onStartAssessment();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <motion.button
            type="button"
            aria-label="Close navigation menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: isReduced ? 0 : 0.2 } }}
            exit={{ opacity: 0, transition: { duration: isReduced ? 0 : 0.15 } }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm focus-visible:outline-none"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.aside
            id="user-mobile-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="User navigation"
            variants={drawerVariants(isReduced)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative h-full w-[85%] max-w-[320px] bg-white shadow-2xl border-r border-diana-sand flex flex-col"
          >
            <div className="px-5 pt-5 pb-4 border-b border-diana-sand">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-diana-forest to-diana-forest-light text-white flex items-center justify-center font-serif font-bold">
                    D
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-diana-text-muted">DIANA</div>
                    <div className="text-lg font-serif font-bold text-diana-forest">Navigation</div>
                  </div>
                </div>
                <motion.button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  whileHover={isReduced ? undefined : { scale: 1.1, rotate: 90 }}
                  whileTap={isReduced ? undefined : { scale: 0.9 }}
                  aria-label="Close navigation menu"
                  className="w-11 h-11 rounded-xl border border-diana-sand bg-white text-diana-forest flex items-center justify-center hover:bg-diana-stone/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diana-forest/30 focus-visible:ring-offset-2"
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="flex items-center gap-3 bg-diana-stone/60 border border-diana-sand rounded-2xl px-4 py-3">
                <div className="w-12 h-12 rounded-full bg-white border border-diana-sand flex items-center justify-center text-diana-text-secondary font-semibold">
                  {userInitials}
                </div>
                <div>
                  <div className="text-sm text-diana-text-secondary">Signed in as</div>
                  <div className="text-base font-semibold text-diana-text-primary">DIANA User</div>
                </div>
              </div>
            </div>

            <div className="px-5">
              <motion.button
                type="button"
                onClick={handleAssessmentClick}
                whileHover={isReduced ? undefined : { scale: 1.02 }}
                whileTap={isReduced ? undefined : { scale: 0.98 }}
                className="w-full min-h-[48px] flex items-center justify-center gap-3 rounded-2xl bg-diana-forest text-white font-bold shadow-md shadow-blue-900/20 hover:bg-diana-forest-light transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diana-forest/30 focus-visible:ring-offset-2"
              >
                <Plus size={18} className="stroke-[3px]" />
                Log Assessment
              </motion.button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    whileHover={isReduced ? undefined : { scale: 1.02, x: 4 }}
                    whileTap={isReduced ? undefined : { scale: 0.98 }}
                    className={`w-full min-h-[48px] px-4 rounded-2xl flex items-center gap-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diana-forest/30 focus-visible:ring-offset-2 ${
                      isActive
                        ? 'bg-diana-forest/10 text-diana-forest'
                        : 'text-diana-text-secondary hover:bg-diana-stone'
                    }`}
                  >
                    <Icon size={20} className={isActive ? 'text-diana-forest' : 'text-diana-text-muted'} />
                    <span className={`font-medium ${isActive ? 'font-bold' : ''}`}>{item.label}</span>
                  </motion.button>
                );
              })}
            </nav>

            <div className="px-5 pb-6 border-t border-diana-sand">
              <motion.button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                whileHover={isReduced ? undefined : { scale: 1.02 }}
                whileTap={isReduced ? undefined : { scale: 0.98 }}
                className="mt-4 w-full min-h-[48px] flex items-center justify-center gap-3 rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2"
              >
                <LogOut size={18} />
                Log Out
              </motion.button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
