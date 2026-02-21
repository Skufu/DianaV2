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
        name: 'Body Mass Index (BMI)',
        unit: 'kg/m²',
        normal: '< 23.0',
        prediabetic: '23.0 - 24.9',
        diabetic: '≥ 25.0',
        description: 'Ratio of weight to height. Uses Philippine (Asia-Pacific WHO) cutoffs. Higher BMI increases diabetes risk, especially with central obesity.'
    },
    {
        name: 'Waist Circumference',
        unit: 'cm',
        normal: '< 80',
        prediabetic: '80 - 88',
        diabetic: '≥ 88',
        description: 'Indicator of central obesity. Important component of metabolic syndrome assessment.'
    },
    {
        name: 'Triglycerides',
        unit: 'mg/dL',
        normal: '< 150',
        prediabetic: '150 - 199',
        diabetic: '≥ 200',
        description: 'Type of fat in the blood. Elevated levels heavily correlate with insulin resistance.'
    },
    {
        name: 'HDL Cholesterol',
        unit: 'mg/dL',
        normal: '≥ 50',
        prediabetic: '40 - 49',
        diabetic: '< 40',
        description: '"Good" cholesterol that helps remove other forms of cholesterol. Lower values indicate higher risk.'
    },
    {
        name: 'TG/HDL Ratio',
        unit: 'ratio',
        normal: '< 2.0',
        prediabetic: '2.0 - 3.0',
        diabetic: '≥ 3.0',
        description: 'Validated surrogate marker for insulin resistance. High ratios suggest atherogenic dyslipidemia.'
    }
];

// FAQ data
const faqData = [
    {
        question: 'What do the diabetes clusters mean for my treatment?',
        answer: (
            <span>
                The clusters (SIDD, SIRD, MOD, MARD) help your healthcare provider understand which type of diabetes you may have.
                Each cluster has different characteristics and may respond better to certain treatments. For example, SIDD may benefit from early insulin,
                while MOD often responds well to lifestyle changes. Your provider will use this information alongside other factors to personalize your care.
            </span>
        )
    },
    {
        question: 'How accurate is the risk prediction?',
        answer: (
            <span>
                The prediction model is trained on large population datasets and uses machine learning algorithms validated in clinical research.
                However, individual results may vary, and this tool should be used as one input among many in clinical decision-making.
                Always discuss results with your healthcare provider.
            </span>
        )
    },
    {
        question: 'Can my cluster assignment change over time?',
        answer: (
            <span>
                Yes, your cluster assignment can change as your health status changes. Weight loss, lifestyle modifications,
                medication changes, and disease progression can all affect which cluster best describes your condition.
                Regular reassessment is recommended.
            </span>
        )
    },
    {
        question: "Why doesn't the model use Fasting Blood Sugar(FBS) or HbA1c?",
        answer: (
            <span>
                Our model predicts your underlying risk <strong>before</strong> clinical diabetes develops. FBS and HbA1c are diagnostic markers used to confirm diabetes. By focusing on metabolic biomarkers like BMI, Waist Circumference, and Triglycerides, the system can identify risk patterns much earlier.
            </span>
        )
    },
    {
        question: 'Why are menopause-related factors important for diabetes risk?',
        answer: (
            <span>
                Menopause brings hormonal changes that can affect metabolism, body composition, and insulin sensitivity.
                Estrogen decline is associated with increased abdominal fat, decreased insulin sensitivity, and changes in lipid profiles.
                Understanding these factors helps personalize risk assessment for menopausal women.
            </span>
        )
    }
];

// Expandable card component with Framer Motion
const ExpandableCard = ({ title, children, defaultOpen = false, icon: Icon, colorTheme = "forest" }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const themeMap = {
        forest: {
            bg: "bg-[#F3F9F6]",
            icon: "text-diana-forest",
            iconBg: "bg-[#E6F3EC]",
            border: "border-diana-forest/20",
        },
        blue: {
            bg: "bg-blue-50/50",
            icon: "text-blue-600",
            iconBg: "bg-blue-100",
            border: "border-blue-200",
        }
    };

    const theme = themeMap[colorTheme] || themeMap.forest;

    return (
        <motion.div
            variants={slideUp}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`glass-card bg-white rounded-3xl border transition-all duration-300 ${isOpen ? `${theme.border} shadow-lg` : 'border-diana-sand hover:border-gray-300 shadow-sm overflow-hidden'}`}
        >
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full p-6 md:p-8 flex items-center justify-between transition-colors text-left gap-4 ${isOpen ? theme.bg + " rounded-t-3xl" : 'hover:bg-gray-50'}`}
            >
                <div className="flex items-center gap-5">
                    {Icon && (
                        <div className={`p-4 rounded-2xl flex-shrink-0 transition-colors ${isOpen ? theme.iconBg : 'bg-gray-100'}`}>
                            <Icon size={28} className={`${isOpen ? theme.icon : 'text-gray-500'}`} />
                        </div>
                    )}
                    <h3 className={`text-xl md:text-2xl font-bold transition-colors ${isOpen ? 'text-gray-900' : 'text-gray-700'}`}>{title}</h3>
                </div>
                <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex-shrink-0 p-3 rounded-full transition-colors ${isOpen ? theme.iconBg : 'bg-gray-50'}`}
                >
                    <ChevronDown size={24} className={isOpen ? theme.icon : 'text-gray-400'} />
                </motion.span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
                        className="overflow-hidden"
                    >
                        <div className={`px-6 md:px-12 pb-8 pt-6 border-t ${theme.border} bg-white rounded-b-3xl`}>
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
                    <h4 className="text-diana-text-muted font-semibold text-base mb-2 uppercase tracking-wider">Learn More</h4>
                    <h2 className="text-4xl font-bold text-diana-text-primary">Education Center</h2>
                    <p className="text-diana-text-secondary text-lg mt-2 leading-relaxed">
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
                <p className="text-blue-100 text-lg leading-loose">
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
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
                >
                    {Object.entries(clusterEducation).map(([key, cluster]) => (
                        <motion.div
                            key={key}
                            variants={slideUp}
                            whileHover={activeCluster === key ? {} : {
                                scale: 1.02,
                                y: -5,
                                borderColor: 'rgba(75, 85, 99, 0.5)',
                                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                            }}
                            className={`glass-card bg-white rounded-3xl border-2 transition-all ${activeCluster === key ? 'border-diana-forest shadow-xl' : 'border-diana-sand hover:border-diana-forest/50 cursor-pointer'
                                }`}
                            onClick={() => {
                                if (activeCluster !== key) {
                                    setActiveCluster(key);
                                } else {
                                    setActiveCluster(null);
                                }
                            }}
                        >
                            <div className="p-6 md:p-8">
                                <div className={`flex items-start justify-between mb-4 ${activeCluster === key && 'cursor-pointer'}`} onClick={(e) => {
                                    if (activeCluster === key) {
                                        e.stopPropagation();
                                        setActiveCluster(null);
                                    }
                                }}>
                                    <div className="flex items-center gap-5">
                                        <img
                                            src={cluster.logo}
                                            alt={`${key} logo`}
                                            className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-white"
                                            loading="lazy"
                                            decoding="async"
                                            width="64"
                                            height="64"
                                        />
                                        <div>
                                            <h4 className="font-bold text-2xl text-diana-text-primary">{key}</h4>
                                            <p className="text-base text-diana-text-secondary font-medium">{cluster.name}</p>
                                        </div>
                                    </div>
                                    <motion.span
                                        animate={{ rotate: activeCluster === key ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="mt-2"
                                    >
                                        <ChevronDown size={28} className="text-diana-text-muted" />
                                    </motion.span>
                                </div>
                                <p className="text-diana-text-primary text-lg mb-2 leading-relaxed font-medium">{cluster.shortDesc}</p>

                                <AnimatePresence>
                                    {activeCluster === key && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-6 pt-6 border-t border-diana-sand space-y-8">
                                                <p className="text-diana-text-primary text-lg leading-loose">{cluster.fullDesc}</p>

                                                <div>
                                                    <h5 className="text-base font-bold text-diana-text-primary uppercase mb-4 tracking-wider">Risk Factors</h5>
                                                    <ul className="space-y-3">
                                                        {cluster.riskFactors.map((factor) => (
                                                            <li key={`${key}-risk-${factor.substring(0, 20).replace(/\\s+/g, '-')}`} className="text-lg text-diana-text-secondary flex items-start gap-4">
                                                                <span className="text-diana-forest mt-1.5 min-w-[12px] text-xl">•</span>
                                                                <span>{factor}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h5 className="text-base font-bold text-diana-text-primary uppercase mb-4 tracking-wider">Recommendations</h5>
                                                    <ul className="space-y-3">
                                                        {cluster.recommendations.map((rec) => (
                                                            <li key={`${key}-rec-${rec.substring(0, 20).replace(/\\s+/g, '-')}`} className="text-lg text-diana-text-secondary flex items-start gap-4">
                                                                <span className="text-green-600 mt-1 font-bold">✓</span>
                                                                <span>{rec}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className={`p-6 rounded-2xl ${cluster.bgColor} ${cluster.borderColor} border`}>
                                                    <h5 className="text-base font-bold text-diana-text-primary uppercase mb-4 tracking-wider flex items-center gap-3">
                                                        <AlertTriangle size={24} className="flex-shrink-0" style={{ color: cluster.color }} />
                                                        Clinical Implications
                                                    </h5>
                                                    <ul className="space-y-3">
                                                        {cluster.clinicalImplications.map((imp) => (
                                                            <li key={`${key}-imp-${imp.substring(0, 20).replace(/\\s+/g, '-')}`} className="text-lg text-diana-text-secondary flex items-start gap-4">
                                                                <span className="mt-1.5 min-w-[12px] text-xl" style={{ color: cluster.color }}>•</span>
                                                                <span>{imp}</span>
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
                            <tr className="border-b-2 border-diana-sand text-lg">
                                <th className="text-left py-5 text-diana-text-secondary font-bold uppercase tracking-wider">Biomarker</th>
                                <th className="text-center py-5 text-green-700 font-bold whitespace-nowrap">Optimal / Normal</th>
                                <th className="text-center py-5 text-amber-700 font-bold whitespace-nowrap">Borderline / At-Risk</th>
                                <th className="text-center py-5 text-red-700 font-bold whitespace-nowrap">Elevated / High Risk</th>
                            </tr>
                        </thead>
                        <tbody>
                            {biomarkerReference.map((bio) => (
                                <tr key={bio.name} className="border-b border-diana-sand">
                                    <td className="py-6 pr-6">
                                        <div className="font-bold text-xl text-diana-text-primary mb-2 flex items-baseline gap-2">
                                            {bio.name}
                                            {bio.unit && <span className="text-sm font-medium text-diana-text-muted">({bio.unit})</span>}
                                        </div>
                                        <div className="text-base text-diana-text-secondary leading-relaxed max-w-lg">{bio.description}</div>
                                    </td>
                                    <td className="text-center py-6 text-green-700 font-bold text-xl">{bio.normal}</td>
                                    <td className="text-center py-6 text-amber-700 font-bold text-xl">{bio.prediabetic}</td>
                                    <td className="text-center py-6 text-red-700 font-bold text-xl">{bio.diabetic}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ExpandableCard>

            {/* Understanding Risk */}
            <ExpandableCard title="Understanding Your Risk Score" icon={Lightbulb}>
                <div className="space-y-6">
                    <p className="text-diana-text-primary text-base leading-loose">
                        Your risk score is calculated using machine learning algorithms trained on large population datasets.
                        The score represents the probability of developing or having Type 2 Diabetes based on your biomarker profile.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-center">
                            <div className="text-3xl font-bold text-green-600">0-33%</div>
                            <div className="text-base font-bold text-diana-text-primary mt-2">Low Risk</div>
                            <div className="text-sm text-diana-text-muted mt-3">Maintain healthy lifestyle, annual screening</div>
                        </div>
                        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-center">
                            <div className="text-3xl font-bold text-amber-600">34-66%</div>
                            <div className="text-base font-bold text-diana-text-primary mt-2">Moderate Risk</div>
                            <div className="text-sm text-diana-text-muted mt-3">Lifestyle modifications, more frequent monitoring</div>
                        </div>
                        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center">
                            <div className="text-3xl font-bold text-red-600">67-100%</div>
                            <div className="text-base font-bold text-diana-text-primary mt-2">High Risk</div>
                            <div className="text-sm text-diana-text-muted mt-3">Consult healthcare provider, consider treatment</div>
                        </div>
                    </div>
                </div>
            </ExpandableCard>

            {/* FAQ Section */}
            <div>
                <h3 className="text-3xl font-bold text-diana-text-primary mb-8 flex items-center gap-3">
                    <HelpCircle size={32} className="text-diana-forest" />
                    Frequently Asked Questions
                </h3>
                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.1 }}
                    className="space-y-4"
                >
                    {faqData.map((faq) => (
                        <ExpandableCard key={faq.question} title={faq.question} icon={Info} colorTheme="blue">
                            <p className="text-gray-600 text-lg leading-relaxed">{faq.answer}</p>
                        </ExpandableCard>
                    ))}
                </motion.div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl mt-8">
                <div className="flex items-start gap-4">
                    <AlertTriangle size={28} className="text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-amber-800 text-lg mb-2">Medical Disclaimer</h4>
                        <p className="text-base text-amber-700 leading-loose">
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
