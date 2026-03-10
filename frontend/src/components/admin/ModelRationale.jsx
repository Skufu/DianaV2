import { motion } from 'framer-motion';
import { BookOpen, ShieldCheck, Activity, Target, AlertTriangle } from 'lucide-react';
import { slideUp, staggerContainer } from '../../utils/animations';

const approvedModelCard = {
  id: 'binary_v2_no_bp',
  title: 'Screening Model — Binary At‑Risk',
  summary: 'Uses metabolic biomarkers to screen for diabetes risk. Designed for rapid clinical triage without requiring blood pressure readings or diagnostic labs.',
  inputs: ['BMI', 'Triglycerides', 'LDL', 'HDL', 'Age'],
  outputs: ['Predicted status (Normal / At‑Risk)', 'At‑risk probability', 'Risk score 0–100'],
  training: 'NHANES postmenopausal cohort (2009–2023). Nested Leave‑One‑Group‑Out validation by NHANES cycle.',
  notes: 'Screening support only — confirm at‑risk results with diagnostic labs (HbA1c/FBS).'
};

const rationaleSections = [
  {
    title: 'Screening Purpose',
    content: 'This model is designed for rapid case‑finding to identify patients who may benefit from diagnostic testing. It provides a binary triage (Normal vs At‑Risk) to support clinical decision‑making.'
  },
  {
    title: 'Model Rationale',
    content: 'The screening model uses metabolic biomarkers that are routinely available in clinical practice. This allows for quick risk assessment without requiring blood pressure readings or diagnostic labs at the point of screening.'
  },
  {
    title: 'Training & Validation',
    content: 'Trained on NHANES postmenopausal cohorts with Leave‑One‑Group‑Out validation across NHANES cycles. This tests temporal generalization and reduces overfitting to a single survey period.'
  },
  {
    title: 'What is NHANES?',
    content: 'NHANES (CDC/NCHS) is a U.S. national health survey combining interviews and clinical exams/labs. It provides standardized biomarker data used to train and validate this screening model.'
  },
  {
    title: 'Interpreting Results',
    content: 'At‑Risk results indicate elevated risk factors and should prompt confirmatory diagnostic testing (HbA1c/FBS). Always interpret screening results within the full patient context.'
  }
];

const ModelRationale = () => {
  return (
    <div className="space-y-8 animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end">
        <div>
          <h4 className="text-diana-text-muted font-semibold text-base mb-2 uppercase tracking-wider">Doctor Dashboard</h4>
          <h2 className="text-4xl font-bold text-diana-text-primary">Model Rationale & Education</h2>
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
          <li>• Interpret results in the full patient context (history, symptoms, comorbidities).</li>
          <li>• Use clinical judgment — screening is a decision‑support tool, not a replacement.</li>
        </ul>
      </motion.div>

      <motion.div
        variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}
      >
        <motion.div variants={slideUp} className="glass-card bg-white rounded-3xl border border-diana-sand p-7 max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-diana-text-primary">{approvedModelCard.title}</h3>
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
              <div className="text-diana-text-secondary">{approvedModelCard.outputs.join(', ')}</div>
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
        {rationaleSections.map((section) => (
          <motion.div key={section.title} variants={slideUp} className="bg-white rounded-3xl border border-slate-100 p-7">
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
              These models are designed for screening support. They do not replace diagnostic testing or clinical judgment.
              Validate results with confirmatory labs and interpret within the patient’s overall clinical context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelRationale;
