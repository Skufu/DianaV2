import React, { useState } from 'react';
import { Image } from 'lucide-react';
import { getMLVisualizationUrl } from '../../api';

const LoadingSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#E0E5F2] rounded-xl ${className}`} />
);

const VisualizationCard = React.memo(({ title, visualizationName }) => {
  const [status, setStatus] = useState('loading');

  return (
    <div className="glass-card p-6">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      {status === 'loading' && (
        <LoadingSkeleton className="w-full h-64 !bg-slate-700" />
      )}
      <img
        src={getMLVisualizationUrl(visualizationName)}
        alt={title}
        className={`w-full rounded-xl ${status !== 'loaded' ? 'hidden' : ''}`}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        loading="lazy"
        decoding="async"
        width="800"
        height="600"
      />
      {status === 'error' && (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-700/30 rounded-xl text-slate-400">
          <Image size={48} className="mb-3 opacity-40" />
          <p className="font-medium">Visualization Unavailable</p>
          <p className="text-sm mt-1">ML server may be offline</p>
        </div>
      )}
    </div>
  );
});

VisualizationCard.displayName = 'VisualizationCard';

export default VisualizationCard;
