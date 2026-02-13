import { useState } from 'react';
import { Activity, Save, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MockMLResultModal from '../common/MockMLResultModal';
import Button from '../common/Button';
import { useCreateAssessment } from '../../api';
import { staggerContainer, fadeIn, slideUp, useInputFocusVariants, useReducedMotion, getFocusVariants } from '../../utils/animations';

const AssessmentForm = ({ onSubmit, onCancel }) => {
  const isReduced = useReducedMotion();
  const inputFocusVariants = useInputFocusVariants();
  const [formData, setFormData] = useState({
    hba1c: '',
    fbs: '',
    bmi: '',
    triglycerides: '',
    ldl: '',
    hdl: '',
    systolic_bp: '',
    diastolic_bp: '',
    notes: ''
  });
  const [error, setError] = useState(null);
  const [showMockModal, setShowMockModal] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createAssessment = useCreateAssessment();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.hba1c || !formData.fbs) {
      setError('HbA1c and FBS are required fields');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      hba1c: parseFloat(formData.hba1c),
      fbs: parseInt(formData.fbs),
      bmi: formData.bmi ? parseFloat(formData.bmi) : null,
      triglycerides: formData.triglycerides ? parseInt(formData.triglycerides) : null,
      ldl: formData.ldl ? parseInt(formData.ldl) : null,
      hdl: formData.hdl ? parseInt(formData.hdl) : null,
      systolic_bp: formData.systolic_bp ? parseInt(formData.systolic_bp) : null,
      diastolic_bp: formData.diastolic_bp ? parseInt(formData.diastolic_bp) : null,
      notes: formData.notes || null
    };

    // Simulate network delay for "Analyzing..." animation
    setTimeout(() => {
      setSubmittedData(payload);
      setShowMockModal(true);
      setIsSubmitting(false);
    }, 1500);
  };

  const handleConfirmSave = async () => {
    if (!submittedData) return;

    try {
      await createAssessment.mutateAsync(submittedData);
      setShowMockModal(false);
      setFormData({
        hba1c: '',
        fbs: '',
        bmi: '',
        triglycerides: '',
        ldl: '',
        hdl: '',
        systolic_bp: '',
        diastolic_bp: '',
        notes: ''
      });
      if (onSubmit) onSubmit(submittedData);
    } catch (err) {
      setError(err.message || 'Failed to save assessment');
      setShowMockModal(false);
    }
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
          {/* Primary Biomarkers Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HbA1c Field */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                HbA1c (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Save size={18} />
                </div>
                <input
                  type="number"
                  name="hba1c"
                  step="0.1"
                  min="4.0"
                  max="15.0"
                  value={formData.hba1c}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="Enter HbA1c (4.0 - 15.0%)"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Normal: &lt;5.7% | Pre-diabetic: 5.7-6.4% | Diabetic: ≥6.5%</p>
            </motion.div>

            {/* FBS Field */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fasting Blood Sugar (mg/dL) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Save size={18} />
                </div>
                <input
                  type="number"
                  name="fbs"
                  step="1"
                  min="70"
                  max="400"
                  value={formData.fbs}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="Enter FBS (70 - 400 mg/dL)"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Normal: &lt;100 | Pre-diabetic: 100-125 | Diabetic: ≥126</p>
            </motion.div>
          </div>

          {/* Body Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BMI Field */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                BMI (kg/m²)
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
                />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="flex items-center"
            >
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg w-full">
                <p className="text-xs text-blue-700">
                  <strong>Age is already saved</strong> from your profile. No need to enter it again.
                </p>
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
                  Triglycerides (mg/dL)
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
                />
              </motion.div>

              {/* LDL Field */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  LDL Cholesterol (mg/dL)
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
                />
              </motion.div>

              {/* HDL Field */}
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  HDL Cholesterol (mg/dL)
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
                />
              </motion.div>
            </div>
          </div>

          {/* Blood Pressure Section (Optional) */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Blood Pressure (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Systolic (mmHg)
                </label>
                <input
                  type="number"
                  name="systolic_bp"
                  step="1"
                  min="80"
                  max="200"
                  value={formData.systolic_bp}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="80 - 200"
                />
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Diastolic (mmHg)
                </label>
                <input
                  type="number"
                  name="diastolic_bp"
                  step="1"
                  min="50"
                  max="130"
                  value={formData.diastolic_bp}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="50 - 130"
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

      {/* Mock ML Result Modal */}
      <MockMLResultModal
        isOpen={showMockModal}
        onClose={() => setShowMockModal(false)}
        formData={submittedData || formData}
        onConfirm={handleConfirmSave}
      />
    </>
  );
};

export default AssessmentForm;
