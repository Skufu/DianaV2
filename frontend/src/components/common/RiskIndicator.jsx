import React from 'react';

const RiskIndicator = ({ riskScore, riskLevel, cluster }) => {
  const getRiskColor = (level) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getClusterColor = (cluster) => {
    switch (cluster) {
      case 'SIRD':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SIDD':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MOD':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MARD':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-3">
      {/* Risk Score */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Diabetes Risk Score</h3>
          <span className={`text-3xl font-bold px-4 py-2 rounded-lg ${getRiskColor(riskLevel)}`}>
            {riskScore}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Risk Level:</span>
          <span className={`px-3 py-1 rounded-md text-sm font-medium ${getRiskColor(riskLevel)}`}>
            {riskLevel?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>

      {/* Cluster Assignment */}
      {cluster && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Metabolic Subtype:</span>
            <span className={`px-3 py-1 rounded-md text-sm font-medium ${getClusterColor(cluster)}`}>
              {cluster}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskIndicator;
