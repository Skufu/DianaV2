import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, AlertCircle, Info } from 'lucide-react';
import { SPRING_TIGHT } from '../../utils/animations';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timeoutRefs = useRef([]);

  const addToast = ({ type, message, duration = 5000 }) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);

    const timeoutId = setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
      timeoutRefs.current = timeoutRefs.current.filter(tid => tid !== timeoutId);
    }, duration);

    timeoutRefs.current.push(timeoutId);
  };

  const removeToast = id => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current = [];
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const toastVariants = {
  hidden: { y: -100, opacity: 0 },
  visible: { y: 0, opacity: 1 },
  exit: { y: -100, opacity: 0 },
};

const Toast = ({ id, type, message, onRemove }) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-600" />;
      case 'error':
        return <AlertCircle size={18} className="text-rose-600" />;
      case 'warning':
        return <Info size={18} className="text-amber-600" />;
      default:
        return <Info size={18} className="text-blue-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200';
      case 'error':
        return 'bg-rose-50 border-rose-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-emerald-800';
      case 'error':
        return 'text-rose-800';
      case 'warning':
        return 'text-amber-800';
      default:
        return 'text-blue-800';
    }
  };

  return (
    <motion.div
      variants={toastVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={SPRING_TIGHT}
      role="alert"
      aria-live="assertive"
      className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border ${getBgColor()} ${getTextColor()}`}
    >
      {getIcon()}
      <p className="flex-1 font-medium text-sm">{message}</p>
      <button
        onClick={() => onRemove(id)}
        className="flex-shrink-0 p-1 hover:bg-black/10 rounded-md transition-colors"
        aria-label="Close toast"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="flex flex-col gap-2 items-end">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <Toast key={toast.id} {...toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToastContainer;
