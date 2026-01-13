import { z } from 'zod';

// Login Form Schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

// Patient Form Schema
export const patientSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  age: z.number()
    .min(18, 'Patient must be at least 18 years old')
    .max(120, 'Invalid age')
    .nullable(),
  height: z.string()
    .max(5, 'Invalid height')
    .nullable(),
  weight: z.string()
    .max(5, 'Invalid weight')
    .nullable(),
  menopauseStatus: z.enum(['Postmenopause', 'Perimenopause', 'Premenopause'], {
    errorMap: () => ({ message: 'Please select menopause status' }),
  }),
  yearsMenopause: z.number()
    .min(0, 'Years since menopause cannot be negative')
    .max(50, 'Invalid value')
    .nullable(),
  familyHistory: z.boolean(),
  physActivity: z.boolean(),
  systolic: z.string()
    .regex(/^\d{2,3}$/, 'Invalid systolic value')
    .nullable(),
  diastolic: z.string()
    .regex(/^\d{2,3}$/, 'Invalid diastolic value')
    .nullable(),
  activity: z.enum(['No', 'Yes', 'sedentary', 'light', 'moderate', 'active', 'very_active'], {
    errorMap: () => ({ message: 'Please select activity level' }),
  }),
  smoking: z.enum(['No', 'Yes', 'never', 'former', 'current'], {
    errorMap: () => ({ message: 'Please select smoking status' }),
  }),
  hypertension: z.enum(['No', 'Yes', 'no', 'yes'], {
    errorMap: () => ({ message: 'Please select hypertension status' }),
  }),
  heartDisease: z.enum(['No', 'Yes', 'no', 'yes'], {
    errorMap: () => ({ message: 'Please select heart disease status' }),
  }),
  cholesterol: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid cholesterol value')
    .nullable(),
  ldl: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid LDL value')
    .nullable(),
  hdl: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid HDL value')
    .nullable(),
  triglycerides: z.string()
    .regex(/^\d{1,4}(\.\d{1})?$/, 'Invalid triglycerides value')
    .nullable(),
});

// Assessment Form Schema (biomarkers for risk calculation)
export const assessmentSchema = z.object({
  fbs: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid fasting blood sugar value')
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'FBS must be positive',
    })
    .refine((val) => !val || parseFloat(val) <= 999, {
      message: 'FBS value too high',
    })
    .nullable(),
  hba1c: z.string()
    .regex(/^\d{1,2}(\.\d{1})?$/, 'Invalid HbA1c value')
    .refine((val) => !val || parseFloat(val) >= 0, {
      message: 'HbA1c must be positive',
    })
    .refine((val) => !val || parseFloat(val) <= 20, {
      message: 'HbA1c value too high',
    })
    .nullable(),
  cholesterol: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid cholesterol value')
    .nullable(),
  ldl: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid LDL value')
    .nullable(),
  hdl: z.string()
    .regex(/^\d{1,3}(\.\d{1})?$/, 'Invalid HDL value')
    .nullable(),
  triglycerides: z.string()
    .regex(/^\d{1,4}(\.\d{1})?$/, 'Invalid triglycerides value')
    .nullable(),
  systolic: z.string()
    .regex(/^\d{2,3}$/, 'Invalid systolic value')
    .refine((val) => !val || (parseInt(val) >= 70 && parseInt(val) <= 250), {
      message: 'Systolic must be between 70-250 mmHg',
    })
    .nullable(),
  diastolic: z.string()
    .regex(/^\d{2,3}$/, 'Invalid diastolic value')
    .refine((val) => !val || (parseInt(val) >= 40 && parseInt(val) <= 150), {
      message: 'Diastolic must be between 40-150 mmHg',
    })
    .nullable(),
  activity: z.enum(['', 'active', 'sedentary', 'light', 'moderate', 'active', 'very_active'], {
    errorMap: () => ({ message: 'Please select activity level' }),
  }),
  history_flag: z.boolean().optional(),
  smoking: z.enum(['', 'never', 'former', 'current', 'No', 'Yes'], {
    errorMap: () => ({ message: 'Please select smoking status' }),
  }),
  hypertension: z.enum(['', 'yes', 'no', 'Yes', 'No'], {
    errorMap: () => ({ message: 'Please select hypertension status' }),
  }),
  heart_disease: z.enum(['', 'yes', 'no', 'Yes', 'No'], {
    errorMap: () => ({ message: 'Please select heart disease status' }),
  }),
  bmi: z.number()
    .min(10, 'BMI too low')
    .max(70, 'BMI too high')
    .optional(),
});

// Helper function to validate and return formatted errors
export const validateForm = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: null };
  }

  // Format Zod errors for display
  const formattedErrors = {};
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    formattedErrors[path] = error.message;
  });

  return { valid: false, errors: formattedErrors };
};
