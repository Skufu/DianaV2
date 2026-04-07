import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeIn } from '../../utils/animations';

const BiomarkerInput = React.memo(
  ({ label, value, onChange, unit, referenceRanges, min, max, step, required = false }) => {
    const [error, setError] = useState('');

    const getRangeText = (val, type) => {
      if (val === undefined || val === null || val === '') return null;

      const numVal = parseFloat(val);

      if (referenceRanges) {
        if (numVal >= referenceRanges.diabetic.min && numVal < referenceRanges.diabetic.max) {
          return 'Diabetic range';
        } else if (
          numVal >= referenceRanges.prediabetic.min &&
          numVal < referenceRanges.prediabetic.max
        ) {
          return 'Prediabetic range';
        } else if (numVal >= referenceRanges.normal.min && numVal < referenceRanges.normal.max) {
          return 'Normal range';
        }
      }
      return null;
    };

    const handleInputChange = e => {
      const inputValue = e.target.value;

      // Allow empty input (for optional fields)
      if (inputValue === '' && !required) {
        onChange('');
        setError('');
        return;
      }

      // Validate range
      const numValue = parseFloat(inputValue);

      if (isNaN(numValue)) {
        setError('Please enter a valid number');
        onChange(inputValue);
        return;
      }

      let validationError = '';
      if (min !== undefined && numValue < min) {
        validationError = `Must be at least ${min}${unit ? ` ${unit}` : ''}`;
      } else if (max !== undefined && numValue > max) {
        validationError = `Must not exceed ${max}${unit ? ` ${unit}` : ''}`;
      }

      setError(validationError);
      onChange(inputValue);
    };

    const rangeText = getRangeText(value, 'normal');

    const inputFocusVariants = {
      focus: {
        scale: 1.01,
        borderColor: '#4318FF',
        boxShadow: '0px 0px 0px 3px rgba(67, 24, 255, 0.15)',
      },
    };

    return (
      <motion.div variants={fadeIn} initial="hidden" animate="visible" className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        <div className="relative rounded-md shadow-sm">
          <motion.input
            whileFocus="focus"
            variants={inputFocusVariants}
            transition={{ duration: 0.2 }}
            type="number"
            step={step || 'any'}
            min={min}
            max={max}
            value={value || ''}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
          {unit && <span className="absolute right-4 top-1/2 text-gray-500 text-sm">{unit}</span>}
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="mt-1 text-sm text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {referenceRanges && rangeText && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`mt-1 text-sm ${
                rangeText === 'Normal range'
                  ? 'text-green-600'
                  : rangeText === 'Prediabetic range'
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              Reference: {rangeText} ({referenceRanges.normal.min}-{referenceRanges.normal.max}
              {referenceRanges.unit})
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
);

BiomarkerInput.displayName = 'BiomarkerInput';

export default BiomarkerInput;
