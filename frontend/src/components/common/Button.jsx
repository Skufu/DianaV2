// Button: shared styled button with variant/size helpers.
import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '../../utils/animations';

const Button = React.memo(
  ({
    children,
    variant = 'primary',
    className = '',
    onClick,
    icon: Icon,
    fullWidth,
    disabled,
    isLoading = false,
    type = 'button',
    ...props
  }) => {
    const isReduced = useReducedMotion();
    const baseStyle =
      'relative overflow-hidden group px-5 py-3 flex items-center justify-center gap-2 rounded-xl font-medium tracking-wide shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors focus:outline-none';

    const variants = {
      primary: 'bg-diana-teal text-white',
      blue: 'bg-blue-600 text-white',
      outline: 'border-2 border-diana-teal text-diana-teal',
      ghost: 'text-slate-500 hover:bg-slate-50',
      danger: 'bg-rose-600 text-white',
    };

    const hoverVariants = {
      primary: {
        backgroundColor: '#0F766E',
        scale: isReduced ? 1 : 1.02,
        boxShadow: '0px 4px 12px rgba(13, 148, 136, 0.4)',
      },
      blue: {
        backgroundColor: '#1D4ED8',
        scale: isReduced ? 1 : 1.02,
        boxShadow: '0px 4px 12px rgba(37, 99, 235, 0.4)',
      },
      outline: { backgroundColor: '#0D9488', color: '#ffffff', scale: isReduced ? 1 : 1.02 },
      ghost: { scale: isReduced ? 1 : 1.02, backgroundColor: '#F8FAFC', color: '#0D9488' },
      danger: {
        backgroundColor: '#E11D48',
        scale: isReduced ? 1 : 1.02,
        boxShadow: '0px 4px 12px rgba(225, 29, 72, 0.4)',
      },
    };

    const tapVariants = {
      scale: isReduced ? 1 : 0.96,
    };

    const focusVariants = {
      boxShadow: '0px 0px 0px 3px rgba(13, 148, 136, 0.3)',
      scale: isReduced ? 1 : 1.01,
    };

    return (
      <motion.button
        {...props}
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
  }
);

Button.displayName = 'Button';

export default Button;
