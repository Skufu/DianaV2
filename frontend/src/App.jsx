import React, { useEffect, useState } from 'react';
import { createAssessmentApi, createPatientApi, fetchAssessmentsApi, fetchPatientsApi, loginApi } from './api';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import PatientHistory from './components/PatientHistory';
import Analytics from './components/Analytics';
import Export from './components/Export';

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [patientViewState, setPatientViewState] = useState('list');
  const [patients, setPatients] = useState([]);
  const [assessmentsCache, setAssessmentsCache] = useState({});
  const [patientsError, setPatientsError] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const handleLogin = async (email, password) => {
    const res = await loginApi(email, password);
    if (!res?.token) throw new Error('login failed');
    setToken(res.token);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoadingPatients(true);
      setPatientsError(null);
      try {
        const data = await fetchPatientsApi(token);
        setPatients(data || []);
      } catch (err) {
        setPatientsError('Failed to load patients.');
      } finally {
        setLoadingPatients(false);
      }
    };
    load();
  }, [token]);

  const loadAssessments = async (patientId) => {
    if (assessmentsCache[patientId]) return assessmentsCache[patientId];
    const data = await fetchAssessmentsApi(token, patientId);
    setAssessmentsCache((prev) => ({ ...prev, [patientId]: data || [] }));
    return data || [];
  };

  const handleAssessmentSubmit = async (formData, bmi) => {
    if (!token) throw new Error('not authenticated');
    const patientPayload = {
      name: formData.name || 'New Patient',
      age: parseInt(formData.age) || null,
      menopause_status: formData.menopauseStatus,
      years_menopause: parseInt(formData.yearsMenopause) || null,
      bmi: bmi || null,
      bp_systolic: parseInt(formData.systolic) || null,
      bp_diastolic: parseInt(formData.diastolic) || null,
      activity: formData.activity,
      smoking: formData.smoking,
      hypertension: formData.hypertension,
      heart_disease: formData.heartDisease,
      chol: parseInt(formData.cholesterol) || null,
      ldl: parseInt(formData.ldl) || null,
      hdl: parseInt(formData.hdl) || null,
      triglycerides: parseInt(formData.triglycerides) || null,
    };
    const patient = await createPatientApi(token, patientPayload);
    const assessmentPayload = {
      fbs: parseFloat(formData.fbs) || 0,
      hba1c: parseFloat(formData.hba1c) || 0,
      cholesterol: parseInt(formData.cholesterol) || null,
      ldl: parseInt(formData.ldl) || null,
      hdl: parseInt(formData.hdl) || null,
      triglycerides: parseInt(formData.triglycerides) || null,
      systolic: parseInt(formData.systolic) || null,
      diastolic: parseInt(formData.diastolic) || null,
      activity: formData.activity,
      history_flag: !!formData.history,
      smoking: formData.smoking,
      hypertension: formData.hypertension,
      heart_disease: formData.heartDisease,
      bmi: bmi || null,
    };
    const assessment = await createAssessmentApi(token, patient.id, assessmentPayload);
    setPatients((prev) => [patient, ...prev]);
    setAssessmentsCache((prev) => ({ ...prev, [patient.id]: [assessment] }));
    return assessment;
  };

  const handleStartAssessment = () => {
    setActiveTab('patients');
    setPatientViewState('form');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onNavigateToPatient={() => setActiveTab('patients')} onStartAssessment={handleStartAssessment} />;
      case 'patients':
        return (
          <>
            {patientsError && <div className="text-red-600 mb-2">{patientsError}</div>}
            <PatientHistory
              viewState={patientViewState}
              setViewState={setPatientViewState}
              patients={patients}
              loadAssessments={loadAssessments}
              onSubmitAssessment={handleAssessmentSubmit}
            />
          </>
        );
      case 'analytics':
        return <Analytics />;
      case 'export':
        return <Export />;
      default:
        return <Dashboard onNavigateToPatient={() => setActiveTab('patients')} onStartAssessment={handleStartAssessment} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex bg-[#F4F7FE]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onStartAssessment={handleStartAssessment} />
      <main className="flex-1 ml-20 lg:ml-72 p-6 lg:p-10">{loadingPatients ? <div>Loading...</div> : renderContent()}</main>
    </div>
  );
};

export default App;
