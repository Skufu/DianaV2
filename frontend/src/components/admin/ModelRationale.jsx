import { motion } from 'framer-motion';
import { BookOpen, ShieldCheck, Activity, Target, AlertTriangle } from 'lucide-react';
import { slideUp, staggerContainer } from '../../utils/animations';

const approvedModelCard = {
  id: 'binary_v2_no_bp',
  title: 'Screening Model — Binary At‑Risk (v2)',
  summary:
    'Uses metabolic biomarkers to screen for diabetes risk. Designed for rapid clinical triage without requiring diagnostic glucose tests (HbA1c/FBS) or blood pressure readings.',
  inputs: [
    'BMI',
    'Triglycerides',
    'LDL cholesterol',
    'HDL cholesterol',
    'Age',
    'Waist circumference',
    'Smoking status',
    'Physical activity',
    'Alcohol use'
  ],
  outputs: ['Predicted status (Normal / At‑Risk)', 'At‑risk probability', 'Risk score 0–100', 'Metabolic cluster (for At‑Risk only)'],
  training:
    'NHANES postmenopausal cohort (2009–2023). Nested Leave‑One‑Group‑Out validation by NHANES cycle. AUC ≈0.72.',
  notes: 'Screening support only — confirm at‑risk results with diagnostic labs (HbA1c/FBS). Metabolic clusters are heuristic proxy labels, not mechanistic subtype diagnoses.',
};

const rationaleSections = [
  {
    title: 'Screening Purpose',
    content:
      'This model is designed for rapid case‑finding to identify patients who may benefit from diagnostic testing. It provides a binary triage (Normal vs At‑Risk) to support clinical decision‑making for postmenopausal women at risk of developing diabetes.',
  },
  {
    title: 'Non‑Circular Design',
    content:
      'The screening model intentionally excludes HbA1c and FBS as input features. These biomarkers are used only for diagnostic confirmation and model labeling, preventing circular prediction logic. The model relies on metabolic and lifestyle factors available before diagnostic testing.',
  },
  {
    title: 'Feature Set (9 Inputs)',
    content:
      'The model uses 9 features: 6 continuous biomarkers (BMI, triglycerides, LDL, HDL, age, waist circumference) and 3 ordinal lifestyle encodings (smoking, physical activity, alcohol). This Gemini‑style design avoids derived ratios or composite scores that could introduce instability.',
  },
  {
    title: 'Training & Validation',
    content:
      'Trained on NHANES postmenopausal cohorts (2009–2023) using Leave‑One‑Group‑Out validation across NHANES cycles. This tests temporal generalization and reduces overfitting to a single survey period. AUC ≈0.72 on nested cross‑validation.',
  },
  {
    title: 'What is NHANES?',
    content:
      'NHANES (CDC/NCHS) is a U.S. national health survey combining interviews and clinical exams/labs. It provides standardized biomarker data used to train and validate this screening model for postmenopausal women (ages 45–60).',
  },
  {
    title: 'Metabolic Clusters (At‑Risk Only)',
    content:
      'For patients predicted as At‑Risk, the model assigns a heuristic metabolic cluster: SIRD‑like (severe insulin‑resistant pattern), SIDD‑like (atherogenic/lipid‑driven), MOD‑like (mild obesity‑related), or MARD‑like (mild age‑related). These are screening stratification tools derived from K‑Means clustering on biomarker patterns, not validated biological subtype diagnoses.',
  },
  {
    title: 'Cluster Limitations',
    content:
      'Cluster labels are "Ahlqvist‑inspired" proxy indicators, not mechanistic subtype classifications. DIANA lacks HOMA2‑B, HOMA2‑IR, and C‑peptide markers used in Ahlqvist et al. methodology. Clusters are computed only for At‑Risk predictions; Normal predictions receive neutral N/A status. Interpret clusters as dominant metabolic patterns requiring clinical correlation, not definitive treatment prescriptions.',
  },
  {
    title: 'Interpreting Results',
    content:
      'At‑Risk results indicate elevated risk factors based on metabolic biomarkers and should prompt confirmatory diagnostic testing (HbA1c/FBS). Risk scores (0–100) represent relative screening priority, not absolute disease probability. Always interpret screening results within the full patient context including history, symptoms, and comorbidities.',
  },
];

const ModelRationale = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end">
        <div>
          <h4 className="text-diana-text-muted font-semibold text-base mb-2 uppercase tracking-wider">
            Doctor Dashboard
          </h4>
          <h2 className="text-4xl font-bold text-diana-text-primary">
            Model Rationale & Education
          </h2>
          <p className="text-diana-text-secondary text-lg mt-2 leading-relaxed">
            Clinical context, training data, and guidance for model interpretation.
          </p>
        </div>
      </header>

      <motion.div
        variants={slideUp}
        className="bg-gradient-to-r from-diana-forest to-diana-forest-light p-8 rounded-3xl text-white"
      >
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={28} />
          <h3 className="text-2xl font-bold">Clinical Guardrails</h3>
        </div>
        <ul className="text-blue-100 text-lg leading-loose space-y-2">
          <li>• Screening support only — not diagnostic or prescriptive.</li>
          <li>• Confirm at‑risk results with diagnostic labs (HbA1c/FBS).</li>
          <li>• Metabolic clusters are heuristic proxy labels for screening stratification, not validated biological subtype diagnoses.</li>
          <li>
            • Interpret results in the full patient context (history, symptoms, comorbidities).
          </li>
          <li>
            • Use clinical judgment — screening is a decision‑support tool, not a replacement.
          </li>
        </ul>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div
          variants={slideUp}
          className="glass-card bg-white rounded-3xl border border-diana-sand p-7 max-w-3xl mx-auto"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-diana-text-primary">
                {approvedModelCard.title}
              </h3>
              <p className="text-diana-text-secondary mt-2">{approvedModelCard.summary}</p>
            </div>
            <div className="p-3 rounded-2xl bg-diana-forest/10 text-diana-forest">
              <Activity size={22} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-semibold text-diana-text-primary">Inputs</div>
              <div className="text-diana-text-secondary">{approvedModelCard.inputs.join(', ')}</div>
            </div>
            <div>
              <div className="font-semibold text-diana-text-primary">Outputs</div>
              <div className="text-diana-text-secondary">
                {approvedModelCard.outputs.join(', ')}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="font-semibold text-diana-text-primary">Training</div>
              <div className="text-diana-text-secondary">{approvedModelCard.training}</div>
            </div>
            <div className="md:col-span-2 flex items-start gap-2 text-diana-text-secondary">
              <Target size={16} className="mt-0.5 text-diana-forest" />
              <span>{approvedModelCard.notes}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rationaleSections.map(section => (
          <motion.div
            key={section.title}
            variants={slideUp}
            className="bg-white rounded-3xl border border-slate-100 p-7"
          >
            <div className="flex items-center gap-3 mb-3 text-diana-text-primary">
              <ShieldCheck size={20} className="text-diana-forest" />
              <h4 className="text-lg font-semibold">{section.title}</h4>
            </div>
            <p className="text-diana-text-secondary leading-relaxed">{section.content}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl">
        <div className="flex items-start gap-4">
          <AlertTriangle size={28} className="text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-amber-800 text-lg mb-2">Clinical Use Reminder</h4>
            <p className="text-base text-amber-700 leading-loose">
              These models are designed for screening support. They do not replace diagnostic
              testing or clinical judgment. Validate results with confirmatory labs and interpret
              within the patient’s overall clinical context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelRationale;
