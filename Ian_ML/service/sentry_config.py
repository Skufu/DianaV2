"""
Sentry configuration for Diana ML service.
Provides error tracking and performance monitoring.
"""

import os
from typing import Optional

try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False


def init_sentry(dsn: Optional[str] = None,
                environment: Optional[str] = None,
                release: Optional[str] = None,
                sample_rate: float = 1.0) -> bool:
    """Initialize Sentry for error tracking.

    Args:
        dsn: Sentry DSN (defaults to SENTRY_DSN env var)
        environment: Environment name (defaults to ENV env var)
        release: Release version (defaults to APP_VERSION env var)
        sample_rate: Sample rate for error tracking (0.0-1.0)

    Returns:
        True if Sentry was initialized, False otherwise
    """
    if not SENTRY_AVAILABLE:
        print("Sentry not available. Install with: pip install sentry-sdk")
        return False

    # Get configuration from environment if not provided
    dsn = dsn or os.getenv('SENTRY_DSN')
    environment = environment or os.getenv('ENV', 'development')
    release = release or os.getenv('APP_VERSION', 'dev')

    # Check if Sentry is enabled
    enabled = os.getenv('SENTRY_ENABLED', 'false').lower() == 'true'

    if not enabled:
        print("Sentry disabled (set SENTRY_ENABLED=true to enable)")
        return False

    if not dsn:
        print("Sentry DSN not configured (set SENTRY_DSN)")
        return False

    # Configure logging integration
    sentry_logging = LoggingIntegration(
        level=logging.INFO,        # Capture INFO and above as breadcrumbs
        event_level=logging.ERROR  # Send ERROR and above as events
    )

    # Initialize Sentry
    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=release,
        sample_rate=sample_rate,
        integrations=[
            FlaskIntegration(),
            sentry_logging,
        ],
        traces_sample_rate=0.1,  # Sample 10% of transactions for performance
        send_default_pii=False,  # Don't send PII
        attach_stacktrace=True,
        max_breadcrumbs=100,
    )

    print(f"Sentry initialized: environment={environment}, release={release}")
    return True


def capture_exception(exception: Exception, context: Optional[dict] = None):
    """Capture an exception in Sentry.

    Args:
        exception: The exception to capture
        context: Additional context to include
    """
    if not SENTRY_AVAILABLE:
        return

    if context:
        with sentry_sdk.push_scope() as scope:
            for key, value in context.items():
                scope.set_extra(key, value)
            sentry_sdk.capture_exception(exception)
    else:
        sentry_sdk.capture_exception(exception)


def capture_message(message: str, level: str = 'info'):
    """Capture a message in Sentry.

    Args:
        message: The message to capture
        level: Log level ('info', 'warning', 'error', etc.)
    """
    if not SENTRY_AVAILABLE:
        return

    sentry_sdk.capture_message(message, level)


def set_user_context(user_id: Optional[str] = None,
                     email: Optional[str] = None,
                     ip_address: Optional[str] = None):
    """Set user context for Sentry.

    Args:
        user_id: User ID
        email: User email
        ip_address: User IP address
    """
    if not SENTRY_AVAILABLE:
        return

    sentry_sdk.set_user({
        'id': user_id,
        'email': email,
        'ip_address': ip_address,
    })


def clear_user_context():
    """Clear user context from Sentry."""
    if not SENTRY_AVAILABLE:
        return

    sentry_sdk.set_user(None)


def set_tag(key: str, value: str):
    """Set a tag in Sentry.

    Args:
        key: Tag key
        value: Tag value
    """
    if not SENTRY_AVAILABLE:
        return

    sentry_sdk.set_tag(key, value)


def start_transaction(name: str, op: str = 'ml'):
    """Start a performance transaction.

    Args:
        name: Transaction name
        op: Operation type

    Returns:
        Transaction object or None
    """
    if not SENTRY_AVAILABLE:
        return None

    return sentry_sdk.start_transaction(name=name, op=op)


def configure_sentry_for_flask(app):
    """Configure Sentry for a Flask application.

    Args:
        app: Flask application instance
    """
    if not SENTRY_AVAILABLE:
        return

    # Initialize Sentry if not already done
    init_sentry()

    # Add before_request handler to set request context
    @app.before_request
    def set_sentry_request_context():
        from flask import request

        # Set request tags
        set_tag('request.method', request.method)
        set_tag('request.path', request.path)

        # Get request ID from headers
        request_id = request.headers.get('X-Request-ID')
        trace_id = request.headers.get('X-Trace-ID')
        span_id = request.headers.get('X-Span-ID')

        if request_id:
            set_tag('request.id', request_id)
        if trace_id:
            set_tag('trace.id', trace_id)
        if span_id:
            set_tag('span.id', span_id)

        # Add breadcrumbs for request
        from sentry_sdk import add_breadcrumb
        add_breadcrumb(
            category='request',
            message=f"{request.method} {request.path}",
            level='info',
            data={
                'query_string': request.query_string.decode('utf-8') if request.query_string else None,
                'headers': dict(request.headers) if request.headers else None,
            }
        )

    # Add error handler
    @app.errorhandler(Exception)
    def handle_error(error):
        capture_exception(error)
        raise error


# Import logging for integration
import logging
