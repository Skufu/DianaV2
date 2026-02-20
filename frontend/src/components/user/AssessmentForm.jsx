import { useState, useRef, useEffect } from 'react';
import { Activity, Save, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MLResultModal from '../common/MLResultModal';
import Button from '../common/Button';
import { useCreateAssessment } from '../../api';
import { slideUp } from '../../utils/animations';

const AssessmentForm = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    age: '',
    bmi: '',
    triglycerides: '',
    ldl: '',
    hdl: '',
    systolic: '',
    diastolic: '',
    smoking_status: 'Unknown',
    physical_activity: 'Unknown',
    alcohol: 'Unknown',
    notes: ''
  });

  // Pre-fill fields from UserProfile if available
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setFormData(prev => {
        const newData = { ...prev };

        // Compute age if date_of_birth exists
        if (initialData.date_of_birth) {
          const birthDate = new Date(initialData.date_of_birth);
          if (!isNaN(birthDate.getTime())) {
            const currentYear = new Date().getFullYear();
            const age = currentYear - birthDate.getFullYear();
            newData.age = age.toString();
          }
        } else if (initialData.age) {
          newData.age = initialData.age.toString(); // Fallback if age is explicitly passed
        }

        // Prefill lifestyle factors if present
        if (initialData.smoking_status && initialData.smoking_status !== '') {
          // ensure capital casing to match option values 'Never', 'Former', 'Current'
          const s = initialData.smoking_status;
          newData.smoking_status = s.charAt(0).toUpperCase() + s.slice(1);
        }
        if (initialData.physical_activity && initialData.physical_activity !== '') {
          newData.physical_activity = initialData.physical_activity;
        }
        if (initialData.alcohol && initialData.alcohol !== '') {
          newData.alcohol = initialData.alcohol;
        }

        return newData;
      });
    }
  }, [initialData]);
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAssessment = useCreateAssessment();
  const submitTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setFormData({
      age: '',
      bmi: '',
      triglycerides: '',
      ldl: '',
      hdl: '',
      systolic: '',
      diastolic: '',
      smoking_status: 'Unknown',
      physical_activity: 'Unknown',
      alcohol: 'Unknown',
      notes: ''
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const requiredFields = ['age', 'bmi', 'triglycerides', 'ldl', 'hdl', 'systolic', 'diastolic'];
    const hasMissingRequired = requiredFields.some(field => !formData[field]);
    if (hasMissingRequired) {
      setError('Please complete all required fields for the clinical assessment.');
      return;
    }

    setIsSubmitting(true);

    const age = parseInt(formData.age, 10);
    if (!age || age < 45 || age > 100) {
      setIsSubmitting(false);
      setError('This application is designed for postmenopausal women aged 45 and above. Please enter a valid age.');
      return;
    }

    const payload = {
      age: age,
      bmi: parseFloat(formData.bmi),
      triglycerides: parseInt(formData.triglycerides),
      ldl: parseInt(formData.ldl),
      hdl: parseInt(formData.hdl),
      systolic: parseInt(formData.systolic),
      diastolic: parseInt(formData.diastolic),
      smoking_status: formData.smoking_status || 'Unknown',
      physical_activity: formData.physical_activity || 'Unknown',
      alcohol: formData.alcohol || 'Unknown',
      notes: formData.notes || null
    };

    try {
      const result = await createAssessment.mutateAsync(payload);
      setAssessmentResult(result);
      setShowResultModal(true);
    } catch (err) {
      setError(err.message || 'Failed to analyze assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSave = () => {
    setShowResultModal(false);
    resetForm();
    if (onSubmit) onSubmit(assessmentResult);
  };

  return (
    <>
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="glass-card p-8 bg-white"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-diana-forest/10 flex items-center justify-center">
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ duration: 0.3 }}
              >
                <Activity size={20} className="text-diana-forest" />
              </motion.div>
            </div>
            <h2 className="text-xl font-bold text-diana-text-primary">Log New Assessment</h2>
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="!p-2 !bg-white/10 hover:!bg-white/20 !text-diana-text-muted hover:text-diana-text-primary"
            >
              <X size={18} />
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Body Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BMI Field */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                BMI (kg/m²) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Save size={18} />
                </div>
                <input
                  type="number"
                  name="bmi"
                  step="0.1"
                  min="15"
                  max="60"
                  value={formData.bmi}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="Enter BMI (15.0 - 60.0)"
                  required
                />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Age (years) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Activity size={18} />
                </div>
                <input
                  type="number"
                  name="age"
                  step="1"
                  min="45"
                  max="100"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="Age 45+ (postmenopausal)"
                  required
                />
              </div>
            </motion.div>
          </div>

          {/* Lipid Profile Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lipid Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Triglycerides Field */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Triglycerides (mg/dL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="triglycerides"
                  step="1"
                  min="30"
                  max="500"
                  value={formData.triglycerides}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="30 - 500"
                  required
                />
              </motion.div>

              {/* LDL Field */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  LDL Cholesterol (mg/dL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="ldl"
                  step="1"
                  min="30"
                  max="300"
                  value={formData.ldl}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="30 - 300"
                  required
                />
              </motion.div>

              {/* HDL Field */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  HDL Cholesterol (mg/dL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="hdl"
                  step="1"
                  min="20"
                  max="150"
                  value={formData.hdl}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="20 - 150"
                  required
                />
              </motion.div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lifestyle</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Smoking Status
                </label>
                <select
                  name="smoking_status"
                  value={formData.smoking_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Never">Never smoked</option>
                  <option value="Former">Former smoker</option>
                  <option value="Current">Current smoker</option>
                </select>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Physical Activity
                </label>
                <select
                  name="physical_activity"
                  value={formData.physical_activity}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="Sedentary">Sedentary (little/no exercise)</option>
                  <option value="Moderate">Moderate (1-3 days/week)</option>
                  <option value="Active">Active (4+ days/week)</option>
                </select>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Alcohol Use
                </label>
                <select
                  name="alcohol"
                  value={formData.alcohol}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                >
                  <option value="Unknown">Unknown</option>
                  <option value="None">None</option>
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Heavy">Heavy</option>
                </select>
              </motion.div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Blood Pressure</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Systolic (mmHg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="systolic"
                  step="1"
                  min="80"
                  max="200"
                  value={formData.systolic}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="80 - 200"
                  required
                />
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Diastolic (mmHg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  name="diastolic"
                  step="1"
                  min="50"
                  max="130"
                  value={formData.diastolic}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="50 - 130"
                  required
                />
              </motion.div>
            </div>
          </div>

          {/* Notes Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notes (optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 top-3 pointer-events-none text-slate-400">
                <Save size={18} />
              </div>
              <input
                type="text"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                placeholder="Add any notes or observations..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              whileFocus={{ scale: 1.02, boxShadow: "0px 0px 0px 2px #10B981" }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 px-6 py-3 bg-diana-forest text-white font-bold rounded-xl hover:bg-diana-forest-light shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="mr-2"
                  aria-hidden="true"
                >
                  <Activity size={20} />
                </motion.div>
              )}
              <span aria-live="polite">{isSubmitting ? 'Analyzing...' : 'Submit for Analysis'}</span>
            </motion.button>
          </div>

          {/* Error Display */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-400 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} className="text-rose-600" />
                </div>
                <p>{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      <MLResultModal
        isOpen={showResultModal}
        onClose={handleConfirmSave}
        result={assessmentResult}
        onConfirm={handleConfirmSave}
        isLoading={isSubmitting}
      />
    </>
  );
};

export default AssessmentForm;
