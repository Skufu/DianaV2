// Export: provides CSV download links for patients and assessments with filtering options
import React, { useState } from 'react';
import { API_BASE, exportPDFApi } from '../../api';
import Button from '../common/Button';
import { Download, FileText, Filter, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const Export = ({ token }) => {
  const [menopauseFilter, setMenopauseFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [pdfGenerating, setPdfGenerating] = useState(false);

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

  const downloadCSV = (path) => async () => {
    try {
      const queryString = buildQueryString();
      const response = await fetch(`${API_BASE}${path}${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download CSV: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <header className="mb-8">
        <h4 className="text-diana-text-muted font-medium text-sm mb-1 uppercase tracking-wider">Data Management</h4>
        <h2 className="text-3xl font-bold text-diana-text-primary">Export Data</h2>
        <p className="text-diana-text-secondary text-sm mt-1">
          Download patient data and insights reports for clinical records or research
        </p>
      </header>

      {/* Filtering Options */}
      <motion.div
        whileHover={{ scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="glass-card p-6 bg-white"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-diana-forest/10 flex items-center justify-center">
            <Filter size={18} className="text-diana-forest" />
          </div>
          <h3 className="text-xl font-bold text-diana-text-primary">Filter Options</h3>
        </div>
        <p className="text-diana-text-secondary text-sm mb-6">
          Apply filters to export specific patient subsets based on menopausal status and risk level
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Menopause Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-diana-text-primary mb-3">
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
                    ? 'border-diana-forest bg-diana-forest/5'
                    : 'border-diana-sand hover:border-diana-forest/30'
                    }`}
                >
                  <input
                    id={`export-menopause-${option.value}`}
                    type="radio"
                    name="menopause"
                    value={option.value}
                    checked={menopauseFilter === option.value}
                    onChange={(e) => setMenopauseFilter(e.target.value)}
                    className="mr-3 w-4 h-4 text-diana-forest accent-diana-forest"
                  />
                  <span className="text-sm font-medium text-diana-text-primary">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Risk Level Filter */}
          <div>
            <label className="block text-sm font-semibold text-diana-text-primary mb-3">
              Diabetes Risk Level
            </label>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All Risk Levels', color: '#94A3B8' },
                { value: 'low', label: 'Low Risk (0-33%)', color: '#22C55E' },
                { value: 'moderate', label: 'Moderate Risk (34-66%)', color: '#F59E0B' },
                { value: 'high', label: 'High Risk (67-100%)', color: '#EF4444' }
              ].map(option => (
                <label
                  key={option.value}
                  htmlFor={`export-risk-${option.value}`}
                  className={`flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${riskFilter === option.value
                    ? 'border-diana-forest bg-diana-forest/5'
                    : 'border-diana-sand hover:border-diana-forest/30'
                    }`}
                >
                  <input
                    id={`export-risk-${option.value}`}
                    type="radio"
                    name="risk"
                    value={option.value}
                    checked={riskFilter === option.value}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    className="mr-3 w-4 h-4 text-diana-forest accent-diana-forest"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="text-sm font-medium text-diana-text-primary">{option.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filters Display */}
        {(menopauseFilter !== 'all' || riskFilter !== 'all') && (
          <div className="mt-6 p-4 bg-diana-stone rounded-xl border border-diana-sand">
            <p className="text-sm font-semibold text-diana-text-primary mb-2">Active Filters:</p>
            <div className="flex flex-wrap gap-2">
              {menopauseFilter !== 'all' && (
                <span className="px-3 py-1 bg-diana-forest/10 rounded-lg text-sm text-diana-forest border border-diana-forest/20 font-medium">
                  Menopause: {menopauseFilter}
                </span>
              )}
              {riskFilter !== 'all' && (
                <span className="px-3 py-1 bg-diana-forest/10 rounded-lg text-sm text-diana-forest border border-diana-forest/20 font-medium">
                  Risk: {riskFilter}
                </span>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Export Options */}
      <motion.div
        whileHover={{ scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="glass-card p-6 bg-white"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-diana-forest/10 flex items-center justify-center">
            <Download size={18} className="text-diana-forest" />
          </div>
          <h3 className="text-xl font-bold text-diana-text-primary">Export Patient Data</h3>
        </div>
        <p className="text-diana-text-secondary text-sm mb-6">
          Download CSV files containing patient demographics, biomarkers, and assessment history
        </p>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-amber-500 text-2xl">🚧</div>
            <div>
              <h4 className="font-bold text-amber-800 mb-1">CSV Export Coming Soon</h4>
              <p className="text-sm text-amber-700">
                CSV export functionality is currently under development. In the meantime, please use the PDF export feature below to download comprehensive insights reports.
              </p>
              <p className="text-xs text-diana-forest mt-2 font-medium">
                Check back soon for CSV downloads with filtering support
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 opacity-50">
          <div className="p-4 border-2 border-diana-sand rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-diana-text-muted mb-1">Patients Data (CSV)</h4>
                <p className="text-sm text-diana-text-muted">
                  Patient demographics: name, age, menopause status, blood pressure, activity level, and complete lipid panel
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="ml-4 bg-diana-stone text-diana-text-muted cursor-not-allowed flex items-center gap-2"
              >
                <Download size={16} />
                Coming Soon
              </Button>
            </div>
          </div>

          <div className="p-4 border-2 border-diana-sand rounded-xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-bold text-diana-text-muted mb-1">Assessments Data (CSV)</h4>
                <p className="text-sm text-diana-text-muted">
                  Assessment records: FBS, HbA1c, BMI, risk scores, cluster assignments, timestamps, and validation status
                </p>
              </div>
              <Button
                variant="outline"
                disabled
                className="ml-4 bg-diana-stone text-diana-text-muted cursor-not-allowed flex items-center gap-2"
              >
                <Download size={16} />
                Coming Soon
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Insights Report */}
      <motion.div
        whileHover={{ scale: 1.01, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="glass-card p-6 bg-white"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-diana-forest/10 flex items-center justify-center">
            <FileText size={18} className="text-diana-forest" />
          </div>
          <h3 className="text-xl font-bold text-diana-text-primary">Insights Report</h3>
        </div>
        <p className="text-diana-text-secondary text-sm mb-6">
          Generate comprehensive insights report with visualizations and statistical summaries
        </p>

        <div className="p-4 border-2 border-diana-sand rounded-xl hover:border-diana-forest transition-all">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-bold text-diana-text-primary mb-1">Cohort Insights Report</h4>
              <p className="text-sm text-diana-text-secondary">
                Comprehensive PDF report including: risk distribution, cluster analysis, biomarker trends, and correlation matrices
              </p>
              <p className="text-xs text-diana-text-muted mt-2">
                Note: This export includes aggregate statistics suitable for clinical review and research purposes
              </p>
            </div>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setPdfGenerating(true);
                  await exportPDFApi();
                } catch (error) {
                  console.error('PDF generation failed:', error);
                  alert('Failed to generate PDF report. Please try again.');
                } finally {
                  setPdfGenerating(false);
                }
              }}
              disabled={pdfGenerating}
              className="ml-4 bg-diana-forest text-white border-2 border-diana-forest hover:bg-diana-forest-light flex items-center gap-2"
            >
              <FileText size={16} />
              {pdfGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Data Privacy Notice */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-amber-50 p-6 rounded-3xl border border-amber-200"
      >
        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} className="text-amber-600" />
          Data Privacy & Security Notice
        </h4>
        <p className="text-sm text-amber-700">
          Exported files contain protected health information (PHI). Ensure compliance with HIPAA, GDPR, or applicable data protection regulations.
          Store files securely, encrypt when transmitting, and delete when no longer needed for clinical or research purposes.
        </p>
      </motion.div>
    </div >
  );
};

export default Export;
