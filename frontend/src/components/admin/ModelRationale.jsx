import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ShieldCheck,
  Activity,
  Target,
  AlertTriangle,
  ChevronDown,
  BrainCircuit,
  Database,
  Fingerprint,
  Users,
  CheckCircle2,
  Stethoscope,
  Info
} from 'lucide-react';
import { slideUp, staggerContainer } from '../../utils/animations';

const approvedModelCard = {
  id: 'binary_v2_no_bp',
  title: 'Screening Model — Binary At-Risk (v2)',
  version: 'v2.0.0',
  summary:
    'Uses metabolic biomarkers to screen for diabetes risk. Designed for rapid clinical triage without requiring diagnostic glucose tests (HbA1c/FBS) or blood pressure readings.',
  inputs: [
    { name: 'BMI', type: 'Clinical' },
    { name: 'Triglycerides', type: 'Lab Component' },
    { name: 'LDL cholesterol', type: 'Lab Component' },
    { name: 'HDL cholesterol', type: 'Lab Component' },
    { name: 'Age', type: 'Demographic' },
    { name: 'Waist circum.', type: 'Clinical' },
    { name: 'Smoking', type: 'Lifestyle' },
    { name: 'Physical activity', type: 'Lifestyle' },
    { name: 'Alcohol use', type: 'Lifestyle' },
  ],
  outputs: [
    'Predicted status (Normal / At-Risk)',
    'At-risk probability',
    'Risk score 0-100',
    'Metabolic cluster (for At-Risk only)',
  ],
  training:
    'NHANES postmenopausal cohort (2009-2023). Nested Leave-One-Group-Out validation by NHANES cycle. AUC ~0.72.',
  notes:
    'Screening support only - confirm at-risk results with diagnostic labs (HbA1c/FBS). Metabolic clusters are heuristic proxy labels, not mechanistic subtype diagnoses.',
};

const rationaleSections = [
  {
    title: 'Screening Purpose',
    icon: <Target className="w-5 h-5 text-indigo-500" />,
    content:
      'This model is designed for rapid case-finding to identify patients who may benefit from diagnostic testing. It provides a binary triage (Normal vs At-Risk) to support clinical decision-making for postmenopausal women at risk of developing diabetes.',
    gradient: 'from-indigo-500/5 to-transparent'
  },
  {
    title: 'Non-Circular Design',
    icon: <Activity className="w-5 h-5 text-violet-500" />,
    content:
      'The screening model intentionally excludes HbA1c and FBS as input features. These biomarkers are used only for diagnostic confirmation and model labeling, preventing circular prediction logic. The model relies on metabolic and lifestyle factors available before diagnostic testing.',
    gradient: 'from-violet-500/5 to-transparent'
  },
  {
    title: 'Feature Set (9 Inputs)',
    icon: <Database className="w-5 h-5 text-indigo-500" />,
    content:
      'The model uses 9 features: 6 continuous biomarkers (BMI, triglycerides, LDL, HDL, age, waist circumference) and 3 ordinal lifestyle encodings (smoking, physical activity, alcohol). This design avoids derived ratios or composite scores that could introduce instability.',
    gradient: 'from-indigo-500/5 to-transparent'
  },
  {
    title: 'Training & Validation',
    icon: <BrainCircuit className="w-5 h-5 text-violet-500" />,
    content:
      'Trained on NHANES postmenopausal cohorts (2009-2023) using Leave-One-Group-Out validation across NHANES cycles. This tests temporal generalization and reduces overfitting to a single survey period. AUC ~0.72 on nested cross-validation.',
    gradient: 'from-violet-500/5 to-transparent'
  },
  {
    title: 'What is NHANES?',
    icon: <Users className="w-5 h-5 text-indigo-500" />,
    content:
      'NHANES (CDC/NCHS) is a U.S. national health survey combining interviews and clinical exams/labs. It provides standardized biomarker data used to train and validate this screening model for postmenopausal women (ages 45-60).',
    gradient: 'from-indigo-500/5 to-transparent'
  },
  {
    title: 'Metabolic Clusters (At-Risk Only)',
    icon: <Fingerprint className="w-5 h-5 text-violet-500" />,
    content:
      'For patients predicted as At-Risk, the model assigns a heuristic metabolic cluster: SIRD-like (severe insulin-resistant pattern), SIDD-like (atherogenic/lipid-driven), MOD-like (mild obesity-related), or MARD-like (mild age-related). These are screening stratification tools derived from K-Means clustering on biomarker patterns, not validated biological subtype diagnoses.',
    gradient: 'from-violet-500/5 to-transparent'
  },
  {
    title: 'Cluster Limitations',
    icon: <AlertTriangle className="w-5 h-5 text-indigo-500" />,
    content:
      'Cluster labels are "Ahlqvist-inspired" proxy indicators, not mechanistic subtype classifications. DIANA lacks HOMA2-B, HOMA2-IR, and C-peptide markers used in Ahlqvist et al. methodology. Clusters are computed only for At-Risk predictions; Normal predictions receive neutral N/A status. Interpret clusters as dominant metabolic patterns requiring clinical correlation, not definitive treatment prescriptions.',
    gradient: 'from-indigo-500/5 to-transparent'
  },
];

const AccordionItem = ({ title, icon, content, gradient, isOpen, onToggle, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`border border-slate-200/60 mb-3 rounded-2xl overflow-hidden bg-white/70 backdrop-blur-sm hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-md ${isOpen ? 'ring-2 ring-diana-forest/10 border-transparent' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left transition-colors relative group"
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'group-hover:opacity-50'}`} />
        <div className="flex items-center gap-4 relative z-10 w-full">
          <div className={`p-2.5 rounded-xl bg-white shadow-sm border border-slate-100/80 flex items-center justify-center transform transition-all duration-300 ${isOpen ? 'scale-110 shadow-md ring-1 ring-slate-200' : ''}`}>
            {icon}
          </div>
          <span className="font-semibold text-slate-800 text-[1.05rem]">{title}</span>
        </div>
        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 flex-shrink-0 ${isOpen ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600 border border-slate-200/50'}`}>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 relative z-10">
              <p className="pl-[3.5rem] pr-2 text-slate-600 leading-relaxed text-[0.95rem]">
                {content}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ModelRationale = () => {
  const [openSections, setOpenSections] = useState([0]);

  const toggleSection = index => {
    setOpenSections(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const expandAll = () => {
    setOpenSections(rationaleSections.map((_, i) => i));
  };

  const collapseAll = () => {
    setOpenSections([]);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 pt-2">
      {/* Header Section */}
      <header className="relative overflow-hidden rounded-3xl bg-slate-900 border border-slate-800 p-8 md:p-10 text-white shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 opacity-100" />
        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        
        {/* Glow Effects */}
        <div className="absolute -top-32 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-sm">
              <Stethoscope className="w-4 h-4 text-indigo-300" />
              <span className="text-indigo-50 text-xs font-semibold tracking-wider uppercase">Doctor Dashboard</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Model Rationale
            </h2>
            <p className="text-indigo-100 text-lg md:text-xl font-normal leading-relaxed max-w-2xl">
              Transparent clinical context, training methodology, and structural interpretation guidance.
            </p>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        
        {/* Guardrails Card */}
        <motion.div
          variants={slideUp}
          className="xl:col-span-1 relative overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-950 p-8 rounded-3xl text-white shadow-lg border border-indigo-800/50"
        >
          
          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="p-3 bg-white/10 border border-white/10 rounded-2xl shadow-inner">
              <ShieldCheck size={28} className="text-indigo-300" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-white">Clinical Usage Boundaries</h3>
          </div>
          
          <ul className="space-y-4 relative z-10">
            {[
              "Screening support only — never diagnostic",
              "Confirm At-Risk results with HbA1c/FBS",
              "Clusters are heuristic labels, not diagnoses",
              "Primary guide must be clinical judgment"
            ].map((text, i) => (
              <li key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 shadow-sm hover:bg-white/10 transition-colors">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <span className="text-indigo-50 text-sm font-semibold tracking-wide leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Specs Card */}
        <motion.div
          variants={slideUp}
          className="xl:col-span-2 bg-white rounded-3xl border border-slate-200/60 p-8 shadow-sm flex flex-col relative overflow-hidden"
        >
          {/* subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 to-white pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
            <div className="flex gap-5">
              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 h-16 w-16">
                <Activity size={32} className="text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{approvedModelCard.title}</h3>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase tracking-wider">
                    {approvedModelCard.version}
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-3xl">{approvedModelCard.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 relative z-10 flex-col md:flex-row">
            {/* Inputs Block */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Database size={18} className="text-indigo-500" />
                <div className="font-bold text-slate-700 text-sm">Model Inputs ({approvedModelCard.inputs.length})</div>
              </div>
              <div className="flex flex-wrap gap-2 mt-auto">
                {approvedModelCard.inputs.map((input, idx) => (
                  <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
                    {input.name}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Outputs Block */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <Target size={18} className="text-violet-500" />
                <div className="font-bold text-slate-700 text-sm">Predicted Outputs</div>
              </div>
              <ul className="space-y-3.5 mt-auto">
                {approvedModelCard.outputs.map((output, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                     <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-0.5 flex-shrink-0" />
                     <span className="leading-snug">{output}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-auto relative z-10 flex items-start gap-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4">
            <Info size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <span className="text-xs font-medium text-indigo-900/90 leading-relaxed">{approvedModelCard.notes}</span>
          </div>
        </motion.div>
      </div>

      {/* Accordion List */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-8 py-6 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100/80">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="p-2.5 bg-diana-forest/10 rounded-xl text-diana-forest">
              <BookOpen size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Detailed Documentation</h3>
              <p className="text-sm text-slate-500 mt-0.5 font-medium">Deep dive into the methodology</p>
            </div>
          </div>
          <div className="flex gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
            <button
              onClick={expandAll}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-diana-forest hover:bg-white rounded-lg transition-all"
            >
              Expand all
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:text-diana-forest hover:bg-white rounded-lg transition-all"
            >
              Collapse all
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8 bg-slate-50/30">
          <div className="max-w-4xl mx-auto">
            {rationaleSections.map((section, index) => (
              <AccordionItem
                key={section.title}
                index={index}
                title={section.title}
                icon={section.icon}
                content={section.content}
                gradient={section.gradient}
                isOpen={openSections.includes(index)}
                onToggle={() => toggleSection(index)}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Footer Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-red-50 to-rose-50 border border-red-100 shadow-lg shadow-red-100/50 p-6 md:p-8 rounded-3xl">
        <div className="absolute top-0 right-0 p-8 transform translate-x-1/3 -translate-y-1/3 opacity-[0.03]">
          <AlertTriangle size={200} />
        </div>
        <div className="relative z-10 flex items-start sm:items-center gap-5">
          <div className="p-3 bg-red-100/80 text-red-600 rounded-2xl flex-shrink-0 shadow-sm border border-red-200/50">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h4 className="text-lg font-bold text-red-900 mb-1.5 tracking-tight">Clinical Responsibility Directive</h4>
            <p className="text-sm md:text-base font-medium text-red-800/80 leading-relaxed max-w-4xl">
              These models are designed purely for screening triage and risk stratification. They <span className="font-bold underline decoration-red-300 underline-offset-2">must not</span> replace diagnostic testing protocols or clinical judgment. Final diagnostic decisions must incorporate A1C and/or fasting glucose results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelRationale;
