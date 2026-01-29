// Button: shared styled button with variant/size helpers.
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '../../utils/animations';

const Button = React.memo(({
  children,
  variant = 'primary',
  className = '',
  onClick,
  icon: Icon,
  fullWidth,
  disabled,
  isLoading = false,
  type = 'button'
}) => {
  const isReduced = useReducedMotion();
  const baseStyle =
    'relative overflow-hidden group px-5 py-3 flex items-center justify-center gap-2 rounded-xl font-medium tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none';

  const variants = {
    primary: 'bg-[#4318FF] text-white',
    outline: 'border-2 border-[#4318FF] text-[#4318FF]',
    ghost: 'text-[#A3AED0] hover:bg-[#F4F7FE]',
    danger: 'bg-[#EE5D50] text-white',
  };

  const hoverVariants = {
    primary: { backgroundColor: '#2B3674', scale: isReduced ? 1 : 1.02, boxShadow: "0px 4px 12px rgba(67, 24, 255, 0.4)" },
    outline: { backgroundColor: '#4318FF', color: '#ffffff', scale: isReduced ? 1 : 1.02 },
    ghost: { scale: isReduced ? 1 : 1.02, backgroundColor: '#F4F7FE', color: '#4318FF' },
    danger: { opacity: 0.9, scale: isReduced ? 1 : 1.02 },
  };

  const tapVariants = {
    scale: isReduced ? 1 : 0.96
  };

  const focusVariants = {
    boxShadow: "0px 0px 0px 3px rgba(67, 24, 255, 0.3)",
    scale: isReduced ? 1 : 1.01
  };

  return (
    <motion.button
      type={type}
      onClick={!isLoading ? onClick : undefined}
      disabled={disabled || isLoading}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ fontFamily: '"DM Sans", sans-serif' }}
      whileHover={!disabled && !isLoading ? hoverVariants[variant] : {}}
      whileTap={!disabled && !isLoading ? tapVariants : {}}
      whileFocus={!disabled && !isLoading ? focusVariants : {}}
      initial={false}
      layout
    >
      <motion.div
        className="flex items-center justify-center gap-2 relative z-10"
        animate={{ opacity: isLoading ? 0.7 : 1 }}
      >
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="mr-2"
          >
            <Loader2 className="animate-spin h-5 w-5" />
          </motion.div>
        )}
        {!isLoading && Icon && <Icon size={18} />}
        <span>{children}</span>
      </motion.div>

      {/* Background decoration for some variants could go here */}
    </motion.button>
  );
});

Button.displayName = 'Button';

export default Button;
