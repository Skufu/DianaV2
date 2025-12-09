import React from 'react';

const THEME = {
  colors: {
    primary: '#4318FF',
    primaryDark: '#2B3674',
    textSec: '#A3AED0',
    status: { error: '#EE5D50' },
  },
  fonts: { main: '"DM Sans", sans-serif' },
};

const Button = ({ children, variant = 'primary', className = '', onClick, icon: Icon, fullWidth, disabled }) => {
  const baseStyle =
    'relative overflow-hidden group px-5 py-3 transition-all duration-300 ease-out flex items-center justify-center gap-2 rounded-xl font-medium tracking-wide shadow-sm hover:shadow-md active:scale-95 disabled:opacity-60';
  const variants = {
    primary: `bg-[${THEME.colors.primary}] text-white hover:bg-[${THEME.colors.primaryDark}]`,
    outline: `border-2 border-[${THEME.colors.primary}] text-[${THEME.colors.primary}] hover:bg-[${THEME.colors.primary}] hover:text-white`,
    ghost: `text-[${THEME.colors.textSec}] hover:text-[${THEME.colors.primary}] hover:bg-[#F4F7FE]`,
    danger: `bg-[${THEME.colors.status.error}] text-white hover:opacity-90`,
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ fontFamily: THEME.fonts.main }}
    >
      {Icon && <Icon size={18} className="relative z-10" />}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;

