import { useState, useEffect } from 'react';
import { X, Activity, TrendingUp, AlertCircle, CheckCircle, Info, Brain, Shield, AlertTriangle, Stethoscope } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MLResultModal - Displays REAL ML prediction results with guardrails
 * 
 * This component shows actual prediction results from the backend ML model
 * with appropriate safety warnings, disclaimers, and clinical context.
 */
const MLResultModal = ({ isOpen, onClose, result, onConfirm, isLoading }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen && !isLoading) {
      // Small delay for animation
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      setShowContent(false);
    }
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  // Default/loading state
  if (!result || isLoading) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-diana-forest/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-2xl"
          >
            <div className="glass-card bg-white p-8 text-center">
              <div className="relative inline-block mb-4">
                <div className="w-16 h-16 border-4 border-diana-forest/20 border-t-diana-forest rounded-full animate-spin" />
                <Brain size={24} className="absolute inset-0 m-auto text-diana-forest" />
              </div>
              <p className="text-diana-text-secondary font-medium">Analyzing your biomarkers...</p>
              <p className="text-sm text-diana-text-muted">Running ML prediction models</p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // Extract data from real backend result
  const {
    risk_score = 0,
    risk_level = 'unknown',
    cluster = 'Unknown',
    predicted_status = 'Unknown',
    model_version = 'unknown',
    validation_status = '',
    fbs = 0,
    hba1c = 0
  } = result;

  const getRiskColor = (level) => {
    const normalizedLevel = level?.toLowerCase() || 'unknown';
    switch (normalizedLevel) {
      case 'low':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
          icon: 'text-green-500',
          gradient: 'from-green-500 to-emerald-600',
          advice: 'Continue healthy habits. Routine check-up in 3-6 months.'
        };
      case 'medium':
      case 'moderate':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-800',
          icon: 'text-amber-500',
          gradient: 'from-amber-500 to-orange-600',
          advice: 'Consider lifestyle changes. Schedule check-up within 1 month.'
        };
      case 'high':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-700',
          badge: 'bg-rose-100 text-rose-800',
          icon: 'text-rose-500',
          gradient: 'from-rose-500 to-red-600',
          advice: 'Consult healthcare provider within 2 weeks. Consider HbA1c testing.'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-700',
          badge: 'bg-slate-100 text-slate-800',
          icon: 'text-slate-500',
          gradient: 'from-slate-500 to-gray-600',
          advice: 'Unable to determine risk level. Consult healthcare provider.'
        };
    }
  };

  const getClusterInfo = (clusterName) => {
    const clusters = {
      'SIDD': {
        fullName: 'Severe Insulin-Deficient Diabetes',
        desc: 'Lower BMI with elevated metabolic strain markers',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '🔴',
        risk: 'High'
      },
      'SIRD': {
        fullName: 'Severe Insulin-Resistant Diabetes',
        desc: 'High BMI with elevated lipids and blood pressure',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '🟠',
        risk: 'High'
      },
      'MOD': {
        fullName: 'Mild Obesity-Related Diabetes',
        desc: 'High BMI with moderately elevated lipid markers',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '🔵',
        risk: 'Moderate'
      },
      'MARD': {
        fullName: 'Mild Age-Related Diabetes',
        desc: 'Lower BMI with healthier lipid and blood pressure profile',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '🟢',
        risk: 'Low'
      },
      'Low Risk': {
        fullName: 'Low Risk Profile',
        desc: 'Healthier biomarker profile with lower diabetes risk',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '🟢',
        risk: 'Low'
      },
      'Moderate Risk': {
        fullName: 'Moderate Risk Profile',
        desc: 'Elevated markers suggesting increased risk',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '🟡',
        risk: 'Moderate'
      },
      'High Risk': {
        fullName: 'High Risk Profile',
        desc: 'Significantly elevated markers requiring attention',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '🔴',
        risk: 'High'
      }
    };
    return clusters[clusterName] || clusters['MARD'];
  };

  const colors = getRiskColor(risk_level);
  const clusterInfo = getClusterInfo(cluster);

  // Check for biomarker warnings
  const hasWarnings = validation_status && validation_status.includes('warning');
  const warningList = hasWarnings 
    ? validation_status.replace('warning:', '').split(',').filter(w => w)
    : [];

  // Check if actual diagnostic values were provided
  const hasDiagnosticValues = fbs > 0 || hba1c > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-diana-forest/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="glass-card bg-white p-0 overflow-hidden">
              {/* Header */}
              <div className={`bg-gradient-to-r ${colors.gradient} p-6 text-white relative`}>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 transition-colors"
                >
                  <X size={20} />
                </motion.button>

                <div className="flex items-center gap-3 mb-2">
                  <Brain size={24} className="text-white/90" />
                  <span className="text-sm font-bold uppercase tracking-wider text-white/80">ML Analysis Complete</span>
                </div>
                <h2 className="text-2xl font-bold">Your Assessment Results</h2>
                <p className="text-white/80 text-sm mt-1">
                  Model: {model_version || 'clinical_v2'} • No HbA1c/FBS used in prediction
                </p>
              </div>

              <div className="p-6 space-y-6">
                <AnimatePresence mode="wait">
                  {!showContent ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-12"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-diana-forest/20 border-t-diana-forest rounded-full animate-spin" />
                        <Brain size={24} className="absolute inset-0 m-auto text-diana-forest" />
                      </div>
                      <p className="mt-4 text-diana-text-secondary font-medium">Processing results...</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ staggerChildren: 0.1 }}
                    >
                      {/* 🚨 SAFETY GUARDRAIL: Medical Disclaimer Banner */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 mb-6"
                      >
                        <div className="flex items-start gap-3">
                          <Stethoscope size={24} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-amber-800 mb-1">Medical Disclaimer</h4>
                            <p className="text-sm text-amber-700">
                              This is a <strong>screening tool only</strong> and does not replace professional medical diagnosis. 
                              This prediction was made <strong>without using HbA1c or fasting blood sugar</strong> values. 
                              Always consult a healthcare provider for proper diagnosis and treatment.
                            </p>
                          </div>
                        </div>
                      </motion.div>

                      {/* Risk Score Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className={`${colors.bg} border ${colors.border} rounded-2xl p-6 mb-6`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Activity className={colors.icon} size={24} />
                            <span className="font-bold text-diana-text-primary">Diabetes Risk Score</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${colors.badge}`}>
                            {risk_level} Risk
                          </span>
                        </div>

                        <div className="flex items-end gap-3 mb-4">
                          <span className={`text-5xl font-bold ${colors.text}`}>{risk_score}</span>
                          <span className="text-diana-text-muted mb-2">/ 100</span>
                        </div>

                        <div className="w-full bg-white/50 rounded-full h-3 mb-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${risk_score}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-3 rounded-full bg-gradient-to-r ${colors.gradient}`}
                          />
                        </div>

                        {/* Risk Interpretation */}
                        <div className="bg-white/60 rounded-lg p-3 mt-3">
                          <p className="text-sm font-medium text-diana-text-primary mb-1">Clinical Interpretation:</p>
                          <p className="text-sm text-diana-text-secondary">{colors.advice}</p>
                        </div>

                        {/* Predicted Status */}
                        <div className="mt-4 pt-4 border-t border-white/50">
                          <p className="text-sm text-diana-text-secondary">
                            <span className="font-medium">Predicted Status:</span>{' '}
                            <span className={`font-bold ${colors.text}`}>{predicted_status}</span>
                          </p>
                        </div>
                      </motion.div>

                      {/* Cluster Information */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.1 }}
                        className="bg-white border border-diana-sand rounded-2xl p-6 mb-6"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <TrendingUp className="text-diana-forest" size={24} />
                          <span className="font-bold text-diana-text-primary">Metabolic Subtype</span>
                          <span className="ml-auto text-sm text-diana-text-muted">
                            Risk Level: {clusterInfo.risk}
                          </span>
                        </div>

                        <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border ${clusterInfo.color} mb-3`}>
                          <span className="text-2xl">{clusterInfo.icon}</span>
                          <div>
                            <div className="font-bold">{cluster}</div>
                            <div className="text-sm opacity-80">{clusterInfo.fullName}</div>
                          </div>
                        </div>

                        <p className="text-sm text-diana-text-secondary">
                          {clusterInfo.desc}
                        </p>
                      </motion.div>

                      {/* 🚨 GUARDRAIL: Biomarker Warnings */}
                      {hasWarnings && warningList.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ delay: 0.15 }}
                          className="bg-rose-50 border border-rose-200 rounded-2xl p-6 mb-6"
                        >
                          <h3 className="font-bold text-rose-800 mb-3 flex items-center gap-2">
                            <AlertTriangle size={20} className="text-rose-600" />
                            Abnormal Biomarker Values Detected
                          </h3>
                          <ul className="space-y-2">
                            {warningList.map((warning) => (
                              <li key={warning} className="flex items-start gap-2 text-sm text-rose-700">
                                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
                                {formatWarning(warning)}
                              </li>
                            ))}
                          </ul>
                          <p className="text-xs text-rose-600 mt-3">
                            These values may affect your health. Please discuss with your healthcare provider.
                          </p>
                        </motion.div>
                      )}

                      {/* 🚨 GUARDRAIL: Limitations Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.2 }}
                        className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6"
                      >
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                          <Info size={20} className="text-slate-600" />
                          Understanding This Prediction
                        </h3>

                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-blue-600">1</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">Screening Tool</p>
                              <p className="text-xs text-slate-600">
                                This model predicts risk using BMI, lipids, and blood pressure only. 
                                It cannot diagnose diabetes. AUC: 0.694 (moderate accuracy).
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-blue-600">2</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">No Lab Tests Used</p>
                              <p className="text-xs text-slate-600">
                                HbA1c and fasting blood sugar were NOT used in this prediction. 
                                This is intentional for pre-screening purposes.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-blue-600">3</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">Population Limitations</p>
                              <p className="text-xs text-slate-600">
                                Model trained on US data. Performance may vary for other populations.
                                External validation recommended.
                              </p>
                            </div>
                          </div>

                          {hasDiagnosticValues && (
                            <div className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle size={14} className="text-green-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700">Diagnostic Values Provided</p>
                                <p className="text-xs text-slate-600">
                                  You provided HbA1c: {hba1c > 0 ? hba1c : 'N/A'}% and FBS: {fbs > 0 ? fbs : 'N/A'} mg/dL. 
                                  These were NOT used in the ML prediction but are important for clinical diagnosis.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Recommendations */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.25 }}
                        className={`${colors.bg} border ${colors.border} rounded-2xl p-6 mb-6`}
                      >
                        <h3 className="font-bold text-diana-text-primary mb-3 flex items-center gap-2">
                          <Shield size={20} className={colors.icon} />
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {risk_level === 'high' && (
                            <>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                Schedule an appointment with your healthcare provider within 2 weeks
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                Request HbA1c and fasting blood glucose tests for proper diagnosis
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                Monitor blood glucose daily and maintain a log
                              </li>
                            </>
                          )}
                          {(risk_level === 'medium' || risk_level === 'moderate') && (
                            <>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                Consider scheduling a check-up within the next month
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size="16" className="text-amber-500 mt-0.5 shrink-0" />
                                Consider HbA1c testing to confirm risk status
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                Focus on lifestyle modifications: diet and exercise
                              </li>
                            </>
                          )}
                          {risk_level === 'low' && (
                            <>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                Continue your healthy lifestyle habits
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                Schedule routine check-up within 3-6 months
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                Consider HbA1c testing as part of routine screening
                              </li>
                            </>
                          )}
                        </ul>
                      </motion.div>

                      {/* Footer Disclaimer */}
                      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6">
                        <p className="text-xs text-slate-600 flex items-start gap-2">
                          <Info size={14} className="mt-0.5 shrink-0" />
                          <span>
                            This analysis is generated by machine learning models (AUC: 0.694) and is for 
                            <strong> screening purposes only</strong>. It does not replace professional medical advice. 
                            Always consult with your healthcare provider for personalized medical guidance. 
                            Model version: {model_version || 'clinical_v2'}.
                          </span>
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onClose}
                          className="flex-1 px-6 py-3 border border-diana-sand text-diana-text-secondary font-bold rounded-xl hover:bg-diana-stone transition-all"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onConfirm}
                          className="flex-1 px-6 py-3 bg-diana-forest text-white font-bold rounded-xl hover:bg-diana-forest-light transition-all shadow-lg shadow-diana-forest/20"
                        >
                          Save to Dashboard
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Helper function to format warning messages
const formatWarning = (warning) => {
  const warningMap = {
    'fbs_diabetic_range': 'Fasting blood sugar is in diabetic range (≥126 mg/dL)',
    'fbs_prediabetic_range': 'Fasting blood sugar is in pre-diabetic range (100-125 mg/dL)',
    'hba1c_diabetic_range': 'HbA1c is in diabetic range (≥6.5%)',
    'hba1c_prediabetic_range': 'HbA1c is in pre-diabetic range (5.7-6.4%)',
    'chol_high': 'Total cholesterol is high (≥240 mg/dL)',
    'chol_borderline': 'Total cholesterol is borderline (200-239 mg/dL)',
    'ldl_high': 'LDL cholesterol is high (≥160 mg/dL)',
    'ldl_borderline': 'LDL cholesterol is borderline (130-159 mg/dL)',
    'hdl_low': 'HDL cholesterol is low (<50 mg/dL for women)',
    'triglycerides_high': 'Triglycerides are high (≥200 mg/dL)',
    'triglycerides_borderline': 'Triglycerides are borderline (150-199 mg/dL)',
    'bp_high': 'Blood pressure is high (≥140/90 mmHg)',
    'bp_elevated': 'Blood pressure is elevated (120-139/80-89 mmHg)',
    'bmi_obese': 'BMI indicates obesity (≥30 kg/m²)',
    'bmi_overweight': 'BMI indicates overweight (25-29.9 kg/m²)'
  };
  return warningMap[warning] || warning.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default MLResultModal;
