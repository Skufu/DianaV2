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
    validation_status = '',
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

  // Section 1: The Verdict - Color Coding
  const getRiskColor = (level, prob) => {
    const normalizedLevel = level?.toLowerCase() || 'unknown';
    // Let's also use the probability or predicted status for a more accurate color fallback
    const isAtRisk =
      predicted_status.toLowerCase().includes('at-risk') ||
      (prob && prob > 0.5) ||
      normalizedLevel === 'high';

    if (!isAtRisk && (normalizedLevel === 'low' || normalizedLevel === 'normal')) {
      return {
        bg: 'bg-teal-50',
        border: 'border-teal-100',
        text: 'text-teal-700',
        badge: 'bg-teal-100 text-teal-800',
        icon: 'text-teal-500',
        gradient: 'from-teal-400 to-emerald-500',
        title: 'Looking Good',
        advice:
          'Your screening indicates a normal risk profile right now. Keep up the wonderful work with your healthy habits!',
      };
    }

    return {
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-800',
      icon: 'text-amber-500',
      gradient: 'from-amber-400 to-orange-500',
      title: 'Action Recommended',
      advice:
        "Your profile shows some elevated risk factors. Don't worry, but please do schedule a visit with your doctor soon to discuss these results.",
    };
  };

  // Section 3: Personal Profile Translations
  const getClusterInfo = clusterName => {
    const NEUTRAL_CLUSTER = {
      fullName: 'Metabolic Profile Unavailable',
      desc: "We couldn't determine a specific profile pattern from these results. This just means your values don't perfectly match our standard categories, which is completely okay. Please share these numbers with your doctor.",
      color: 'bg-slate-100 text-slate-700',
      icon: <Activity className="text-slate-500" size={24} />,
    };

    // Empathetic translations for women 45+
    const clusters = {
      SIDD: {
        fullName: 'Atherogenic / Lipid-Driven Profile',
        desc: 'Your results outline a lipid-driven profile. This beautifully unique body of yours is currently processing cholesterol and blood fats in a way that needs a little extra attention from your doctor, rather than focusing purely on weight.',
        color: 'bg-rose-100 text-rose-800',
        icon: <Droplets className="text-rose-600" size={24} />,
      },
      SIRD: {
        fullName: 'Insulin Resistance Profile',
        desc: 'Your results show that your body is currently working harder than usual to process sugars. Please know this is incredibly common, especially during hormonal transitions, and it usually responds wonderfully to simple lifestyle changes.',
        color: 'bg-orange-100 text-orange-800',
        icon: <Flame className="text-orange-600" size={24} />,
      },
      MOD: {
        fullName: 'Weight Harmony Profile',
        desc: 'Your profile suggests that your lovely metabolism is closely linked to your current weight. Finding a balanced, sustainable routine that feels good for your body could be the key to supporting your long-term health.',
        color: 'bg-blue-100 text-blue-800',
        icon: <Leaf className="text-blue-600" size={24} />,
      },
      MARD: {
        fullName: 'Age-Related Changes',
        desc: 'Your results reflect natural metabolic shifts as you mature. It is completely normal for our bodies to change equations over time! Staying reasonably active and eating vibrantly is your best path forward.',
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
  const getActionSteps = (clusterCode, riskLevel) => {
    // Regardless of cluster, if risk is normal/low, advice is positive maintenance
    const isAtRisk =
      predicted_status.toLowerCase().includes('at-risk') ||
      (at_risk_probability && at_risk_probability > 0.5) ||
      riskLevel === 'high';

    if (!isAtRisk) {
      return [
        'Keep up the wonderful work! Your current routine is serving your body beautifully.',
        'Stay reasonably active. Dancing, walking, or gardening are joyful ways to keep moving.',
        'See your doctor for routine wellness visits just to keep everything wonderfully on track.',
      ];
    }

    switch (clusterCode) {
      case 'SIDD':
        return [
          'Book a chat with your doctor to discuss your cholesterol and lipid levels.',
          'Focus on heart-healthy fats, like olive oil, avocados, and omega-3s (like salmon).',
          'Be kind to yourself. Stress affects our hearts too, so take deep breaths and gentle steps forward!',
        ];
      case 'SIRD':
        return [
          'Book a chat with your doctor to discuss strategies for insulin resistance.',
          'Focus on complex carbs (like whole grains and veggies) to help your body process energy smoothly.',
          'Try a gentle 10-minute walk after meals—it works wonders for balancing blood sugar!',
        ];
      case 'MOD':
        return [
          'Book a chat with your doctor to explore holistic, gentle approaches to metabolic balance.',
          'Focus on sustainable, nourishing meals rather than restrictive diets.',
          'Find joyful ways to move your body that celebrate what it can do!',
        ];
      case 'MARD':
        return [
          'Book a chat with your doctor to review these age-related metabolic changes.',
          'Focus on maintaining muscle mass—gentle strength exercises or yoga are fantastic.',
          'Prioritize vibrant, nutrient-dense foods to support your general vitality safely.',
        ];
      default:
        return [
          'Book a chat with your doctor to review these insights together safely.',
          'Ask about routine wellness testing to get a fuller picture of your health.',
          'Take simple, daily steps like staying hydrated and getting restful sleep.',
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

  const colors = getRiskColor(overallRiskLevel, at_risk_probability);
  const profileClusterInfo = canRenderSubtypeProfile
    ? getClusterInfo(normalizedCluster)
    : getClusterInfo('');

  const actionSteps = getActionSteps(normalizedCluster, overallRiskLevel);

  const isDoctorModel = typeof model_version === 'string' && model_version.length > 0;
  const modelLabelMap = {
    binary_v2_no_bp: 'Screening Model — Binary at‑Risk',
    clinical: 'Screening Model — Binary at‑Risk',
  };
  const modelLabel = modelLabelMap[model_version] || 'Screening Model — Binary at‑Risk';

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
        <div className="bg-white rounded-[32px] p-12 text-center shadow-2xl">
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
              className={`bg-gradient-to-br ${colors.gradient} p-8 text-white relative shrink-0`}
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
                className="absolute top-6 right-6 p-2.5 rounded-full bg-white/20 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white/10"
              >
                <X size={20} />
              </motion.button>

              <div className="flex items-center gap-3 mb-2 opacity-90">
                <Sparkles size={24} />
                <span className="text-sm font-semibold uppercase tracking-widest leading-none mt-1">
                  AI-Assisted Results
                </span>
              </div>
              <h2 className="text-[34px] font-medium tracking-tight mb-2 leading-tight">
                Metabolic Risk Assessment
              </h2>
              {isDoctorModel && (
                <div className="text-sm text-white/80 font-medium">
                  <span className="uppercase tracking-wide opacity-80">Model:</span> {modelLabel}
                </div>
              )}
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-8 w-full">
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
                      className={`${colors.bg} rounded-3xl p-6 sm:p-7 shadow-sm border ${colors.border}`}
                    >
                      {hasPredictedStatus && (
                        <div className="mb-3">
                          <span className="inline-block px-4 py-1.5 rounded-full bg-slate-800 text-white text-[15px] font-semibold tracking-wide">
                            Predicted Status: {predicted_status}
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-3 mb-4 flex-wrap">
                        <span className="text-lg font-medium text-slate-700">
                          Risk Probability:
                        </span>
                        {hasAtRiskProbability ? (
                          <span
                            className={`text-[56px] leading-[1.1] font-light tracking-tighter ${colors.text}`}
                          >
                            {probabilityText}
                          </span>
                        ) : (
                          <span className={`text-[36px] leading-[1.1] font-light ${colors.text}`}>
                            {probabilityText}
                          </span>
                        )}
                      </div>

                      <div className="bg-white/80 rounded-2xl p-5 shadow-sm border border-white">
                        <p className="text-slate-700 leading-relaxed font-medium text-[16px]">
                          {colors.advice}
                        </p>
                      </div>
                    </motion.div>

                    {/* Section 2: Biomarker Snapshot (Understanding) */}
                    {biomarkerData.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100"
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
                      className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100"
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
                            {canRenderSubtypeProfile
                              ? profileClusterInfo.fullName
                              : 'Subtype information unavailable'}
                          </motion.div>
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.5 }}
                            className="text-slate-600 text-[16px] leading-relaxed"
                          >
                            {canRenderSubtypeProfile
                              ? profileClusterInfo.desc
                              : 'This assessment result does not include subtype/cluster output. We are showing a neutral summary without subtype-specific interpretation.'}
                          </motion.p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Validation Warnings (Optional Context) */}
                    {(warning || (validation_warnings && validation_warnings.length > 0)) && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-amber-50/50 rounded-3xl p-6 border border-amber-200"
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
                                <span className="text-amber-500 mt-0.5">⚠️</span>
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
                      className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-100"
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

                    {/* Clinical Guardrails (Footer Context) */}
                    <div className="bg-slate-100/70 border border-slate-200/50 rounded-2xl p-5 mb-4">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">
                        Clinical Guardrails
                      </h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed font-medium">
                        AI-assisted screening support — not a diagnosis. Use with clinical context.
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
              className="shrink-0 border-t border-slate-200/70 bg-white/95 px-6 sm:px-8 py-5 backdrop-blur-md rounded-b-[32px] pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <motion.button
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onClose}
                  className="w-full py-3.5 text-slate-500 font-semibold text-[16px] rounded-xl hover:bg-slate-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
                >
                  Close
                </motion.button>
                <motion.button
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onConfirm}
                  className="w-full py-3.5 bg-slate-800 text-white font-semibold text-[16px] rounded-xl shadow-lg shadow-slate-800/10 hover:bg-slate-700 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2"
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
