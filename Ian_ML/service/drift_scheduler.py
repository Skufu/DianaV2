"""
DIANA Drift Scheduler Module
Provides periodic drift monitoring with MLflow logging and alerts.

Usage:
    from Ian_ML.service.drift_scheduler import DriftScheduler
    
    scheduler = DriftScheduler(check_interval_hours=24)
    scheduler.start()
    
    # Later...
    scheduler.stop()
"""

import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Optional

import numpy as np

from Ian_ML.service.drift_detection import DriftMonitor, DriftReport, get_drift_monitor

try:
    from Ian_ML.service.mlflow_config import get_mlflow_manager
    mlflow_available = True
except ImportError:
    get_mlflow_manager = None
    mlflow_available = False

logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_CHECK_INTERVAL_HOURS = 24
DEFAULT_MIN_SAMPLES_FOR_CHECK = 10
DEFAULT_DRIFT_THRESHOLD_LOW = 0.1
DEFAULT_DRIFT_THRESHOLD_MEDIUM = 0.2
DEFAULT_DRIFT_THRESHOLD_HIGH = 0.25


@dataclass
class SchedulerConfig:
    """Configuration for drift scheduler."""
    check_interval_hours: float = DEFAULT_CHECK_INTERVAL_HOURS
    min_samples_for_check: int = DEFAULT_MIN_SAMPLES_FOR_CHECK
    drift_threshold_low: float = DEFAULT_DRIFT_THRESHOLD_LOW
    drift_threshold_medium: float = DEFAULT_DRIFT_THRESHOLD_MEDIUM
    drift_threshold_high: float = DEFAULT_DRIFT_THRESHOLD_HIGH
    enable_mlflow_logging: bool = True
    enable_alerts: bool = True
    alert_callbacks: list[Callable[[DriftReport], None]] = field(default_factory=list)


class DriftScheduler:
    """
    Periodic drift detection scheduler.
    
    Runs drift checks at configurable intervals, logs metrics to MLflow,
    and triggers alerts for significant drift.
    """
    
    def __init__(
        self,
        config: Optional[SchedulerConfig] = None,
        drift_monitor: Optional[DriftMonitor] = None
    ):
        """
        Initialize drift scheduler.
        
        Args:
            config: Scheduler configuration
            drift_monitor: Drift monitor instance (creates new if None)
        """
        self.config = config or SchedulerConfig()
        self.monitor = drift_monitor or get_drift_monitor()
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        
        # Buffer for collecting feature data between checks
        self._feature_buffer: dict[str, list[float]] = {}
        self._buffer_lock = threading.Lock()
        
        # Last check results
        self._last_check_time: Optional[datetime] = None
        self._last_report: Optional[DriftReport] = None
    
    @property
    def is_running(self) -> bool:
        """Check if scheduler is running."""
        return self._running
    
    @property
    def last_check_time(self) -> Optional[datetime]:
        """Get timestamp of last drift check."""
        return self._last_check_time
    
    @property
    def last_report(self) -> Optional[DriftReport]:
        """Get last drift report."""
        return self._last_report
    
    def add_sample(self, features: dict[str, float]) -> None:
        """
        Add a sample to the feature buffer for drift checking.
        
        Args:
            features: Dict of feature name -> value
        """
        with self._buffer_lock:
            for feature, value in features.items():
                if feature not in self._feature_buffer:
                    self._feature_buffer[feature] = []
                self._feature_buffer[feature].append(float(value))
    
    def add_samples(self, samples: list[dict[str, float]]) -> None:
        """
        Add multiple samples to the feature buffer.
        
        Args:
            samples: List of feature dicts
        """
        for sample in samples:
            self.add_sample(sample)
    
    def start(self) -> None:
        """Start the drift scheduler."""
        with self._lock:
            if self._running:
                logger.warning("Drift scheduler already running")
                return
            
            self._stop_event.clear()
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._running = True
            self._thread.start()
            logger.info(
                "Drift scheduler started (interval: %d hours)",
                self.config.check_interval_hours
            )
    
    def stop(self) -> None:
        """Stop the drift scheduler."""
        with self._lock:
            if not self._running:
                return
            
            self._stop_event.set()
            self._running = False
            
            if self._thread is not None:
                self._thread.join(timeout=5.0)
                self._thread = None
            
            logger.info("Drift scheduler stopped")
    
    def _run_loop(self) -> None:
        """Main scheduler loop."""
        while not self._stop_event.is_set():
            try:
                self._check_drift()
            except Exception as e:
                logger.exception("Drift check failed: %s", e)
            
            # Sleep for interval, but check stop event periodically
            sleep_seconds = self.config.check_interval_hours * 3600
            check_interval = min(60.0, sleep_seconds)  # Check every minute max
            
            elapsed = 0.0
            while elapsed < sleep_seconds and not self._stop_event.is_set():
                time.sleep(check_interval)
                elapsed += check_interval
    
    def _check_drift(self) -> Optional[DriftReport]:
        """Perform a drift check and log results."""
        with self._buffer_lock:
            # Get current data from buffer
            if not self._feature_buffer:
                logger.debug("No feature data in buffer for drift check")
                return None
            
            # Check if we have enough samples
            min_samples = min(len(v) for v in self._feature_buffer.values()) if self._feature_buffer else 0
            if min_samples < self.config.min_samples_for_check:
                logger.debug(
                    "Insufficient samples for drift check: %d < %d",
                    min_samples, self.config.min_samples_for_check
                )
                return None
            
            # Convert buffer to numpy arrays
            current_data = {
                k: np.array(v) for k, v in self._feature_buffer.items()
            }
            
            # Clear buffer after using
            self._feature_buffer = {}
        
        # Perform drift check
        report = self.monitor.check_feature_drift(current_data)
        
        # Update last check info
        self._last_check_time = datetime.now()
        self._last_report = report
        
        # Log to MLflow
        if self.config.enable_mlflow_logging:
            self._log_to_mlflow(report, min_samples)
        
        # Create alert if drift detected
        if report.has_drift and self.config.enable_alerts:
            self._handle_alert(report)
        
        logger.info(
            "Drift check completed: has_drift=%s, severity=%s, features_checked=%d",
            report.has_drift, report.severity, len(report.feature_drifts)
        )
        
        return report
    
    def _log_to_mlflow(self, report: DriftReport, sample_count: int) -> None:
        """Log drift metrics to MLflow."""
        if not mlflow_available or get_mlflow_manager is None:
            logger.debug("MLflow not available, skipping logging")
            return
        
        try:
            manager = get_mlflow_manager()
            if not manager.is_available:
                logger.debug("MLflow manager not available, skipping logging")
                return
            
            # Prepare metrics
            metrics: dict[str, float] = {
                "drift/has_drift": 1.0 if report.has_drift else 0.0,
                "drift/severity_score": self._severity_to_score(report.severity),
                "drift/features_checked": float(len(report.feature_drifts)),
                "drift/features_drifted": float(sum(
                    1 for f in report.feature_drifts.values() if f.get("drifted", False)
                )),
                "drift/sample_count": float(sample_count),
            }
            
            # Add per-feature metrics
            for feature, info in report.feature_drifts.items():
                safe_feature_name = feature.replace("/", "_").replace(".", "_")
                metrics[f"drift/{safe_feature_name}_psi"] = float(info.get("psi", 0.0))
                metrics[f"drift/{safe_feature_name}_ks_stat"] = float(info.get("ks_statistic", 0.0))
                metrics[f"drift/{safe_feature_name}_ks_pvalue"] = float(info.get("ks_pvalue", 1.0))
                metrics[f"drift/{safe_feature_name}_drifted"] = 1.0 if info.get("drifted", False) else 0.0
            
            # Log to MLflow
            with manager.start_run(run_name=f"drift_check_{datetime.now().strftime('%Y%m%d_%H%M%S')}"):
                manager.log_metrics(metrics)
                manager.log_params({
                    "check_type": "scheduled",
                    "interval_hours": str(self.config.check_interval_hours),
                })
            
            logger.info("Logged %d drift metrics to MLflow", len(metrics))
            
        except Exception as e:
            logger.error("Failed to log drift metrics to MLflow: %s", e)
    
    def _severity_to_score(self, severity: str) -> float:
        """Convert severity string to numeric score."""
        return {
            "none": 0.0,
            "low": 0.25,
            "medium": 0.5,
            "high": 1.0,
        }.get(severity, 0.0)
    
    def _handle_alert(self, report: DriftReport) -> None:
        """Handle drift alert with callbacks."""
        # Create alert in monitor
        alert = self.monitor.create_alert(report)
        
        if alert is None:
            return
        
        # Call registered callbacks
        for callback in self.config.alert_callbacks:
            try:
                callback(report)
            except Exception as e:
                logger.error("Alert callback failed: %s", e)
    
    def run_check_now(self) -> Optional[DriftReport]:
        """
        Run a drift check immediately (outside of scheduled interval).
        
        Returns:
            DriftReport if check was performed, None if skipped
        """
        return self._check_drift()
    
    def get_status(self) -> dict[str, Any]:
        """Get scheduler status."""
        return {
            "running": self._running,
            "check_interval_hours": self.config.check_interval_hours,
            "min_samples_for_check": self.config.min_samples_for_check,
            "buffer_size": sum(len(v) for v in self._feature_buffer.values()) if self._feature_buffer else 0,
            "last_check_time": self._last_check_time.isoformat() if self._last_check_time else None,
            "last_drift_detected": self._last_report.has_drift if self._last_report else None,
            "last_severity": self._last_report.severity if self._last_report else "none",
        }


# Singleton instance
_scheduler: Optional[DriftScheduler] = None
_scheduler_lock = threading.Lock()


def get_drift_scheduler(config: Optional[SchedulerConfig] = None) -> DriftScheduler:
    """Get or create the singleton drift scheduler."""
    global _scheduler
    with _scheduler_lock:
        if _scheduler is None:
            _scheduler = DriftScheduler(config=config)
        return _scheduler


def start_drift_scheduler(config: Optional[SchedulerConfig] = None) -> DriftScheduler:
    """Start the drift scheduler with optional config."""
    scheduler = get_drift_scheduler(config)
    if not scheduler.is_running:
        scheduler.start()
    return scheduler


def stop_drift_scheduler() -> None:
    """Stop the drift scheduler."""
    with _scheduler_lock:
        if _scheduler is not None:
            _scheduler.stop()


if __name__ == "__main__":
    # Test the drift scheduler
    logging.basicConfig(level=logging.INFO)
    
    # Create config
    config = SchedulerConfig(
        check_interval_hours=0.01,  # 36 seconds for testing
        min_samples_for_check=5,
    )
    
    # Create scheduler
    scheduler = DriftScheduler(config=config)
    
    print("Starting drift scheduler...")
    scheduler.start()
    
    # Add some test samples
    print("Adding test samples...")
    for _ in range(10):
        scheduler.add_sample({
            "bmi": np.random.normal(27, 5),
            "age": np.random.normal(55, 10),
            "triglycerides": np.random.normal(150, 50),
        })
    
    # Run a check
    print("Running manual check...")
    report = scheduler.run_check_now()
    if report:
        print(f"Drift detected: {report.has_drift}")
        print(f"Severity: {report.severity}")
    
    # Get status
    status = scheduler.get_status()
    print(f"Scheduler status: {status}")
    
    # Stop scheduler
    print("Stopping scheduler...")
    scheduler.stop()
    print("Done!")
