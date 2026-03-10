import React from 'react';

const ClusterRecommendations = ({ cluster }) => {
  const recommendations = {
    SIRD: {
      title: 'Severe Insulin-Resistant Diabetes',
      description: 'High BMI, high triglycerides, low HDL — insulin resistance pattern.',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '⚠️',
      focus: [
        'Weight management through diet and exercise',
        'Cardiovascular health monitoring',
        'Regular physical activity (150+ minutes/week)',
        'Mediterranean or DASH diet',
        'Screen for sleep apnea',
      ],
    },
    SIDD: {
      title: 'Atherogenic / Lipid-Driven Diabetes',
      description: 'High TG/HDL ratio — metabolic derangement pattern.',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '🩸',
      focus: [
        'Blood glucose monitoring (regular testing)',
        'Insulin therapy consideration',
        'Monitor for diabetic complications',
        'Regular kidney function tests',
        'Annual eye exams',
        'Foot care education',
      ],
    },
    MOD: {
      title: 'Mild Obesity-Related Diabetes',
      description: 'Elevated BMI with moderate metabolic markers — obesity-driven pattern.',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '🔶',
      focus: [
        'Weight loss (5-10% of body weight)',
        'Healthy eating plan',
        'Moderate exercise (30 min/day)',
        'Monitor lipids and blood pressure',
        'Consider metformin or similar medications',
      ],
    },
    MARD: {
      title: 'Mild Age-Related Diabetes',
      description: 'Older age with mild metabolic values — age-related pattern.',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: '✅',
      focus: [
        'Regular health checkups',
        'Maintain healthy weight',
        'Lifestyle management',
        'Cardiovascular screening',
      ],
    },
  };

  const clusterInfo = recommendations[cluster];

  if (!clusterInfo) {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border ${clusterInfo.color}`}>
      <div className="flex items-start space-x-3">
        <span className="text-2xl">{clusterInfo.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{clusterInfo.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{clusterInfo.description}</p>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Focus Areas:</h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              {clusterInfo.focus.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClusterRecommendations;
