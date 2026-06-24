import SIDDLogo from '../../assets/clusters/sidd.png';
import SIRDLogo from '../../assets/clusters/sird.png';
import MODLogo from '../../assets/clusters/mod.png';
import MARDLogo from '../../assets/clusters/mard.png';

export const clusterEducation = {
  SIRD: {
    name: 'Insulin Resistant',
    shortDesc:
      'Your result looks like an insulin-resistance pattern. Small, steady changes may help.',
    color: '#D97706',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    logo: SIRDLogo,
    fullDesc: `This screening pattern suggests your body may be working harder to process sugar and fats. Everyday changes like food choices, movement, sleep, and weight management may help. Your doctor can tell you which steps fit your health history.`,
    riskFactors: [
      'Higher levels of blood fats (triglycerides)',
      'Extra weight around your middle',
      'Lower "good" cholesterol (HDL)',
      'Family history of diabetes',
      'Changes related to menopause',
    ],
    recommendations: [
      'Focus on losing a small amount of weight—even 5-10% helps',
      'Add walking or light exercise to your routine',
      'Choose heart-healthy foods like vegetables, fish, and olive oil',
      'Talk to your doctor about whether follow-up tests are needed',
      'Get regular check-ups to track your progress',
    ],
    clinicalImplications: [
      'Lifestyle changes may be especially useful here',
      'Reducing belly fat can improve how your body uses insulin',
      'Regular monitoring helps catch changes early',
      'Your doctor may discuss medications that help insulin work better',
    ],
  },
  SIDD: {
    name: 'Cholesterol-Focused',
    shortDesc: 'Your result points most strongly toward cholesterol and blood-fat concerns.',
    color: '#DC2626',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    logo: SIDDLogo,
    fullDesc: `This screening pattern centers on cholesterol and related blood-fat markers. These numbers can affect heart and metabolic health, but they are also numbers you can review and track with your doctor.`,
    riskFactors: [
      'Higher LDL ("bad") cholesterol',
      'Higher total cholesterol levels',
      'Family history of heart disease',
      'Less physical activity',
      'Diet high in saturated fats',
    ],
    recommendations: [
      'Ask your doctor about a heart-healthy eating plan',
      'Add more fiber, fruits, and vegetables to your meals',
      'Stay active—even daily walks help your heart',
      'Get your cholesterol checked regularly',
      'Discuss whether cholesterol medication might help',
    ],
    clinicalImplications: [
      'Heart and metabolic health are the main focus for this pattern',
      'Diet and exercise can lower cholesterol naturally',
      'Your doctor may recommend medication if needed',
      'Regular check-ups help track whether the numbers are improving',
    ],
  },
  MOD: {
    name: 'Weight-Related',
    shortDesc: 'Your result points most strongly toward weight and waist-related factors.',
    color: '#2563EB',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    logo: MODLogo,
    fullDesc: `This screening pattern is mainly connected to weight and waist-related factors. Modest, steady changes can help improve metabolic health for many people, especially when they are realistic and supported by a clinician.`,
    riskFactors: [
      'Higher body weight or BMI',
      'Extra weight around your middle',
      'Less daily movement or exercise',
      'Eating patterns that may need adjusting',
      'Gradual weight gain over the years',
    ],
    recommendations: [
      'Set small, realistic weight loss goals',
      'Find physical activities you actually enjoy',
      'Make gradual changes to how you eat',
      'Ask your doctor about weight management support',
      'Celebrate small wins along the way',
    ],
    clinicalImplications: [
      'Lifestyle changes may be especially useful here',
      'Modest weight loss can help improve metabolic health',
      'Small changes are easier to maintain over time',
      'Your doctor can help create a plan that works for you',
    ],
  },
  MARD: {
    name: 'Mild Pattern',
    shortDesc: 'The mildest screening pattern, with no single factor standing out strongly.',
    color: '#16A34A',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    logo: MARDLogo,
    fullDesc: `This is the mildest of the four screening patterns. It means DIANA did not find one dominant area driving your result. That is encouraging, but it is still worth keeping regular check-ups and watching for changes over time.`,
    riskFactors: [
      'Milder overall metabolic changes',
      'No single dominant risk factor standing out',
      'Subtle shifts that may come with age',
      'Gradual changes in body composition',
      'Less physical activity over time',
    ],
    recommendations: [
      'Keep up with regular check-ups',
      'Stay active with activities you enjoy',
      'Eat a balanced, varied diet',
      'Get enough sleep and manage stress',
      'Maintain your current healthy habits',
    ],
    clinicalImplications: [
      'The mildest screening pattern of the four',
      'Very manageable with standard healthy habits',
      'Lower concern compared with the other screening patterns',
      'Focus on maintaining your good health',
    ],
  },
};
