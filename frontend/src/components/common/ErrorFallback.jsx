import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * ErrorFallback - User-friendly error display with retry option
 * 
 * Props:
 *   section: Name of the section that failed (e.g., "Insights", "Dashboard")
 *   error: The error object
 *   errorInfo: React error info with component stack
 *   onRetry: Callback to reset the error boundary
 */
const ErrorFallback = ({ section = 'This section', error, errorInfo, onRetry }) => {
    const [showDetails, setShowDetails] = useState(false);

    const errorMessage = error?.message || 'An unexpected error occurred';
    const isDev = import.meta.env.DEV;

    return (
        <div className="flex items-center justify-center min-h-[300px] p-6">
            <div className="max-w-md w-full bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-2xl border border-red-200 dark:border-red-800/50 shadow-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Something went wrong
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {section} encountered an error and couldn't load properly.
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-4 flex flex-col gap-3">
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </button>
                    )}

                    {isDev && (
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm transition-colors"
                        >
                            {showDetails ? (
                                <>
                                    <ChevronUp className="w-4 h-4" />
                                    Hide Details
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4" />
                                    Show Technical Details
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Error Details (Dev Mode) */}
                {isDev && showDetails && (
                    <div className="border-t border-red-200 dark:border-red-800/50 bg-gray-900 p-4">
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs font-medium text-red-400 mb-1">Error Message:</p>
                                <p className="text-xs text-gray-300 font-mono break-all">{errorMessage}</p>
                            </div>

                            {errorInfo?.componentStack && (
                                <div>
                                    <p className="text-xs font-medium text-red-400 mb-1">Component Stack:</p>
                                    <pre className="text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                                        {errorInfo.componentStack}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ErrorFallback;
