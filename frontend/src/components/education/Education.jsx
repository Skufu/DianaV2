// Education: comprehensive educational content about diabetes clusters and risk assessment
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, slideUp } from '../../utils/animations';
import {
    BookOpen, ChevronDown, ChevronUp, Heart, Activity,
    AlertTriangle, Info, HelpCircle, Lightbulb, Target
} from 'lucide-react';

// Import cluster logos
import SIDDLogo from '../../assets/clusters/sidd.png';
import SIRDLogo from '../../assets/clusters/sird.png';
import MODLogo from '../../assets/clusters/mod.png';
import MARDLogo from '../../assets/clusters/mard.png';

// Comprehensive cluster education data - using light mode compatible colors
export const clusterEducation = {
    SIDD: {
        name: 'Severe Insulin-Deficient Diabetes',
        shortDesc: 'Early onset, low BMI, poor metabolic control',
        color: '#DC2626', // red-600
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        logo: SIDDLogo,
        fullDesc: `SIDD is characterized by early diabetes onset with significantly reduced insulin secretion. 
    Patients in this cluster typically have lower BMI but experience poor glycemic control. 
    This subtype often requires early insulin therapy due to the body's inability to produce sufficient insulin.`,
        riskFactors: [
            'Early age of diabetes onset',
            'Low beta-cell function (insulin production)',
            'Poor glycemic control despite treatment',
            'Lower body weight/BMI',
            'Higher HbA1c levels'
        ],
        recommendations: [
            'Early consideration of insulin therapy',
            'Frequent blood glucose monitoring',
            'Regular screening for diabetic complications',
            'Focus on tight glycemic control',
            'Nutritional counseling for adequate carbohydrate management'
        ],
        clinicalImplications: [
            'Higher risk of diabetic ketoacidosis',
            'May need insulin earlier than other subtypes',
            'Regular eye and kidney screening recommended',
            'Consider continuous glucose monitoring'
        ]
    },
    SIRD: {
        name: 'Severe Insulin-Resistant Diabetes',
        shortDesc: 'High insulin resistance, elevated risk of kidney disease',
        color: '#D97706', // amber-600
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        logo: SIRDLogo,
        fullDesc: `SIRD is marked by severe insulin resistance where the body produces insulin but cells don't respond effectively. 
    This subtype is strongly associated with metabolic syndrome and carries a significantly higher risk of diabetic kidney disease 
    and fatty liver disease compared to other clusters.`,
        riskFactors: [
            'High insulin resistance (HOMA-IR)',
            'Elevated triglycerides',
            'Higher BMI/obesity',
            'Metabolic syndrome features',
            'Family history of diabetes'
        ],
        recommendations: [
            'Weight management and lifestyle modifications',
            'Medications targeting insulin resistance (metformin, TZDs)',
            'Regular kidney function monitoring',
            'Liver health screening',
            'Cardiovascular risk assessment'
        ],
        clinicalImplications: [
            'Highest risk of diabetic nephropathy',
            'Elevated risk of non-alcoholic fatty liver disease',
            'Consider medications that improve insulin sensitivity',
            'Monitor for early signs of kidney dysfunction'
        ]
    },
    MOD: {
        name: 'Mild Obesity-Related Diabetes',
        shortDesc: 'High BMI but relatively stable metabolic state',
        color: '#2563EB', // blue-600
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        logo: MODLogo,
        fullDesc: `MOD is primarily driven by obesity and excess body weight. Despite having high BMI, patients in this cluster 
    often maintain relatively normal metabolic function initially. Weight management is the key therapeutic target, 
    and many patients respond well to lifestyle interventions.`,
        riskFactors: [
            'High BMI (≥30 kg/m²)',
            'Excess body fat, especially visceral fat',
            'Sedentary lifestyle',
            'Poor dietary habits',
            'Gradual weight gain over time'
        ],
        recommendations: [
            'Structured weight loss program (target 5-10% reduction)',
            'Regular physical activity (150+ min/week)',
            'Dietary modifications (reduced calories, balanced nutrition)',
            'Consider weight-loss medications if indicated',
            'Behavioral counseling and support'
        ],
        clinicalImplications: [
            'Often responds well to lifestyle interventions',
            'Weight loss can significantly improve glycemic control',
            'Lower complication risk with successful weight management',
            'May achieve remission with substantial weight loss'
        ]
    },
    MARD: {
        name: 'Mild Age-Related Diabetes',
        shortDesc: 'Later onset with modest metabolic changes',
        color: '#16A34A', // green-600
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        logo: MARDLogo,
        fullDesc: `MARD typically develops later in life and progresses more slowly than other subtypes. 
    These patients generally have modest metabolic abnormalities and a more favorable prognosis. 
    Standard diabetes management approaches are usually effective for this cluster.`,
        riskFactors: [
            'Older age at diagnosis (typically >60 years)',
            'Gradual onset of symptoms',
            'Modest elevations in blood glucose',
            'Age-related metabolic changes',
            'Declining physical activity with age'
        ],
        recommendations: [
            'Standard diabetes management protocols',
            'Regular but gentle physical activity',
            'Balanced nutrition appropriate for age',
            'Regular monitoring of blood glucose',
            'Age-appropriate screening for complications'
        ],
        clinicalImplications: [
            'Generally more favorable prognosis',
            'Lower risk of severe complications',
            'Standard treatment usually effective',
            'Focus on maintaining quality of life'
        ]
    }
};

// Biomarker reference data
const biomarkerReference = [
    {
        name: 'Fasting Blood Sugar (FBS)',
        unit: 'mg/dL',
        normal: '< 100',
        prediabetic: '100-125',
        diabetic: '≥ 126',
        description: 'Measures blood glucose after 8+ hours of fasting. A key diagnostic marker for diabetes.'
    },
    {
        name: 'HbA1c',
        unit: '%',
        normal: '< 5.7',
        prediabetic: '5.7-6.4',
        diabetic: '≥ 6.5',
        description: 'Reflects average blood sugar over the past 2-3 months. The gold standard for long-term glucose control.'
    },
    {
        name: 'Body Mass Index (BMI)',
        unit: 'kg/m²',
        normal: '18.5-24.9',
        prediabetic: '25-29.9 (Overweight)',
        diabetic: '≥ 30 (Obese)',
        description: 'Ratio of weight to height. Higher BMI increases diabetes risk, especially with central obesity.'
    },
    {
        name: 'Triglycerides',
        unit: 'mg/dL',
        normal: '< 150',
        prediabetic: '150-199',
        diabetic: '≥ 200',
        description: 'Type of fat in the blood. Elevated levels are associated with insulin resistance.'
    },
    {
        name: 'HDL Cholesterol',
        unit: 'mg/dL',
        normal: '≥ 60 (optimal)',
        prediabetic: '40-59',
        diabetic: '< 40',
        description: '"Good" cholesterol that helps remove other forms of cholesterol. Higher is better.'
    },
    {
        name: 'Blood Pressure',
        unit: 'mmHg',
        normal: '< 120/80',
        prediabetic: '120-129/<80 (Elevated)',
        diabetic: '≥ 130/80 (Hypertension)',
        description: 'Force of blood against artery walls. High blood pressure often coexists with diabetes.'
    }
];

// FAQ data
const faqData = [
    {
        question: 'What do the diabetes clusters mean for my treatment?',
        answer: `The clusters (SIDD, SIRD, MOD, MARD) help your healthcare provider understand which type of diabetes you may have. 
    Each cluster has different characteristics and may respond better to certain treatments. For example, SIDD may benefit from early insulin, 
    while MOD often responds well to lifestyle changes. Your provider will use this information alongside other factors to personalize your care.`
    },
    {
        question: 'How accurate is the risk prediction?',
        answer: `The prediction model is trained on large population datasets and uses machine learning algorithms validated in clinical research. 
    However, individual results may vary, and this tool should be used as one input among many in clinical decision-making. 
    Always discuss results with your healthcare provider.`
    },
    {
        question: 'Can my cluster assignment change over time?',
        answer: `Yes, your cluster assignment can change as your health status changes. Weight loss, lifestyle modifications, 
    medication changes, and disease progression can all affect which cluster best describes your condition. 
    Regular reassessment is recommended.`
    },
    {
        question: 'What is the difference between FBS and HbA1c?',
        answer: `Fasting Blood Sugar (FBS) measures your blood glucose at a single point in time after fasting. 
    HbA1c reflects your average blood sugar over the past 2-3 months by measuring glucose attached to hemoglobin. 
    Both are important: FBS shows current control, while HbA1c shows long-term patterns.`
    },
    {
        question: 'Why are menopause-related factors important for diabetes risk?',
        answer: `Menopause brings hormonal changes that can affect metabolism, body composition, and insulin sensitivity. 
    Estrogen decline is associated with increased abdominal fat, decreased insulin sensitivity, and changes in lipid profiles. 
    Understanding these factors helps personalize risk assessment for menopausal women.`
    }
];

// Expandable card component with Framer Motion
const ExpandableCard = ({ title, children, defaultOpen = false, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <motion.div
            variants={slideUp}
            className="glass-card bg-white rounded-2xl border border-diana-sand overflow-hidden transition-all"
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-diana-stone/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon size={20} className="text-diana-forest" />}
                    <h3 className="text-lg font-bold text-diana-text-primary">{title}</h3>
                </div>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={20} className="text-diana-text-muted" />
                </motion.span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6">
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
    const [activeCluster, setActiveCluster] = useState(null);

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
                <div>
                    <h4 className="text-diana-text-muted font-medium text-sm mb-1 uppercase tracking-wider">Learn More</h4>
                    <h2 className="text-3xl font-bold text-diana-text-primary">Education Center</h2>
                    <p className="text-diana-text-secondary text-sm mt-1">
                        Understanding diabetes clusters, biomarkers, and your risk assessment
                    </p>
                </div>
            </header>

            {/* Quick Overview */}
            <div className="bg-gradient-to-r from-diana-forest to-diana-forest-light p-8 rounded-3xl text-white">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen size={28} />
                    <h3 className="text-2xl font-bold">Understanding Your Results</h3>
                </div>
                <p className="text-blue-100 leading-relaxed">
                    DIANA uses machine learning to analyze your biomarkers and assign you to one of four diabetes clusters.
                    Each cluster represents a distinct subtype of Type 2 Diabetes with unique characteristics and treatment considerations.
                    This personalized approach helps guide more effective management strategies.
                </p>
            </div>

            {/* Cluster Cards */}
            <div>
                <h3 className="text-xl font-bold text-diana-text-primary mb-4 flex items-center gap-2">
                    <Target size={20} className="text-diana-forest" />
                    Diabetes Clusters Explained
                </h3>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                    {Object.entries(clusterEducation).map(([key, cluster]) => (
                        <motion.div
                            key={key}
                            variants={slideUp}
                            whileHover={{ scale: 1.02, borderColor: 'rgba(75, 85, 99, 0.5)' }}
                            className={`glass-card bg-white rounded-3xl border-2 transition-all cursor-pointer ${activeCluster === key ? 'border-diana-forest shadow-lg' : 'border-diana-sand hover:border-diana-forest/50'
                                }`}
                            onClick={() => setActiveCluster(activeCluster === key ? null : key)}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={cluster.logo}
                                            alt={`${key} logo`}
                                            className="w-12 h-12 rounded-2xl object-cover"
                                            loading="lazy"
                                            decoding="async"
                                            width="48"
                                            height="48"
                                        />
                                        <div>
                                            <h4 className="font-bold text-diana-text-primary">{key}</h4>
                                            <p className="text-xs text-diana-text-muted">{cluster.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-diana-text-secondary text-sm mb-4">{cluster.shortDesc}</p>

                                <AnimatePresence>
                                    {activeCluster === key && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 pt-4 border-t border-diana-sand space-y-4">
                                                <p className="text-diana-text-primary text-sm leading-relaxed">{cluster.fullDesc}</p>

                                                <div>
                                                    <h5 className="text-xs font-bold text-diana-text-muted uppercase mb-2">Risk Factors</h5>
                                                    <ul className="space-y-1">
                                                        {cluster.riskFactors.map((factor) => (
                                                            <li key={`${key}-risk-${factor.substring(0, 20).replace(/\s+/g, '-')}`} className="text-sm text-diana-text-primary flex items-start gap-2">
                                                                <span className="text-diana-forest mt-1">•</span> {factor}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h5 className="text-xs font-bold text-diana-text-muted uppercase mb-2">Recommendations</h5>
                                                    <ul className="space-y-1">
                                                        {cluster.recommendations.map((rec) => (
                                                            <li key={`${key}-rec-${rec.substring(0, 20).replace(/\s+/g, '-')}`} className="text-sm text-diana-text-primary flex items-start gap-2">
                                                                <span className="text-green-600 mt-1">✓</span> {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className={`p-4 rounded-xl ${cluster.bgColor} ${cluster.borderColor} border`}>
                                                    <h5 className="text-xs font-bold text-diana-text-secondary uppercase mb-2">Clinical Implications</h5>
                                                    <ul className="space-y-1">
                                                        {cluster.clinicalImplications.map((imp) => (
                                                            <li key={`${key}-imp-${imp.substring(0, 20).replace(/\s+/g, '-')}`} className="text-sm text-diana-text-primary flex items-start gap-2">
                                                                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: cluster.color }} />
                                                                {imp}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Biomarker Reference */}
            <ExpandableCard title="Biomarker Reference Guide" icon={Activity} defaultOpen={true}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-diana-sand">
                                <th className="text-left py-3 text-diana-text-muted font-medium">Biomarker</th>
                                <th className="text-center py-3 text-green-600 font-medium">Normal</th>
                                <th className="text-center py-3 text-amber-600 font-medium">Pre-diabetic</th>
                                <th className="text-center py-3 text-red-600 font-medium">Diabetic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {biomarkerReference.map((bio) => (
                                <tr key={bio.name} className="border-b border-diana-sand">
                                    <td className="py-4">
                                        <div className="font-bold text-diana-text-primary">{bio.name}</div>
                                        <div className="text-xs text-diana-text-muted mt-1">{bio.description}</div>
                                    </td>
                                    <td className="text-center py-4 text-green-600 font-medium">{bio.normal}</td>
                                    <td className="text-center py-4 text-amber-600 font-medium">{bio.prediabetic}</td>
                                    <td className="text-center py-4 text-red-600 font-medium">{bio.diabetic}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ExpandableCard>

            {/* Understanding Risk */}
            <ExpandableCard title="Understanding Your Risk Score" icon={Lightbulb}>
                <div className="space-y-4">
                    <p className="text-diana-text-primary leading-relaxed">
                        Your risk score is calculated using machine learning algorithms trained on large population datasets.
                        The score represents the probability of developing or having Type 2 Diabetes based on your biomarker profile.
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                            <div className="text-2xl font-bold text-green-600">0-33%</div>
                            <div className="text-sm font-medium text-diana-text-primary mt-1">Low Risk</div>
                            <div className="text-xs text-diana-text-muted mt-2">Maintain healthy lifestyle, annual screening</div>
                        </div>
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                            <div className="text-2xl font-bold text-amber-600">34-66%</div>
                            <div className="text-sm font-medium text-diana-text-primary mt-1">Moderate Risk</div>
                            <div className="text-xs text-diana-text-muted mt-2">Lifestyle modifications, more frequent monitoring</div>
                        </div>
                        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                            <div className="text-2xl font-bold text-red-600">67-100%</div>
                            <div className="text-sm font-medium text-diana-text-primary mt-1">High Risk</div>
                            <div className="text-xs text-diana-text-muted mt-2">Consult healthcare provider, consider treatment</div>
                        </div>
                    </div>
                </div>
            </ExpandableCard>

            {/* FAQ Section */}
            <div>
                <h3 className="text-xl font-bold text-diana-text-primary mb-4 flex items-center gap-2">
                    <HelpCircle size={20} className="text-diana-forest" />
                    Frequently Asked Questions
                </h3>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="space-y-3"
                >
                    {faqData.map((faq) => (
                        <ExpandableCard key={faq.question} title={faq.question} icon={Info}>
                            <p className="text-diana-text-primary leading-relaxed">{faq.answer}</p>
                        </ExpandableCard>
                    ))}
                </motion.div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-amber-800 mb-2">Medical Disclaimer</h4>
                        <p className="text-sm text-amber-700 leading-relaxed">
                            This tool is for educational and informational purposes only. It is not intended to diagnose, treat, cure, or prevent any disease.
                            The risk predictions and cluster assignments are based on statistical models and should not replace professional medical advice.
                            Always consult with a qualified healthcare provider for diagnosis and treatment decisions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Education;
