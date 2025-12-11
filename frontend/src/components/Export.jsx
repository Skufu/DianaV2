import React from 'react';
import { API_BASE } from '../api';
import Button from './Button';

const Export = () => {
  const openLink = (path) => () => window.open(`${API_BASE}${path}`, '_blank', 'noopener');
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2] animate-fade-in">
      <h2 className="text-2xl font-bold text-[#1B2559] mb-4">Export Data</h2>
      <p className="text-[#A3AED0] mb-6">Use backend export endpoints to download CSVs for patients and assessments.</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={openLink('/api/v1/export/patients.csv')} className="bg-white text-[#4318FF] hover:bg-[#F4F7FE]">
          Download Patients CSV
        </Button>
        <Button variant="outline" onClick={openLink('/api/v1/export/assessments.csv')} className="bg-white text-[#4318FF] hover:bg-[#F4F7FE]">
          Download Assessments CSV
        </Button>
      </div>
    </div>
  );
};

export default Export;

