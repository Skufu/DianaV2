// Export: provides PDF download for patient health reports
import React, { useState } from 'react';
import { exportPDFApi } from '../../api';
import Button from '../common/Button';
import { Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

const Export = () => {
  const [pdfGenerating, setPdfGenerating] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <header className="mb-8">
        <h4 className="text-diana-text-muted font-medium text-sm mb-1 uppercase tracking-wider">Reports</h4>
        <h2 className="text-3xl font-bold text-diana-text-primary">Health Report</h2>
        <p className="text-diana-text-secondary text-sm mt-1">
          Download a summary of your health data for your records or to share with your doctor
        </p>
      </header>

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
          <h3 className="text-xl font-bold text-diana-text-primary">Download Health Report</h3>
        </div>
        <p className="text-diana-text-secondary text-sm mb-6">
          Generate a detailed PDF report of your health history, risk assessments, and clinical summary.
        </p>

        <div className="p-4 border-2 border-diana-sand rounded-xl hover:border-diana-forest transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h4 className="font-bold text-diana-text-primary mb-1">My Personal Health Report</h4>
              <p className="text-sm text-diana-text-secondary">
                A complete summary of your latest biomarkers, diabetes risk analysis, and historical trends.
              </p>
              <p className="text-xs text-diana-text-muted mt-2">
                Ideal for sharing with your healthcare provider during check-ups.
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
              className="bg-diana-forest text-white border-2 border-diana-forest hover:bg-diana-forest-light flex items-center justify-center gap-2 min-w-[160px] py-2 whitespace-nowrap"
            >
              {pdfGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Export;
