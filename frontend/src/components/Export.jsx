import React from 'react';
import { API_BASE } from '../api';

const Export = () => {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-[#E0E5F2]">
      <h2 className="text-2xl font-bold text-[#1B2559] mb-4">Export Data</h2>
      <p className="text-[#A3AED0] mb-4">Use backend export endpoints to download CSVs for patients and assessments.</p>
      <div className="space-y-3">
        <a className="text-[#4318FF] font-bold hover:underline" href={`${API_BASE}/api/v1/export/patients.csv`} target="_blank" rel="noreferrer">
          Download Patients CSV
        </a>
        <a className="text-[#4318FF] font-bold hover:underline" href={`${API_BASE}/api/v1/export/assessments.csv`} target="_blank" rel="noreferrer">
          Download Assessments CSV
        </a>
      </div>
    </div>
  );
};

export default Export;

