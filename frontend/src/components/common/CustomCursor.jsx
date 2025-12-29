import React, { useEffect, useState, useRef } from 'react';

/**
 * CustomCursor: A smooth, premium cursor with crosshair design
 * More visible and responsive for clinical tool use
 */
const CustomCursor = ({ isLoggedIn = false }) => {
    const cursorRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isVisible) setIsVisible(true);

            if (cursorRef.current) {
                cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            }

            // Check if hovering over interactive elements
            const target = e.target;
            const isInteractive =
                target.closest('button') ||
                target.closest('a') ||
                target.closest('input') ||
                target.closest('select') ||
                target.closest('textarea') ||
                window.getComputedStyle(target).cursor === 'pointer';

            setIsHovering(!!isInteractive);
        };

        const handleMouseLeave = () => setIsVisible(false);
        const handleMouseEnter = () => setIsVisible(true);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('mouseenter', handleMouseEnter);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, [isVisible]);

    // Only show enhanced cursor when logged in
    if (!isLoggedIn) {
        return (
            <div
                ref={cursorRef}
                className={`fixed top-0 left-0 pointer-events-none z-[1000] transition-all duration-100 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
          ${isHovering ? 'w-4 h-4 -mt-2 -ml-2' : 'w-2 h-2 -mt-1 -ml-1'}`}
                style={{
                    borderRadius: '50%',
                    background: isHovering
                        ? 'radial-gradient(circle, rgba(34, 211, 238, 1) 0%, rgba(20, 184, 166, 0.8) 100%)'
                        : 'radial-gradient(circle, rgba(20, 184, 166, 1) 0%, rgba(20, 184, 166, 0.7) 100%)',
                    boxShadow: isHovering
                        ? '0 0 20px rgba(34, 211, 238, 0.6), 0 0 40px rgba(20, 184, 166, 0.3)'
                        : '0 0 12px rgba(20, 184, 166, 0.5)'
                }}
            />
        );
    }

    // Enhanced crosshair cursor for logged-in state
    return (
        <div
            ref={cursorRef}
            className={`fixed top-0 left-0 pointer-events-none z-[1000] transition-all duration-75 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={{
                marginTop: '-12px',
                marginLeft: '-12px',
                width: '24px',
                height: '24px'
            }}
        >
            {/* Crosshair design */}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{
                    filter: isHovering
                        ? 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8)) drop-shadow(0 0 16px rgba(20, 184, 166, 0.5))'
                        : 'drop-shadow(0 0 4px rgba(20, 184, 166, 0.6))',
                    transition: 'filter 0.15s ease-out, transform 0.15s ease-out',
                    transform: isHovering ? 'scale(1.2)' : 'scale(1)'
                }}
            >
                {/* Outer ring */}
                <circle
                    cx="12"
                    cy="12"
                    r={isHovering ? "10" : "8"}
                    stroke={isHovering ? "#22D3EE" : "#14B8A6"}
                    strokeWidth="1.5"
                    fill="none"
                    opacity={isHovering ? "0.9" : "0.7"}
                />
                {/* Center dot */}
                <circle
                    cx="12"
                    cy="12"
                    r={isHovering ? "3" : "2"}
                    fill={isHovering ? "#22D3EE" : "#14B8A6"}
                />
                {/* Crosshair lines */}
                <line x1="12" y1="2" x2="12" y2="6" stroke={isHovering ? "#22D3EE" : "#14B8A6"} strokeWidth="1.5" opacity="0.8" />
                <line x1="12" y1="18" x2="12" y2="22" stroke={isHovering ? "#22D3EE" : "#14B8A6"} strokeWidth="1.5" opacity="0.8" />
                <line x1="2" y1="12" x2="6" y2="12" stroke={isHovering ? "#22D3EE" : "#14B8A6"} strokeWidth="1.5" opacity="0.8" />
                <line x1="18" y1="12" x2="22" y2="12" stroke={isHovering ? "#22D3EE" : "#14B8A6"} strokeWidth="1.5" opacity="0.8" />
            </svg>
        </div>
    );
};

export default CustomCursor;
