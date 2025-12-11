// Button: shared styled button with variant/size helpers.
import React from 'react';

const Button = ({ children, variant = 'primary', className = '', onClick, icon: Icon, fullWidth, disabled }) => {
  const baseStyle =
    'relative overflow-hidden group px-5 py-3 transition-all duration-300 ease-out flex items-center justify-center gap-2 rounded-xl font-medium tracking-wide shadow-sm hover:shadow-md active:scale-95 disabled:opacity-60';
  const variants = {
    primary: 'bg-[#4318FF] text-white hover:bg-[#2B3674]',
    outline: 'border-2 border-[#4318FF] text-[#4318FF] hover:bg-[#4318FF] hover:text-white',
    ghost: 'text-[#A3AED0] hover:text-[#4318FF] hover:bg-[#F4F7FE]',
    danger: 'bg-[#EE5D50] text-white hover:opacity-90',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={{ fontFamily: '"DM Sans", sans-serif' }}
    >
      {Icon && <Icon size={18} className="relative z-10" />}
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;

