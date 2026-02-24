import { motion } from 'framer-motion';
import { BookOpen, ShieldCheck, Activity, Target, AlertTriangle } from 'lucide-react';
import { slideUp, staggerContainer } from '../../utils/animations';

const modelCards = [
  {
    id: 'binary_v2_no_bp',
    title: 'Screening (No BP) — Binary At-Risk',
    summary: 'Binary screening model for Normal vs At-Risk without BP, HbA1c, or FBS to reduce circularity.',
    inputs: ['BMI', 'Triglycerides', 'LDL', 'HDL', 'Age', 'Lifestyle (optional)'],
    outputs: ['Predicted status (Normal / At-Risk)', 'At-risk probability', 'Risk score 0–100'],
    training: 'NHANES postmenopausal cohort (2009–2023). Nested Leave-One-Group-Out validation by NHANES cycle.',
    notes: 'Optimized for screening sensitivity; false positives expected and should trigger confirmatory labs.'
  },
  {
    id: 'binary_v2_bp',
    title: 'Screening (With BP) — Binary At-Risk',
    summary: 'Binary screening model that includes systolic/diastolic BP for risk triage.',
    inputs: ['BMI', 'Triglycerides', 'LDL', 'HDL', 'Age', 'Systolic', 'Diastolic', 'Lifestyle (optional)'],
    outputs: ['Predicted status (Normal / At-Risk)', 'At-risk probability', 'Risk score 0–100'],
    training: 'NHANES postmenopausal cohort (2009–2023). Nested Leave-One-Group-Out validation by NHANES cycle.',
    notes: 'Use for screening only; confirm with HbA1c/FBS when at-risk.'
  },
  {
    id: 'clinical_3class',
    title: 'Clinical 3-Class (Normal / Pre-diabetic / Diabetic)',
    summary: 'Three-class screening model using metabolic and BP features for clinical stratification.',
    inputs: ['BMI', 'Triglycerides', 'LDL', 'HDL', 'Age', 'Systolic', 'Diastolic', 'Lifestyle (optional)'],
    outputs: ['Predicted status (Normal / Pre-diabetic / Diabetic)', 'At-risk probability', 'Risk score 0–100'],
    training: 'NHANES postmenopausal cohort (2009–2023). Thresholds tuned to capture pre-diabetic and diabetic classes.',
    notes: 'Designed for screening; thresholds favor sensitivity over specificity.'
  },
  {
    id: 'ada',
    title: 'ADA Baseline (HbA1c + FBS)',
    summary: 'Baseline diagnostic model using HbA1c and FBS, aligned with ADA biomarker criteria.',
    inputs: ['HbA1c', 'FBS', 'BMI', 'Triglycerides', 'LDL', 'HDL'],
    outputs: ['Medical status', 'Risk score 0–100'],
    training: 'NHANES postmenopausal cohort; used as diagnostic baseline.',
    notes: 'HbA1c/FBS are diagnostic markers; treat outputs as confirmatory, not predictive.'
  }
];

const rationaleSections = [
  {
    title: 'Why Binary vs 3-Class',
    content: 'Binary models prioritize sensitivity for case-finding (Normal vs At-Risk). Three-class models provide finer stratification (Normal, Pre-diabetic, Diabetic) while still tuned for screening sensitivity.'
  },
  {
    title: 'Why “No BP” vs “With BP”',
    content: 'No-BP models avoid reliance on vitals when blood pressure is unavailable. BP-enabled models add systolic/diastolic signals for stronger clinical stratification when vitals are reliable.'
  },
  {
    title: 'How the Models Were Trained',
    content: 'Models were trained on NHANES postmenopausal cohorts with Leave-One-Group-Out validation using NHANES cycles as groups. This tests temporal generalization across survey cycles. Training artifacts follow the repo’s LOCO validation workflow.'
  },
  {
    title: 'What is NHANES?',
    content: 'NHANES (CDC/NCHS) is a U.S. national health survey combining interviews and clinical exams/labs. It provides standardized biomarker data used to train and validate the DIANA screening models.'
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
          <li>• Models trained on NHANES postmenopausal cohort (US population).</li>
          <li>• Use confirmatory labs (HbA1c/FBS) for clinical decisions.</li>
          <li>• Interpret results in full patient context (history, symptoms, comorbidities).</li>
        </ul>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {modelCards.map((card) => (
            <motion.div key={card.id} variants={slideUp} className="glass-card bg-white rounded-3xl border border-diana-sand p-7">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-diana-text-primary">{card.title}</h3>
                  <p className="text-diana-text-secondary mt-2">{card.summary}</p>
                </div>
                <div className="p-3 rounded-2xl bg-diana-forest/10 text-diana-forest">
                  <Activity size={22} />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-diana-text-primary">Inputs</div>
                  <div className="text-diana-text-secondary">{card.inputs.join(', ')}</div>
                </div>
                <div>
                  <div className="font-semibold text-diana-text-primary">Outputs</div>
                  <div className="text-diana-text-secondary">{card.outputs.join(', ')}</div>
                </div>
                <div>
                  <div className="font-semibold text-diana-text-primary">Training</div>
                  <div className="text-diana-text-secondary">{card.training}</div>
                </div>
                <div className="flex items-start gap-2 text-diana-text-secondary">
                  <Target size={16} className="mt-0.5 text-diana-forest" />
                  <span>{card.notes}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
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
