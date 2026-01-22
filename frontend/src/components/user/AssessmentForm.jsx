import { useState } from 'react';
import { Activity, Save, AlertCircle } from 'lucide-react';
import { createAssessmentApi } from '../../api';

const AssessmentForm = ({ token, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    hba1c: '',
    fbs: '',
    bmi: '',
    cholesterol: '',
    systolic_bp: '',
    diastolic_bp: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.hba1c || !formData.fbs) {
      setError('HbA1c and FBS are required fields');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        hba1c: parseFloat(formData.hba1c),
        fbs: parseInt(formData.fbs),
        bmi: formData.bmi ? parseFloat(formData.bmi) : null,
        cholesterol: formData.cholesterol ? parseInt(formData.cholesterol) : null,
        systolic_bp: formData.systolic_bp ? parseInt(formData.systolic_bp) : null,
        diastolic_bp: formData.diastolic_bp ? parseInt(formData.diastolic_bp) : null,
        notes: formData.notes || null
      };

      await createAssessmentApi(payload);
      alert('Assessment logged successfully!');
      if (onSubmit) onSubmit();
    } catch (err) {
      setError(err.message || 'Failed to log assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-teal-400" />
          <h2 className="text-xl font-bold text-white">Log New Assessment</h2>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              HbA1c <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              name="hba1c"
              value={formData.hba1c}
              onChange={handleChange}
              step="0.1"
              min="3.0"
              max="15.0"
              placeholder="e.g., 5.7"
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">Normal: 4.0-5.6% | Range: 3.0-15.0%</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Fasting Blood Sugar (FBS) <span className="text-rose-400">*</span>
            </label>
            <input
              type="number"
              name="fbs"
              value={formData.fbs}
              onChange={handleChange}
              min="50"
              max="400"
              placeholder="e.g., 95"
              required
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">Normal: 70-99 mg/dL | Range: 50-400 mg/dL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">BMI (kg/m²)</label>
            <input
              type="number"
              name="bmi"
              value={formData.bmi}
              onChange={handleChange}
              step="0.1"
              min="15.0"
              max="50.0"
              placeholder="e.g., 24.5"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">Normal: 18.5-24.9 | Range: 15.0-50.0</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Total Cholesterol (mg/dL)</label>
            <input
              type="number"
              name="cholesterol"
              value={formData.cholesterol}
              onChange={handleChange}
              min="100"
              max="400"
              placeholder="e.g., 200"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">Normal: {'<'}200 mg/dL | Range: 100-400 mg/dL</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Blood Pressure - Systolic (mmHg)
            </label>
            <input
              type="number"
              name="systolic_bp"
              value={formData.systolic_bp}
              onChange={handleChange}
              min="70"
              max="250"
              placeholder="e.g., 120"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">Normal: 90-120 mmHg | Range: 70-250 mmHg</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Blood Pressure - Diastolic (mmHg)
            </label>
            <input
              type="number"
              name="diastolic_bp"
              value={formData.diastolic_bp}
              onChange={handleChange}
              min="40"
              max="150"
              placeholder="e.g., 80"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">Normal: 60-80 mmHg | Range: 40-150 mmHg</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows="3"
            placeholder="Any additional notes about this assessment..."
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors resize-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 rounded-xl font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Log Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssessmentForm;
