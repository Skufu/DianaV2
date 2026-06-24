import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Heart,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Flame,
  Droplets,
  Leaf,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/**
 * MLResultModal - Displays prediction results optimized for women 45+ (non-techy)
 * Redesigned Flow: Clarity -> Understanding -> Reassurance -> Action
 * IMPORTANT MODEL NOTE: The primary model type for this application is now ALWAYS
 * "binary_v2_no_bp". The UI/UX is specifically optimized for output from this model.
 */
const AT_RISK_SCREENING_THRESHOLD = 0.465;

const MLResultModal = ({ isOpen, onClose, result, onConfirm, isLoading }) => {
  const [showContent, setShowContent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const contentTransition = shouldReduceMotion
    ? { duration: 0, staggerChildren: 0 }
    : { staggerChildren: 0.08 };
  const modalTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 25 };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || isLoading) {
      setShowContent(false);
      return undefined;
    }

    if (shouldReduceMotion) {
      setShowContent(true);
      return undefined;
    }

    const timer = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(timer);
  }, [isOpen, isLoading, shouldReduceMotion]);

  // Safely default result to avoid destructuring errors when closed
  const safeResult = result || {};

  const {
    risk_level: overallRiskLevelRaw = 'unknown',
    cluster = 'Unknown',
    predicted_status = '',
    model_version = '',
    at_risk_probability,
    validation_warnings = [],
    warning = '',
    output_capabilities,
    cluster_capability,
    // Extract biomarker inputs for the Snapshot section
    bmi = 0,
    ldl = 0,
    hdl = 0,
    triglycerides = 0,
    age = 0,
  } = safeResult;

  const outputCapabilities =
    output_capabilities && typeof output_capabilities === 'object' ? output_capabilities : null;
  const clusterCapability =
    cluster_capability && typeof cluster_capability === 'object' ? cluster_capability : null;

  const capabilityOrFalse = capabilityValue => capabilityValue === true;

  const canonicalClusters = new Set(['SIDD', 'SIRD', 'MOD', 'MARD']);
  const normalizedCluster = typeof cluster === 'string' ? cluster.trim().toUpperCase() : '';
  const hasCanonicalCluster = canonicalClusters.has(normalizedCluster);

  const hasExplicitCapabilityContract = Boolean(outputCapabilities || clusterCapability);

  const hasPredictedStatus =
    hasExplicitCapabilityContract &&
    capabilityOrFalse(outputCapabilities?.predicted_status) &&
    typeof predicted_status === 'string' &&
    predicted_status.trim().length > 0;

  const hasAtRiskProbability =
    hasExplicitCapabilityContract &&
    capabilityOrFalse(outputCapabilities?.at_risk_probability) &&
    Number.isFinite(at_risk_probability);

  const capabilityExplicitlyDisabled =
    hasExplicitCapabilityContract &&
    (!capabilityOrFalse(outputCapabilities?.metabolic_subtype) ||
      !capabilityOrFalse(clusterCapability?.supported));

  const canRenderSubtypeProfile = hasCanonicalCluster && !capabilityExplicitlyDisabled;

  const normalizedPredictedStatus =
    typeof predicted_status === 'string' ? predicted_status.trim().toLowerCase() : '';
  const isPredictedAtRisk = [
    'at-risk',
    'at risk',
    'pre-diabetic',
    'prediabetic',
    'diabetic',
  ].includes(normalizedPredictedStatus);
  const isPredictedNotAtRisk = ['normal', 'not at risk', 'not-at-risk', 'low'].includes(
    normalizedPredictedStatus
  );

  const deriveScreeningState = (level, prob) => {
    const normalizedLevel = level?.toLowerCase() || 'unknown';

    if (hasPredictedStatus) {
      if (isPredictedAtRisk) return 'atRisk';
      if (isPredictedNotAtRisk) return 'notAtRisk';
    }

    if (Number.isFinite(prob)) {
      return prob >= AT_RISK_SCREENING_THRESHOLD ? 'atRisk' : 'notAtRisk';
    }

    if (['high', 'medium', 'moderate'].includes(normalizedLevel)) return 'atRisk';
    if (['low', 'normal'].includes(normalizedLevel)) return 'notAtRisk';

    return 'unknown';
  };

  // Section 1: The Verdict - Color Coding
  const getRiskPresentation = screeningState => {
    if (screeningState === 'notAtRisk') {
      return {
        bg: 'bg-teal-50',
        border: 'border-teal-100',
        text: 'text-teal-700',
        badge: 'bg-teal-100 text-teal-900 border-teal-200',
        icon: 'text-teal-500',
        gradient: 'from-teal-500 to-emerald-500',
        statusLabel: 'Not at risk',
        probabilityLabel: 'At-risk estimate',
        advice:
          'Your result is in the not-at-risk range for this screening. Keep your regular checkups and healthy routines, and share these results with your doctor if you have concerns.',
      };
    }

    if (screeningState === 'atRisk') {
      return {
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        badge: 'bg-amber-100 text-amber-900 border-amber-200',
        icon: 'text-amber-500',
        gradient: 'from-amber-500 to-orange-500',
        statusLabel: 'At risk - follow up',
        probabilityLabel: 'At-risk estimate',
        advice:
          'Your result is in the at-risk range for this screening. This does not mean you have diabetes, but it is a good reason to schedule a checkup soon and review the numbers with your doctor.',
      };
    }

    return {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      text: 'text-slate-700',
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: 'text-slate-500',
      gradient: 'from-slate-500 to-slate-700',
      statusLabel: 'Needs review',
      probabilityLabel: 'At-risk estimate',
      advice:
        'We could not clearly place this result into an at-risk or not-at-risk range. Please review the numbers with your doctor or clinic.',
    };
  };

  // Section 3: Personal Profile Translations
  const getClusterInfo = clusterName => {
    const NEUTRAL_CLUSTER = {
      fullName: 'No subtype pattern shown',
      desc: 'This result did not include a specific subtype pattern. That is okay. DIANA is showing your main screening result and biomarker numbers without guessing a subtype.',
      color: 'bg-slate-100 text-slate-700',
      icon: <Activity className="text-slate-500" size={24} />,
    };

    // Empathetic translations for women 45+
    const clusters = {
      SIDD: {
        fullName: 'Atherogenic / Lipid-Driven Profile',
        desc: 'Your pattern is mostly linked with cholesterol and blood fats. Your doctor can help review LDL, HDL, and triglycerides and decide what follow-up is needed.',
        color: 'bg-rose-100 text-rose-800',
        icon: <Droplets className="text-rose-600" size={24} />,
      },
      SIRD: {
        fullName: 'Insulin Resistance Profile',
        desc: 'Your pattern suggests your body may be working harder to handle sugar and insulin. This is common in midlife and can often improve with food, movement, sleep, and medical guidance.',
        color: 'bg-orange-100 text-orange-800',
        icon: <Flame className="text-orange-600" size={24} />,
      },
      MOD: {
        fullName: 'Weight-Linked Metabolic Profile',
        desc: 'Your pattern suggests weight and metabolism are closely connected in this result. A realistic food and activity plan may help, but your doctor should guide what is appropriate for you.',
        color: 'bg-blue-100 text-blue-800',
        icon: <Leaf className="text-blue-600" size={24} />,
      },
      MARD: {
        fullName: 'Age-Related Changes',
        desc: 'Your pattern is more related to age-linked metabolic changes. Regular checkups, strength activity, walking, and balanced meals can help you stay on track.',
        color: 'bg-teal-100 text-teal-800',
        icon: <Sparkles className="text-teal-600" size={24} />,
      },
    };

    if (!clusterName || clusterName === 'Unknown' || clusterName === 'N/A' || clusterName === '') {
      return NEUTRAL_CLUSTER;
    }
    return clusters[clusterName] || NEUTRAL_CLUSTER;
  };

  // Section 4: tailored action steps based on cluster
  const getActionSteps = (clusterCode, isAtRisk) => {
    if (!isAtRisk) {
      return [
        'Keep doing the healthy habits that are already working for you.',
        'Stay active in a way you can keep up, such as walking, light strength exercises, or household movement.',
        'Bring these results to your next routine checkup, especially if your symptoms or family history change.',
      ];
    }

    switch (clusterCode) {
      case 'SIDD':
        return [
          'Book a visit with your doctor to discuss your cholesterol and blood fat levels.',
          'Ask whether LDL, HDL, and triglycerides need repeat testing or a treatment plan.',
          'Choose heart-supportive meals and movement changes that you can realistically maintain.',
        ];
      case 'SIRD':
        return [
          'Book a visit with your doctor to discuss insulin resistance and follow-up testing.',
          'Ask what food, movement, sleep, or medication options are appropriate for you.',
          'Try gentle activity after meals, such as a short walk, if your doctor says it is safe.',
        ];
      case 'MOD':
        return [
          'Book a visit with your doctor to discuss weight and metabolic health together.',
          'Focus on sustainable meals rather than strict or short-term diets.',
          'Choose movement that fits your joints, energy level, and daily routine.',
        ];
      case 'MARD':
        return [
          'Book a visit with your doctor to review age-related metabolic changes.',
          'Ask whether strength activity, walking, or nutrition changes would be useful for you.',
          'Keep routine lab checks so changes can be followed over time.',
        ];
      default:
        return [
          'Book a visit with your doctor to review this screening result.',
          'Ask whether you need repeat labs or diagnostic testing.',
          'Start with small daily steps, such as regular walking, balanced meals, and better sleep.',
        ];
    }
  };

  // Helper for Section 2: Biomarker tagging
  const evaluateBiomarker = (name, value) => {
    if (!value || value <= 0) return null;
    let status = 'Normal';
    let colorClass = 'text-teal-600 bg-teal-50 border-teal-100';

    if (name === 'LDL') {
      if (value >= 130) {
        status = 'High';
        colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
      } else if (value >= 100) {
        status = 'Borderline';
        colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
      }
    } else if (name === 'Triglycerides') {
      if (value >= 200) {
        status = 'High';
        colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
      } else if (value >= 150) {
        status = 'Borderline';
        colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
      }
    } else if (name === 'HDL') {
      if (value < 50) {
        status = 'Low';
        colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
      }
    } else if (name === 'BMI') {
      if (value >= 30) {
        status = 'Obese';
        colorClass = 'text-rose-600 bg-rose-50 border-rose-100';
      } else if (value >= 25) {
        status = 'Elevated';
        colorClass = 'text-amber-600 bg-amber-50 border-amber-100';
      }
    }

    return { label: name, value, status, colorClass };
  };

  const overallRiskLevel = (overallRiskLevelRaw || 'unknown').toLowerCase();
  const screeningState = deriveScreeningState(overallRiskLevel, at_risk_probability);
  const colors = getRiskPresentation(screeningState);
  const profileClusterInfo = canRenderSubtypeProfile
    ? getClusterInfo(normalizedCluster)
    : getClusterInfo('');

  const actionSteps = getActionSteps(normalizedCluster, screeningState === 'atRisk');

  const isDoctorModel = typeof model_version === 'string' && model_version.length > 0;
  const probabilityText = Number.isFinite(at_risk_probability)
    ? `${Math.round(at_risk_probability * 100)}%`
    : 'Unavailable';

  // Compile Biomarker Snapshot features
  const biomarkerData = [
    evaluateBiomarker('LDL', ldl),
    evaluateBiomarker('Triglycerides', triglycerides),
    evaluateBiomarker('HDL', hdl),
    evaluateBiomarker('BMI', bmi),
    evaluateBiomarker('Age', age),
  ].filter(Boolean); // removes nulls if data is missing

  const renderLoading = () => (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : undefined}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : undefined}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="bg-white rounded-[32px] p-8 sm:p-12 text-center shadow-2xl">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 border-[6px] border-rose-100 border-t-rose-400 rounded-full animate-spin motion-reduce:animate-none" />
            <Heart
              size={36}
              className="absolute inset-0 m-auto text-rose-400 animate-pulse motion-reduce:animate-none"
            />
          </div>
          <h3 className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">
            Reviewing your health profile...
          </h3>
          <p className="text-slate-500 text-lg">
            Just a moment while we put together your personalized insights.
          </p>
        </div>
      </motion.div>
    </div>
  );

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (!result || isLoading) && renderLoading()}
      {isOpen && result && !isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={event => {
              if (!showContent) return;
              if (event.target === event.currentTarget) {
                onClose();
              }
            }}
          />

          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={modalTransition}
            className="relative z-10 w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden rounded-[32px] bg-slate-50 shadow-2xl"
          >
            {/* Header */}
            <div
              className={`bg-gradient-to-br ${colors.gradient} px-6 py-5 sm:p-8 text-white relative shrink-0`}
            >
              <motion.button
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }
                }
                whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                onClick={onClose}
                aria-label="Close results"
                className="absolute top-5 sm:top-6 right-5 sm:right-6 p-2 rounded-full bg-white/20 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white/10"
              >
                <X size={18} />
              </motion.button>

              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1 opacity-90">
                  <Sparkles size={16} />
                  <span className="text-sm font-medium tracking-wide">
                    {isDoctorModel ? 'Clinical Screening' : 'AI Analysis'}
                  </span>
                </div>
                <h2 className="text-[22px] sm:text-[32px] font-bold tracking-tight pr-10">
                  Assessment Result
                </h2>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8 w-full">
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
                    <p className="text-slate-500 font-medium text-lg">
                      Preparing your personalized insights...
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="content"
                    initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={contentTransition}
                    className="flex flex-col gap-6"
                  >
                    {/* Section 1: The Verdict (Clarity) */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`${colors.bg} ${colors.border} rounded-3xl p-6 sm:p-8 shadow-sm border`}
                    >
                      <div className="mb-4">
                        <span
                          className={`inline-flex items-center rounded-[10px] border px-3 py-1 text-[13px] font-bold uppercase tracking-wider ${colors.badge}`}
                        >
                          Screening result: {colors.statusLabel}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-3">
                        {hasAtRiskProbability ? (
                          <span
                            className={`text-[64px] leading-none font-bold tracking-tighter ${colors.text}`}
                          >
                            {probabilityText}
                          </span>
                        ) : (
                          <span className={`text-[48px] leading-none font-bold ${colors.text}`}>
                            {probabilityText}
                          </span>
                        )}
                        <span className="text-sm uppercase tracking-wider font-bold text-slate-500">
                          {colors.probabilityLabel}
                        </span>
                      </div>

                      <p className="text-slate-700 leading-relaxed font-medium text-[15px] pt-3 border-t border-slate-900/10">
                        {colors.advice}
                      </p>
                    </motion.div>

                    {/* Section 2: Biomarker Snapshot (Understanding) */}
                    {biomarkerData.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-100"
                      >
                        <h3 className="text-[19px] font-semibold text-slate-800 mb-4 flex items-center gap-2">
                          <Activity className="text-indigo-400" size={20} />
                          Your Biomarker Snapshot
                        </h3>
                        <p className="text-[15px] text-slate-600 mb-4">
                          Here are the key numbers we analyzed to generate your result:
                        </p>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {biomarkerData.map(marker => (
                            <li
                              key={marker.label}
                              className="bg-slate-50 p-3.5 rounded-2xl flex justify-between items-center border border-slate-100/50"
                            >
                              <span className="text-slate-700 font-medium">{marker.label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-900 font-bold">{marker.value}</span>
                                <span
                                  className={`text-[12px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${marker.colorClass}`}
                                >
                                  {marker.status}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}

                    {/* Section 3: Personal Profile Card (Reassurance) */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-100"
                    >
                      <h3 className="text-[19px] font-semibold text-slate-800 mb-5 flex items-center gap-2">
                        <Leaf className="text-teal-500" size={20} />
                        {canRenderSubtypeProfile
                          ? 'Your Personal Profile'
                          : 'Result Profile Summary'}
                      </h3>

                      <div className="flex flex-col sm:flex-row items-start gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100/50">
                        <motion.div
                          whileHover={shouldReduceMotion ? undefined : { scale: 1.1, rotate: 5 }}
                          transition={
                            shouldReduceMotion
                              ? { duration: 0 }
                              : { type: 'spring', stiffness: 300 }
                          }
                          className={`p-4 rounded-full ${profileClusterInfo.color} shrink-0 shadow-sm mx-auto sm:mx-0`}
                        >
                          {profileClusterInfo.icon}
                        </motion.div>
                        <div className="flex flex-col text-center sm:text-left">
                          {canRenderSubtypeProfile && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
                              className="mb-2"
                            >
                              <span className="text-[12px] font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                                Cluster: {normalizedCluster}
                              </span>
                            </motion.div>
                          )}
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4 }}
                            className="font-bold text-slate-800 text-[20px] mb-2 leading-tight"
                          >
                            {profileClusterInfo.fullName}
                          </motion.div>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.5 }}
                            className="text-slate-600 text-[16px] leading-relaxed"
                          >
                            {profileClusterInfo.desc}
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Validation Warnings (Optional Context) */}
                    {(warning || (validation_warnings && validation_warnings.length > 0)) && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50/50 rounded-3xl p-5 sm:p-6 border border-amber-200"
                      >
                        <h3 className="text-base font-semibold text-amber-800 mb-2 flex items-center gap-2">
                          <AlertCircle size={20} className="text-amber-500" />
                          Data Note
                        </h3>
                        <p className="text-[15px] text-amber-700 mb-3 leading-relaxed">
                          Some of your values are slightly outside the typical range our AI has seen
                          before. Please discuss these with your doctor:
                        </p>
                        <ul className="space-y-2">
                          {validation_warnings &&
                            validation_warnings.map(warn => (
                              <li
                                key={warn}
                                className="flex items-start gap-2 text-[14px] text-amber-800 bg-white/70 p-3 rounded-xl border border-amber-100/50"
                              >
                                <AlertCircle
                                  size={16}
                                  className="text-amber-500 mt-0.5 shrink-0"
                                  aria-hidden="true"
                                />
                                <span>{warn}</span>
                              </li>
                            ))}
                        </ul>
                      </motion.div>
                    )}

                    {/* Section 4: Actionable Next Steps (Action) */}
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-100"
                    >
                      <h3 className="text-[19px] font-semibold text-slate-800 mb-5 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-indigo-500" />
                        Actionable Next Steps
                      </h3>
                      <ul className="space-y-4">
                        {actionSteps.map(step => (
                          <li
                            key={step}
                            className="flex gap-4 items-start text-slate-700 text-[16px] leading-relaxed"
                          >
                            <div className="mt-1 bg-indigo-50 text-indigo-500 p-1.5 rounded-full shrink-0">
                              <CheckCircle size={18} />
                            </div>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>

                    {/* Screening Caution (Footer Context) */}
                    <div className="bg-slate-100/70 border border-slate-200/50 rounded-2xl p-4 sm:p-5 mb-4">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">
                        Important Caution
                      </h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                        This is a screening result, not a diagnosis. Use it as a guide for a
                        conversation with your doctor or clinic.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons Footer - Pinned to bottom, independent of scroll */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 260, damping: 24 }
              }
              className="shrink-0 border-t border-slate-200/70 bg-white/95 px-5 sm:px-8 py-4 backdrop-blur-md rounded-b-[32px] pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            >
              <div className="flex items-center gap-3 w-full">
                <motion.button
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onClose}
                  className="px-5 py-3.5 text-slate-500 font-semibold text-[15px] rounded-xl hover:bg-slate-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Close
                </motion.button>
                <motion.button
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onConfirm}
                  className="flex-1 py-3.5 bg-slate-800 text-white font-semibold text-[15px] rounded-xl shadow-lg shadow-slate-800/10 hover:bg-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  Save My Results
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default MLResultModal;
