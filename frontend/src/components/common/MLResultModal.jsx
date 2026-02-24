import { useState, useEffect } from 'react';
import { X, Heart, Sparkles, ShieldCheck, AlertCircle, CheckCircle, Flame, Droplets, Leaf } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MLResultModal - Displays prediction results optimized for women 45+ (non-techy)
 * Reassuring, clear tone with empowering next steps.
 */
const MLResultModal = ({ isOpen, onClose, result, onConfirm, isLoading }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen && !isLoading) {
      const timer = setTimeout(() => setShowContent(true), 400);
      return () => clearTimeout(timer);
    } else if (!isOpen) {
      setShowContent(false);
    }
  }, [isOpen, isLoading]);

  if (!isOpen) return null;

  if (!result || isLoading) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-xl"
          >
            <div className="bg-white rounded-[32px] p-12 text-center shadow-2xl">
              <div className="relative inline-block mb-6">
                <div className="w-24 h-24 border-[6px] border-rose-100 border-t-rose-400 rounded-full animate-spin" />
                <Heart size={36} className="absolute inset-0 m-auto text-rose-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">Reviewing your health profile...</h3>
              <p className="text-slate-500 text-lg">Just a moment while we put together your personalized insights.</p>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const {
    risk_score = 0,
    risk_level: overallRiskLevelRaw = 'unknown',
    cluster = 'Unknown',
    treatment_focus = '',
    validation_status = '',
    predicted_status = '',
    model_version = '',
    at_risk_probability,
  } = result;

  const getRiskColor = (level) => {
    const normalizedLevel = level?.toLowerCase() || 'unknown';
    switch (normalizedLevel) {
      case 'low':
        return {
          bg: 'bg-teal-50',
          border: 'border-white',
          text: 'text-teal-700',
          badge: 'bg-teal-100 text-teal-800',
          icon: 'text-teal-500',
          gradient: 'from-teal-400 to-emerald-500',
          title: 'Looking Good',
          advice: 'Your screening indicates a low risk profile right now. Keep up the wonderful work with your healthy habits!'
        };
      case 'medium':
      case 'moderate':
        return {
          bg: 'bg-amber-50',
          border: 'border-white',
          text: 'text-amber-700',
          badge: 'bg-amber-100 text-amber-800',
          icon: 'text-amber-500',
          gradient: 'from-amber-400 to-orange-400',
          title: 'Time for a Check-in',
          advice: 'Your results suggest a moderate risk. Small, mindful changes to your daily routine can make a big difference.'
        };
      case 'high':
        return {
          bg: 'bg-rose-50',
          border: 'border-white',
          text: 'text-rose-700',
          badge: 'bg-rose-100 text-rose-800',
          icon: 'text-rose-500',
          gradient: 'from-rose-400 to-red-400',
          title: 'Action Recommended',
          advice: 'Your profile shows some elevated risk factors. Don\'t worry, but please do schedule a visit with your doctor soon.'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-white',
          text: 'text-slate-700',
          badge: 'bg-slate-100 text-slate-800',
          icon: 'text-slate-500',
          gradient: 'from-slate-400 to-gray-500',
          title: 'Results Processed',
          advice: 'We have processed your data. Please discuss these details with your healthcare provider to understand them fully.'
        };
    }
  };

  const getClusterInfo = (clusterName) => {
    const clusters = {
      'SIDD': {
        fullName: 'Insulin Sensitivity Profile',
        desc: 'Your body might need a little extra help utilizing insulin properly. This is very common and manageable.',
        color: 'bg-rose-100 text-rose-800',
        icon: <Droplets className="text-rose-600" size={24} />,
      },
      'SIRD': {
        fullName: 'Metabolic Balance Profile',
        desc: 'Your results point toward insulin resistance, which often improves beautifully with gentle lifestyle adjustments.',
        color: 'bg-orange-100 text-orange-800',
        icon: <Flame className="text-orange-600" size={24} />,
      },
      'MOD': {
        fullName: 'Weight Harmony Profile',
        desc: 'Finding a balanced weight that feels right for your body could be the key to supporting your health.',
        color: 'bg-blue-100 text-blue-800',
        icon: <Leaf className="text-blue-600" size={24} />,
      },
      'MARD': {
        fullName: 'Age-Related Changes',
        desc: 'Natural changes as we mature are playing a role in your results. It\'s completely normal, and staying active is the best approach.',
        color: 'bg-teal-100 text-teal-800',
        icon: <Sparkles className="text-teal-600" size={24} />,
      },
      'Low Risk': {
        fullName: 'Balanced Wellness Profile',
        desc: 'Your health markers are looking beautifully balanced right now.',
        color: 'bg-teal-100 text-teal-800',
        icon: <Heart className="text-teal-600" size={24} />,
      },
      'Moderate Risk': {
        fullName: 'Attention Needed Profile',
        desc: 'Some of your markers are slightly elevated and could use some nurturing.',
        color: 'bg-amber-100 text-amber-800',
        icon: <AlertCircle className="text-amber-600" size={24} />,
      },
      'High Risk': {
        fullName: 'Care Priority Profile',
        desc: 'Your markers are elevated. Partnering closely with your doctor is the best and safest next step.',
        color: 'bg-rose-100 text-rose-800',
        icon: <ShieldCheck className="text-rose-600" size={24} />,
      }
    };
    return clusters[clusterName] || clusters['Moderate Risk'];
  };

  const normalizedRiskScore = Number.isFinite(risk_score) ? risk_score : null;
  const overallRiskScore = normalizedRiskScore ?? 0;
  const overallRiskLevel = normalizedRiskScore !== null
    ? (overallRiskScore >= 67 ? 'high' : overallRiskScore >= 34 ? 'moderate' : 'low')
    : (overallRiskLevelRaw || 'unknown').toLowerCase();

  const colors = getRiskColor(overallRiskLevel);
  const clusterInfo = getClusterInfo(cluster);

  const hasWarnings = validation_status && validation_status.includes('warning');
  const warningList = hasWarnings
    ? validation_status.replace('warning:', '').split(',').filter(w => w)
    : [];

  const isDoctorModel = typeof model_version === 'string' && model_version.length > 0;
  const modelLabelMap = {
    binary_v2_no_bp: 'Screening (No BP) – Binary at-risk',
    binary_v2_bp: 'Screening (With BP) – Binary at-risk',
    clinical_3class: 'Clinical 3-Class (Normal/Pre-diabetic/Diabetic)',
    clinical: 'Clinical (No HbA1c/FBS)',
    ada: 'ADA Baseline (HbA1c + FBS)'
  };
  const modelLabel = modelLabelMap[model_version] || model_version || 'Clinical Screening';
  const probabilityText = Number.isFinite(at_risk_probability)
    ? `${Math.round(at_risk_probability * 100)}% at-risk probability`
    : 'Probability unavailable';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={(event) => {
              if (!showContent) return;
              if (event.target === event.currentTarget) {
                onClose();
              }
            }}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] bg-slate-50 shadow-2xl"
          >
            <div className="overflow-hidden">
              {/* Header */}
              <div className={`bg-gradient-to-br ${colors.gradient} p-8 text-white relative`}>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.3)" }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2.5 rounded-full bg-white/20 transition-colors shadow-sm"
                >
                  <X size={20} />
                </motion.button>

                <div className="flex items-center gap-3 mb-2">
                  <Sparkles size={24} className="text-white/90" />
                  <span className="text-sm font-semibold uppercase tracking-widest text-white/90">AI-Assisted Results</span>
                </div>
                <h2 className="text-[34px] font-medium tracking-tight mb-1">{colors.title}</h2>
                {isDoctorModel && (
                  <div className="mt-3 text-sm text-white/90 font-medium">
                    <span className="uppercase tracking-wide">Model:</span> {modelLabel}
                  </div>
                )}
              </div>

              <div className="p-8 space-y-7">
                <AnimatePresence mode="wait">
                  {!showContent ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16"
                    >
                      <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-400 rounded-full animate-spin mb-4" />
                      <p className="text-slate-500 font-medium text-lg">Preparing your personalized insights...</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ staggerChildren: 0.08 }}
                    >
                      {/* Wellness Score Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`${colors.bg} rounded-3xl p-7 mb-7 shadow-sm border ${colors.border}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-semibold text-slate-800">Your Wellness Score</h3>
                        </div>

                        <div className="flex items-baseline gap-2 mb-5">
                          <span className={`text-[80px] leading-none font-light tracking-tighter ${colors.text}`}>{overallRiskScore}</span>
                          <span className="text-slate-500 font-medium text-lg">/ 100</span>
                        </div>

                        {isDoctorModel && predicted_status && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-4 py-1.5 rounded-full bg-slate-800 text-white text-sm font-semibold">
                              Predicted: {predicted_status}
                            </span>
                            <span className="px-4 py-1.5 rounded-full bg-white/90 text-slate-700 text-sm font-semibold border border-slate-200">
                              {probabilityText}
                            </span>
                          </div>
                        )}

                        <div className="w-full bg-white/60 rounded-full h-4 mb-5 overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${overallRiskScore}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={`h-full rounded-full bg-gradient-to-r ${colors.gradient} opacity-90`}
                          />
                        </div>

                        <div className="bg-white/80 rounded-2xl p-5 mt-2 shadow-sm">
                          <p className="text-slate-700 leading-relaxed font-medium text-[17px]">
                            {colors.advice}
                          </p>
                        </div>
                      </motion.div>

                      {/* Personal Profile Card */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-7 mb-7 shadow-sm border border-slate-100"
                      >
                        <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                          <Leaf className="text-teal-500" size={22} />
                          Your Personal Profile
                        </h3>

                        <div className="flex items-start gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                          <div className={`p-4 rounded-full ${clusterInfo.color} shrink-0 shadow-sm`}>
                            {clusterInfo.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-[19px] mb-1.5">{clusterInfo.fullName}</div>
                            <p className="text-slate-600 text-[16px] leading-relaxed mb-3">
                              {clusterInfo.desc}
                            </p>
                            {treatment_focus && (
                              <div className="inline-block px-4 py-1.5 bg-white border border-slate-200 rounded-full text-[13px] text-slate-600 font-medium shadow-sm">
                                Focus on: {treatment_focus}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>

                      {/* Gentle Warnings (if any) */}
                      {hasWarnings && warningList.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-rose-50/50 rounded-3xl p-7 mb-7 border border-rose-100"
                        >
                          <h3 className="text-lg font-semibold text-rose-800 mb-3 flex items-center gap-2">
                            <Heart size={22} className="text-rose-500" />
                            Gentle Reminders
                          </h3>
                          <p className="text-[16px] text-rose-700 mb-4 leading-relaxed">
                            A few numbers in your results stood out. It&apos;s completely normal to have fluctuations, but they are great points to discuss at your next doctor&apos;s visit:
                          </p>
                          <ul className="space-y-3">
                            {warningList.map((warning) => (
                              <li key={warning} className="flex items-start gap-3 text-[15px] text-rose-800/80 bg-white/70 p-3 rounded-xl shadow-sm">
                                <span className="text-rose-400 mt-0.5 font-bold">•</span>
                                <span className="pt-0.5">{formatFriendlyWarning(warning)}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}

                      {/* Gentle Next Steps */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-7 mb-7 shadow-sm border border-slate-100"
                      >
                        <h3 className="text-lg font-semibold text-slate-800 mb-5 flex items-center gap-2">
                          <ShieldCheck size={22} className="text-indigo-500" />
                          Suggested Next Steps
                        </h3>
                        <ul className="space-y-4">
                          {overallRiskLevel === 'high' && (
                            <>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Book a chat with your doctor.</strong> Share these insights with them so they can guide you softly and securely.</span>
                              </li>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Ask about a routine blood test.</strong> Simple lab tests can give you a fuller picture of how your lovely body is doing.</span>
                              </li>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Be kind to yourself.</strong> Stress affects our bodies too, so take deep breaths and gentle steps forward!</span>
                              </li>
                            </>
                          )}
                          {(overallRiskLevel === 'medium' || overallRiskLevel === 'moderate') && (
                            <>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Consider a check-up.</strong> It might be a wonderful time to schedule an appointment just to see how you&apos;re feeling.</span>
                              </li>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Enjoy nourishing foods.</strong> Focus on adding vibrant, colorful veggies and whole grains to your lovely meals.</span>
                              </li>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Stay active your way.</strong> A lovely daily walk, dancing to a favorite song, or gentle stretching makes a huge difference.</span>
                              </li>
                            </>
                          )}
                          {overallRiskLevel === 'low' && (
                            <>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-green-50 text-green-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Keep up the wonderful work!</strong> Your current routine is serving your body beautifully.</span>
                              </li>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-green-50 text-green-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>Stay reasonably active.</strong> Dancing, walking, or gardening are joyful ways to keep moving.</span>
                              </li>
                              <li className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed">
                                <div className="mt-1 bg-green-50 text-green-500 p-1.5 rounded-full shrink-0"><CheckCircle size={18} /></div>
                                <span><strong>See your doctor for routine wellness visits</strong> just to keep everything wonderfully on track.</span>
                              </li>
                            </>
                          )}
                        </ul>
                      </motion.div>

                      <div className="bg-slate-100 rounded-2xl p-6 mb-7">
                        <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">Clinical Guardrails</h4>
                        <ul className="text-[15px] text-slate-600 leading-relaxed font-medium space-y-2">
                          <li>• AI-assisted screening support — not a diagnosis. Clinical judgment remains primary.</li>
                          <li>• Model trained on NHANES postmenopausal cohort; external generalization may be limited.</li>
                          <li>• False positives are expected for screening sensitivity. Confirm with HbA1c/FBS when appropriate.</li>
                          <li>• Use with clinical context (history, symptoms, and confirmatory labs).</li>
                        </ul>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-5 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onClose}
                          className="flex-1 py-4 text-slate-500 font-semibold text-[17px] rounded-2xl hover:bg-slate-100 transition-all"
                        >
                          Close
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={onConfirm}
                          className="flex-1 py-4 bg-slate-800 text-white font-semibold text-[17px] rounded-2xl shadow-xl shadow-slate-800/10 hover:bg-slate-700 transition-all tracking-wide"
                        >
                          Save My Results
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

// Friendly warning translations
const formatFriendlyWarning = (warning) => {
  const warningMap = {
    'fbs_diabetic_range': 'Your fasting blood sugar was a bit elevated.',
    'fbs_prediabetic_range': 'Your fasting blood sugar is slightly higher than usual.',
    'hba1c_diabetic_range': 'Your recent blood sugar average (HbA1c) is a bit high.',
    'hba1c_prediabetic_range': 'Your recent blood sugar average (HbA1c) is slightly elevated.',
    'chol_high': 'Your total cholesterol is on the higher side.',
    'chol_borderline': 'Your total cholesterol is slightly elevated.',
    'ldl_high': 'Your LDL (often called "bad") cholesterol is a bit high.',
    'ldl_borderline': 'Your LDL cholesterol is slightly above the ideal range.',
    'hdl_low': 'Your HDL (often called "good") cholesterol is a little low.',
    'triglycerides_high': 'Your triglycerides (a type of fat in blood) are high.',
    'triglycerides_borderline': 'Your triglycerides are slightly elevated.',
    'bp_high': 'Your blood pressure is running a little high.',
    'bp_elevated': 'Your blood pressure is slightly elevated.',
    'bmi_obese': 'Your BMI indicates it might be good to discuss weight management with your doctor.',
    'bmi_overweight': 'Your BMI is slightly above the typical range.'
  };
  return warningMap[warning] || warning.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default MLResultModal;
