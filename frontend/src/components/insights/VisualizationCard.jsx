import React, { useState } from 'react';
import { Image } from 'lucide-react';
import { getMLVisualizationUrl } from '../../api';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const LoadingSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#E0E5F2] rounded-xl ${className}`} />
);

const VisualizationCard = React.memo(({ title, visualizationName }) => {
  const [status, setStatus] = useState('loading');

  return (
    <motion.div
      variants={cardVariants}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.3 }}
      whileHover="hover"
      className="glass-card p-8 bg-white"
    >
      <h3 className="text-xl font-serif font-bold text-diana-text-primary mb-6">{title}</h3>
      {status === 'loading' && (
        <LoadingSkeleton className="w-full h-64 !bg-diana-stone/50" />
      )}
      <img
        src={getMLVisualizationUrl(visualizationName)}
        alt={title}
        className={`w-full rounded-xl shadow-md border border-diana-stone ${status !== 'loaded' ? 'hidden' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        loading="lazy"
        decoding="async"
        width="800"
        height="600"
      />
      {status === 'error' && (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-rose-50 rounded-xl text-rose-400 border border-rose-100">
          <Image size={48} className="mb-3 opacity-50" />
          <p className="font-bold">Visualization Unavailable</p>
          <p className="text-sm mt-1 text-rose-300">ML server may be offline</p>
        </div>
      )}
    </motion.div>
  );
});

VisualizationCard.displayName = 'VisualizationCard';

export default VisualizationCard;
