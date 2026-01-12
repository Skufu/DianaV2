// PatientHistory: list, profile, and assessment form for menopausal risk.
import React, { useEffect, useState } from 'react';
import { ChevronRight, ArrowLeft, Activity, Clipboard, FileText, CheckCircle, XCircle, Heart, TrendingUp, X, Users, Thermometer, Edit2, Trash2, Eye, AlertTriangle, Info, Shuffle } from 'lucide-react';
import Button from '../common/Button';
import { updatePatientApi, deletePatientApi, updateAssessmentApi, deleteAssessmentApi } from '../../api';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { clusterEducation } from '../education/Education';

const PatientHistory = ({ viewState, setViewState, patients = [], loadAssessments, onSubmitAssessment, onRefreshPatients, token }) => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    fbs: '',
    hba1c: '',
    menopauseStatus: 'Postmenopause',
    yearsMenopause: 0,
    familyHistory: false,
    physActivity: false,
    systolic: '',
    diastolic: '',
    activity: 'No',
    cholesterol: '',
    ldl: '',
    hdl: '',
    triglycerides: '',
    smoking: 'No',
    hypertension: 'No',
    heartDisease: 'No',
  });
  const [prediction, setPrediction] = useState(null);
  const [cluster, setCluster] = useState(null);
  const [calculatedBMI, setCalculatedBMI] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [formError, setFormError] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const stepTitles = ['Demographics', 'Biomarkers', 'Medical History', 'Results'];

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 1: {
        const nameErr = validateField('name', formData.name);
        if (nameErr) { setFormError(nameErr); return false; }
        const ageErr = validateField('age', formData.age);
        if (ageErr) { setFormError(ageErr); return false; }
        break;
      }
      case 2: {
        const fbsErr = validateField('fbs', formData.fbs);
        if (fbsErr) { setFormError(fbsErr); return false; }
        const hba1cErr = validateField('hba1c', formData.hba1c);
        if (hba1cErr) { setFormError(hba1cErr); return false; }
        const cholErr = validateField('cholesterol', formData.cholesterol);
        if (formData.cholesterol && cholErr) { setFormError(cholErr); return false; }
        const ldlErr = validateField('ldl', formData.ldl);
        if (formData.ldl && ldlErr) { setFormError(ldlErr); return false; }
        const hdlErr = validateField('hdl', formData.hdl);
        if (formData.hdl && hdlErr) { setFormError(hdlErr); return false; }
        const trigErr = validateField('triglycerides', formData.triglycerides);
        if (formData.triglycerides && trigErr) { setFormError(trigErr); return false; }
        break;
      }
      case 3: {
        const sysErr = validateField('systolic', formData.systolic);
        if (formData.systolic && sysErr) { setFormError(sysErr); return false; }
        const diaErr = validateField('diastolic', formData.diastolic);
        if (formData.diastolic && diaErr) { setFormError(diaErr); return false; }
        break;
      }
      default:
        break;
    }
    setFormError(null);
    return true;
  };

  const nextStep = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 3) {
        // Step 3 -> 4: Run ML calculation
        await calculateRisk();
      } else {
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      }
    }
  };

  const prevStep = () => {
    setFormError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Reset step when form opens
  const resetForm = () => {
    setCurrentStep(1);
    setFormError(null);
    setPrediction(null);
    setCluster(null);
    setFormData({
      name: '',
      age: '',
      height: '',
      weight: '',
      fbs: '',
      hba1c: '',
      menopauseStatus: 'Postmenopause',
      yearsMenopause: 0,
      familyHistory: false,
      physActivity: false,
      systolic: '',
      diastolic: '',
      activity: 'No',
      cholesterol: '',
      ldl: '',
      hdl: '',
      triglycerides: '',
      smoking: 'No',
      hypertension: 'No',
      heartDisease: 'No',
    });
  };

  const randomBetween = (min, max, decimals = 0) => {
    const val = Math.random() * (max - min) + min;
    return decimals > 0 ? parseFloat(val.toFixed(decimals)) : Math.round(val);
  };

  const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const firstNames = ['Sarah', 'Maria', 'Jennifer', 'Lisa', 'Carmen', 'Patricia', 'Rachel', 'Diana', 'Amy', 'Michelle', 'Linda', 'Barbara', 'Susan', 'Nancy', 'Karen'];
  const lastNames = ['Johnson', 'Rodriguez', 'Wang', 'Thompson', 'Silva', 'Davis', 'Kim', 'Martinez', 'Chen', 'Brown', 'Smith', 'Garcia', 'Miller', 'Wilson', 'Moore'];

  const randomizeForm = () => {
    const age = randomBetween(45, 70);
    const height = randomBetween(150, 175);
    const weight = randomBetween(55, 95);
    
    const profileType = Math.random();
    let profile;
    
    if (profileType < 0.25) {
      profile = { type: 'SIDD', hba1cMin: 8.0, hba1cMax: 12.0, fbsMin: 180, fbsMax: 300, bmiMin: 28, bmiMax: 40, tgMin: 120, tgMax: 200, ldlMin: 100, ldlMax: 150, hdlMin: 35, hdlMax: 55 };
    } else if (profileType < 0.50) {
      profile = { type: 'SIRD', hba1cMin: 5.5, hba1cMax: 6.5, fbsMin: 100, fbsMax: 120, bmiMin: 35, bmiMax: 45, tgMin: 80, tgMax: 120, ldlMin: 90, ldlMax: 130, hdlMin: 40, hdlMax: 55 };
    } else if (profileType < 0.75) {
      profile = { type: 'MOD', hba1cMin: 5.5, hba1cMax: 6.2, fbsMin: 100, fbsMax: 115, bmiMin: 28, bmiMax: 34, tgMin: 160, tgMax: 250, ldlMin: 130, ldlMax: 180, hdlMin: 38, hdlMax: 50 };
    } else {
      profile = { type: 'MARD', hba1cMin: 4.8, hba1cMax: 5.6, fbsMin: 75, fbsMax: 100, bmiMin: 20, bmiMax: 28, tgMin: 60, tgMax: 100, ldlMin: 90, ldlMax: 140, hdlMin: 55, hdlMax: 85 };
    }
    
    const isHighRisk = profile.type === 'SIDD' || profile.type === 'SIRD';

    setFormData({
      name: `${randomChoice(firstNames)} ${randomChoice(lastNames)}`,
      age: age.toString(),
      height: height.toString(),
      weight: weight.toString(),
      fbs: randomBetween(profile.fbsMin, profile.fbsMax).toString(),
      hba1c: randomBetween(profile.hba1cMin, profile.hba1cMax, 1).toString(),
      menopauseStatus: 'Postmenopause',
      yearsMenopause: randomBetween(0, 15),
      familyHistory: Math.random() > 0.6,
      physActivity: Math.random() > 0.4,
      systolic: randomBetween(isHighRisk ? 130 : 100, isHighRisk ? 160 : 130).toString(),
      diastolic: randomBetween(isHighRisk ? 85 : 60, isHighRisk ? 100 : 85).toString(),
      activity: randomChoice(['No', 'Yes']),
      cholesterol: randomBetween(isHighRisk ? 200 : 150, isHighRisk ? 280 : 200).toString(),
      ldl: randomBetween(profile.ldlMin, profile.ldlMax).toString(),
      hdl: randomBetween(profile.hdlMin, profile.hdlMax).toString(),
      triglycerides: randomBetween(profile.tgMin, profile.tgMax).toString(),
      smoking: randomChoice(['No', 'Yes']),
      hypertension: isHighRisk ? randomChoice(['Yes', 'No']) : 'No',
      heartDisease: isHighRisk && Math.random() > 0.7 ? 'Yes' : 'No',
    });
    setFormError(null);
  };

  const validationRules = {
    name: { required: true, label: 'Name' },
    age: { required: true, min: 18, max: 120, label: 'Age' },
    height: { min: 100, max: 250, label: 'Height' },
    weight: { min: 30, max: 300, label: 'Weight' },
    fbs: { required: true, min: 50, max: 500, label: 'FBS' },
    hba1c: { required: true, min: 3, max: 15, label: 'HbA1c' },
    systolic: { min: 70, max: 250, label: 'Systolic BP' },
    diastolic: { min: 40, max: 150, label: 'Diastolic BP' },
    cholesterol: { min: 100, max: 400, label: 'Cholesterol' },
    ldl: { min: 30, max: 300, label: 'LDL' },
    hdl: { min: 20, max: 150, label: 'HDL' },
    triglycerides: { min: 50, max: 600, label: 'Triglycerides' },
  };

  const validateField = (key, value) => {
    const rule = validationRules[key];
    if (!rule) return null;

    if (rule.required && (!value || value === '')) {
      return `${rule.label} is required`;
    }

    const numVal = parseFloat(value);
    if (value && !isNaN(numVal)) {
      if (rule.min !== undefined && numVal < rule.min) {
        return `${rule.label} must be at least ${rule.min}`;
      }
      if (rule.max !== undefined && numVal > rule.max) {
        return `${rule.label} must be at most ${rule.max}`;
      }
    }
    return null;
  };

  const validateAllFields = () => {
    const errors = [];
    for (const [key, rule] of Object.entries(validationRules)) {
      const error = validateField(key, formData[key]);
      if (error) errors.push(error);
    }
    return errors;
  };

  // Step Indicator Component
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {stepTitles.map((title, idx) => {
        const stepNum = idx + 1;
        const isCompleted = currentStep > stepNum;
        const isCurrent = currentStep === stepNum;

        return (
          <React.Fragment key={idx}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${isCompleted
                  ? 'bg-[#05CD99] text-white'
                  : isCurrent
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
                    : 'bg-slate-700/30 text-slate-400 border-2 border-slate-600/30'
                  }`}
              >
                {isCompleted ? <CheckCircle size={18} /> : stepNum}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${isCurrent ? 'text-teal-400' : isCompleted ? 'text-[#05CD99]' : 'text-slate-400'
                  }`}
              >
                {title}
              </span>
            </div>
            {idx < stepTitles.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 rounded-full transition-colors ${isCompleted ? 'bg-[#05CD99]' : 'bg-slate-700'
                  }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Keep selectedPatient's summary fields in sync with the latest data
  // from the /patients API (single source of truth on the backend).
  useEffect(() => {
    if (!selectedPatient || !patients || patients.length === 0) return;
    const updated = patients.find((p) => p.id === selectedPatient.id);
    if (!updated) return;
    // Preserve any loaded history while updating summary fields.
    setSelectedPatient((prev) =>
      prev && prev.id === updated.id
        ? { ...updated, history: prev.history || [] }
        : prev
    );
  }, [patients, selectedPatient?.id]);

  // Attach assessment history to patient for charts, without overriding
  // summary fields that now come from the backend (single source of truth).
  const attachHistoryToPatient = (patient, history = []) => ({
    ...patient,
    history: history || [],
  });

  const clusterDescriptions = {
    SIDD: 'Severe Insulin-Deficient Diabetes',
    SIRD: 'Severe Insulin-Resistant Diabetes',
    MOD: 'Mild Obesity-Related Diabetes',
    MARD: 'Mild Age-Related Diabetes',
  };

  const getRiskMeta = (score) => {
    if (score === null || score === undefined || score === '') {
      return { label: 'No risk available', badge: 'bg-[#EFF4FB] text-white', value: '--' };
    }
    const numeric = Number(score);
    if (Number.isNaN(numeric)) {
      return { label: 'No risk available', badge: 'bg-[#EFF4FB] text-white', value: '--' };
    }
    if (numeric >= 67) return { label: 'High risk', badge: 'bg-[#EE5D50] text-white', value: numeric };
    if (numeric >= 34) return { label: 'Moderate risk', badge: 'bg-[#FFB547] text-white', value: numeric };
    return { label: 'Low risk', badge: 'bg-[#6AD2FF] text-white', value: numeric };
  };

  const renderLoadingRows = () =>
    Array.from({ length: 3 }).map((_, idx) => (
      <tr key={`skeleton-${idx}`} className="animate-pulse">
        <td className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-700" />
            <div className="space-y-2">
              <div className="h-3 w-28 bg-slate-700 rounded" />
              <div className="h-2 w-16 bg-slate-700 rounded" />
            </div>
          </div>
        </td>
        <td className="p-6">
          <div className="h-3 w-20 bg-slate-700 rounded mb-2" />
          <div className="h-2 w-14 bg-slate-700 rounded" />
        </td>
        <td className="p-6">
          <div className="h-3 w-32 bg-slate-700 rounded" />
        </td>
        <td className="p-6">
          <div className="h-3 w-24 bg-slate-700 rounded mb-2" />
          <div className="h-2 w-32 bg-slate-700 rounded" />
        </td>
        <td className="p-6">
          <div className="w-8 h-8 rounded-full border border-slate-600/30 bg-slate-700/30" />
        </td>
      </tr>
    ));

  useEffect(() => {
    if (formData.weight && formData.height) {
      const heightM = formData.height / 100;
      const bmi = (formData.weight / (heightM * heightM)).toFixed(1);
      setCalculatedBMI(bmi);
    } else {
      setCalculatedBMI(null);
    }
  }, [formData.weight, formData.height]);

  const calculateRisk = async () => {
    // Basic client-side validation for key fields
    if (!formData.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!formData.age || Number(formData.age) <= 0) {
      setFormError('Age is required.');
      return;
    }
    if (!formData.fbs || Number(formData.fbs) <= 0) {
      setFormError('FBS is required.');
      return;
    }
    if (!formData.hba1c || Number(formData.hba1c) <= 0) {
      setFormError('HbA1c is required.');
      return;
    }
    setFormError(null);
    setIsComputing(true);
    setPrediction(null);
    setCluster(null);
    try {
      if (onSubmitAssessment) {
        const bmi = parseFloat(calculatedBMI) || 0;
        const result = await onSubmitAssessment(formData, bmi);
        setCluster(result?.cluster || 'N/A');
        setPrediction(result?.risk_score ?? result?.riskScore ?? null);
        setCurrentStep(4);
      } else {
        const bmi = parseFloat(calculatedBMI) || 20;
        const hba1c = parseFloat(formData.hba1c) || 5.0;
        let calculatedCluster = 'MOD';
        let riskScore = 30;
        if (bmi > 30 && hba1c > 6.0) {
          calculatedCluster = 'SIRD';
          riskScore = 85;
        } else if (hba1c > 6.5 && bmi < 27) {
          calculatedCluster = 'SIDD';
          riskScore = 92;
        }
        setCluster(calculatedCluster);
        setPrediction(riskScore);
        // Advance to Step 4 results
        setCurrentStep(4);
      }
    } catch (err) {
      console.error('Assessment error:', err);
      setCluster('Error');
      setPrediction(null);
      // Still advance to Step 4 to show error state
      setCurrentStep(4);
    } finally {
      setIsComputing(false);
    }
  };

  const handleViewProfile = async (patient) => {
    setSelectedPatient(patient);
    setViewState('profile');
    if (loadAssessments) {
      setHistoryLoading(true);
      try {
        const history = await loadAssessments(patient.id);
        setSelectedPatient(attachHistoryToPatient(patient, history || []));
      } catch (_) {
        /* ignore */
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const handleEditPatient = (patient) => {
    setEditingPatient({
      ...patient,
      menopauseStatus: patient.menopause_status || patient.menopauseStatus || 'Postmenopause',
      yearsMenopause: patient.years_menopause || patient.yearsMenopause || 0,
      familyHistory: patient.family_history || patient.familyHistory || false,
      physActivity: patient.phys_activity || patient.physActivity || false,
    });
  };

  const handleSavePatient = async () => {
    if (!editingPatient || !token) return;
    try {
      const payload = {
        name: editingPatient.name,
        age: parseInt(editingPatient.age) || 0,
        menopause_status: editingPatient.menopauseStatus || editingPatient.menopause_status,
        years_menopause: parseInt(editingPatient.yearsMenopause || editingPatient.years_menopause) || 0,
        bmi: parseFloat(editingPatient.bmi) || 0,
        bp_systolic: parseInt(editingPatient.bp_systolic || editingPatient.systolic) || 0,
        bp_diastolic: parseInt(editingPatient.bp_diastolic || editingPatient.diastolic) || 0,
        activity: editingPatient.activity || 'No',
        phys_activity: editingPatient.physActivity || editingPatient.phys_activity || false,
        smoking: editingPatient.smoking || 'No',
        hypertension: editingPatient.hypertension || 'No',
        heart_disease: editingPatient.heartDisease || editingPatient.heart_disease || 'No',
        family_history: editingPatient.familyHistory || editingPatient.family_history || false,
        chol: parseInt(editingPatient.chol || editingPatient.cholesterol) || 0,
        ldl: parseInt(editingPatient.ldl) || 0,
        hdl: parseInt(editingPatient.hdl) || 0,
        triglycerides: parseInt(editingPatient.triglycerides) || 0,
      };
      await updatePatientApi(token, editingPatient.id, payload);
      setEditingPatient(null);
      if (onRefreshPatients) await onRefreshPatients();
    } catch (err) {
      alert('Failed to update patient: ' + err.message);
    }
  };

  const handleDeletePatient = async (patientId) => {
    setDeleteConfirm({ type: 'patient', id: patientId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) {
      console.error('confirmDelete: deleteConfirm is null');
      return;
    }
    if (!token) {
      console.error('confirmDelete: token is null');
      alert('Authentication error. Please refresh the page and try again.');
      setDeleteConfirm(null);
      return;
    }
    try {
      if (deleteConfirm.type === 'patient') {
        await deletePatientApi(token, deleteConfirm.id);
        setDeleteConfirm(null);
        if (onRefreshPatients) {
          await onRefreshPatients();
        }
      } else if (deleteConfirm.type === 'assessment') {
        await deleteAssessmentApi(token, deleteConfirm.patientId, deleteConfirm.id);
        setDeleteConfirm(null);
        // Refresh the patient's assessment history
        if (selectedPatient) {
          const history = await loadAssessments(selectedPatient.id);
          setSelectedPatient(attachHistoryToPatient(selectedPatient, history || []));
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete: ' + err.message);
      setDeleteConfirm(null);
    }
  };

  const handleEditAssessment = (assessment) => {
    setEditingAssessment(assessment);
  };

  const handleSaveAssessment = async () => {
    if (!editingAssessment || !token || !selectedPatient) return;
    try {
      const payload = {
        fbs: parseFloat(editingAssessment.fbs) || 0,
        hba1c: parseFloat(editingAssessment.hba1c) || 0,
        cholesterol: parseInt(editingAssessment.cholesterol) || 0,
        ldl: parseInt(editingAssessment.ldl) || 0,
        hdl: parseInt(editingAssessment.hdl) || 0,
        triglycerides: parseInt(editingAssessment.triglycerides) || 0,
        systolic: parseInt(editingAssessment.systolic) || 0,
        diastolic: parseInt(editingAssessment.diastolic) || 0,
        activity: editingAssessment.activity || 'No',
        history_flag: editingAssessment.history_flag || false,
        smoking: editingAssessment.smoking || 'No',
        hypertension: editingAssessment.hypertension || 'No',
        heart_disease: editingAssessment.heart_disease || 'No',
        bmi: parseFloat(editingAssessment.bmi) || 0,
      };
      await updateAssessmentApi(token, selectedPatient.id, editingAssessment.id, payload);
      setEditingAssessment(null);
      // Refresh the patient's assessment history
      const history = await loadAssessments(selectedPatient.id);
      setSelectedPatient(attachHistoryToPatient(selectedPatient, history || []));
    } catch (err) {
      alert('Failed to update assessment: ' + err.message);
    }
  };

  const handleDeleteAssessment = (assessment) => {
    setDeleteConfirm({ type: 'assessment', id: assessment.id, patientId: selectedPatient.id });
  };

  const PatientProfileView = ({ patient }) => {
    if (!patient) return null;
    const riskMeta = getRiskMeta(patient.risk ?? patient.risk_score);
    return (
      <div className="animate-fade-in pb-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setViewState('list')}
            className="w-10 h-10 glass-card rounded-xl shadow-sm flex items-center justify-center text-white hover:bg-slate-700/30 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-white">{patient.name}</h2>
            <p className="text-slate-400">ID: {patient.id || patient.idNumber || 'N/A'} • {patient.status || patient.menopause_status}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border border-slate-600/30 ${riskMeta.badge}`}>{riskMeta.label}</span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/30 text-white border border-slate-600/30">
                {clusterDescriptions[patient.cluster] || 'Cluster description unavailable'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/30 text-white border border-slate-600/30">
                Patient self-check • discuss with provider
              </span>
            </div>
          </div>
        </div>

        <div
          className={`mb-8 p-8 rounded-3xl flex items-center justify-between text-white shadow-lg relative overflow-hidden ${patient.cluster === 'SIDD' || patient.cluster === 'SIRD'
            ? 'bg-gradient-to-r from-[#EE5D50] to-[#FFB547]'
            : patient.cluster === 'MOD'
              ? 'bg-gradient-to-r from-[#6AD2FF] to-[#4318FF]'
              : patient.cluster === 'MARD'
                ? 'bg-gradient-to-r from-[#05CD99] to-[#6AD2FF]'
                : 'bg-teal-500'
            }`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 text-sm uppercase tracking-widest font-bold mb-2">
              <Activity size={16} /> Clinical Cluster Assignment
            </div>
            <h2 className="text-4xl font-bold">{patient.cluster || 'N/A'}</h2>
            <p className="text-lg mt-2 opacity-90 max-w-xl">
              {clusterDescriptions[patient.cluster] || 'Cluster description unavailable'}
            </p>
          </div>
          <TrendingUp size={96} className="opacity-20 absolute right-8 -bottom-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <div className="glass-card p-8 rounded-3xl shadow-sm text-center relative overflow-hidden border border-slate-600/30">
              <div
                className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl font-bold mb-4 relative z-10 transition-all duration-500 ${patient.risk > 66
                  ? 'bg-[#EE5D50] text-white shadow-red-200 shadow-xl'
                  : patient.risk > 33
                    ? 'bg-[#FFB547] text-white shadow-orange-200 shadow-xl'
                    : 'bg-[#6AD2FF] text-white shadow-blue-200 shadow-xl'
                  }`}
              >
                {patient.risk || patient.risk_score || 'N/A'}%
              </div>
              <h3 className="text-white font-bold text-xl mb-1">Probabilistic Risk</h3>
              <p className="text-slate-400 text-sm">Last assessment: {patient.lastVisit || 'N/A'}</p>
            </div>

            <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-600/30">
              <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                <FileText size={18} className="text-teal-400" /> Share with your provider
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                This tool is informational for patients. Save these results and review them with your clinician for medical decisions.
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                  Download / Print Summary
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-xl flex items-center gap-2">
                  <TrendingUp size={20} className="text-teal-400" /> Historical Biomarker Trends
                </h3>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                {historyLoading ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">Loading history…</div>
                ) : patient.history && patient.history.length > 0 ? (
                  <AreaChart
                    data={patient.history.map(h => ({
                      date: h.date || new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      HbA1c: parseFloat(h.hba1c) || 0,
                      FBS: parseFloat(h.fbs) || 0,
                      'Risk Score': parseInt(h.risk_score) || 0
                    }))}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorHbA1c" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4318FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4318FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorFBS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6AD2FF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6AD2FF" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EE5D50" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#EE5D50" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
                    <XAxis
                      dataKey="date"
                      stroke="#A3AED0"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#A3AED0"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1B2559',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        padding: '10px'
                      }}
                      labelStyle={{ color: '#A3AED0', marginBottom: '5px' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="HbA1c"
                      stroke="#4318FF"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorHbA1c)"
                      name="HbA1c (%)"
                    />
                    <Area
                      type="monotone"
                      dataKey="FBS"
                      stroke="#6AD2FF"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorFBS)"
                      name="FBS (mg/dL)"
                    />
                  </AreaChart>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">No historical data available.</div>
                )}
              </ResponsiveContainer>
            </div>

            {/* Risk Score Trend Chart */}
            {patient.history && patient.history.length > 0 && (
              <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <Activity size={20} className="text-[#EE5D50]" /> Risk Score Progression
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={patient.history.map(h => ({
                      date: h.date || new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      'Risk Score': parseInt(h.risk_score) || 0,
                      'BMI': parseFloat(h.bmi) || 0
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E5F2" />
                    <XAxis
                      dataKey="date"
                      stroke="#A3AED0"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <YAxis
                      stroke="#A3AED0"
                      style={{ fontSize: '12px', fontWeight: 600 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1B2559',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '12px',
                        padding: '10px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="Risk Score"
                      stroke="#EE5D50"
                      strokeWidth={3}
                      dot={{ fill: '#EE5D50', r: 6 }}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="BMI"
                      stroke="#FFB547"
                      strokeWidth={2}
                      dot={{ fill: '#FFB547', r: 4 }}
                      strokeDasharray="5 5"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {patient.history && patient.history.length > 0 && (
              <div className="glass-card p-8 rounded-3xl shadow-sm border border-slate-600/30">
                <h3 className="text-white font-bold text-xl mb-6 flex items-center gap-2">
                  <Clipboard size={20} className="text-teal-400" /> Assessment History
                </h3>
                <div className="space-y-3">
                  {patient.history.map((assessment, idx) => (
                    <div key={assessment.id || idx} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl border border-slate-600/30 hover:border-teal-500 transition-colors">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-slate-400 text-xs">Date</span>
                          <div className="text-white font-bold text-sm">{assessment.date || new Date(assessment.created_at).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">FBS / HbA1c</span>
                          <div className="text-white font-bold text-sm">{assessment.fbs} / {assessment.hba1c}%</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Risk Score</span>
                          <div className="text-white font-bold text-sm">{assessment.risk_score}%</div>
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Cluster</span>
                          <div className="text-white font-bold text-sm">{assessment.cluster}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditAssessment(assessment)}
                          className="w-8 h-8 rounded-full border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500 transition-colors glass-card"
                          title="Edit Assessment"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAssessment(assessment)}
                          className="w-8 h-8 rounded-full border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-[#EE5D50] hover:border-[#EE5D50] transition-colors glass-card"
                          title="Delete Assessment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render profile view when a patient is selected
  if (viewState === 'profile' && selectedPatient) {
    return <PatientProfileView patient={selectedPatient} />;
  }

  if (viewState === 'form') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 md:p-4 animate-fade-in">
        <div className="glass-card rounded-3xl shadow-2xl max-w-[95vw] md:max-w-6xl w-full max-h-[95vh] overflow-y-auto p-4 md:p-6 lg:p-8 relative animate-scale-in">
          <button
            onClick={() => { resetForm(); setViewState('list'); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-700/30 text-white flex items-center justify-center hover:bg-slate-700 transition-colors z-10"
          >
            <X size={18} />
          </button>
          <header className="mb-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => { resetForm(); setViewState('list'); }}
                className="w-10 h-10 md:w-12 md:h-12 glass-card rounded-2xl shadow-sm flex items-center justify-center text-white hover:bg-slate-700/30 transition-colors border border-slate-600/30"
              >
                <ChevronRight className="rotate-180" size={18} />
              </button>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">New Assessment</h2>
                <p className="text-slate-400 text-sm">Step {currentStep} of {totalSteps}</p>
              </div>
            </div>
            <StepIndicator />
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {currentStep < 4 && (
              <div className={`${currentStep === 3 ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
                <div className="glass-card p-4 md:p-8 rounded-3xl shadow-sm border border-slate-600/30">
                  {formError && <div className="mb-4 p-3 bg-[#FFF5F5] border border-[#EE5D50]/30 rounded-xl text-sm text-[#EE5D50] font-semibold flex items-center gap-2"><XCircle size={16} /> {formError}</div>}

                  {/* Randomize Button - visible on steps 1-3 */}
                  {currentStep < 4 && (
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={randomizeForm}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-medium transition-all"
                      >
                        <Shuffle size={16} />
                        Randomize Test Data
                      </button>
                    </div>
                  )}

                  {/* Step 1: Demographics */}
                  {currentStep === 1 && (
                    <div className="animate-fade-in">
                      <h3 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                          <Users size={18} />
                        </div>
                        Patient Demographics
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label htmlFor="patient-name" className="text-white text-sm font-bold ml-1">Name</label>
                          <input
                            id="patient-name"
                            name="name"
                            type="text"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="patient-age" className="text-white text-sm font-bold ml-1">Age</label>
                          <input
                            id="patient-age"
                            name="age"
                            type="number"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            value={formData.age}
                            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="patient-weight" className="text-white text-sm font-bold ml-1">Weight (kg)</label>
                          <input
                            id="patient-weight"
                            name="weight"
                            type="number"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="patient-height" className="text-white text-sm font-bold ml-1">Height (cm)</label>
                          <input
                            id="patient-height"
                            name="height"
                            type="number"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                          <label className="text-white text-sm font-bold ml-1">Menopausal Status</label>
                          <div className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white font-medium">
                            Postmenopausal
                          </div>
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-2 animate-fade-in">
                          <label htmlFor="patient-years-menopause" className="text-white text-sm font-bold ml-1">Years Since Menopause</label>
                          <input
                            id="patient-years-menopause"
                            name="yearsMenopause"
                            type="number"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                            value={formData.yearsMenopause}
                            onChange={(e) => setFormData({ ...formData, yearsMenopause: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Biomarkers */}
                  {currentStep === 2 && (
                    <div className="animate-fade-in">
                      <div className="mb-8">
                        <h3 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                            <Thermometer size={18} />
                          </div>
                          Blood Biomarkers
                        </h3>
                        <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <label htmlFor="patient-fbs" className="text-white text-sm font-bold ml-1">Fasting Blood Sugar</label>
                              <span className="text-slate-400 text-xs">Normal: &lt;100</span>
                            </div>
                            <input
                              id="patient-fbs"
                              name="fbs"
                              type="number"
                              className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                              placeholder="mg/dL"
                              value={formData.fbs}
                              onChange={(e) => setFormData({ ...formData, fbs: e.target.value })}
                            />
                            <p className="text-[11px] text-slate-400">Refer to lab ranges (FBS/OGTT) from study tables.</p>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <label htmlFor="patient-hba1c" className="text-white text-sm font-bold ml-1">HbA1c (%)</label>
                              <span className="text-slate-400 text-xs">Normal: &lt;5.7%</span>
                            </div>
                            <input
                              id="patient-hba1c"
                              name="hba1c"
                              type="number"
                              step="0.1"
                              className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all"
                              placeholder="%"
                              value={formData.hba1c}
                              onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })}
                            />
                            <p className="text-[11px] text-slate-400">Use recent lab value; long-term control indicator.</p>
                          </div>
                        </div>
                        <div className="bg-slate-700/30 p-6 rounded-2xl border border-slate-600/30">
                          <h4 className="text-[#707EAE] font-bold text-sm uppercase mb-4">Lipid Profile</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              { key: 'cholesterol', label: 'Total Cholesterol' },
                              { key: 'triglycerides', label: 'Triglycerides' },
                              { key: 'ldl', label: 'LDL-C' },
                              { key: 'hdl', label: 'HDL-C' },
                            ].map((field) => (
                              <div className="space-y-2" key={field.key}>
                                <label htmlFor={`patient-lipid-${field.key}`} className="text-white text-xs font-bold ml-1">{field.label}</label>
                                <input
                                  id={`patient-lipid-${field.key}`}
                                  name={field.key}
                                  type="number"
                                  className="w-full glass-card border border-transparent p-3 rounded-lg text-white focus:border-teal-500 outline-none transition-all shadow-sm"
                                  placeholder="mg/dL"
                                  value={formData[field.key]}
                                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Medical History */}
                  {currentStep === 3 && (
                    <div className="animate-fade-in">
                      <h3 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                          <Clipboard size={18} />
                        </div>
                        Medical History &amp; Lifestyle
                      </h3>
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <label htmlFor="patient-systolic" className="text-white text-sm font-bold ml-1">Systolic BP</label>
                          <input
                            id="patient-systolic"
                            name="systolic"
                            type="number"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 outline-none transition-all"
                            placeholder="mmHg"
                            value={formData.systolic}
                            onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="patient-diastolic" className="text-white text-sm font-bold ml-1">Diastolic BP</label>
                          <input
                            id="patient-diastolic"
                            name="diastolic"
                            type="number"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 outline-none transition-all"
                            placeholder="mmHg"
                            value={formData.diastolic}
                            onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label htmlFor="patient-phys-activity" className="text-white text-sm font-bold ml-1">Physical Activity (Yes/No)</label>
                          <select
                            id="patient-phys-activity"
                            name="physActivity"
                            className="w-full bg-slate-700/30 border border-transparent p-4 rounded-xl text-white focus:glass-card focus:border-teal-500 outline-none transition-all appearance-none"
                            value={formData.physActivity ? 'Yes' : 'No'}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                physActivity: e.target.value === 'Yes',
                                activity: e.target.value,
                              })
                            }
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { key: 'familyHistory', label: 'Family History of Diabetes' },
                          { key: 'smoking', label: 'Smoking History', checkboxVal: 'Yes', fallback: 'No' },
                          { key: 'hypertension', label: 'History of Hypertension', checkboxVal: 'Yes', fallback: 'No' },
                          { key: 'heartDisease', label: 'History of Heart Disease', checkboxVal: 'Yes', fallback: 'No' },
                        ].map((item) => (
                          <label
                            key={item.key}
                            htmlFor={`patient-${item.key}`}
                            className="flex items-center gap-3 p-4 rounded-xl border border-slate-600/30 cursor-pointer hover:bg-slate-700/30 transition-colors"
                          >
                            <input
                              id={`patient-${item.key}`}
                              name={item.key}
                              type="checkbox"
                              className="w-5 h-5 rounded text-teal-400 focus:ring-teal-500"
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  [item.key]: item.checkboxVal ? (e.target.checked ? item.checkboxVal : item.fallback || 'No') : e.target.checked,
                                })
                              }
                            />
                            <span className="text-white font-medium">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step Navigation */}
                  <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-600/30">
                    {currentStep > 1 && currentStep < 4 ? (
                      <Button variant="ghost" onClick={prevStep}>
                        ← Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    {currentStep < 4 ? (
                      <Button onClick={nextStep} disabled={isComputing}>
                        {currentStep === 3 ? (isComputing ? 'Analyzing...' : 'Submit & Analyze →') : 'Continue →'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 Live Analysis Sidebar */}
            {currentStep === 3 && (
              <div className="lg:col-span-1 space-y-6 animate-fade-in">
                <div className="bg-[#111C44] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Live Analysis</h3>
                    <p className="opacity-70 text-sm mb-6">Real-time BMI calculation based on input parameters.</p>
                    <div className="flex justify-between items-end border-b border-white/20 pb-4 mb-4">
                      <span className="text-sm opacity-80">Calculated BMI</span>
                      <span className="text-3xl font-bold">{calculatedBMI || '--.-'}</span>
                    </div>
                    <div className="text-xs opacity-60">Click "Submit & Analyze" to run the ML prediction and view your results.</div>
                  </div>
                  <Activity size={120} className="absolute -bottom-6 -right-6 opacity-10" />
                </div>
              </div>
            )}

            {/* Step 4: Results View */}
            {currentStep === 4 && (
              <div className="lg:col-span-3 animate-fade-in">
                <div className="max-w-3xl mx-auto space-y-6">
                  {/* Success Header */}
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto rounded-full bg-[#05CD99]/10 flex items-center justify-center mb-4">
                      <CheckCircle size={40} className="text-[#05CD99]" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Assessment Complete</h3>
                    <p className="text-slate-400 mt-2">Results have been saved to patient history</p>
                  </div>

                  {/* Cluster Result Card */}
                  <div
                    className="rounded-3xl p-8 text-white mb-6 relative overflow-hidden"
                    style={{
                      backgroundColor: clusterEducation[cluster?.toUpperCase()]?.color || '#4318FF',
                      background: `linear-gradient(135deg, ${clusterEducation[cluster?.toUpperCase()]?.color || '#4318FF'} 0%, ${clusterEducation[cluster?.toUpperCase()]?.color || '#4318FF'}dd 100%)`
                    }}
                  >
                    <div className="relative z-10">
                      <p className="text-white/70 text-sm mb-1">Identified Cluster</p>
                      <h2 className="text-4xl font-bold mb-1">{clusterEducation[cluster?.toUpperCase()]?.name || cluster}</h2>
                      {clusterEducation[cluster?.toUpperCase()] && (
                        <p className="text-white/90 text-lg font-medium opacity-80 italic">{cluster}</p>
                      )}
                      <div className="mt-6 pt-6 border-t border-white/20 flex items-center gap-8">
                        <div>
                          <p className="text-white/70 text-sm mb-1">Risk Probability</p>
                          <span className="text-4xl font-bold">{prediction ?? '--'}%</span>
                        </div>
                        <div>
                          <p className="text-white/70 text-sm mb-1">Risk Level</p>
                          <span className="text-xl font-bold">{getRiskMeta(prediction).label}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 opacity-10">
                      <Activity size={200} />
                    </div>
                  </div>

                  {/* Cluster Education Section */}
                  {clusterEducation[cluster?.toUpperCase()] && (
                    <div className="glass-card rounded-3xl p-8 border border-slate-600/30">
                      <div className="flex items-start gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                          <Info size={20} className="text-teal-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">What does {cluster} mean?</h4>
                          <p className="text-slate-400 text-sm">Understanding your cluster assignment</p>
                        </div>
                      </div>

                      <p className="text-white leading-relaxed mb-6">
                        {clusterEducation[cluster?.toUpperCase()]?.shortDesc}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h5 className="text-xs font-bold text-[#707EAE] uppercase mb-3">Key Risk Factors</h5>
                          <ul className="space-y-2">
                            {clusterEducation[cluster?.toUpperCase()]?.riskFactors.slice(0, 4).map((factor, i) => (
                              <li key={i} className="text-sm text-white flex items-start gap-2">
                                <span className="text-[#EE5D50] mt-1">•</span> {factor}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-[#707EAE] uppercase mb-3">Recommendations</h5>
                          <ul className="space-y-2">
                            {clusterEducation[cluster?.toUpperCase()]?.recommendations.slice(0, 4).map((rec, i) => (
                              <li key={i} className="text-sm text-white flex items-start gap-2">
                                <span className="text-[#05CD99] mt-1">✓</span> {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clinical Note */}
                  <div className="bg-[#FFF9E6] border border-[#FFB547]/30 p-6 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={24} className="text-[#FFB547] flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-amber-900 mb-1">Important Notice</h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                          This assessment is for informational purposes. Please discuss these results with your healthcare provider
                          for proper diagnosis and personalized treatment recommendations.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => window.print()}
                    >
                      Download / Print Results
                    </Button>
                    <Button
                      fullWidth
                      onClick={() => { resetForm(); setViewState('list'); if (onRefreshPatients) onRefreshPatients(); }}
                    >
                      Back to Patients
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div >
        </div >
      </div >
    );
  }

  return (
    <>
      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative animate-scale-in">
            <button
              onClick={() => setEditingPatient(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-700/30 text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Edit Patient</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-patient-name" className="block text-sm font-medium text-white mb-2">Name</label>
                <input
                  id="edit-patient-name"
                  name="name"
                  type="text"
                  value={editingPatient.name || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-patient-age" className="block text-sm font-medium text-white mb-2">Age</label>
                  <input
                    id="edit-patient-age"
                    name="age"
                    type="number"
                    value={editingPatient.age || ''}
                    onChange={(e) => setEditingPatient({ ...editingPatient, age: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Menopause Status</label>
                  <div className="w-full px-4 py-3 rounded-xl border border-slate-600/30 bg-slate-700/30 text-white font-medium">
                    Postmenopausal
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setEditingPatient(null)}>Cancel</Button>
                <Button onClick={handleSavePatient}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assessment Modal */}
      {editingAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 relative animate-scale-in">
            <button
              onClick={() => setEditingAssessment(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-700/30 text-white flex items-center justify-center hover:bg-slate-700 transition-colors"
            >
              <X size={18} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Edit Assessment</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-assessment-fbs" className="block text-sm font-medium text-white mb-2">FBS (mg/dL)</label>
                <input
                  id="edit-assessment-fbs"
                  name="fbs"
                  type="number"
                  step="0.01"
                  value={editingAssessment.fbs || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, fbs: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="edit-assessment-hba1c" className="block text-sm font-medium text-white mb-2">HbA1c (%)</label>
                <input
                  id="edit-assessment-hba1c"
                  name="hba1c"
                  type="number"
                  step="0.01"
                  value={editingAssessment.hba1c || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, hba1c: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="edit-assessment-cholesterol" className="block text-sm font-medium text-white mb-2">Cholesterol</label>
                <input
                  id="edit-assessment-cholesterol"
                  name="cholesterol"
                  type="number"
                  value={editingAssessment.cholesterol || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, cholesterol: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="edit-assessment-ldl" className="block text-sm font-medium text-white mb-2">LDL</label>
                <input
                  id="edit-assessment-ldl"
                  name="ldl"
                  type="number"
                  value={editingAssessment.ldl || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, ldl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="edit-assessment-hdl" className="block text-sm font-medium text-white mb-2">HDL</label>
                <input
                  id="edit-assessment-hdl"
                  name="hdl"
                  type="number"
                  value={editingAssessment.hdl || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, hdl: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Triglycerides</label>
                <input
                  type="number"
                  value={editingAssessment.triglycerides || ''}
                  onChange={(e) => setEditingAssessment({ ...editingAssessment, triglycerides: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-600/30 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={() => setEditingAssessment(null)}>Cancel</Button>
              <Button onClick={handleSaveAssessment}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-card rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-scale-in">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#EE5D50]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} className="text-[#EE5D50]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Confirm Delete</h2>
              <p className="text-slate-400 mb-6">
                Are you sure you want to delete this {deleteConfirm.type}? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" fullWidth onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button fullWidth onClick={confirmDelete} className="bg-[#EE5D50] hover:bg-[#EE5D50]/90">Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-full flex flex-col animate-fade-in pb-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
          <div>
            <h4 className="text-[#707EAE] font-medium text-sm mb-1">Database</h4>
            <h2 className="text-3xl font-bold text-white">Patient History</h2>
          </div>
        </header>
        <div className="glass-card rounded-3xl shadow-sm overflow-hidden border border-slate-600/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-600/30 bg-slate-700/30">
                  <th className="p-6 text-slate-400 font-medium text-sm uppercase tracking-wider">Patient</th>
                  <th className="p-6 text-slate-400 font_medium text-sm uppercase tracking-wider">Status</th>
                  <th className="p-6 text-slate-400 font_medium text-sm uppercase tracking-wider">Biomarkers</th>
                  <th className="p-6 text-slate-400 font_medium text-sm uppercase tracking-wider">Assigned Cluster</th>
                  <th className="p-6 text-slate-400 font_medium text-sm uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E5F2]">
                {patients === undefined || patients === null ? (
                  renderLoadingRows()
                ) : (patients && patients.length > 0) ? (
                  patients.map((p) => {
                    const riskMeta = getRiskMeta(p.risk ?? p.risk_score);
                    return (
                      <tr key={p.id} className="hover:bg-slate-700/30 transition-colors group">
                        <td className="p-6 cursor-pointer" onClick={() => handleViewProfile(p)}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
                              {p.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="text-white font-bold text-sm group-hover:text-teal-400 transition-colors">{p.name || 'Unnamed'}</div>
                              <div className="text-slate-400 text-xs font-medium">ID: {p.id || 'N/A'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-6 cursor-pointer" onClick={() => handleViewProfile(p)}>
                          <span className="text-white font-medium text-sm">{p.menopause_status || 'N/A'}</span>
                          <div className="text-slate-400 text-xs">Age: {p.age || 'N/A'}</div>
                          <div className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-semibold border border-slate-600/30 text-white bg-slate-700/30">
                            {riskMeta.label}
                          </div>
                        </td>
                        <td className="p-6 cursor-pointer" onClick={() => handleViewProfile(p)}>
                          <div className="flex flex-wrap gap-2">
                            <div className="bg-teal-500/20 px-2 py-1 rounded text-xs font-bold text-teal-300 border border-teal-500/30">FBS: {p.fbs || '--'}</div>
                            <div className="bg-cyan-500/20 px-2 py-1 rounded text-xs font-bold text-cyan-300 border border-cyan-500/30">HbA1c: {p.hba1c || '--'}%</div>
                            <div className={`px-2 py-1 rounded text-xs font-bold border border-slate-600/30 ${riskMeta.badge}`}>
                              {riskMeta.value === '--' ? '--' : `${riskMeta.value}%`}
                            </div>
                          </div>
                        </td>
                        <td className="p-6 cursor-pointer" onClick={() => handleViewProfile(p)}>
                          <div className="space-y-1">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${p.cluster === 'SIRD' || p.cluster === 'SIDD' ? 'bg-[#111C44] text-white' : 'bg-[#6AD2FF]/20 text-white'
                                }`}
                            >
                              {p.cluster || 'N/A'}
                            </span>
                            <div className="text-[11px] text-slate-400 font-medium leading-snug">
                              {clusterDescriptions[p.cluster] || 'Cluster description unavailable'}
                            </div>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProfile(p);
                              }}
                              className="w-8 h-8 rounded-full border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500 transition-colors glass-card"
                              title="View Profile"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPatient(p);
                              }}
                              className="w-8 h-8 rounded-full border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-teal-400 hover:border-teal-500 transition-colors glass-card"
                              title="Edit Patient"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePatient(p.id);
                              }}
                              className="w-8 h-8 rounded-full border border-slate-600/30 flex items-center justify-center text-slate-400 hover:text-[#EE5D50] hover:border-[#EE5D50] transition-colors glass-card"
                              title="Delete Patient"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No patients found. Start a new assessment to populate history.
                      <div className="mt-4 flex justify-center">
                        <Button onClick={() => setViewState('form')}>New Assessment</Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-4">
          This tool supports cluster-based risk assessment for menopausal women; results should be interpreted alongside healthcare providers.
        </p>
      </div>
    </>
  );
};

export default PatientHistory;

