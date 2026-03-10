import React, { useState } from 'react';
import { exportPDFApi } from '../../api';

const PDFExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      await exportPDFApi();
    } catch (err) {
      setError(err.message || 'Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Export Health Report</h3>
      <p className="text-sm text-gray-600 mb-4">
        Generate a professional PDF health report to share with your healthcare provider.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting}
        className={`w-full px-4 py-3 rounded-md text-white font-medium transition-colors ${
          isExporting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {isExporting ? (
          <span className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8 12 0 0110a8 018-8 018-8a8a8v11.2c0-.5 1-.5 0-.5-.5-2.5l-4.5-4.5 4.5-7.5a4 4 0 018-8 8a8a8v11.2c0-.4.4-1 0 0z"
              />
            </svg>
            Exporting...
          </span>
        ) : (
          <span className="flex items-center">
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l6 6m-6-6l6 6M14 4h-2m0 0l-4-4m0 0l4 4"
              />
            </svg>
            Download PDF Report
          </span>
        )}
      </button>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">What&apos;s Included:</h4>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside ml-4">
          <li>Your personal health information</li>
          <li>Assessment history table</li>
          <li>Trend charts for all biomarkers</li>
          <li>Current cluster assignment</li>
          <li>Risk level analysis</li>
          <li>Cluster-specific recommendations</li>
        </ul>
      </div>
    </div>
  );
};

export default PDFExport;
