// Education: comprehensive educational content about diabetes clusters and risk assessment
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, slideUp } from '../../utils/animations';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Heart,
  Activity,
  AlertTriangle,
  Info,
  HelpCircle,
  Lightbulb,
  Target,
} from 'lucide-react';

// Import cluster logos
import SIDDLogo from '../../assets/clusters/sidd.png';
import SIRDLogo from '../../assets/clusters/sird.png';
import MODLogo from '../../assets/clusters/mod.png';
import MARDLogo from '../../assets/clusters/mard.png';

// Comprehensive cluster education data - using light mode compatible colors
// Note: These are pattern-based classifications translated into user-friendly language
export const clusterEducation = {
  SIDD: {
    name: 'High-Cholesterol / Lipid-Driven Profile',
    shortDesc: 'Driven by high cholesterol, requiring focused heart health management (SIDD-like).',
    color: '#DC2626', // red-600
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    logo: SIDDLogo,
    fullDesc: `This profile is characterized by cholesterol imbalances, such as elevated LDL (bad) cholesterol. 
    Rather than classic insulin issues, this subtype is driven more by lipid levels in the blood. 
    Women in this group often benefit most from cardiovascular check-ups and cholesterol-lowering strategies. 
    Note: This is a pattern-based classification to help guide your care, not a finalized diagnostic label.`,
    riskFactors: [
      'Elevated LDL (bad) cholesterol',
      'Imbalances in blood lipids',
      'Challenges with blood sugar control',
      'Cardiovascular risk factors (like blood pressure)',
      'Higher average blood sugar (HbA1c)',
    ],
    recommendations: [
      'Cardiovascular health assessment',
      'Regular blood sugar monitoring',
      'Routine eye and kidney check-ups',
      'Cholesterol management discussion with your doctor',
      'Heart-healthy nutritional counseling',
    ],
    clinicalImplications: [
      'Greater focus needed on heart health',
      'May benefit from cholesterol-lowering discussions',
      'Regular preventive screenings are highly recommended',
      'Comprehensive metabolic monitoring is helpful',
    ],
  },
  SIRD: {
    name: 'High Insulin-Resistant Profile',
    shortDesc: 'Characterized by high insulin resistance, focusing on kidney and liver health (SIRD-like).',
    color: '#D97706', // amber-600
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    logo: SIRDLogo,
    fullDesc: `This profile features significant insulin resistance—meaning your body produces insulin, but your cells don't respond to it effectively. 
    This pattern is strongly tied to metabolic changes and places an extra focus on protecting your kidney and liver health. 
    Recognizing this early gives you a great head start on preventive care.`,
    riskFactors: [
      'High insulin resistance',
      'Elevated triglycerides (blood fats)',
      'Higher body weight or BMI',
      'Metabolic syndrome indicators',
      'Family history of diabetes',
    ],
    recommendations: [
      'Gentle weight management and lifestyle shifts',
      'Discussing medications that improve insulin sensitivity',
      'Routine kidney health check-ups',
      'Liver health screenings',
      'Heart health assessments',
    ],
    clinicalImplications: [
      'Extra care needed for kidney health',
      'Focus on preventing fatty liver changes',
      'Treatments tailored to boost insulin response work well',
      'Early monitoring of kidney function is key',
    ],
  },
  MOD: {
    name: 'Weight-Related / High BMI Profile',
    shortDesc: 'Primarily driven by excess weight, with a stable metabolism that responds well to lifestyle changes (MOD-like).',
    color: '#2563EB', // blue-600
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    logo: MODLogo,
    fullDesc: `This profile is primarily associated with carrying extra body weight. The good news is that women in this 
    cluster often maintain a relatively stable metabolic function early on. This means weight management is your most 
    powerful tool, and many individuals see fantastic improvements simply through lifestyle and dietary changes.`,
    riskFactors: [
      'Higher BMI (Body Mass Index)',
      'Carrying extra weight, especially around the middle',
      'Lower levels of daily physical activity',
      'Dietary habits that may need adjustment',
      'Gradual weight gain over time',
    ],
    recommendations: [
      'Structured, achievable weight management goals',
      'Adding regular, enjoyable physical activity to your week',
      'Balanced, sustainable nutritional adjustments',
      'Discussing weight-management support with your doctor',
      'Behavioral counseling to build lasting habits',
    ],
    clinicalImplications: [
      'Responds remarkably well to lifestyle changes',
      'Weight loss directly improves blood sugar control',
      'Considerably lower risk of complications with weight management',
      'High potential for reversing risk trends',
    ],
  },
  MARD: {
    name: 'Age-Related Profile',
    shortDesc: 'Typically develops later in life with more gradual, modest changes to your metabolism (MARD-like).',
    color: '#16A34A', // green-600
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    logo: MARDLogo,
    fullDesc: `This profile relates to gradual, natural shifts in metabolism that occur as we get older. 
    The changes here are typically modest, progressing much more slowly than other profiles. 
    Because of this steadier pace, standard foundational health approaches are usually highly effective, 
    making this a very manageable pattern.`,
    riskFactors: [
      'Older age (typically past 60)',
      'Very gradual, subtle onset of changes',
      'Modest elevations in blood sugar',
      'Natural, age-related metabolic shifts',
      'Decreased physical activity in later years',
    ],
    recommendations: [
      'Standard foundational health protocols',
      'Regular, gentle physical activities (like walking or yoga)',
      'Nutrient-dense, balanced eating habits',
      'Routine monitoring during regular check-ups',
      'Age-appropriate preventive screenings',
    ],
    clinicalImplications: [
      'A highly manageable, slower-progressing profile',
      'Generally lower risk for severe complications',
      'Standard lifestyle adjustments are highly successful',
      'Focus is kept firmly on maintaining your quality of life',
    ],
  },
};

// Biomarker reference data
const biomarkerReference = [
  {
    name: 'Body Mass Index (BMI)',
    unit: 'kg/m²',
    normal: '< 23.0',
    prediabetic: '23.0 - 24.9',
    diabetic: '≥ 25.0',
    description:
      'Ratio of weight to height. Uses Asia-Pacific WHO cutoffs for Asian populations. Higher BMI increases diabetes risk, especially with central obesity.',
  },
  {
    name: 'Waist Circumference',
    unit: 'cm',
    normal: '< 80',
    prediabetic: '80 - 87',
    diabetic: '≥ 88',
    description:
      'Indicator of central obesity in women. Important component of metabolic syndrome assessment.',
  },
  {
    name: 'Triglycerides',
    unit: 'mg/dL',
    normal: '< 150',
    prediabetic: '150 - 199',
    diabetic: '≥ 200',
    description:
      'Type of fat in the blood. Elevated levels strongly correlate with insulin resistance and cardiovascular risk.',
  },
  {
    name: 'HDL Cholesterol',
    unit: 'mg/dL',
    normal: '≥ 50',
    prediabetic: '40 - 49',
    diabetic: '< 40',
    description:
      '"Good" cholesterol that helps remove other forms of cholesterol. Lower values indicate higher cardiovascular and diabetes risk.',
  },
  {
    name: 'TG/HDL Ratio',
    unit: 'ratio',
    normal: '< 2.0',
    prediabetic: '2.0 - 3.0',
    diabetic: '≥ 3.0',
    description:
      'Validated surrogate marker for insulin resistance. Higher ratios suggest atherogenic dyslipidemia and increased metabolic risk.',
  },
];

// FAQ data
const faqData = [
  {
    question: 'What do the diabetes clusters mean for my treatment?',
    answer: (
      <span>
        The subtype labels (SIRD-like, SIDD-like, MOD-like, MARD-like) help your healthcare provider understand
        which metabolic pattern may be present. Each subtype has different characteristics and may respond better to
        certain approaches. For example, SIRD-like may benefit from insulin resistance management, while MOD-like often
        responds well to lifestyle changes. Your provider will use this information alongside other
        factors to personalize your care. These are pattern-based classifications to support clinical discussion.
      </span>
    ),
  },
  {
    question: 'How accurate is the risk prediction?',
    answer: (
      <span>
        The prediction model is trained on NHANES data (2009-2023) from postmenopausal women (age 45+)
        and uses machine learning algorithms validated through rigorous cross-validation.
        However, individual results may vary, and this tool should be used as one input among many in clinical decision-making.
        Always discuss results with your healthcare provider.
      </span>
    ),
  },
  {
    question: 'Can my cluster assignment change over time?',
    answer: (
      <span>
        Yes, your subtype assignment can change as your health status changes. Weight loss,
        lifestyle modifications, medication changes, and disease progression can all affect which
        metabolic pattern best describes your condition. Additionally, only patients classified as &quot;At-Risk&quot;
        receive a subtype assignment. Regular reassessment is recommended to track changes over time.
      </span>
    ),
  },
  {
    question: "Why doesn't the model use Fasting Blood Sugar (FBS) or HbA1c as input?",
    answer: (
      <span>
        FBS and HbA1c are <strong>diagnostic markers</strong> used to confirm diabetes, not features for prediction.
        Our model predicts your underlying metabolic risk <strong>before</strong> clinical diabetes develops.
        By focusing on biomarkers like BMI, Waist Circumference, and Triglycerides, the system can identify risk
        patterns earlier, allowing for preventive action.
      </span>
    ),
  },
  {
    question: 'Why are menopause-related factors important for diabetes risk?',
    answer: (
      <span>
        Menopause brings hormonal changes that can affect metabolism, body composition, and insulin
        sensitivity. Estrogen decline is associated with increased abdominal fat, decreased insulin
        sensitivity, and changes in lipid profiles. Understanding these factors helps personalize
        risk assessment for menopausal women.
      </span>
    ),
  },
];

// Expandable card component with Framer Motion
const ExpandableCard = ({
  title,
  children,
  defaultOpen = false,
  icon: Icon,
  colorTheme = 'forest',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const themeMap = {
    forest: {
      bg: 'bg-[#F3F9F6]',
      icon: 'text-diana-forest',
      iconBg: 'bg-[#E6F3EC]',
      border: 'border-diana-forest/20',
    },
    blue: {
      bg: 'bg-blue-50/50',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      border: 'border-blue-200',
    },
  };

  const theme = themeMap[colorTheme] || themeMap.forest;

  return (
    <motion.div
      variants={slideUp}
      whileHover={{ scale: 1.005 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`glass-card bg-white rounded-2xl border transition-all duration-300 ${isOpen ? `${theme.border} shadow-sm` : 'border-diana-sand hover:border-gray-300 shadow-sm overflow-hidden'}`}
    >
      <motion.button
        whileHover={{ backgroundColor: isOpen ? undefined : 'rgba(249, 250, 251, 1)' }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`expandable-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`w-full p-4 md:p-5 flex items-center justify-between transition-colors text-left gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-diana-forest/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${isOpen ? theme.bg + ' rounded-t-2xl' : 'hover:bg-gray-50'}`}
      >
        <div className="flex items-center gap-4">
          {Icon && (
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${isOpen ? theme.iconBg : 'bg-gray-100'}`}
            >
              <Icon size={20} className={`${isOpen ? theme.icon : 'text-gray-500'}`} />
            </motion.div>
          )}
          <h3
            className={`text-base md:text-lg font-bold transition-colors ${isOpen ? 'text-gray-900' : 'text-gray-700'}`}
          >
            {title}
          </h3>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={`flex-shrink-0 p-2 rounded-full transition-colors ${isOpen ? theme.iconBg : 'bg-gray-50'}`}
        >
          <ChevronDown size={18} className={isOpen ? theme.icon : 'text-gray-400'} />
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <div
              id={`expandable-card-${title.replace(/\s+/g, '-').toLowerCase()}`}
              className={`px-5 md:px-6 pb-5 pt-4 border-t ${theme.border} bg-white rounded-b-2xl`}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main Education component
const Education = () => {
  const [activeCluster, setActiveCluster] = useState('SIDD');

  return (
    <div className="space-y-6 animate-fade-in pb-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4">
        <div>
          <h4 className="text-diana-text-muted font-semibold text-sm mb-1 uppercase tracking-wider">
            Learn More
          </h4>
          <h2 className="text-3xl font-bold text-diana-text-primary">Education Center</h2>
          <p className="text-diana-text-secondary text-base mt-1 leading-relaxed">
            Understanding diabetes clusters, biomarkers, and your risk assessment
          </p>
        </div>
      </header>

      {/* Quick Overview */}
      <div className="bg-gradient-to-r from-diana-forest to-diana-forest-light p-5 rounded-2xl text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="bg-white/20 p-2.5 rounded-xl flex-shrink-0 self-start md:self-center">
            <BookOpen size={24} className="text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-wide">Understanding Your Results</h3>
            <p className="text-blue-50 text-sm leading-relaxed">
              <strong>1. Screening:</strong> Identifies if you are &quot;Normal&quot; or &quot;At-Risk&quot; based on biomarkers. 
              <strong> 2. Subtyping:</strong> If &quot;At-Risk&quot;, assigns a metabolic pattern to guide care. (Pattern-based classification to support clinical discussion, not a definitive diagnosis).
            </p>
          </div>
        </div>
      </div>

      {/* Cluster Cards */}
      <div>
        <h3 className="text-xl font-bold text-diana-text-primary mb-4 flex items-center gap-2">
          <Target size={24} className="text-diana-forest" />
          Diabetes Clusters Explained
        </h3>
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          {/* Sidebar Tabs */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            className="w-full lg:w-[32%] flex flex-col gap-3"
          >
            {Object.entries(clusterEducation).map(([key, cluster]) => (
              <motion.button
                key={key}
                variants={slideUp}
                whileHover={{ scale: activeCluster === key ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveCluster(key)}
                className={`flex flex-col text-left p-3 md:p-4 rounded-2xl border transition-all duration-300 ${
                  activeCluster === key
                    ? 'border-diana-forest bg-white shadow-sm ring-1 ring-diana-forest/20'
                    : 'border-diana-sand bg-gray-50/50 hover:bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 w-full">
                  <img
                    src={cluster.logo}
                    alt={`${key} logo`}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover shadow-sm bg-white flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-bold text-lg md:text-xl transition-colors ${activeCluster === key ? 'text-diana-forest' : 'text-diana-text-primary'}`}>
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

          {/* Content Area */}
          <div className="w-full lg:w-[68%]">
            <AnimatePresence mode="wait">
              {activeCluster && (
                <motion.div
                  key={activeCluster}
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -10 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className={`glass-card bg-white rounded-2xl border-2 ${clusterEducation[activeCluster].borderColor} overflow-hidden shadow-sm`}
                >
                  <div className={`p-5 md:p-6 ${clusterEducation[activeCluster].bgColor} bg-opacity-40 border-b border-gray-100/50`}>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <motion.img
                        initial={{ scale: 0.8, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                        src={clusterEducation[activeCluster].logo}
                        alt={`${activeCluster} logo`}
                        className="w-16 h-16 rounded-xl object-cover shadow-sm bg-white hidden sm:block border border-white"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <h3 className="text-2xl font-bold text-diana-text-primary">{activeCluster}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border bg-white ${clusterEducation[activeCluster].borderColor} text-gray-800 shadow-sm`}>
                            {clusterEducation[activeCluster].name}
                          </span>
                        </div>
                        <p className="text-sm text-diana-text-secondary font-medium leading-relaxed">
                          {clusterEducation[activeCluster].shortDesc}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5 md:p-6 space-y-6">
                    <p className="text-diana-text-primary text-base leading-relaxed">
                      {clusterEducation[activeCluster].fullDesc}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-xs font-bold text-diana-text-muted uppercase tracking-wider mb-3">
                          Associated Profile
                        </h5>
                        <ul className="space-y-2">
                          {clusterEducation[activeCluster].riskFactors.map(factor => (
                            <li
                              key={`risk-${factor.substring(0, 10).replace(/\\s+/g, '-')}`}
                              className="text-sm text-diana-text-secondary flex items-start gap-2"
                            >
                              <span className="text-diana-forest mt-0.5 min-w-[10px] text-base">•</span>
                              <span className="leading-relaxed">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="text-xs font-bold text-diana-text-muted uppercase tracking-wider mb-3">
                          Actionable Steps
                        </h5>
                        <ul className="space-y-2">
                          {clusterEducation[activeCluster].recommendations.map(rec => (
                            <li
                              key={`rec-${rec.substring(0, 10).replace(/\\s+/g, '-')}`}
                              className="text-sm text-diana-text-secondary flex items-start gap-2"
                            >
                              <span className="text-green-500 mt-0 font-bold text-base">✓</span>
                              <span className="leading-relaxed">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className={`p-4 md:p-5 rounded-xl ${clusterEducation[activeCluster].bgColor} ${clusterEducation[activeCluster].borderColor} border bg-opacity-60`}>
                      <h5 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} style={{ color: clusterEducation[activeCluster].color }} />
                        Focus Area
                      </h5>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
                        {clusterEducation[activeCluster].clinicalImplications.map(imp => (
                          <li
                            key={`imp-${imp.substring(0, 10).replace(/\\s+/g, '-')}`}
                            className="text-sm text-gray-700 flex items-start gap-2"
                          >
                            <span className="mt-0.5 text-base" style={{ color: clusterEducation[activeCluster].color }}>•</span>
                            <span className="leading-relaxed">{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Biomarker Reference */}
      <ExpandableCard title="Biomarker Reference Guide" icon={Activity} defaultOpen={false}>
        <div className="space-y-4 md:hidden">
          {biomarkerReference.map(bio => (
            <motion.div
              whileHover={{ scale: 1.02, x: 5 }}
              key={bio.name}
              className="rounded-xl border border-diana-sand/80 bg-white/80 p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="space-y-1.5">
                <div className="font-bold text-base text-diana-text-primary">
                  {bio.name}
                  {bio.unit && (
                    <span className="text-xs font-medium text-diana-text-muted"> ({bio.unit})</span>
                  )}
                </div>
                <p className="text-sm text-diana-text-secondary leading-relaxed">
                  {bio.description}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between rounded-lg bg-green-50/70 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Optimal
                  </span>
                  <span className="text-sm font-bold text-green-700">{bio.normal}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-amber-50/70 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Borderline
                  </span>
                  <span className="text-sm font-bold text-amber-700">{bio.prediabetic}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-red-50/70 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                    Elevated
                  </span>
                  <span className="text-sm font-bold text-red-700">{bio.diabetic}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-diana-sand">
                <th className="text-left py-4 text-diana-text-secondary font-bold uppercase tracking-wider text-xs">
                  Biomarker
                </th>
                <th className="text-center py-4 text-green-700 font-bold whitespace-nowrap text-xs">
                  Optimal / Normal
                </th>
                <th className="text-center py-4 text-amber-700 font-bold whitespace-nowrap text-xs">
                  Borderline / At-Risk
                </th>
                <th className="text-center py-4 text-red-700 font-bold whitespace-nowrap text-xs">
                  Elevated / High Risk
                </th>
              </tr>
            </thead>
            <tbody>
              {biomarkerReference.map(bio => (
                <motion.tr 
                  whileHover={{ backgroundColor: 'rgba(249, 250, 251, 1)' }}
                  key={bio.name} 
                  className="border-b border-gray-100 transition-colors"
                >
                  <td className="py-4 pr-4">
                    <div className="font-bold text-base text-diana-text-primary mb-1 flex items-baseline gap-2">
                      {bio.name}
                      {bio.unit && (
                        <span className="text-xs font-medium text-diana-text-muted">
                          ({bio.unit})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-diana-text-secondary leading-relaxed max-w-lg">
                      {bio.description}
                    </div>
                  </td>
                  <td className="text-center py-4 text-green-700 font-semibold text-base">
                    {bio.normal}
                  </td>
                  <td className="text-center py-4 text-amber-700 font-semibold text-base">
                    {bio.prediabetic}
                  </td>
                  <td className="text-center py-4 text-red-700 font-semibold text-base">
                    {bio.diabetic}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </ExpandableCard>

      {/* Understanding Risk */}
      <ExpandableCard title="Understanding Your Risk Score" icon={Lightbulb}>
        <div className="space-y-6">
          <p className="text-diana-text-primary text-base leading-loose">
            Your risk score is calculated using machine learning algorithms trained on NHANES data (2009-2023)
            from postmenopausal women (age 45+). The score represents the probability of having or developing
            Type 2 Diabetes based on your biomarker profile.
          </p>
          <p className="text-diana-text-secondary text-base leading-relaxed">
            The system uses a screening threshold (approximately 45%) to classify results:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="p-6 rounded-xl bg-green-50 border border-green-200 text-center cursor-default shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-green-600">Below 45%</div>
              <div className="text-base font-bold text-diana-text-primary mt-2">Normal</div>
              <div className="text-sm text-diana-text-muted mt-3">
                Lower risk profile. Maintain healthy lifestyle, regular check-ups.
              </div>
            </motion.div>
            <motion.div whileHover={{ y: -5, scale: 1.02 }} className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center cursor-default shadow-sm hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-amber-600">45% or Higher</div>
              <div className="text-base font-bold text-diana-text-primary mt-2">At-Risk</div>
              <div className="text-sm text-diana-text-muted mt-3">
                Discuss results with your provider. May benefit from lifestyle changes and further evaluation.
              </div>
            </motion.div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>Note:</strong> The screening threshold is optimized for sensitivity in detecting at-risk individuals.
              A result of "At-Risk" doesn't mean you have diabetes—it means further evaluation is recommended.
              Confirmatory testing may be suggested by your healthcare provider.
            </p>
          </div>
        </div>
      </ExpandableCard>

      {/* FAQ Section */}
      <div>
        <h3 className="text-xl font-bold text-diana-text-primary mb-6 flex items-center gap-2">
          <HelpCircle size={24} className="text-diana-forest" />
          Frequently Asked Questions
        </h3>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="space-y-3"
        >
          {faqData.map(faq => (
            <ExpandableCard key={faq.question} title={faq.question} icon={Info} colorTheme="blue">
              <p className="text-gray-600 text-base leading-relaxed">{faq.answer}</p>
            </ExpandableCard>
          ))}
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle size={24} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-base mb-1.5">Medical Disclaimer</h4>
            <div className="text-sm text-amber-900/80 leading-relaxed space-y-2">
              <p>
                <strong>This is a SCREENING tool, not a diagnostic tool.</strong> DIANA is designed to support
                clinical decision-making by identifying metabolic risk patterns, but it does NOT replace
                clinical judgment, professional medical evaluation, or confirmatory diagnostic testing.
              </p>
              <p>
                The subtype labels (SIRD-like, SIDD-like, MOD-like, MARD-like) are heuristic proxy labels
                based on biomarker patterns, not validated clinical diagnoses. They are intended to support
                discussion with your healthcare provider.
              </p>
              <p>
                If you receive an &quot;At-Risk&quot; result, confirmatory testing may be needed. Always consult with a qualified healthcare provider
                for diagnosis and treatment decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Education;
