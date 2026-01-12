// Export: provides CSV download links for patients and assessments with filtering options
import React, { useState } from 'react';
import { API_BASE } from '../../api';
import Button from '../common/Button';
import { Download, FileText, Filter } from 'lucide-react';

const Export = ({ token }) => {
  const [menopauseFilter, setMenopauseFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (menopauseFilter !== 'all') {
      params.append('menopause_status', menopauseFilter);
    }
    if (riskFilter !== 'all') {
      params.append('risk_level', riskFilter);
    }
    return params.toString() ? `?${params.toString()}` : '';
  };

  const openLink = (path) => () => {
    const queryString = buildQueryString();
    window.open(`${API_BASE}${path}${queryString}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <header className="mb-8">
        <h4 className="text-[#707EAE] font-medium text-sm mb-1">Data Management</h4>
        <h2 className="text-3xl font-bold text-white">Export Data</h2>
        <p className="text-slate-400 text-sm mt-1">
          Download patient data and insights reports for clinical records or research
        </p>
      </header>

      {/* Filtering Options */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-600/30">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={20} className="text-teal-400" />
          <h3 className="text-xl font-bold text-white">Filter Options</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Apply filters to export specific patient subsets based on menopausal status and risk level
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Menopause Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Menopausal Status
            </label>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All Statuses' },
                { value: 'perimenopausal', label: 'Perimenopausal' },
                { value: 'postmenopausal', label: 'Postmenopausal' },
                { value: 'premenopausal', label: 'Premenopausal' }
              ].map(option => (
                <label
                  key={option.value}
                  htmlFor={`export-menopause-${option.value}`}
                  className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${menopauseFilter === option.value
                    ? 'border-teal-500 bg-slate-700/30'
                    : 'border-slate-600/30 hover:border-[#A3AED0]'
                    }`}
                >
                  <input
                    id={`export-menopause-${option.value}`}
                    type="radio"
                    name="menopause"
                    value={option.value}
                    checked={menopauseFilter === option.value}
                    onChange={(e) => setMenopauseFilter(e.target.value)}
                    className="mr-3 w-4 h-4 text-teal-400"
                  />
                  <span className="text-sm font-medium text-white">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-sm font-semibold text-white mb-3">
              Diabetes Risk Level
            </label>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All Risk Levels', color: '#A3AED0' },
                { value: 'low', label: 'Low Risk (0-33%)', color: '#6AD2FF' },
                { value: 'moderate', label: 'Moderate Risk (34-66%)', color: '#FFB547' },
                { value: 'high', label: 'High Risk (67-100%)', color: '#EE5D50' }
              ].map(option => (
                <label
                  key={option.value}
                  htmlFor={`export-risk-${option.value}`}
                  className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${riskFilter === option.value
                    ? 'border-teal-500 bg-slate-700/30'
                    : 'border-slate-600/30 hover:border-[#A3AED0]'
                    }`}
                >
                  <input
                    id={`export-risk-${option.value}`}
                    type="radio"
                    name="risk"
                    value={option.value}
                    checked={riskFilter === option.value}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="mr-3 w-4 h-4 text-teal-400"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="text-sm font-medium text-white">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(menopauseFilter !== 'all' || riskFilter !== 'all') && (
          <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/30">
            <p className="text-sm font-semibold text-white mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {menopauseFilter !== 'all' && (
                <span className="px-3 py-1 glass-card rounded-lg text-sm text-teal-400 border border-teal-500">
                  Menopause: {menopauseFilter}
                </span>
              )}
              {riskFilter !== 'all' && (
                <span className="px-3 py-1 glass-card rounded-lg text-sm text-teal-400 border border-teal-500">
                  Risk: {riskFilter}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-600/30">
        <div className="flex items-center gap-2 mb-4">
          <Download size={20} className="text-teal-400" />
          <h3 className="text-xl font-bold text-white">Export Patient Data</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Download CSV files containing patient demographics, biomarkers, and assessment history
        </p>

        <div className="space-y-4">
          {/* Patients CSV */}
          <div className="p-4 border-2 border-slate-600/30 rounded-xl hover:border-teal-500 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">Patients Data (CSV)</h4>
                <p className="text-sm text-slate-400">
                  Patient demographics: name, age, menopause status, blood pressure, activity level, and complete lipid panel
                </p>
                {(menopauseFilter !== 'all' || riskFilter !== 'all') && (
                  <p className="text-xs text-teal-400 mt-2 font-medium">
                    ✓ Filters will be applied to this export
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={openLink('/api/v1/export/patients.csv')}
                className="ml-4 bg-teal-500 text-white hover:bg-[#3311DD] flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </Button>
            </div>
          </div>

          {/* Assessments CSV */}
          <div className="p-4 border-2 border-slate-600/30 rounded-xl hover:border-teal-500 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-white mb-1">Assessments Data (CSV)</h4>
                <p className="text-sm text-slate-400">
                  Assessment records: FBS, HbA1c, BMI, risk scores, cluster assignments, timestamps, and validation status
                </p>
                {(menopauseFilter !== 'all' || riskFilter !== 'all') && (
                  <p className="text-xs text-teal-400 mt-2 font-medium">
                    ✓ Filters will be applied to this export
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={openLink('/api/v1/export/assessments.csv')}
                className="ml-4 bg-teal-500 text-white hover:bg-[#3311DD] flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Insights Report */}
      <div className="glass-card p-6 rounded-3xl shadow-sm border border-slate-600/30">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={20} className="text-teal-400" />
          <h3 className="text-xl font-bold text-white">Insights Report</h3>
        </div>
        <p className="text-slate-400 text-sm mb-6">
          Generate comprehensive insights report with visualizations and statistical summaries
        </p>

        <div className="p-4 border-2 border-slate-600/30 rounded-xl hover:border-teal-500 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-bold text-white mb-1">Cohort Insights Report</h4>
              <p className="text-sm text-slate-400">
                Comprehensive PDF report including: risk distribution, cluster analysis, biomarker trends, and correlation matrices
              </p>
              <p className="text-xs text-[#707EAE] mt-2">
                Note: This export includes aggregate statistics suitable for clinical review and research purposes
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => alert('Insights report generation coming soon!')}
              className="ml-4 glass-card text-teal-400 border-2 border-teal-500 hover:bg-slate-700/30 flex items-center gap-2"
            >
              <FileText size={16} />
              Generate
            </Button>
          </div>
        </div>
      </div>

      {/* Data Privacy Notice */}
      <div className="bg-amber-500/10 p-6 rounded-3xl border border-amber-500/30">
        <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-2">
          <span>⚠️</span>
          Data Privacy & Security Notice
        </h4>
        <p className="text-sm text-slate-300">
          Exported files contain protected health information (PHI). Ensure compliance with HIPAA, GDPR, or applicable data protection regulations.
          Store files securely, encrypt when transmitting, and delete when no longer needed for clinical or research purposes.
        </p>
      </div>
    </div>
  );
};

export default Export;
