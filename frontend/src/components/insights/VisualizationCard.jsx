import React, { useState, useEffect } from 'react';
import { Image } from 'lucide-react';
import { fetchMLVisualizationApi, getErrorMessage } from '../../api';
import { motion } from 'framer-motion';
import { cardVariants } from '../../utils/animations';

const LoadingSkeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[#E0E5F2] rounded-xl ${className}`} />
);

const VisualizationCard = React.memo(({ title, visualizationName }) => {
  const [status, setStatus] = useState('loading');
  const [imgSrc, setImgSrc] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;
    const controller = new AbortController();

    const fetchImage = async () => {
      setStatus('loading');
      setErrorMessage('');
      try {
        const blob = await fetchMLVisualizationApi(visualizationName, {
          signal: controller.signal,
        });
        objectUrl = URL.createObjectURL(blob);

        if (isMounted) {
          setImgSrc(objectUrl);
          setStatus('loaded');
        }
      } catch (error) {
        if (isMounted && error?.code !== 'REQUEST_ABORTED') {
          setErrorMessage(
            getErrorMessage(error, 'The visualization could not be loaded right now.')
          );
          setStatus('error');
        }
      }
    };

    fetchImage();

    return () => {
      isMounted = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [visualizationName]);

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
      {status === 'loading' && <LoadingSkeleton className="w-full h-64 !bg-diana-stone/50" />}
      <img
        src={imgSrc}
        alt={title}
        className={`w-full rounded-xl shadow-md border border-diana-stone ${status !== 'loaded' ? 'hidden' : ''}`}
        loading="lazy"
        decoding="async"
        width="800"
        height="600"
      />
      {status === 'error' && (
        <div className="w-full h-64 flex flex-col items-center justify-center bg-rose-50 rounded-xl text-rose-400 border border-rose-100">
          <Image size={48} className="mb-3 opacity-50" />
          <p className="font-bold">Visualization Unavailable</p>
          <p className="text-sm mt-1 text-rose-300">{errorMessage}</p>
        </div>
      )}
    </motion.div>
  );
});

VisualizationCard.displayName = 'VisualizationCard';

export default VisualizationCard;
