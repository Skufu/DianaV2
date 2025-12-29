// Education: comprehensive educational content about diabetes clusters and risk assessment
import React, { useState } from 'react';
import {
    BookOpen, ChevronDown, ChevronUp, Heart, Activity,
    AlertTriangle, Info, HelpCircle, Lightbulb, Target
} from 'lucide-react';

// Comprehensive cluster education data
export const clusterEducation = {
    SIDD: {
        name: 'Severe Insulin-Deficient Diabetes',
        shortDesc: 'Early onset, low BMI, poor metabolic control',
        color: '#EE5D50',
        bgColor: 'bg-[#EE5D50]/10',
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
        color: '#FFB547',
        bgColor: 'bg-[#FFB547]/10',
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
        color: '#6AD2FF',
        bgColor: 'bg-[#6AD2FF]/10',
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
        color: '#05CD99',
        bgColor: 'bg-[#05CD99]/10',
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

// Expandable card component
const ExpandableCard = ({ title, children, defaultOpen = false, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="glass-card rounded-2xl border border-slate-600/30 overflow-hidden transition-all">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon size={20} className="text-teal-400" />}
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>
            {isOpen && (
                <div className="px-6 pb-6 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

// Main Education component
const Education = () => {
    const [activeCluster, setActiveCluster] = useState(null);

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
                <div>
                    <h4 className="text-[#707EAE] font-medium text-sm mb-1">Learn More</h4>
                    <h2 className="text-3xl font-bold text-white">Education Center</h2>
                    <p className="text-slate-400 text-sm mt-1">
                        Understanding diabetes clusters, biomarkers, and your risk assessment
                    </p>
                </div>
            </header>

            {/* Quick Overview */}
            <div className="bg-gradient-to-br from-teal-500 to-cyan-500 p-8 rounded-3xl text-white">
                <div className="flex items-center gap-3 mb-4">
                    <BookOpen size={28} />
                    <h3 className="text-2xl font-bold">Understanding Your Results</h3>
                </div>
                <p className="text-white/80 leading-relaxed">
                    DIANA uses machine learning to analyze your biomarkers and assign you to one of four diabetes clusters.
                    Each cluster represents a distinct subtype of Type 2 Diabetes with unique characteristics and treatment considerations.
                    This personalized approach helps guide more effective management strategies.
                </p>
            </div>

            {/* Cluster Cards */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Target size={20} className="text-teal-400" />
                    Diabetes Clusters Explained
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(clusterEducation).map(([key, cluster]) => (
                        <div
                            key={key}
                            className={`glass-card rounded-3xl border-2 transition-all cursor-pointer ${activeCluster === key ? 'border-[#4318FF] shadow-lg' : 'border-slate-600/30 hover:border-[#4318FF]/50'
                                }`}
                            onClick={() => setActiveCluster(activeCluster === key ? null : key)}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                                            style={{ backgroundColor: cluster.color }}
                                        >
                                            {key}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white">{key}</h4>
                                            <p className="text-xs text-[#707EAE]">{cluster.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-slate-400 text-sm mb-4">{cluster.shortDesc}</p>

                                {activeCluster === key && (
                                    <div className="mt-4 pt-4 border-t border-slate-600/30 space-y-4 animate-fade-in">
                                        <p className="text-white text-sm leading-relaxed">{cluster.fullDesc}</p>

                                        <div>
                                            <h5 className="text-xs font-bold text-[#707EAE] uppercase mb-2">Risk Factors</h5>
                                            <ul className="space-y-1">
                                                {cluster.riskFactors.map((factor, i) => (
                                                    <li key={i} className="text-sm text-white flex items-start gap-2">
                                                        <span className="text-teal-400 mt-1">•</span> {factor}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div>
                                            <h5 className="text-xs font-bold text-[#707EAE] uppercase mb-2">Recommendations</h5>
                                            <ul className="space-y-1">
                                                {cluster.recommendations.map((rec, i) => (
                                                    <li key={i} className="text-sm text-white flex items-start gap-2">
                                                        <span className="text-[#05CD99] mt-1">✓</span> {rec}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className={`p-4 rounded-xl ${cluster.bgColor}`}>
                                            <h5 className="text-xs font-bold text-[#707EAE] uppercase mb-2">Clinical Implications</h5>
                                            <ul className="space-y-1">
                                                {cluster.clinicalImplications.map((imp, i) => (
                                                    <li key={i} className="text-sm text-white flex items-start gap-2">
                                                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: cluster.color }} />
                                                        {imp}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Biomarker Reference */}
            <ExpandableCard title="Biomarker Reference Guide" icon={Activity} defaultOpen={true}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-600/30">
                                <th className="text-left py-3 text-[#707EAE] font-medium">Biomarker</th>
                                <th className="text-center py-3 text-[#05CD99] font-medium">Normal</th>
                                <th className="text-center py-3 text-[#FFB547] font-medium">Pre-diabetic</th>
                                <th className="text-center py-3 text-[#EE5D50] font-medium">Diabetic</th>
                            </tr>
                        </thead>
                        <tbody>
                            {biomarkerReference.map((bio, i) => (
                                <tr key={i} className="border-b border-slate-600/30">
                                    <td className="py-4">
                                        <div className="font-bold text-white">{bio.name}</div>
                                        <div className="text-xs text-slate-400 mt-1">{bio.description}</div>
                                    </td>
                                    <td className="text-center py-4 text-[#05CD99] font-medium">{bio.normal}</td>
                                    <td className="text-center py-4 text-[#FFB547] font-medium">{bio.prediabetic}</td>
                                    <td className="text-center py-4 text-[#EE5D50] font-medium">{bio.diabetic}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </ExpandableCard>

            {/* Understanding Risk */}
            <ExpandableCard title="Understanding Your Risk Score" icon={Lightbulb}>
                <div className="space-y-4">
                    <p className="text-white leading-relaxed">
                        Your risk score is calculated using machine learning algorithms trained on large population datasets.
                        The score represents the probability of developing or having Type 2 Diabetes based on your biomarker profile.
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-[#6AD2FF]/10 border border-[#6AD2FF]/30 text-center">
                            <div className="text-2xl font-bold text-[#6AD2FF]">0-33%</div>
                            <div className="text-sm font-medium text-white mt-1">Low Risk</div>
                            <div className="text-xs text-slate-400 mt-2">Maintain healthy lifestyle, annual screening</div>
                        </div>
                        <div className="p-4 rounded-xl bg-[#FFB547]/10 border border-[#FFB547]/30 text-center">
                            <div className="text-2xl font-bold text-[#FFB547]">34-66%</div>
                            <div className="text-sm font-medium text-white mt-1">Moderate Risk</div>
                            <div className="text-xs text-slate-400 mt-2">Lifestyle modifications, more frequent monitoring</div>
                        </div>
                        <div className="p-4 rounded-xl bg-[#EE5D50]/10 border border-[#EE5D50]/30 text-center">
                            <div className="text-2xl font-bold text-[#EE5D50]">67-100%</div>
                            <div className="text-sm font-medium text-white mt-1">High Risk</div>
                            <div className="text-xs text-slate-400 mt-2">Consult healthcare provider, consider treatment</div>
                        </div>
                    </div>
                </div>
            </ExpandableCard>

            {/* FAQ Section */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <HelpCircle size={20} className="text-teal-400" />
                    Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                    {faqData.map((faq, i) => (
                        <ExpandableCard key={i} title={faq.question} icon={Info}>
                            <p className="text-white leading-relaxed">{faq.answer}</p>
                        </ExpandableCard>
                    ))}
                </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-[#FFF5F5] border border-[#EE5D50]/30 p-6 rounded-2xl">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="text-[#EE5D50] flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-bold text-white mb-2">Medical Disclaimer</h4>
                        <p className="text-sm text-white leading-relaxed">
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
