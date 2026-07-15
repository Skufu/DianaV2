import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { BookOpen, Activity, HelpCircle, Lightbulb, Target, ChevronDown, AlertCircle } from 'lucide-react';

import { clusterEducation } from './clusterData';
import { useReducedMotion } from '../../utils/animations';

const biomarkerReference = [
  {
    name: 'Body Mass Index (BMI)',
    unit: 'kg/m²',
    lowerRisk: '< 23.0',
    watch: '23.0 - 24.9',
    attention: '≥ 25.0',
    description:
      'A measure of whether your weight is healthy for your height. Higher BMI increases diabetes risk, especially if you carry extra weight around your middle.',
  },
  {
    name: 'Waist Circumference',
    unit: 'cm',
    lowerRisk: '< 80',
    watch: '80 - 87',
    attention: '≥ 88',
    description:
      'How much belly fat you carry. Belly fat is more concerning than fat elsewhere because it affects how your body processes sugar and fats.',
  },
  {
    name: 'Triglycerides',
    unit: 'mg/dL',
    lowerRisk: '< 150',
    watch: '150 - 199',
    attention: '≥ 200',
    description:
      'A type of fat in your blood. High levels are linked to insulin resistance and heart disease. Eating less sugar and refined carbs can help lower them.',
  },
  {
    name: 'HDL Cholesterol',
    unit: 'mg/dL',
    lowerRisk: '≥ 50',
    watch: '40 - 49',
    attention: '< 40',
    description:
      'Your "good" cholesterol—it helps protect your heart. Higher is better. Exercise and healthy fats (like olive oil and fish) can raise HDL.',
  },
  {
    name: 'LDL Cholesterol',
    unit: 'mg/dL',
    lowerRisk: '< 100',
    watch: '100 - 159',
    attention: '≥ 160',
    description:
      'Your "bad" cholesterol—too much can clog arteries. Lower is better. Diet changes and medication can help bring it down.',
  },
];

const faqData = [
  {
    question: 'What do the screening patterns mean for me?',
    answer:
      'Each pattern points to the health factors that may matter most in your result. Insulin Resistant means your body may not be using insulin as well as expected. Cholesterol-Focused means your cholesterol numbers deserve attention. Weight-Related means weight and waist changes may be important. Mild Pattern means no single factor stands out strongly. These are screening patterns, not diagnoses, and your doctor can help decide what they mean for your care.',
  },
  {
    question: 'How reliable is this assessment?',
    answer:
      'DIANA was built from health survey data and tested across different time periods, but no screening tool is perfect. It is meant to highlight possible risk patterns early, not confirm diabetes. Use your result as one piece of information and discuss it with your doctor, especially if the result says you may be at risk.',
  },
  {
    question: 'Can my pattern change over time?',
    answer:
      "Yes! Your pattern can shift as your health changes. If you lose weight, start exercising, or make other lifestyle changes, your metabolic profile may improve. That's actually good news—it means your actions matter. We recommend reassessing regularly to see how you're doing.",
  },
  {
    question: 'Why does the main screening model avoid blood sugar tests?',
    answer:
      "HbA1c and fasting blood sugar tests are used to check for prediabetes or diabetes. DIANA's main screening model avoids using them as inputs because those tests help define the label it is trying to flag. Instead, it looks at related warning signs like weight, waist size, cholesterol, blood fats, and lifestyle. If DIANA flags you as at risk, your doctor may still order blood sugar testing to confirm what is happening.",
  },
  {
    question: 'Why focus on menopause?',
    answer:
      'Menopause changes your body in ways that affect diabetes risk. Hormonal shifts can lead to more belly fat, changes in cholesterol, and harder time managing weight. DIANA was specifically designed for women going through these changes, so it understands your unique situation and can give you more relevant guidance.',
  },
];

const tabs = [
  { id: 'patterns', label: 'Health Patterns', icon: Target },
  { id: 'measurements', label: 'Measurements', icon: Activity },
  { id: 'score', label: 'Your Score', icon: Lightbulb },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

const springTransition = { type: 'spring', stiffness: 400, damping: 30 };
const softSpring = { type: 'spring', stiffness: 300, damping: 24 };

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: softSpring },
};

const FaqItem = ({ faq, isReduced }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-100 last:border-0">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-gray-50/50 transition-colors"
        whileHover={isReduced ? {} : { backgroundColor: 'rgba(249, 250, 251, 0.5)' }}
        whileTap={isReduced ? {} : { scale: 0.995 }}
      >
        <span className="font-bold text-diana-text-primary pr-4">{faq.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={springTransition}
          className="text-gray-400 flex-shrink-0"
          aria-hidden="true"
        >
          <ChevronDown size={20} />
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ...softSpring, opacity: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-5 md:pb-6">
              <p className="text-gray-600 text-base leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Education = () => {
  const isReduced = useReducedMotion();
  const [activeTab, setActiveTab] = useState('patterns');
  const [activeCluster, setActiveCluster] = useState('SIRD');

  const motionProps = props => (isReduced ? {} : props);

  return (
    <div className="space-y-6 pb-6">
      <motion.header
        initial={motionProps({ opacity: 0, y: -10 })}
        animate={{ opacity: 1, y: 0 }}
        transition={softSpring}
      >
        <h4 className="text-diana-text-muted font-semibold text-sm mb-1 uppercase tracking-wider">
          Learn More
        </h4>
        <h2 className="text-3xl font-bold text-diana-text-primary">Your Health Guide</h2>
        <p className="text-diana-text-secondary text-base mt-1">
          Understanding your results and what you can do about them
        </p>
      </motion.header>

      <motion.div
        initial={motionProps({ opacity: 0, y: 10 })}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...softSpring, delay: 0.1 }}
        className="bg-gradient-to-r from-diana-forest to-diana-forest-light p-5 rounded-2xl text-white shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <motion.div
            whileHover={motionProps({ scale: 1.05, rotate: 3 })}
            transition={springTransition}
            className="bg-white/20 p-2.5 rounded-xl flex-shrink-0 self-start md:self-center"
          >
            <BookOpen size={24} className="text-white" />
          </motion.div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">How It Works</h3>
            <p className="text-blue-50 text-sm leading-relaxed">
              <strong>Step 1:</strong> We check your overall diabetes risk based on your health
              measurements.
              <strong> Step 2:</strong> If you&apos;re at higher risk, we show which health pattern
              may fit you best, so you and your doctor have clearer focus areas to review.
            </p>
          </div>
        </div>
      </motion.div>

      <LayoutGroup>
        <motion.div
          layout
          className="flex gap-2 flex-wrap"
          initial={motionProps({ opacity: 0, y: 8 })}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...softSpring, delay: 0.15 }}
        >
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                layout
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'text-white'
                    : 'text-diana-text-secondary hover:text-diana-text-primary'
                }`}
                whileHover={motionProps({ scale: 1.03 })}
                whileTap={motionProps({ scale: 0.97 })}
                transition={springTransition}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabBg"
                    className="absolute inset-0 bg-diana-forest rounded-xl shadow-md"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={16} />
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'patterns' && (
            <motion.div
              key="patterns"
              initial={motionProps({ opacity: 0, y: 14 })}
              animate={{ opacity: 1, y: 0 }}
              exit={motionProps({ opacity: 0, y: -8 })}
              transition={softSpring}
            >
              <div className="mb-6 p-4 bg-amber-50/70 border-l-4 border-amber-500 rounded-r-xl flex items-start gap-3 shadow-sm text-left">
                <AlertCircle className="h-6 w-6 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
                    Clinical Disclaimer: Subgroup Proxies
                  </h4>
                  <p className="text-sm font-medium text-amber-950 leading-relaxed">
                    DIANA's subgroup categories (SIRD, SIDD, MOD, MARD) represent dominant metabolic patterns in lipids, body size, and age, serving as screening proxies. They are <strong>not</strong> mechanistic diabetes subtypes or diagnostic categories. Unlike clinical research studies (e.g., Ahlqvist et al., 2018), DIANA operates without GAD antibodies, C-peptide, or HOMA insulin-function markers. Always review results with a physician.
                  </p>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row gap-5 items-start">
                <motion.div
                  variants={isReduced ? {} : stagger}
                  initial="hidden"
                  animate="visible"
                  className="w-full lg:w-[32%] flex flex-col gap-3"
                >
                  {Object.entries(clusterEducation).map(([key, cluster]) => (
                    <motion.button
                      key={key}
                      variants={isReduced ? {} : fadeUp}
                      whileHover={motionProps({ scale: activeCluster === key ? 1 : 1.02, y: -2 })}
                      whileTap={motionProps({ scale: 0.98 })}
                      onClick={() => setActiveCluster(key)}
                      className={`relative flex flex-col text-left p-3 md:p-4 rounded-2xl border transition-colors ${
                        activeCluster === key
                          ? 'border-diana-forest bg-white shadow-sm ring-1 ring-diana-forest/20'
                          : 'border-diana-sand bg-gray-50/50 hover:bg-white hover:border-gray-300'
                      }`}
                      transition={springTransition}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <img
                          src={cluster.logo}
                          alt={`${key} logo`}
                          className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-sm bg-white flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                          <h4
                            className={`font-bold text-lg md:text-xl ${activeCluster === key ? 'text-diana-forest' : 'text-diana-text-primary'}`}
                          >
                            {key}
                          </h4>
                          <p className="text-xs font-medium text-diana-text-secondary line-clamp-2 leading-tight mt-0.5">
                            {cluster.name}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>

                <div className="w-full lg:w-[68%]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCluster}
                      initial={motionProps({ opacity: 0, scale: 0.97, x: 10 })}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={motionProps({ opacity: 0, scale: 0.97, x: -10 })}
                      transition={softSpring}
                      className={`bg-white rounded-2xl border-2 ${clusterEducation[activeCluster].borderColor} overflow-hidden shadow-sm`}
                    >
                      <div
                        className={`p-5 md:p-6 ${clusterEducation[activeCluster].bgColor} border-b border-gray-100/50`}
                      >
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                          <motion.img
                            initial={motionProps({ scale: 0.7, rotate: -15, opacity: 0 })}
                            animate={{ scale: 1, rotate: 0, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.1 }}
                            src={clusterEducation[activeCluster].logo}
                            alt={`${activeCluster} logo`}
                            className="w-16 h-16 rounded-xl object-cover shadow-sm bg-white hidden sm:block border border-white"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <motion.h3
                                initial={motionProps({ opacity: 0, x: -8 })}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ ...softSpring, delay: 0.05 }}
                                className="text-2xl font-bold text-diana-text-primary"
                              >
                                {activeCluster}
                              </motion.h3>
                              <motion.span
                                initial={motionProps({ opacity: 0, scale: 0.8 })}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ ...springTransition, delay: 0.1 }}
                                className={`px-3 py-1 rounded-full text-xs font-bold border bg-white ${clusterEducation[activeCluster].borderColor} text-gray-800 shadow-sm`}
                              >
                                {clusterEducation[activeCluster].name}
                              </motion.span>
                            </div>
                            <motion.p
                              initial={motionProps({ opacity: 0 })}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.15 }}
                              className="text-sm text-diana-text-secondary font-medium leading-relaxed"
                            >
                              {clusterEducation[activeCluster].shortDesc}
                            </motion.p>
                          </div>
                        </div>
                      </div>

                      <motion.div
                        variants={isReduced ? {} : stagger}
                        initial="hidden"
                        animate="visible"
                        className="p-5 md:p-6 space-y-6"
                      >
                        <motion.p
                          variants={isReduced ? {} : fadeUp}
                          className="text-diana-text-primary text-base leading-relaxed"
                        >
                          {clusterEducation[activeCluster].fullDesc}
                        </motion.p>

                        <motion.div
                          variants={isReduced ? {} : fadeUp}
                          className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                          <div>
                            <h5 className="text-xs font-bold text-diana-text-muted uppercase tracking-wider mb-3">
                              What This Means
                            </h5>
                            <motion.ul
                              variants={isReduced ? {} : stagger}
                              initial="hidden"
                              animate="visible"
                              className="space-y-2"
                            >
                              {clusterEducation[activeCluster].riskFactors.map(factor => (
                                <motion.li
                                  key={factor}
                                  variants={isReduced ? {} : fadeUp}
                                  className="text-sm text-diana-text-secondary flex items-start gap-2"
                                >
                                  <span className="text-diana-forest mt-0.5 min-w-[10px] text-base">
                                    •
                                  </span>
                                  <span className="leading-relaxed">{factor}</span>
                                </motion.li>
                              ))}
                            </motion.ul>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-diana-text-muted uppercase tracking-wider mb-3">
                              Actionable Steps
                            </h5>
                            <motion.ul
                              variants={isReduced ? {} : stagger}
                              initial="hidden"
                              animate="visible"
                              className="space-y-2"
                            >
                              {clusterEducation[activeCluster].recommendations.map(rec => (
                                <motion.li
                                  key={rec}
                                  variants={isReduced ? {} : fadeUp}
                                  className="text-sm text-diana-text-secondary flex items-start gap-2"
                                >
                                  <span className="text-green-500 mt-0 font-bold text-base">✓</span>
                                  <span className="leading-relaxed">{rec}</span>
                                </motion.li>
                              ))}
                            </motion.ul>
                          </div>
                        </motion.div>

                        <motion.div
                          variants={isReduced ? {} : fadeUp}
                          className={`p-4 md:p-5 rounded-xl ${clusterEducation[activeCluster].bgColor} ${clusterEducation[activeCluster].borderColor} border`}
                        >
                          <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span style={{ color: clusterEducation[activeCluster].color }}>●</span>
                            Key Focus Areas
                          </h5>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
                            {clusterEducation[activeCluster].clinicalImplications.map(imp => (
                              <motion.li
                                key={imp}
                                variants={isReduced ? {} : fadeUp}
                                className="text-sm text-gray-700 flex items-start gap-2"
                              >
                                <span
                                  className="mt-0.5 text-base"
                                  style={{ color: clusterEducation[activeCluster].color }}
                                >
                                  •
                                </span>
                                <span className="leading-relaxed">{imp}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'measurements' && (
            <motion.div
              key="measurements"
              initial={motionProps({ opacity: 0, y: 14 })}
              animate={{ opacity: 1, y: 0 }}
              exit={motionProps({ opacity: 0, y: -8 })}
              transition={softSpring}
              className="bg-white rounded-2xl border border-diana-sand shadow-sm overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-diana-text-primary">
                  Health Measurements Guide
                </h3>
                <p className="text-sm text-diana-text-secondary mt-1">
                  Understanding the key numbers in your health assessment
                </p>
              </div>
              <div className="p-5 md:p-6">
                <motion.div
                  variants={isReduced ? {} : stagger}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4 md:hidden"
                >
                  {biomarkerReference.map(bio => (
                    <motion.div
                      key={bio.name}
                      variants={isReduced ? {} : fadeUp}
                      whileHover={motionProps({ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' })}
                      className="rounded-xl border border-diana-sand/80 bg-white/80 p-4 shadow-sm"
                    >
                      <div className="font-bold text-base text-diana-text-primary">
                        {bio.name}
                        {bio.unit && (
                          <span className="text-xs font-medium text-diana-text-muted">
                            {' '}
                            ({bio.unit})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-diana-text-secondary leading-relaxed mt-1">
                        {bio.description}
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between rounded-lg bg-green-50/70 px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                            Lower risk
                          </span>
                          <span className="text-sm font-bold text-green-700">{bio.lowerRisk}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-amber-50/70 px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            Watch
                          </span>
                          <span className="text-sm font-bold text-amber-700">{bio.watch}</span>
                        </div>
                        <div className="flex items-center justify-between rounded-lg bg-red-50/70 px-3 py-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                            Review
                          </span>
                          <span className="text-sm font-bold text-red-700">{bio.attention}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-diana-sand">
                        <th className="text-left py-4 text-diana-text-secondary font-bold uppercase tracking-wider text-xs">
                          Measurement
                        </th>
                        <th className="text-center py-4 text-green-700 font-bold whitespace-nowrap text-xs">
                          Lower-Risk Range
                        </th>
                        <th className="text-center py-4 text-amber-700 font-bold whitespace-nowrap text-xs">
                          Watch Zone
                        </th>
                        <th className="text-center py-4 text-red-700 font-bold whitespace-nowrap text-xs">
                          Needs Attention
                        </th>
                      </tr>
                    </thead>
                    <motion.tbody
                      variants={isReduced ? {} : stagger}
                      initial="hidden"
                      animate="visible"
                    >
                      {biomarkerReference.map(bio => (
                        <motion.tr
                          key={bio.name}
                          variants={isReduced ? {} : fadeUp}
                          className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-4 pr-4">
                            <div className="font-bold text-base text-diana-text-primary mb-1">
                              {bio.name}
                              {bio.unit && (
                                <span className="text-xs font-medium text-diana-text-muted">
                                  {' '}
                                  ({bio.unit})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-diana-text-secondary leading-relaxed max-w-lg">
                              {bio.description}
                            </div>
                          </td>
                          <td className="text-center py-4 text-green-700 font-semibold text-base">
                            {bio.lowerRisk}
                          </td>
                          <td className="text-center py-4 text-amber-700 font-semibold text-base">
                            {bio.watch}
                          </td>
                          <td className="text-center py-4 text-red-700 font-semibold text-base">
                            {bio.attention}
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-diana-text-muted">
                  These ranges are screening reference points, not a diagnosis. Your own target
                  numbers may differ based on your medical history and your doctor&apos;s advice.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'score' && (
            <motion.div
              key="score"
              initial={motionProps({ opacity: 0, y: 14 })}
              animate={{ opacity: 1, y: 0 }}
              exit={motionProps({ opacity: 0, y: -8 })}
              transition={softSpring}
              className="bg-white rounded-2xl border border-diana-sand shadow-sm overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-diana-text-primary">
                  Understanding Your Risk Score
                </h3>
                <p className="text-sm text-diana-text-secondary mt-1">
                  What your number means and what to do next
                </p>
              </div>
              <motion.div
                variants={isReduced ? {} : stagger}
                initial="hidden"
                animate="visible"
                className="p-5 md:p-6 space-y-6"
              >
                <motion.p
                  variants={isReduced ? {} : fadeUp}
                  className="text-diana-text-primary text-base leading-loose"
                >
                  Your score shows how strongly your measurements match DIANA&apos;s at-risk
                  screening pattern. It is not a diagnosis and it does not confirm that you will
                  develop Type 2 Diabetes. It is a signal to help you and your doctor decide whether
                  follow-up testing or lifestyle support makes sense.
                </motion.p>
                <motion.p
                  variants={isReduced ? {} : fadeUp}
                  className="text-diana-text-secondary text-base leading-relaxed"
                >
                  The main screening model uses weight, waist size, cholesterol, blood fats, and
                  lifestyle factors. It avoids HbA1c and fasting blood sugar as inputs so it is not
                  simply repeating the same tests used to check for prediabetes or diabetes.
                </motion.p>

                <motion.div
                  variants={isReduced ? {} : fadeUp}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  <motion.div
                    whileHover={motionProps({ y: -4, scale: 1.01 })}
                    transition={springTransition}
                    className="p-6 rounded-xl bg-green-50 border border-green-200 text-center shadow-sm"
                  >
                    <div className="text-3xl font-bold text-green-600">Below 46.5%</div>
                    <div className="text-base font-bold text-diana-text-primary mt-2">
                      Not at risk
                    </div>
                    <div className="text-sm text-diana-text-muted mt-3">
                      Your result is below DIANA&apos;s follow-up threshold. Keep up regular
                      checkups.
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={motionProps({ y: -4, scale: 1.01 })}
                    transition={springTransition}
                    className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center shadow-sm"
                  >
                    <div className="text-3xl font-bold text-amber-600">46.5% or Higher</div>
                    <div className="text-base font-bold text-diana-text-primary mt-2">At risk</div>
                    <div className="text-sm text-diana-text-muted mt-3">
                      Schedule a doctor visit soon to review your result and possible follow-up
                      tests.
                    </div>
                  </motion.div>
                </motion.div>

                <motion.div
                  variants={isReduced ? {} : fadeUp}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4"
                >
                  <p className="text-sm text-blue-800 leading-relaxed">
                    <strong>Remember:</strong> An &quot;At risk&quot; result does not mean you have
                    diabetes. It means your measurements look similar to people DIANA flags for
                    follow-up review. Catching this early can help you ask better questions. Your
                    doctor can help you figure out next steps.
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'faq' && (
            <motion.div
              key="faq"
              initial={motionProps({ opacity: 0, y: 14 })}
              animate={{ opacity: 1, y: 0 }}
              exit={motionProps({ opacity: 0, y: -8 })}
              transition={softSpring}
              className="bg-white rounded-2xl border border-diana-sand shadow-sm overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-diana-text-primary">
                  Frequently Asked Questions
                </h3>
                <p className="text-sm text-diana-text-secondary mt-1">
                  Common questions about your results
                </p>
              </div>
              {faqData.map(faq => (
                <FaqItem key={faq.question} faq={faq} isReduced={isReduced} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </div>
  );
};

export default Education;
