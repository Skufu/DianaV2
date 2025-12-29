// MouseGlow: Subtle cursor-following glow effect that doesn't interfere with forms
import React, { useEffect, useRef, useState } from 'react';

const MouseGlow = ({
    color = 'rgba(67, 24, 255, 0.08)', // Subtle purple glow
    size = 400,
    blur = 80,
    enabled = true
}) => {
    const glowRef = useRef(null);
    const [position, setPosition] = useState({ x: -1000, y: -1000 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!enabled) return;

        let animationFrameId;
        let targetX = -1000;
        let targetY = -1000;
        let currentX = -1000;
        let currentY = -1000;

        const handleMouseMove = (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            if (!isVisible) setIsVisible(true);
        };

        const handleMouseLeave = () => {
            setIsVisible(false);
        };

        // Smooth follow animation
        const animate = () => {
            // Lerp (linear interpolation) for smooth following
            currentX += (targetX - currentX) * 0.08;
            currentY += (targetY - currentY) * 0.08;

            setPosition({ x: currentX, y: currentY });
            animationFrameId = requestAnimationFrame(animate);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);
        animate();

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [enabled, isVisible]);

    if (!enabled) return null;

    return (
        <div
            ref={glowRef}
            className="fixed pointer-events-none z-0 transition-opacity duration-500"
            style={{
                left: position.x - size / 2,
                top: position.y - size / 2,
                width: size,
                height: size,
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                filter: `blur(${blur}px)`,
                opacity: isVisible ? 1 : 0,
                transform: 'translate3d(0, 0, 0)', // GPU acceleration
                willChange: 'left, top, opacity',
            }}
        />
    );
};

export default MouseGlow;
