import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getUserProfileApi, 
  getAssessmentsApi, 
  exportPDFApi 
  deleteAccountApi 
} from '../../api';
import RiskIndicator from '../common/RiskIndicator';
import ClusterRecommendations from '../common/ClusterRecommendations';
import PDFExport from '../common/PDFExport';

const Dashboard = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadAssessments();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('diana_token');
      const data = await getUserProfileApi(token);
      setProfile(data);
    } catch (err) {
      setError('Failed to load profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async () => {
    setAssessmentsLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('diana_token');
      const data = await getAssessmentsApi(token);
      setAssessments(data || []);
    } catch (err) {
      setError('Failed to load assessments: ' + err.message);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 border-t-transparent">
        </div>
      </div>
    );
  }

  if (!profile || loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 border-t-transparent">
        </div>
      </div>
    );
  }

  const latestAssessment = profile?.latest_assessment;
  const daysSinceLastAssessment = profile?.last_assessment_at 
    ? Math.floor((new Date() - new Date(profile?.last_assessment_at)) / (1000 * 60 * 60 * 24)) 
    : 0;

  const needsReminder = profile?.assessment_frequency_months
    ? daysSinceLastAssessment >= (profile.assessment_frequency_months * 30)
    : false;

  const riskColor = latestAssessment?.risk_level === 'low' 
    ? 'text-green-600' 
    : latestAssessment?.risk_level === 'medium'
      ? 'text-yellow-600' 
      : 'text-red-600';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {profile?.first_name || 'User'}!
          </h1>
          <p className="text-gray-600 mb-2">
            {daysSinceLastAssessment === 0 
              ? "Complete your first assessment to get started."
              : `Last assessment was ${daysSinceLastAssessment} days ago`}
            </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Latest Assessment Card */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Latest Assessment
            </h2>
            
            {latestAssessment ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(latestAssessment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                    <div className={riskColor}>
                      Risk Level: {latestAssessment.risk_level?.toUpperCase() || 'UNKNOWN'}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">HbA1c:</div>
                    <div className={`text-2xl font-bold ${riskColor}`}>
                      {latestAssessment.hba1c?.toFixed(2)}%
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">FBS:</div>
                    <div className="text-2xl font-medium text-gray-900">
                      {latestAssessment.fbs?.toFixed(2)} mg/dL
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">BMI:</div>
                    <div className="text-2xl font-medium text-gray-900">
                      {latestAssessment.bmi?.toFixed(1)} kg/m²
                    </div>
                  </div>

                  <ClusterRecommendations cluster={latestAssessment.cluster} />
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => handleNavigate('/assessments/new')}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md"
                  >
                    Log New Assessment
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 mt-12">
                No assessments yet. Log your first assessment to get started!
              </p>
            )}
          </div>

          {/* Assessment Count Card */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Assessment History
            </h2>
            
            <div className="text-4xl font-bold text-gray-900">
              Total Assessments: {profile?.assessment_count || 0}
            </div>

            <div className="flex items-center space-x-4 mt-2">
              <span className={`text-2xl font-semibold ${riskColor}`}>
                Risk Level: {latestAssessment?.risk_level?.toUpperCase() || 'N/A'}
              </span>
              <span className={`text-sm text-gray-600 ml-2`}>
                Cluster: {latestAssessment?.cluster || 'N/A'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => handleNavigate('/trends')}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md"
          >
            View Trends
          </button>
        </div>

        {/* PDF Export Card */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Export Health Report
          </h2>
            
          <p className="text-gray-600 mb-4">
            Generate a professional PDF report to share with your healthcare provider. 
            Includes your personal health information, assessment history, and current risk level.
          </p>

          <PDFExport />
        </div>
      </div>

        {/* Actions Card */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleNavigate('/profile')}
              className="px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-md"
            >
              My Profile
            </button>

            <button
              onClick={() => handleNavigate('/onboarding')}
              className="px-4 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 shadow-md"
              disab
