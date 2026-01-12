// ClusterTooltip: Reusable tooltip/popover for cluster information
import React, { useState, useRef, useEffect } from 'react';
import { Info, X, ExternalLink } from 'lucide-react';
import { clusterEducation } from '../education/Education';

/**
 * ClusterTooltip - Shows cluster information in a tooltip/popover
 * 
 * @param {string} cluster - The cluster code (SIDD, SIRD, MOD, MARD)
 * @param {boolean} showIcon - Whether to show the info icon trigger
 * @param {function} onLearnMore - Callback when "Learn More" is clicked
 * @param {string} size - Icon size: 'sm' (14px), 'md' (16px), 'lg' (18px)
 */
const ClusterTooltip = ({
    cluster,
    showIcon = true,
    onLearnMore,
    size = 'md',
    children
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const tooltipRef = useRef(null);
    const triggerRef = useRef(null);

    const clusterData = clusterEducation[cluster?.toUpperCase()];

    const iconSizes = { sm: 14, md: 16, lg: 18 };
    const iconSize = iconSizes[size] || 16;

    // Close tooltip when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target) &&
                triggerRef.current && !triggerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    if (!clusterData) return children || null;

    const handleLearnMore = () => {
        setIsOpen(false);
        if (onLearnMore) {
            onLearnMore(cluster);
        }
    };

    return (
        <div className="relative inline-flex items-center">
            {children}

            {showIcon && (
                <button
                    ref={triggerRef}
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="ml-1 p-1 rounded-full hover:bg-[#F4F7FE] text-[#A3AED0] hover:text-[#4318FF] transition-colors focus:outline-none focus:ring-2 focus:ring-[#4318FF]/20"
                    aria-label={`About ${cluster} cluster`}
                >
                    <Info size={iconSize} />
                </button>
            )}

            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <div
                        className="fixed inset-0 bg-black/20 z-40 md:hidden"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Tooltip content */}
                    <div
                        ref={tooltipRef}
                        className="absolute z-50 w-80 left-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#E0E5F2] overflow-hidden animate-scale-in"
                        style={{
                            transformOrigin: 'top left',
                            maxHeight: 'calc(100vh - 100px)',
                            overflowY: 'auto'
                        }}
                    >
                        {/* Header */}
                        <div
                            className="p-4 text-white relative"
                            style={{ backgroundColor: clusterData.color }}
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                            >
                                <X size={14} />
                            </button>
                            <div className="flex items-center gap-3">
                                {clusterData.logo && (
                                    <img
                                        src={clusterData.logo}
                                        alt={`${cluster} logo`}
                                        className="w-10 h-10 rounded-xl object-cover"
                                    />
                                )}
                                <div>
                                    <div className="text-2xl font-bold">{cluster}</div>
                                    <div className="text-sm opacity-90">{clusterData.name}</div>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-[#1B2559] leading-relaxed">
                                {clusterData.shortDesc}
                            </p>

                            {/* Key characteristics */}
                            <div>
                                <h4 className="text-xs font-bold text-[#707EAE] uppercase mb-2">Key Characteristics</h4>
                                <ul className="space-y-1">
                                    {clusterData.riskFactors.slice(0, 3).map((factor, i) => (
                                        <li key={i} className="text-xs text-[#1B2559] flex items-start gap-2">
                                            <span className="text-[#4318FF] mt-0.5">•</span> {factor}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommendations preview */}
                            <div className={`p-3 rounded-xl ${clusterData.bgColor}`}>
                                <h4 className="text-xs font-bold text-[#707EAE] uppercase mb-2">Top Recommendation</h4>
                                <p className="text-xs text-[#1B2559]">{clusterData.recommendations[0]}</p>
                            </div>

                            {/* Learn More link */}
                            {onLearnMore && (
                                <button
                                    onClick={handleLearnMore}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#4318FF] hover:bg-[#3311CC] text-white text-sm font-medium rounded-xl transition-colors"
                                >
                                    <span>Learn More</span>
                                    <ExternalLink size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ClusterTooltip;
