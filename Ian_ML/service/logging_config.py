"""
Structured logging configuration for Diana ML service.
Provides JSON logging with PII redaction and request tracing.
"""

import json
import logging
import os
import re
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
from typing import Any, Dict, Optional


class PIIRedactionFilter(logging.Filter):
    """Filter that redacts PII from log messages."""

    # Patterns for PII detection
    PATTERNS = {
        'email': re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'),
        'phone': re.compile(r'(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}'),
        'ipv4': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
        'jwt': re.compile(r'ey[a-zA-Z0-9]*\.ey[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*'),
        'api_key': re.compile(r'(?i)(api[_-]?key|apikey)\s*[:=]\s*["\']?[a-zA-Z0-9_-]{16,}["\']?'),
        'password': re.compile(r'(?i)(password|passwd|pwd)\s*[:=]\s*["\']?[^\s"\']+["\']?'),
        'auth_header': re.compile(r'(?i)(authorization|x-api-key)\s*:\s*bearer\s+[^\s]+'),
    }

    SENSITIVE_FIELDS = {
        'password', 'passwd', 'pwd', 'secret', 'secret_key', 'api_key', 'apikey',
        'token', 'access_token', 'refresh_token', 'authorization',
        'credit_card', 'cc_number', 'cvv', 'ssn', 'social_security',
        'dob', 'date_of_birth', 'birthdate',
        'first_name', 'last_name', 'fullname', 'phone', 'mobile', 'cell',
        'address', 'street', 'city', 'zip', 'postal', 'email',
    }

    def filter(self, record: logging.LogRecord) -> bool:
        """Filter log record by redacting PII."""
        # Redact from message
        if isinstance(record.msg, str):
            record.msg = self._redact_string(record.msg)

        # Redact from args
        if record.args:
            record.args = tuple(self._redact_value(arg) for arg in record.args)

        return True

    def _redact_string(self, value: str) -> str:
        """Redact PII from string."""
        result = value
        for name, pattern in self.PATTERNS.items():
            result = pattern.sub(f'[REDACTED_{name.upper()}]', result)
        return result

    def _redact_value(self, value: Any) -> Any:
        """Redact PII from value."""
        if isinstance(value, str):
            return self._redact_string(value)
        elif isinstance(value, dict):
            return self._redact_dict(value)
        elif isinstance(value, (list, tuple)):
            return [self._redact_value(item) for item in value]
        return value

    def _redact_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Redact PII from dictionary."""
        result = {}
        for key, value in data.items():
            key_lower = key.lower()
            # Check if key indicates sensitive data
            if any(sensitive in key_lower for sensitive in self.SENSITIVE_FIELDS):
                result[key] = '[REDACTED]'
            else:
                result[key] = self._redact_value(value)
        return result


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def __init__(self, service_name: str = 'diana-ml', version: str = 'dev'):
        super().__init__()
        self.service_name = service_name
        self.version = version

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'message': record.getMessage(),
            'service': self.service_name,
            'version': self.version,
            'logger': record.name,
        }

        # Add request context if available
        if hasattr(record, 'request_id'):
            log_data['request_id'] = record.request_id
        if hasattr(record, 'trace_id'):
            log_data['trace_id'] = record.trace_id
        if hasattr(record, 'span_id'):
            log_data['span_id'] = record.span_id

        # Add exception info
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ['timestamp', 'level', 'message', 'service', 'version',
                          'logger', 'request_id', 'trace_id', 'span_id', 'exc_info']:
                log_data[key] = value

        return json.dumps(log_data)


class RequestContextFilter(logging.Filter):
    """Filter that adds request context to log records."""

    _context = {}

    @classmethod
    def set_context(cls, request_id: Optional[str] = None,
                    trace_id: Optional[str] = None,
                    span_id: Optional[str] = None):
        """Set request context."""
        cls._context = {
            'request_id': request_id,
            'trace_id': trace_id,
            'span_id': span_id,
        }

    @classmethod
    def clear_context(cls):
        """Clear request context."""
        cls._context = {}

    def filter(self, record: logging.LogRecord) -> bool:
        """Add context to log record."""
        for key, value in self._context.items():
            if value and not hasattr(record, key):
                setattr(record, key, value)
        return True


def setup_logging(service_name: str = 'diana-ml',
                  version: str = 'dev',
                  level: str = None) -> logging.Logger:
    """Set up structured logging for the service.

    Args:
        service_name: Name of the service
        version: Version of the service
        level: Log level (default: INFO in production, DEBUG in development)

    Returns:
        Configured logger
    """
    # Determine log level
    if level is None:
        env = os.getenv('ENV', 'development')
        level = 'DEBUG' if env in ['development', 'dev', 'local'] else 'INFO'

    # Create formatter
    env = os.getenv('ENV', 'development')
    if env in ['production', 'prod', 'staging', 'stage']:
        # Production: JSON logging
        formatter = JSONFormatter(service_name=service_name, version=version)
    else:
        # Development: Console logging
        formatter = logging.Formatter(
            '%(asctime)s [%(levelname)s] %(name)s: %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper()))

    # Clear existing handlers
    root_logger.handlers = []

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    log_dir = os.getenv('DIANA_LOG_DIR')
    file_handler = None
    if log_dir:
        try:
            os.makedirs(log_dir, mode=0o750, exist_ok=True)
            max_bytes = _get_positive_int_env('DIANA_LOG_MAX_BYTES', 5 * 1024 * 1024)
            backup_count = _get_positive_int_env('DIANA_LOG_MAX_BACKUPS', 3)
            file_handler = RotatingFileHandler(
                os.path.join(log_dir, 'ml.log'),
                maxBytes=max_bytes,
                backupCount=backup_count,
                encoding='utf-8'
            )
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
        except OSError as exc:
            root_logger.warning("Failed to initialize ML file logger: %s", exc)

    # Add PII redaction filter
    pii_filter = PIIRedactionFilter()
    root_logger.addFilter(pii_filter)
    console_handler.addFilter(pii_filter)
    if file_handler:
        file_handler.addFilter(pii_filter)

    # Add request context filter
    context_filter = RequestContextFilter()
    root_logger.addFilter(context_filter)
    console_handler.addFilter(context_filter)
    if file_handler:
        file_handler.addFilter(context_filter)

    # Create service logger
    logger = logging.getLogger(service_name)
    logger.info(f"Logging initialized: level={level}, service={service_name}, version={version}")

    return logger


def _get_positive_int_env(key: str, default: int) -> int:
    try:
        value = int(os.getenv(key, ''))
    except ValueError:
        return default
    return value if value > 0 else default


def get_logger(name: str = 'diana-ml') -> logging.Logger:
    """Get a logger with the specified name."""
    return logging.getLogger(name)


# Global request context
_request_context = {}


def set_request_context(request_id: Optional[str] = None,
                       trace_id: Optional[str] = None,
                       span_id: Optional[str] = None):
    """Set the global request context for logging."""
    global _request_context
    _request_context = {
        'request_id': request_id,
        'trace_id': trace_id,
        'span_id': span_id,
    }
    RequestContextFilter.set_context(request_id, trace_id, span_id)


def clear_request_context():
    """Clear the global request context."""
    global _request_context
    _request_context = {}
    RequestContextFilter.clear_context()


def get_request_context() -> Dict[str, Optional[str]]:
    """Get the current request context."""
    return _request_context.copy()
