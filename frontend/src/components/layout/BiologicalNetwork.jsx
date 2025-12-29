// BiologicalNetwork: Premium animated canvas background with connected nodes
// Uses React.memo and stable refs to prevent re-initialization on parent re-renders
import React, { useEffect, useRef, memo } from 'react';

const BiologicalNetwork = memo(({
    className = '',
    nodeCount = 80,
    connectionDistance = 180,
    speed = 0.25
}) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const nodesRef = useRef(null);  // null initially, only init once
    const mouseRef = useRef({ x: null, y: null });
    const dimensionsRef = useRef({ width: 0, height: 0 });
    const contextRef = useRef(null);
    const dprRef = useRef(1);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        contextRef.current = ctx;

        let width = canvas.offsetWidth;
        let height = canvas.offsetHeight;
        dimensionsRef.current = { width, height };

        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        dprRef.current = dpr;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Only initialize nodes ONCE (not on every render)
        if (nodesRef.current === null) {
            nodesRef.current = [];
            for (let i = 0; i < nodeCount; i++) {
                const baseRadius = Math.random() * 3 + 1.5;
                nodesRef.current.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * speed,
                    vy: (Math.random() - 0.5) * speed,
                    radius: baseRadius,
                    baseRadius: baseRadius,
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.015 + Math.random() * 0.01,
                    // Premium: each node has slightly different color
                    hue: 170 + Math.random() * 20, // teal range
                    brightness: 0.6 + Math.random() * 0.3
                });
            }
        }

        // Mouse tracking - use WINDOW events since canvas has pointerEvents:none
        const handleMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: null, y: null };
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        // Animation loop
        const animate = () => {
            const { width: w, height: h } = dimensionsRef.current;
            ctx.clearRect(0, 0, w, h);

            const nodes = nodesRef.current;
            const mouse = mouseRef.current;
            const time = Date.now() * 0.001;

            // Premium: subtle ambient glow that follows mouse
            if (mouse.x !== null && mouse.y !== null) {
                const ambientGradient = ctx.createRadialGradient(
                    mouse.x, mouse.y, 0,
                    mouse.x, mouse.y, 200
                );
                ambientGradient.addColorStop(0, 'rgba(20, 184, 166, 0.08)');
                ambientGradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.03)');
                ambientGradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
                ctx.fillStyle = ambientGradient;
                ctx.fillRect(0, 0, w, h);
            }

            // Update and draw nodes
            nodes.forEach((node, i) => {
                // Update position with organic motion
                node.x += node.vx;
                node.y += node.vy;

                // Bounce off edges smoothly
                if (node.x < 0 || node.x > w) {
                    node.vx *= -0.95;
                    node.x = Math.max(0, Math.min(w, node.x));
                }
                if (node.y < 0 || node.y > h) {
                    node.vy *= -0.95;
                    node.y = Math.max(0, Math.min(h, node.y));
                }

                // Subtle drift
                node.vx += (Math.random() - 0.5) * 0.008;
                node.vy += (Math.random() - 0.5) * 0.008;

                // Gentle mouse attraction/repulsion
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - node.x;
                    const dy = mouse.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200 && dist > 0) {
                        // Nodes gently move toward cursor
                        const force = (1 - dist / 200) * 0.02;
                        node.vx += (dx / dist) * force;
                        node.vy += (dy / dist) * force;
                    }
                }

                // Clamp velocity
                const maxVel = speed * 1.2;
                node.vx = Math.max(-maxVel, Math.min(maxVel, node.vx));
                node.vy = Math.max(-maxVel, Math.min(maxVel, node.vy));

                // Update pulse
                node.pulsePhase += node.pulseSpeed;
                const pulse = 1 + Math.sin(node.pulsePhase) * 0.25;
                node.radius = node.baseRadius * pulse;

                // Draw connections to nearby nodes
                for (let j = i + 1; j < nodes.length; j++) {
                    const other = nodes[j];
                    const dx = other.x - node.x;
                    const dy = other.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        const opacity = Math.pow(1 - dist / connectionDistance, 1.5) * 0.3;

                        // Premium: gradient line
                        const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
                        gradient.addColorStop(0, `hsla(${node.hue}, 70%, 55%, ${opacity})`);
                        gradient.addColorStop(1, `hsla(${other.hue}, 70%, 55%, ${opacity})`);

                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }

                // Enhanced connections to mouse cursor
                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - node.x;
                    const dy = mouse.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance * 1.8) {
                        const opacity = Math.pow(1 - dist / (connectionDistance * 1.8), 2) * 0.6;

                        // Premium: cyan glow line to cursor
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.strokeStyle = `rgba(34, 211, 238, ${opacity.toFixed(3)})`;
                        ctx.lineWidth = 1.2;
                        ctx.stroke();
                    }
                }

                // Draw node with premium multi-layer glow
                const x = node.x;
                const y = node.y;
                const r = node.radius;

                // Outer glow (largest, faintest)
                const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
                outerGlow.addColorStop(0, `hsla(${node.hue}, 60%, 50%, 0.15)`);
                outerGlow.addColorStop(0.5, `hsla(${node.hue}, 60%, 50%, 0.05)`);
                outerGlow.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(x, y, r * 6, 0, Math.PI * 2);
                ctx.fillStyle = outerGlow;
                ctx.fill();

                // Inner glow
                const innerGlow = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
                innerGlow.addColorStop(0, `hsla(${node.hue}, 70%, 60%, 0.4)`);
                innerGlow.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(x, y, r * 3, 0, Math.PI * 2);
                ctx.fillStyle = innerGlow;
                ctx.fill();

                // Core node
                const core = ctx.createRadialGradient(x, y, 0, x, y, r);
                core.addColorStop(0, `hsla(${node.hue}, 80%, 75%, 1)`);
                core.addColorStop(0.5, `hsla(${node.hue}, 70%, 55%, 0.9)`);
                core.addColorStop(1, `hsla(${node.hue}, 60%, 45%, 0.6)`);
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = core;
                ctx.fill();
            });

            // Draw mouse cursor glow
            if (mouse.x !== null && mouse.y !== null) {
                const cursorGlow = ctx.createRadialGradient(
                    mouse.x, mouse.y, 0,
                    mouse.x, mouse.y, 30
                );
                cursorGlow.addColorStop(0, 'rgba(34, 211, 238, 0.25)');
                cursorGlow.addColorStop(0.5, 'rgba(20, 184, 166, 0.1)');
                cursorGlow.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
                ctx.fillStyle = cursorGlow;
                ctx.fill();
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        // Handle resize - preserve nodes, just adjust bounds
        const handleResize = () => {
            const newWidth = canvas.offsetWidth;
            const newHeight = canvas.offsetHeight;

            // Scale node positions proportionally
            const scaleX = newWidth / width;
            const scaleY = newHeight / height;
            nodesRef.current.forEach(node => {
                node.x *= scaleX;
                node.y *= scaleY;
            });

            width = newWidth;
            height = newHeight;
            dimensionsRef.current = { width, height };

            const dpr = dprRef.current;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        };

        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('resize', handleResize);
        };
    }, []); // Empty dependency array - only run once!

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full ${className}`}
            style={{ pointerEvents: 'none' }}
        />
    );
});

BiologicalNetwork.displayName = 'BiologicalNetwork';

export default BiologicalNetwork;
