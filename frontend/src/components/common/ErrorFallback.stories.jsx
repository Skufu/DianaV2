import React from 'react';
import ErrorFallback from './ErrorFallback';

export default {
    title: 'Common/ErrorFallback',
    component: ErrorFallback,
    parameters: {
        docs: {
            description: {
                component: 'User-friendly error display with retry option. Shows when an ErrorBoundary catches an error.',
            },
        },
    },
    argTypes: {
        section: {
            control: 'text',
            description: 'Name of the section that failed',
        },
        onRetry: {
            action: 'retry clicked',
            description: 'Callback when user clicks "Try Again"',
        },
    },
};

const Template = (args) => <ErrorFallback {...args} />;

// Default state - no error details
export const Default = Template.bind({});
Default.args = {
    section: 'Analytics',
};

// With error (dev mode shows details)
export const WithError = Template.bind({});
WithError.args = {
    section: 'Dashboard',
    error: new Error('Failed to fetch patient data: Network timeout'),
    errorInfo: {
        componentStack: `
    at Dashboard (http://localhost:5173/src/components/dashboard/Dashboard.jsx:45:12)
    at Suspense
    at ErrorBoundary
    at App`,
    },
};

// Different section names
export const PatientHistory = Template.bind({});
PatientHistory.args = {
    section: 'Patient History',
};

export const Export = Template.bind({});
Export.args = {
    section: 'Data Export',
};
