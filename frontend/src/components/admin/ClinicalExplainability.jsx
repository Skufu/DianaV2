import { useMemo, useState } from 'react';
import { Brain, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import SHAPExplanation from '../common/SHAPExplanation';
import { slideUp, staggerContainer } from '../../utils/animations';

const defaultFormState = {
  modelType: 'binary_v2_no_bp',
  age: '',
  bmi: '',
  triglycerides: '',
  ldl: '',
  hdl: '',
  hba1c: '',
  fbs: '',
  systolic: '',
  diastolic: '',
  smoking: 'Unknown',
  activity: 'Unknown',
  alcohol: 'Unknown',
};

const lifestyleOptions = ['Unknown', 'Never', 'Former', 'Current'];
const activityOptions = ['Unknown', 'Low', 'Moderate', 'High'];
const alcoholOptions = ['Unknown', 'None', 'Occasional', 'Regular'];
const DOCTOR_LOCKED_MODEL_TYPE = 'binary_v2_no_bp';

const ClinicalExplainability = ({ userRole = 'admin' }) => {
  const isDoctor = userRole === 'doctor';
  const [formData, setFormData] = useState(defaultFormState);
  const [submittedData, setSubmittedData] = useState(null);
  const [error, setError] = useState(null);
  const activeModelType = isDoctor ? DOCTOR_LOCKED_MODEL_TYPE : formData.modelType;

  const requiredFields = useMemo(() => {
    const fields = ['age', 'bmi', 'triglycerides', 'ldl', 'hdl'];
    if (activeModelType === 'ada') {
      fields.push('hba1c', 'fbs');
    }
    if (activeModelType === 'binary_v2_bp') {
      fields.push('systolic', 'diastolic');
    }
    return fields;
  }, [activeModelType]);

  const patientPayload = useMemo(() => {
    if (!submittedData) return null;
    const payload = {
      age: Number(submittedData.age),
      bmi: Number(submittedData.bmi),
      triglycerides: Number(submittedData.triglycerides),
      ldl: Number(submittedData.ldl),
      hdl: Number(submittedData.hdl),
      systolic: submittedData.systolic ? Number(submittedData.systolic) : undefined,
      diastolic: submittedData.diastolic ? Number(submittedData.diastolic) : undefined,
      smoking: submittedData.smoking,
      activity: submittedData.activity,
      alcohol: submittedData.alcohol,
      model_type: isDoctor ? DOCTOR_LOCKED_MODEL_TYPE : submittedData.modelType,
    };

    if (submittedData.modelType === 'ada') {
      payload.hba1c = Number(submittedData.hba1c);
      payload.fbs = Number(submittedData.fbs);
    }

    if (submittedData.modelType === 'binary_v2_bp') {
      payload.systolic = Number(submittedData.systolic);
      payload.diastolic = Number(submittedData.diastolic);
    }

    return payload;
  }, [isDoctor, submittedData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'modelType') {
        if (value !== 'ada') {
          next.hba1c = '';
          next.fbs = '';
        }
        if (value !== 'binary_v2_bp') {
          next.systolic = '';
          next.diastolic = '';
        }
      }
      return next;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    const missing = requiredFields.filter((field) => !formData[field]);
    if (missing.length > 0) {
      setError('Please complete all required biomarker fields to generate an explanation.');
      return;
    }

    const age = Number(formData.age);
    if (!Number.isFinite(age) || age < 45) {
      setError('Age must be 45+ to match the DIANA menopausal cohort.');
      return;
    }

    setSubmittedData({
      ...formData,
      modelType: isDoctor ? DOCTOR_LOCKED_MODEL_TYPE : formData.modelType,
    });
  };

  const handleReset = () => {
    setFormData(defaultFormState);
    setSubmittedData(null);
    setError(null);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
      <motion.div variants={slideUp} className="glass-card bg-white rounded-3xl border border-slate-200/60 p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                <Brain className="text-purple-600" size={24} />
              </span>
              Clinical Explainability
            </h3>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Generate SHAP-based feature contributions for a single clinical assessment. This view is
              intended for clinicians to validate model reasoning and communicate biomarker-driven risk.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <ShieldCheck size={18} />
            Clinician Use Only
          </div>
        </div>
      </motion.div>

      <motion.form
        variants={slideUp}
        onSubmit={handleSubmit}
        className="glass-card bg-white rounded-3xl border border-slate-200/60 p-8 space-y-6"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900">Patient Biomarker Inputs</h4>
          <div className="text-sm text-slate-500">Required fields marked *</div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-600">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isDoctor ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Model Type</label>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                Screening (No BP) — Binary at-risk
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="modelType" className="block text-sm font-semibold text-slate-700 mb-1">Model Type</label>
              <select
                id="modelType"
                name="modelType"
                value={formData.modelType}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
              >
                <option value="binary_v2_no_bp">Screening (No BP) — Binary at-risk</option>
                <option value="binary_v2_bp">Screening (With BP) — Binary at-risk</option>
                <option value="ada">ADA Baseline (HbA1c + FBS)</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor="age" className="block text-sm font-semibold text-slate-700 mb-1">Age *</label>
            <input
              id="age"
              name="age"
              type="number"
              value={formData.age}
              onChange={handleChange}
              min="45"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            />
          </div>
          <div>
            <label htmlFor="bmi" className="block text-sm font-semibold text-slate-700 mb-1">BMI *</label>
            <input
              id="bmi"
              name="bmi"
              type="number"
              value={formData.bmi}
              onChange={handleChange}
              step="0.1"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            />
          </div>
          <div>
            <label htmlFor="triglycerides" className="block text-sm font-semibold text-slate-700 mb-1">Triglycerides (mg/dL) *</label>
            <input
              id="triglycerides"
              name="triglycerides"
              type="number"
              value={formData.triglycerides}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            />
          </div>
          <div>
            <label htmlFor="ldl" className="block text-sm font-semibold text-slate-700 mb-1">LDL (mg/dL) *</label>
            <input
              id="ldl"
              name="ldl"
              type="number"
              value={formData.ldl}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            />
          </div>
          <div>
            <label htmlFor="hdl" className="block text-sm font-semibold text-slate-700 mb-1">HDL (mg/dL) *</label>
            <input
              id="hdl"
              name="hdl"
              type="number"
              value={formData.hdl}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            />
          </div>
          {activeModelType === 'binary_v2_bp' && (
            <>
              <div>
                <label htmlFor="systolic" className="block text-sm font-semibold text-slate-700 mb-1">Systolic (mmHg) *</label>
                <input
                  id="systolic"
                  name="systolic"
                  type="number"
                  value={formData.systolic}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
                />
              </div>
              <div>
                <label htmlFor="diastolic" className="block text-sm font-semibold text-slate-700 mb-1">Diastolic (mmHg) *</label>
                <input
                  id="diastolic"
                  name="diastolic"
                  type="number"
                  value={formData.diastolic}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
                />
              </div>
            </>
          )}
          {activeModelType === 'ada' && (
            <>
              <div>
                <label htmlFor="hba1c" className="block text-sm font-semibold text-slate-700 mb-1">HbA1c (%) *</label>
                <input
                  id="hba1c"
                  name="hba1c"
                  type="number"
                  value={formData.hba1c}
                  onChange={handleChange}
                  step="0.1"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
                />
              </div>
              <div>
                <label htmlFor="fbs" className="block text-sm font-semibold text-slate-700 mb-1">FBS (mg/dL) *</label>
                <input
                  id="fbs"
                  name="fbs"
                  type="number"
                  value={formData.fbs}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="smoking" className="block text-sm font-semibold text-slate-700 mb-1">Smoking Status</label>
            <select
              id="smoking"
              name="smoking"
              value={formData.smoking}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            >
              {lifestyleOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="activity" className="block text-sm font-semibold text-slate-700 mb-1">Physical Activity</label>
            <select
              id="activity"
              name="activity"
              value={formData.activity}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            >
              {activityOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="alcohol" className="block text-sm font-semibold text-slate-700 mb-1">Alcohol Use</label>
            <select
              id="alcohol"
              name="alcohol"
              value={formData.alcohol}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700"
            >
              {alcoholOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Generate Explanation
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </motion.form>

      {patientPayload && (
        <motion.div variants={slideUp} className="space-y-4">
          <SHAPExplanation
            patientData={patientPayload}
            modelType={isDoctor ? DOCTOR_LOCKED_MODEL_TYPE : submittedData?.modelType}
            showTitle
          />
        </motion.div>
      )}
    </motion.div>
  );
};

export default ClinicalExplainability;
