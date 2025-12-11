// PatientHistory: list, profile, and assessment form for menopausal risk.
import React, { useEffect, useState } from 'react';
import { ChevronRight, ArrowLeft, Activity, Clipboard, FileText, CheckCircle, XCircle, Heart, TrendingUp, X, Users, Thermometer } from 'lucide-react';
import Button from './Button';

const PatientHistory = ({ viewState, setViewState, patients = [], loadAssessments, onSubmitAssessment }) => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    fbs: '',
    hba1c: '',
    menopauseStatus: 'Perimenopause',
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

  const clusterDescriptions = {
    SOIRD: 'Severe obesity-related & insulin-resistant diabetes',
    SIDD: 'Severe insulin-deficient diabetes',
    MARD: 'Mild age-associated diabetes',
    MIDD: 'Mild insulin-deficient diabetes',
  };

  const getRiskMeta = (score) => {
    if (score === null || score === undefined || score === '') {
      return { label: 'No risk available', badge: 'bg-[#EFF4FB] text-[#1B2559]', value: '--' };
    }
    const numeric = Number(score);
    if (Number.isNaN(numeric)) {
      return { label: 'No risk available', badge: 'bg-[#EFF4FB] text-[#1B2559]', value: '--' };
    }
    if (numeric >= 67) return { label: 'High risk', badge: 'bg-[#EE5D50] text-white', value: numeric };
    if (numeric >= 34) return { label: 'Moderate risk', badge: 'bg-[#FFB547] text-[#1B2559]', value: numeric };
    return { label: 'Low risk', badge: 'bg-[#6AD2FF] text-[#1B2559]', value: numeric };
  };

  const renderLoadingRows = () =>
    Array.from({ length: 3 }).map((_, idx) => (
      <tr key={`skeleton-${idx}`} className="animate-pulse">
        <td className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#E0E5F2]" />
            <div className="space-y-2">
              <div className="h-3 w-28 bg-[#E0E5F2] rounded" />
              <div className="h-2 w-16 bg-[#E0E5F2] rounded" />
            </div>
          </div>
        </td>
        <td className="p-6">
          <div className="h-3 w-20 bg-[#E0E5F2] rounded mb-2" />
          <div className="h-2 w-14 bg-[#E0E5F2] rounded" />
        </td>
        <td className="p-6">
          <div className="h-3 w-32 bg-[#E0E5F2] rounded" />
        </td>
        <td className="p-6">
          <div className="h-3 w-24 bg-[#E0E5F2] rounded mb-2" />
          <div className="h-2 w-32 bg-[#E0E5F2] rounded" />
        </td>
        <td className="p-6">
          <div className="w-8 h-8 rounded-full border border-[#E0E5F2] bg-[#F4F7FE]" />
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
      } else {
        const bmi = parseFloat(calculatedBMI) || 20;
        const hba1c = parseFloat(formData.hba1c) || 5.0;
        let calculatedCluster = 'MIDD';
        let riskScore = 20;
        if (bmi > 30 && hba1c > 6.0) {
          calculatedCluster = 'SOIRD';
          riskScore = 85;
        } else if (hba1c > 6.5 && bmi < 27) {
          calculatedCluster = 'SIDD';
          riskScore = 92;
        } else {
          calculatedCluster = 'MIDD';
          riskScore = 30;
        }
        setCluster(calculatedCluster);
        setPrediction(riskScore);
      }
    } catch (err) {
      setCluster('Error');
      setPrediction(null);
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
        setSelectedPatient({ ...patient, history: history || [] });
      } catch (_) {
        /* ignore */
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const PatientProfileView = ({ patient }) => {
    if (!patient) return null;
    const riskMeta = getRiskMeta(patient.risk ?? patient.risk_score);
    return (
      <div className="animate-fade-in pb-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setViewState('list')}
            className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#1B2559] hover:bg-[#F4F7FE] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-[#1B2559]">{patient.name}</h2>
          <p className="text-[#A3AED0]">ID: {patient.id || patient.idNumber || 'N/A'} • {patient.status || patient.menopause_status}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border border-[#E0E5F2] ${riskMeta.badge}`}>{riskMeta.label}</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F7FE] text-[#1B2559] border border-[#E0E5F2]">
              {clusterDescriptions[patient.cluster] || 'Cluster description unavailable'}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F4F7FE] text-[#1B2559] border border-[#E0E5F2]">
              Patient self-check • discuss with provider
            </span>
          </div>
          </div>
        </div>

        <div
          className={`mb-8 p-8 rounded-3xl flex items-center justify-between text-white shadow-lg relative overflow-hidden ${
            patient.cluster === 'SOIRD' || patient.cluster === 'SIDD' ? 'bg-[#111C44]' : 'bg-[#4318FF]'
          }`}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 opacity-80 text-sm uppercase tracking-widest font-bold mb-2">
              <Activity size={16} /> Clinical Cluster Assignment
            </div>
            <h2 className="text-4xl font-bold">{patient.cluster || 'N/A'}</h2>
            <p className="text-lg mt-2 opacity-90 max-w-xl">
              {patient.cluster === 'SOIRD' && 'Severe Obesity-Related & Insulin-Resistant Diabetes'}
              {patient.cluster === 'SIDD' && 'Severe Insulin-Deficient Diabetes'}
              {patient.cluster === 'MARD' && 'Mild Age-Associated Diabetes'}
              {patient.cluster === 'MIDD' && 'Mild Insulin-Deficient Diabetes'}
            </p>
          </div>
          <TrendingUp size={96} className="opacity-20 absolute right-8 -bottom-4" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm text-center relative overflow-hidden border border-[#E0E5F2]">
              <div
                className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-4xl font-bold mb-4 relative z-10 transition-all duration-500 ${
                  patient.risk > 66
                    ? 'bg-[#EE5D50] text-white shadow-red-200 shadow-xl'
                    : patient.risk > 33
                    ? 'bg-[#FFB547] text-[#1B2559] shadow-orange-200 shadow-xl'
                    : 'bg-[#6AD2FF] text-[#1B2559] shadow-blue-200 shadow-xl'
                }`}
              >
                {patient.risk || patient.risk_score || 'N/A'}%
              </div>
              <h3 className="text-[#1B2559] font-bold text-xl mb-1">Probabilistic Risk</h3>
              <p className="text-[#A3AED0] text-sm">Last assessment: {patient.lastVisit || 'N/A'}</p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#E0E5F2]">
              <h4 className="text-[#1B2559] font-bold mb-3 flex items-center gap-2">
                <FileText size={18} className="text-[#4318FF]" /> Share with your provider
              </h4>
              <p className="text-sm text-[#A3AED0] leading-relaxed">
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
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[#1B2559] font-bold text-xl flex items-center gap-2">
                  <TrendingUp size={20} className="text-[#4318FF]" /> Historical Biomarker Trends
                </h3>
              </div>
              <div className="h-80 w-full relative border-l border-b border-[#E0E5F2] pl-2 pb-2">
                {historyLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[#A3AED0]">Loading history…</div>
                ) : patient.history && patient.history.length > 0 ? (
                  <div className="absolute inset-0 flex items-end justify-between px-8">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-50">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="w-full h-px bg-[#E0E5F2] border-t border-dashed"></div>
                      ))}
                    </div>
                    {patient.history.map((record, i) => (
                      <div key={i} className="relative h-full flex items-end group">
                        <div className="w-8 bg-[#4318FF] rounded-t-md mx-1 hover:opacity-80 transition-all relative z-10 cursor-pointer" style={{ height: `${(record.hba1c / 10) * 100}%` }}>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-xs font-bold text-white bg-[#1B2559] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {record.hba1c}%
                          </div>
                        </div>
                        <div className="w-8 bg-[#6AD2FF] rounded-t-md mx-1 hover:opacity-80 transition-all relative z-10 cursor-pointer" style={{ height: `${(record.fbs / 200) * 100}%` }}>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 text-xs font-bold text-white bg-[#1B2559] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {record.fbs} mg/dL
                          </div>
                        </div>
                        <div className="absolute top-full mt-4 text-xs font-bold text-[#A3AED0] w-20 text-center -ml-4">{record.date}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#A3AED0]">No historical data available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (viewState === 'form') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 lg:p-8 relative animate-scale-in">
          <button
            onClick={() => setViewState('list')}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#F4F7FE] text-[#1B2559] flex items-center justify-center hover:bg-[#E0E5F2] transition-colors"
          >
            <X size={18} />
          </button>
          <header className="flex items-center gap-4 mb-8">
            <button
              onClick={() => setViewState('list')}
              className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#1B2559] hover:bg-[#F4F7FE] transition-colors border border-[#E0E5F2]"
            >
              <ChevronRight className="rotate-180" />
            </button>
            <div>
              <h2 className="text-3xl font-bold text-[#1B2559]">New Assessment</h2>
              <p className="text-[#A3AED0]">Complete biomarker data for Cluster-Based Identification.</p>
            </div>
          </header>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
              {formError && <div className="mb-4 text-sm text-[#EE5D50] font-semibold">{formError}</div>}
              <div className="mb-8">
                <h3 className="text-[#1B2559] text-lg font-bold mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#4318FF]/10 text-[#4318FF] flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  Patient Demographics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Name</label>
                    <input
                      type="text"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Age</label>
                    <input
                      type="number"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Weight (kg)</label>
                    <input
                      type="number"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Height (cm)</label>
                    <input
                      type="number"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Menopausal Status</label>
                    <select
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all appearance-none"
                      onChange={(e) => setFormData({ ...formData, menopauseStatus: e.target.value })}
                    >
                      <option value="Perimenopause">Perimenopause</option>
                      <option value="Menopause">Menopause</option>
                      <option value="Postmenopause">Postmenopause</option>
                      <option value="Surgical Menopause">Surgical Menopause</option>
                    </select>
                  </div>
                  {formData.menopauseStatus !== 'Perimenopause' && (
                    <div className="space-y-2 col-span-2 md:col-span-2 animate-fade-in">
                      <label className="text-[#1B2559] text-sm font-bold ml-1">Years Since Menopause</label>
                      <input
                        type="number"
                        className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                        onChange={(e) => setFormData({ ...formData, yearsMenopause: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full h-px bg-[#E0E5F2] my-8" />
              <div className="mb-8">
                <h3 className="text-[#1B2559] text-lg font-bold mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#4318FF]/10 text-[#4318FF] flex items-center justify-center">
                    <Thermometer size={18} />
                  </div>
                  Blood Biomarkers
                </h3>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[#1B2559] text-sm font-bold ml-1">Fasting Blood Sugar</label>
                      <span className="text-[#A3AED0] text-xs">Normal: &lt;100</span>
                    </div>
                    <input
                      type="number"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                      placeholder="mg/dL"
                      onChange={(e) => setFormData({ ...formData, fbs: e.target.value })}
                    />
                    <p className="text-[11px] text-[#A3AED0]">Refer to lab ranges (FBS/OGTT) from study tables.</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-[#1B2559] text-sm font-bold ml-1">HbA1c (%)</label>
                      <span className="text-[#A3AED0] text-xs">Normal: &lt;5.7%</span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] focus:ring-4 focus:ring-[#4318FF]/10 outline-none transition-all"
                      placeholder="%"
                      onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })}
                    />
                    <p className="text-[11px] text-[#A3AED0]">Use recent lab value; long-term control indicator.</p>
                  </div>
                </div>
                <div className="bg-[#F4F7FE] p-6 rounded-2xl border border-[#E0E5F2]">
                  <h4 className="text-[#707EAE] font-bold text-sm uppercase mb-4">Lipid Profile</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'cholesterol', label: 'Total Cholesterol' },
                      { key: 'triglycerides', label: 'Triglycerides' },
                      { key: 'ldl', label: 'LDL-C' },
                      { key: 'hdl', label: 'HDL-C' },
                    ].map((field) => (
                      <div className="space-y-2" key={field.key}>
                        <label className="text-[#1B2559] text-xs font-bold ml-1">{field.label}</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-transparent p-3 rounded-lg text-[#1B2559] focus:border-[#4318FF] outline-none transition-all shadow-sm"
                          placeholder="mg/dL"
                          onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="w-full h-px bg-[#E0E5F2] my-8" />
              <div>
                <h3 className="text-[#1B2559] text-lg font-bold mb-6 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#4318FF]/10 text-[#4318FF] flex items-center justify-center">
                    <Clipboard size={18} />
                  </div>
                  Medical History & Lifestyle
                </h3>
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Systolic BP</label>
                    <input
                      type="number"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] outline-none transition-all"
                      placeholder="mmHg"
                      onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Diastolic BP</label>
                    <input
                      type="number"
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] outline-none transition-all"
                      placeholder="mmHg"
                      onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[#1B2559] text-sm font-bold ml-1">Physical Activity (Yes/No)</label>
                    <select
                      className="w-full bg-[#F4F7FE] border border-transparent p-4 rounded-xl text-[#1B2559] focus:bg-white focus:border-[#4318FF] outline-none transition-all appearance-none"
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
                      className="flex items-center gap-3 p-4 rounded-xl border border-[#E0E5F2] cursor-pointer hover:bg-[#F4F7FE] transition-colors"
                    >
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded text-[#4318FF] focus:ring-[#4318FF]"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            [item.key]: item.checkboxVal ? (e.target.checked ? item.checkboxVal : item.fallback || 'No') : e.target.checked,
                          })
                        }
                      />
                      <span className="text-[#1B2559] font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111C44] rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-2">Live Analysis</h3>
                <p className="opacity-70 text-sm mb-6">Real-time BMI calculation based on input parameters.</p>
                <div className="flex justify-between items-end border-b border-white/20 pb-4 mb-4">
                  <span className="text-sm opacity-80">Calculated BMI</span>
                  <span className="text-3xl font-bold">{calculatedBMI || '--.-'}</span>
                </div>
                <div className="text-xs opacity-60">Fill in all core biomarkers to enable risk prediction and cluster assignment.</div>
              </div>
              <Activity size={120} className="absolute -bottom-6 -right-6 opacity-10" />
            </div>
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-[#E0E5F2] sticky top-6">
              <h3 className="text-[#1B2559] font-bold text-xl mb-6">Action</h3>
              <div className="space-y-4">
                <Button fullWidth onClick={calculateRisk} disabled={isComputing}>
                  {isComputing ? 'Processing...' : 'Run Cluster Analysis'}
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setViewState('list')}>
                  Cancel Assessment
                </Button>
              </div>
              {prediction !== null && (
                <div className="mt-8 pt-8 border-t border-[#E0E5F2] animate-fade-in">
                  <div className="text-center">
                    <p className="text-[#A3AED0] text-xs font-bold uppercase tracking-widest mb-1">Identified Cluster</p>
                    <h2 className="text-4xl font-bold text-[#4318FF] mb-2">{cluster}</h2>
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${
                        getRiskMeta(prediction).badge
                      }`}
                    >
                      {prediction}% Risk Probability
                    </div>
                  </div>
                </div>
              )}
              <div className="mt-6 text-[12px] text-[#A3AED0] leading-relaxed">
                Next steps: keep these results, schedule a follow-up with your provider, and repeat labs as advised.
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col animate-fade-in pb-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h4 className="text-[#707EAE] font-medium text-sm mb-1">Database</h4>
          <h2 className="text-3xl font-bold text-[#1B2559]">Patient History</h2>
        </div>
      </header>
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-[#E0E5F2]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E5F2] bg-[#F4F7FE]">
                <th className="p-6 text-[#A3AED0] font-medium text-sm uppercase tracking-wider">Patient</th>
                <th className="p-6 text-[#A3AED0] font_medium text-sm uppercase tracking-wider">Status</th>
                <th className="p-6 text-[#A3AED0] font_medium text-sm uppercase tracking-wider">Biomarkers</th>
                <th className="p-6 text-[#A3AED0] font_medium text-sm uppercase tracking-wider">Assigned Cluster</th>
                <th className="p-6 text-[#A3AED0] font_medium text-sm uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0E5F2]">
              {patients === undefined || patients === null ? (
                renderLoadingRows()
              ) : (patients && patients.length > 0) ? (
                patients.map((p) => {
                  const riskMeta = getRiskMeta(p.risk ?? p.risk_score);
                  return (
                    <tr key={p.id} className="hover:bg-[#F4F7FE] transition-colors group cursor-pointer" onClick={() => handleViewProfile(p)}>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#4318FF] text-white flex items-center justify-center font-bold shadow-md group-hover:scale-110 transition-transform">
                            {p.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-[#1B2559] font-bold text-sm group-hover:text-[#4318FF] transition-colors">{p.name || 'Unnamed'}</div>
                            <div className="text-[#A3AED0] text-xs font-medium">ID: {p.id || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-[#1B2559] font-medium text-sm">{p.menopause_status || 'N/A'}</span>
                        <div className="text-[#A3AED0] text-xs">Age: {p.age || 'N/A'}</div>
                        <div className="mt-2 inline-block px-2 py-1 rounded-full text-[11px] font-semibold border border-[#E0E5F2] text-[#1B2559] bg-[#F4F7FE]">
                          {riskMeta.label}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-2">
                          <div className="bg-[#EFF4FB] px-2 py-1 rounded text-xs font-bold text-[#1B2559] border border-[#E0E5F2]">FBS: {p.fbs || '--'}</div>
                          <div className="bg-[#EFF4FB] px-2 py-1 rounded text-xs font-bold text-[#1B2559] border border-[#E0E5F2]">A1c: {p.hba1c || '--'}%</div>
                          <div className={`px-2 py-1 rounded text-xs font-bold border border-[#E0E5F2] ${riskMeta.badge}`}>
                            {riskMeta.value === '--' ? '--' : `${riskMeta.value}%`}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              p.cluster === 'SOIRD' || p.cluster === 'SIDD' ? 'bg-[#111C44] text-white' : 'bg-[#6AD2FF]/20 text-[#1B2559]'
                            }`}
                          >
                            {p.cluster || 'N/A'}
                          </span>
                          <div className="text-[11px] text-[#A3AED0] font-medium leading-snug">
                            {clusterDescriptions[p.cluster] || 'Cluster description unavailable'}
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <button className="w-8 h-8 rounded-full border border-[#E0E5F2] flex items-center justify-center text-[#A3AED0] hover:text-[#4318FF] hover:border-[#4318FF] transition-colors bg-white">
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#A3AED0]">
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
      <p className="text-[#A3AED0] text-xs mt-4">
        This tool supports cluster-based risk assessment for menopausal women; results should be interpreted alongside healthcare providers.
      </p>
    </div>
  );
};

export default PatientHistory;

