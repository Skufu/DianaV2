import { useState, useEffect } from 'react';
import { X, Activity, TrendingUp, AlertCircle, CheckCircle, Info, Brain, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MockMLResultModal = ({ isOpen, onClose, formData, onConfirm }) => {
  const [showContent, setShowContent] = useState(false);
  const [mockResult, setMockResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setShowContent(false);
      const result = generateMockResult(formData);
      setMockResult(result);

      const timer = setTimeout(() => {
        setShowContent(true);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isOpen, formData]);

  if (!mockResult) return null;

  const { riskScore, riskLevel, cluster, confidence, factors } = mockResult;

  const getRiskColor = (level) => {
    switch (level) {
      case 'low':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          badge: 'bg-green-100 text-green-800',
          icon: 'text-green-500',
          gradient: 'from-green-500 to-emerald-600'
        };
      case 'medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-800',
          icon: 'text-amber-500',
          gradient: 'from-amber-500 to-orange-600'
        };
      case 'high':
        return {
          bg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-700',
          badge: 'bg-rose-100 text-rose-800',
          icon: 'text-rose-500',
          gradient: 'from-rose-500 to-red-600'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          text: 'text-slate-700',
          badge: 'bg-slate-100 text-slate-800',
          icon: 'text-slate-500',
          gradient: 'from-slate-500 to-gray-600'
        };
    }
  };

  const getClusterInfo = (clusterName) => {
    const clusters = {
      'SIDD': {
        fullName: 'Severe Insulin-Deficient Diabetes',
        desc: 'Early onset, low BMI, poor metabolic control',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: '🔴'
      },
      'SIRD': {
        fullName: 'Severe Insulin-Resistant Diabetes',
        desc: 'High insulin resistance, elevated kidney disease risk',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '🟠'
      },
      'MOD': {
        fullName: 'Mild Obesity-Related Diabetes',
        desc: 'High BMI but relatively stable metabolic state',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: '🔵'
      },
      'MARD': {
        fullName: 'Mild Age-Related Diabetes',
        desc: 'Older onset, mild metabolic disturbances',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: '🟢'
      }
    };
    return clusters[clusterName] || clusters['MOD'];
  };

  const colors = getRiskColor(riskLevel);
  const clusterInfo = getClusterInfo(cluster);

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { scale: 0.95, opacity: 0, y: 20 },
    visible: {
      scale: 1,
      opacity: 1,
      y: 0,
      transition: { type: "spring", duration: 0.5, bounce: 0.3 }
    },
    exit: { scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.2 } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-diana-forest/30 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="glass-card bg-white p-0 overflow-hidden">
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
                  <span className="text-sm font-bold uppercase tracking-wider text-white/80">AI Analysis Complete</span>
                </div>
                <h2 className="text-2xl font-bold">Your Assessment Results</h2>
              </div>

              <div className="p-6 space-y-6 min-h-[400px]">
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
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Brain size={24} className="text-diana-forest" />
                        </motion.div>
                      </div>
                      <p className="mt-4 text-diana-text-secondary font-medium">Analyzing your biomarkers...</p>
                      <p className="text-sm text-diana-text-muted">Running ML prediction models</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ staggerChildren: 0.1 }}
                    >
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`${colors.bg} border ${colors.border} rounded-2xl p-6 mb-6`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Activity className={colors.icon} size={24} />
                            <span className="font-bold text-diana-text-primary">Diabetes Risk Score</span>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${colors.badge}`}>
                            {riskLevel} Risk
                          </span>
                        </div>

                        <div className="flex items-end gap-3 mb-4">
                          <span className={`text-5xl font-bold ${colors.text}`}>{riskScore}</span>
                          <span className="text-diana-text-muted mb-2">/ 100</span>
                        </div>

                        <div className="w-full bg-white/50 rounded-full h-3 mb-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${riskScore}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-3 rounded-full bg-gradient-to-r ${colors.gradient}`}
                          />
                        </div>

                        <p className="text-sm text-diana-text-secondary">
                          Based on your HbA1c ({formData.hba1c}%), FBS ({formData.fbs} mg/dL), and other biomarkers
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="bg-white border border-diana-sand rounded-2xl p-6 mb-6"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <TrendingUp className="text-diana-forest" size={24} />
                          <span className="font-bold text-diana-text-primary">Metabolic Subtype</span>
                          <span className="ml-auto text-sm text-diana-text-muted">
                            Confidence: {confidence}%
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

                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="bg-diana-stone/30 rounded-2xl p-6 mb-6"
                      >
                        <h3 className="font-bold text-diana-text-primary mb-4 flex items-center gap-2">
                          <Info size={20} className="text-diana-forest" />
                          Key Contributing Factors
                        </h3>

                        <div className="space-y-3">
                          {factors.map((factor, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${factor.impact === 'high' ? 'bg-rose-500' :
                                factor.impact === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                                }`} />
                              <span className="text-sm text-diana-text-secondary flex-1">{factor.name}</span>
                              <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${factor.impact === 'high' ? 'bg-rose-100 text-rose-700' :
                                factor.impact === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                }`}>
                                {factor.impact}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className={`${colors.bg} border ${colors.border} rounded-2xl p-6 mb-6`}
                      >
                        <h3 className="font-bold text-diana-text-primary mb-3 flex items-center gap-2">
                          <Shield size={20} className={colors.icon} />
                          Recommendations
                        </h3>
                        <ul className="space-y-2">
                          {riskLevel === 'high' && (
                            <>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <AlertCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                Schedule an appointment with your healthcare provider within 2 weeks
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                                Monitor blood glucose daily and maintain a log
                              </li>
                            </>
                          )}
                          {riskLevel === 'medium' && (
                            <>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                Consider scheduling a check-up within the next month
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                                Focus on lifestyle modifications: diet and exercise
                              </li>
                            </>
                          )}
                          {riskLevel === 'low' && (
                            <>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                Continue your healthy lifestyle habits
                              </li>
                              <li className="flex items-start gap-2 text-sm text-diana-text-secondary">
                                <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
                                Schedule routine check-up within 3-6 months
                              </li>
                            </>
                          )}
                        </ul>
                      </motion.div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                        <p className="text-xs text-slate-500 flex items-start gap-2">
                          <Info size={14} className="mt-0.5 shrink-0" />
                          This analysis is generated by machine learning models and is for informational purposes only.
                          It does not replace professional medical advice. Always consult with your healthcare provider
                          for personalized medical guidance.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onClose}
                          className="flex-1 px-6 py-3 border border-diana-sand text-diana-text-secondary font-bold rounded-xl hover:bg-diana-stone transition-all"
                        >
                          Close
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

const generateMockResult = (formData) => {
  const hba1c = parseFloat(formData.hba1c) || 5.7;
  const fbs = parseInt(formData.fbs) || 95;
  const bmi = parseFloat(formData.bmi) || 25;
  const triglycerides = parseInt(formData.triglycerides) || 150;
  const hdl = parseInt(formData.hdl) || 50;
  const ldl = parseInt(formData.ldl) || 100;

  let riskScore = 0;
  let riskLevel = 'low';
  let cluster = 'MARD';

  // HbA1c contribution (primary classifier per ADA)
  if (hba1c >= 6.5) {
    riskScore += 35;
  } else if (hba1c >= 5.7) {
    riskScore += 20;
  }

  // FBS contribution
  if (fbs >= 126) {
    riskScore += 30;
  } else if (fbs >= 100) {
    riskScore += 15;
  }

  // BMI contribution
  if (bmi >= 30) {
    riskScore += 15;
  } else if (bmi >= 25) {
    riskScore += 8;
  }

  // Lipid profile contribution
  if (triglycerides >= 200) {
    riskScore += 5;
  }
  if (hdl < 40) {
    riskScore += 5;
  }

  riskScore += Math.floor(Math.random() * 10) - 5;
  riskScore = Math.max(0, Math.min(100, riskScore));

  if (riskScore >= 67) {
    riskLevel = 'high';
  } else if (riskScore >= 34) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // Cluster assignment based on Ahlqvist classification characteristics
  // SIDD: High HbA1c, low BMI (severe insulin-deficient)
  // SIRD: High BMI, high TG, low HDL (severe insulin-resistant)
  // MOD: High BMI, moderate metabolic (mild obesity-related)
  // MARD: Low BMI, healthiest profile (mild age-related)
  if (hba1c > 7.0 && bmi < 25) {
    cluster = 'SIDD';
  } else if (bmi >= 35 && triglycerides > 150 && hdl < 50) {
    cluster = 'SIRD';
  } else if (bmi >= 30) {
    cluster = 'MOD';
  } else {
    cluster = 'MARD';
  }

  const factors = [];

  if (hba1c > 6.0) {
    factors.push({ name: `HbA1c Level (${hba1c}%)`, impact: hba1c > 7.0 ? 'high' : 'medium' });
  }

  if (fbs > 100) {
    factors.push({ name: `Fasting Blood Sugar (${fbs} mg/dL)`, impact: fbs > 126 ? 'high' : 'medium' });
  }

  if (bmi > 25) {
    factors.push({ name: `BMI (${bmi} kg/m²)`, impact: bmi > 30 ? 'medium' : 'low' });
  }

  if (triglycerides > 150) {
    factors.push({ name: `Triglycerides (${triglycerides} mg/dL)`, impact: triglycerides > 200 ? 'medium' : 'low' });
  }

  if (hdl < 50) {
    factors.push({ name: `HDL Cholesterol (${hdl} mg/dL)`, impact: hdl < 40 ? 'medium' : 'low' });
  }

  if (factors.length === 0) {
    factors.push({ name: 'Overall biomarker profile', impact: 'low' });
  }

  return {
    riskScore,
    riskLevel,
    cluster,
    confidence: Math.floor(Math.random() * 15) + 80,
    factors
  };
};


export default MockMLResultModal;
