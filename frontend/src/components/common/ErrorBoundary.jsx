import React, { Component } from 'react';
import ErrorFallback from './ErrorFallback';

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 * 
 * Usage:
 *   <ErrorBoundary fallback={<CustomFallback />}>
 *     <ComponentThatMayError />
 *   </ErrorBoundary>
 * 
 * Or with section name for default fallback:
 *   <ErrorBoundary section="Analytics">
 *     <Analytics />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console (could be extended to error reporting service)
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

        this.setState({ errorInfo });

        // Optional: Report to error tracking service
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return React.cloneElement(this.props.fallback, {
                    error: this.state.error,
                    errorInfo: this.state.errorInfo,
                    onRetry: this.handleRetry
                });
            }

            // Default fallback with section name
            return (
                <ErrorFallback
                    section={this.props.section || 'This section'}
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    onRetry={this.handleRetry}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
