import { useState, useRef, useEffect } from 'react';
import { Activity, Save, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MLResultModal from '../common/MLResultModal';
import Button from '../common/Button';
import { useCreateAssessment } from '../../api';
import { slideUp } from '../../utils/animations';

const AssessmentForm = ({ initialData, onSubmit, onCancel, showModelSelector = false }) => {
	const [formData, setFormData] = useState({
		age: '',
		bmi: '',
		fbs: '',
		hba1c: '',
		systolic: '',
		diastolic: '',
		waist_circumference: '',
		family_history_diabetes: '',
		triglycerides: '',
		ldl: '',
		hdl: '',
		smoking_status: 'Unknown',
		physical_activity: 'Unknown',
		alcohol: 'Unknown',
		notes: '',
		model_type: 'binary_v2_no_bp'
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
			fbs: '',
			hba1c: '',
			systolic: '',
			diastolic: '',
			waist_circumference: '',
			family_history_diabetes: '',
			triglycerides: '',
			ldl: '',
			hdl: '',
			smoking_status: 'Unknown',
			physical_activity: 'Unknown',
			alcohol: 'Unknown',
			notes: '',
			model_type: 'binary_v2_no_bp'
		});
	};

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => {
			const next = { ...prev, [name]: value };
			if (name === 'model_type') {
				if (value !== 'ada') {
					next.fbs = '';
					next.hba1c = '';
				}
				if (value !== 'binary_v2_bp') {
					next.systolic = '';
					next.diastolic = '';
				}
				if (value === 'ada') {
					next.waist_circumference = '';
					next.family_history_diabetes = '';
				}
				if (value === 'binary_v2_no_bp') {
					next.family_history_diabetes = '';
				}
			}
			return next;
		});
	};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

		const requiredFields = ['age', 'bmi', 'triglycerides', 'ldl', 'hdl'];
		if (formData.model_type === 'ada') {
			requiredFields.push('fbs', 'hba1c');
		}
		if (formData.model_type === 'binary_v2_bp') {
			requiredFields.push('systolic', 'diastolic');
		}
    const hasMissingRequired = requiredFields.some(field => !formData[field]);
    if (hasMissingRequired) {
      setError('Please complete all required fields for the clinical assessment.');
      return;
    }

    setIsSubmitting(true);

    const age = parseInt(formData.age, 10);
    if (!age || age < 45 || age > 60) {
      setIsSubmitting(false);
      setError('Age must be between 45-60 years for postmenopausal women. This application is designed for this specific population.');
      return;
    }

		const payload = {
			age: age,
			bmi: parseFloat(formData.bmi),
			triglycerides: parseFloat(formData.triglycerides),
			ldl: parseFloat(formData.ldl),
			hdl: parseFloat(formData.hdl),
			smoking: formData.smoking_status || 'Unknown',
			activity: formData.physical_activity || 'Unknown',
			alcohol: formData.alcohol || 'Unknown',
			notes: formData.notes || null,
			model_type: formData.model_type,
		};

		if (formData.waist_circumference) {
			payload.waist_circumference = parseFloat(formData.waist_circumference);
		}
		if (formData.model_type !== 'binary_v2_no_bp') {
			if (formData.family_history_diabetes === 'yes') {
				payload.family_history_diabetes = true;
			}
			if (formData.family_history_diabetes === 'no') {
				payload.family_history_diabetes = false;
			}
		}
		if (formData.model_type === 'ada') {
			payload.fbs = parseFloat(formData.fbs);
			payload.hba1c = parseFloat(formData.hba1c);
		}
		if (formData.model_type === 'binary_v2_bp') {
			payload.systolic = parseFloat(formData.systolic);
			payload.diastolic = parseFloat(formData.diastolic);
		}



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

  const handleCloseResult = () => {
    setShowResultModal(false);
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
			{showModelSelector && (
				<div>
					<label htmlFor="model_type" className="block text-sm font-semibold text-gray-700 mb-1">
						Model Type
					</label>
					<select
						id="model_type"
						name="model_type"
						value={formData.model_type}
						onChange={handleChange}
						className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
					>
						<option value="binary_v2_no_bp">Screening (no BP)</option>
						<option value="binary_v2_bp">Screening (with BP)</option>
						<option value="ada">ADA (HbA1c + FBS)</option>
					</select>
				</div>
			)}
          {/* Body Metrics Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* BMI Field */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
				<label htmlFor="bmi" className="block text-sm font-semibold text-gray-700 mb-1">
					BMI (kg/m²) <span className="text-rose-500">*</span>
				</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Save size={18} />
                </div>
					<input
						type="number"
						id="bmi"
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
				<label htmlFor="age" className="block text-sm font-semibold text-gray-700 mb-1">
					Age (years) <span className="text-rose-500">*</span>
				</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Activity size={18} />
                </div>
					<input
						type="number"
						id="age"
						name="age"
                  step="1"
                  min="45"
                  max="60"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
                  placeholder="Age 45-60 (postmenopausal)"
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
				<label htmlFor="triglycerides" className="block text-sm font-medium text-gray-600 mb-1">
					Triglycerides (mg/dL) <span className="text-rose-500">*</span>
				</label>
					<input
						type="number"
						id="triglycerides"
						name="triglycerides"
                  step="0.1"
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
				<label htmlFor="ldl" className="block text-sm font-medium text-gray-600 mb-1">
					LDL Cholesterol (mg/dL) <span className="text-rose-500">*</span>
				</label>
					<input
						type="number"
						id="ldl"
						name="ldl"
                  step="0.1"
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
				<label htmlFor="hdl" className="block text-sm font-medium text-gray-600 mb-1">
					HDL Cholesterol (mg/dL) <span className="text-rose-500">*</span>
				</label>
					<input
						type="number"
						id="hdl"
						name="hdl"
                  step="0.1"
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

			<div>
				<h3 className="text-sm font-semibold text-gray-700 mb-3">Enrichment (Optional)</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
						<label htmlFor="waist_circumference" className="block text-sm font-medium text-gray-600 mb-1">
							Waist Circumference (cm)
						</label>
						<input
							type="number"
							id="waist_circumference"
							name="waist_circumference"
							step="0.1"
							min="40"
							max="200"
							value={formData.waist_circumference}
							onChange={handleChange}
							className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
							placeholder="e.g. 88.0"
						/>
            </motion.div>

					{formData.model_type !== 'binary_v2_no_bp' && (
						<motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
							<label htmlFor="family_history_diabetes" className="block text-sm font-medium text-gray-600 mb-1">
								Family History of Diabetes
							</label>
							<select
								id="family_history_diabetes"
								name="family_history_diabetes"
								value={formData.family_history_diabetes}
								onChange={handleChange}
								className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
							>
								<option value="">Unknown</option>
								<option value="yes">Yes</option>
								<option value="no">No</option>
							</select>
						</motion.div>
					)}
				</div>
			</div>
			{formData.model_type === 'binary_v2_bp' && (
				<div>
					<h3 className="text-sm font-semibold text-gray-700 mb-3">Blood Pressure</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<motion.div
							whileHover={{ y: -2 }}
							transition={{ duration: 0.2 }}
						>
							<label htmlFor="systolic" className="block text-sm font-medium text-gray-600 mb-1">
								Systolic (mmHg) <span className="text-rose-500">*</span>
							</label>
							<input
								type="number"
								id="systolic"
								name="systolic"
								step="0.1"
								min="50"
								max="300"
								value={formData.systolic}
								onChange={handleChange}
								className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
								placeholder="50 - 300"
								required
							/>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							transition={{ duration: 0.2 }}
						>
							<label htmlFor="diastolic" className="block text-sm font-medium text-gray-600 mb-1">
								Diastolic (mmHg) <span className="text-rose-500">*</span>
							</label>
							<input
								type="number"
								id="diastolic"
								name="diastolic"
								step="0.1"
								min="30"
								max="200"
								value={formData.diastolic}
								onChange={handleChange}
								className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
								placeholder="30 - 200"
								required
							/>
						</motion.div>
					</div>
				</div>
			)}

			{formData.model_type === 'ada' && (
				<div>
					<h3 className="text-sm font-semibold text-gray-700 mb-3">Glycemic Markers</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<motion.div
							whileHover={{ y: -2 }}
							transition={{ duration: 0.2 }}
						>
						<label htmlFor="hba1c" className="block text-sm font-medium text-gray-600 mb-1">
							HbA1c (%) <span className="text-rose-500">*</span>
						</label>
							<input
								type="number"
								id="hba1c"
								name="hba1c"
								step="0.1"
								min="2"
								max="20"
								value={formData.hba1c}
								onChange={handleChange}
								className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
								placeholder="2.0 - 20.0"
								required
							/>
						</motion.div>

						<motion.div
							whileHover={{ y: -2 }}
							transition={{ duration: 0.2 }}
						>
						<label htmlFor="fbs" className="block text-sm font-medium text-gray-600 mb-1">
							Fasting Blood Sugar (mg/dL) <span className="text-rose-500">*</span>
						</label>
							<input
								type="number"
								id="fbs"
								name="fbs"
								step="0.1"
								min="20"
								max="600"
								value={formData.fbs}
								onChange={handleChange}
								className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all shadow-sm"
								placeholder="20 - 600"
								required
							/>
						</motion.div>
					</div>
				</div>
			)}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lifestyle</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
				<label htmlFor="smoking_status" className="block text-sm font-medium text-gray-600 mb-1">
					Smoking Status
				</label>
					<select
						id="smoking_status"
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
				<label htmlFor="physical_activity" className="block text-sm font-medium text-gray-600 mb-1">
					Physical Activity
				</label>
					<select
						id="physical_activity"
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
				<label htmlFor="alcohol" className="block text-sm font-medium text-gray-600 mb-1">
					Alcohol Use
				</label>
					<select
						id="alcohol"
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



          {/* Notes Field */}
          <div>
			<label htmlFor="notes" className="block text-sm font-semibold text-gray-700 mb-1">
				Notes (optional)
			</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 top-3 pointer-events-none text-slate-400">
                <Save size={18} />
              </div>
				<input
					type="text"
					id="notes"
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
            <Button
              type="submit"
              isLoading={isSubmitting}
              variant="blue"
              className="px-8 py-3 shadow-lg shadow-blue-600/20"
              icon={!isSubmitting ? Save : undefined}
            >
              {isSubmitting ? 'Analyzing...' : 'Submit for Analysis'}
            </Button>
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
                className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-700 flex items-center gap-3 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                  <AlertCircle size={20} className="text-rose-600" />
                </div>
                <p className="font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>

      <MLResultModal
        isOpen={showResultModal}
        onClose={handleCloseResult}
        result={assessmentResult}
        onConfirm={handleConfirmSave}
        isLoading={isSubmitting}
      />
    </>
  );
};

export default AssessmentForm;
