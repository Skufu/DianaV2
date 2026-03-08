import { motion } from 'framer-motion';
import { Menu, User } from 'lucide-react';
import { useReducedMotion } from '../../utils/animations';

const MobileHeader = ({ onOpen, isOpen, userInitials = 'U' }) => {
  const isReduced = useReducedMotion();

  return (
    <motion.header
      initial={{ y: isReduced ? 0 : -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: isReduced ? 0 : 0.2 }}
      className="fixed top-0 left-0 right-0 z-[70] lg:hidden"
    >
      <div className="h-14 sm:h-16 bg-white/90 backdrop-blur-xl border-b border-diana-sand shadow-sm">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          <motion.button
            type="button"
            onClick={onOpen}
            whileHover={isReduced ? undefined : { scale: 1.05, rotate: 90 }}
            whileTap={isReduced ? undefined : { scale: 0.95 }}
            aria-label="Open navigation menu"
            aria-controls="user-mobile-drawer"
            aria-expanded={isOpen}
            className="w-11 h-11 rounded-xl border border-diana-sand bg-white text-diana-forest flex items-center justify-center shadow-sm hover:bg-diana-stone/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diana-forest/30 focus-visible:ring-offset-2"
          >
            <Menu size={22} />
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-diana-forest to-diana-forest-light text-white flex items-center justify-center font-serif font-bold tracking-wide">
              D
            </div>
            <div className="leading-tight">
              <div className="text-sm uppercase tracking-[0.2em] text-diana-text-muted">DIANA</div>
              <div className="text-xs text-diana-text-secondary">User Portal</div>
            </div>
          </div>

          <div className="w-11 h-11 rounded-full bg-diana-stone border border-diana-sand flex items-center justify-center text-diana-text-secondary font-semibold">
            {userInitials ? userInitials : <User size={18} />}
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default MobileHeader;
