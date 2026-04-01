"""
Test suite for Ian_ML/service/drift_scheduler.py - Drift Monitoring Integration

Tests cover:
- DriftScheduler initialization and configuration
- Sample collection and buffering
- Periodic drift checks with MLflow logging
- Alert handling and callbacks
- Scheduler start/stop lifecycle
"""

import pytest
import time
import threading
import numpy as np
from unittest.mock import patch, MagicMock, call
from datetime import datetime

from Ian_ML.service.drift_scheduler import (
    DriftScheduler,
    SchedulerConfig,
    get_drift_scheduler,
    start_drift_scheduler,
    stop_drift_scheduler,
)
from Ian_ML.service.drift_detection import DriftReport


class TestSchedulerConfig:
    """Tests for SchedulerConfig dataclass."""
    
    def test_default_config(self):
        """Test default configuration values."""
        config = SchedulerConfig()
        
        assert config.check_interval_hours == 24
        assert config.min_samples_for_check == 10
        assert config.drift_threshold_low == 0.1
        assert config.drift_threshold_medium == 0.2
        assert config.drift_threshold_high == 0.25
        assert config.enable_mlflow_logging is True
        assert config.enable_alerts is True
        assert config.alert_callbacks == []
    
    def test_custom_config(self):
        """Test custom configuration values."""
        def callback(report):
            pass
        
        config = SchedulerConfig(
            check_interval_hours=12,
            min_samples_for_check=20,
            drift_threshold_low=0.15,
            enable_mlflow_logging=False,
            alert_callbacks=[callback],
        )
        
        assert config.check_interval_hours == 12
        assert config.min_samples_for_check == 20
        assert config.drift_threshold_low == 0.15
        assert config.enable_mlflow_logging is False
        assert len(config.alert_callbacks) == 1


class TestDriftScheduler:
    """Tests for DriftScheduler class."""
    
    @pytest.fixture
    def mock_monitor(self):
        """Create a mock DriftMonitor."""
        monitor = MagicMock()
        monitor.check_feature_drift.return_value = DriftReport(
            has_drift=False,
            severity="none",
            feature_drifts={},
            recommendations=[],
        )
        return monitor
    
    @pytest.fixture
    def config(self):
        """Create a test configuration."""
        return SchedulerConfig(
            check_interval_hours=0.01,  # 36 seconds for faster testing
            min_samples_for_check=5,
        )
    
    @pytest.fixture
    def scheduler(self, mock_monitor, config):
        """Create a DriftScheduler with mocked monitor."""
        return DriftScheduler(config=config, drift_monitor=mock_monitor)
    
    def test_initialization(self, scheduler, mock_monitor):
        """Test scheduler initialization."""
        assert scheduler.is_running is False
        assert scheduler.last_check_time is None
        assert scheduler.last_report is None
        assert scheduler.monitor == mock_monitor
    
    def test_add_sample(self, scheduler):
        """Test adding single sample to buffer."""
        scheduler.add_sample({
            "bmi": 25.0,
            "age": 55,
            "triglycerides": 150,
        })
        
        status = scheduler.get_status()
        assert status["buffer_size"] == 3
    
    def test_add_samples(self, scheduler):
        """Test adding multiple samples to buffer."""
        samples = [
            {"bmi": 25.0, "age": 55, "triglycerides": 150},
            {"bmi": 26.0, "age": 56, "triglycerides": 160},
            {"bmi": 27.0, "age": 57, "triglycerides": 170},
        ]
        
        scheduler.add_samples(samples)
        
        status = scheduler.get_status()
        assert status["buffer_size"] == 9  # 3 features * 3 samples
    
    def test_start_stop(self, scheduler):
        """Test scheduler start and stop lifecycle."""
        assert scheduler.is_running is False
        
        scheduler.start()
        assert scheduler.is_running is True
        
        scheduler.stop()
        assert scheduler.is_running is False
    
    def test_double_start(self, scheduler):
        """Test that double start is handled gracefully."""
        scheduler.start()
        scheduler.start()  # Should not raise error
        
        assert scheduler.is_running is True
        scheduler.stop()
    
    def test_stop_when_not_running(self, scheduler):
        """Test that stop when not running is handled gracefully."""
        scheduler.stop()  # Should not raise error
        assert scheduler.is_running is False
    
    def test_run_check_now_insufficient_samples(self, scheduler, mock_monitor):
        """Test drift check with insufficient samples."""
        report = scheduler.run_check_now()
        
        # Should return None when buffer is empty
        assert report is None
        mock_monitor.check_feature_drift.assert_not_called()
    
    def test_run_check_now_with_samples(self, scheduler, mock_monitor):
        """Test drift check with sufficient samples."""
        # Add enough samples
        for _ in range(10):
            scheduler.add_sample({
                "bmi": np.random.normal(27, 5),
                "age": np.random.normal(55, 10),
                "triglycerides": np.random.normal(150, 50),
            })
        
        report = scheduler.run_check_now()
        
        assert report is not None
        mock_monitor.check_feature_drift.assert_called_once()
        assert scheduler.last_check_time is not None
        assert scheduler.last_report == report
    
    def test_run_check_creates_alert_on_drift(self, scheduler, mock_monitor):
        """Test that drift check creates alert when drift detected."""
        # Configure mock to return drift
        drift_report = DriftReport(
            has_drift=True,
            severity="high",
            feature_drifts={"bmi": {"psi": 0.3, "drifted": True}},
            recommendations=["Retrain model"],
        )
        mock_monitor.check_feature_drift.return_value = drift_report
        mock_monitor.create_alert.return_value = MagicMock()
        
        # Add samples and run check
        for _ in range(10):
            scheduler.add_sample({
                "bmi": np.random.normal(27, 5),
                "age": np.random.normal(55, 10),
                "triglycerides": np.random.normal(150, 50),
            })
        
        report = scheduler.run_check_now()
        
        assert report.has_drift is True
        mock_monitor.create_alert.assert_called_once_with(drift_report)
    
    def test_alert_callbacks(self, mock_monitor, config):
        """Test that alert callbacks are invoked."""
        callback_called = []
        
        def callback(report):
            callback_called.append(report)
        
        config_with_callback = SchedulerConfig(
            check_interval_hours=0.01,
            min_samples_for_check=5,
            alert_callbacks=[callback],
        )
        
        scheduler = DriftScheduler(config=config_with_callback, drift_monitor=mock_monitor)
        
        # Configure mock to return drift
        drift_report = DriftReport(
            has_drift=True,
            severity="high",
            feature_drifts={"bmi": {"psi": 0.3, "drifted": True}},
            recommendations=["Retrain model"],
        )
        mock_monitor.check_feature_drift.return_value = drift_report
        mock_monitor.create_alert.return_value = MagicMock()
        
        # Add samples and run check
        for _ in range(10):
            scheduler.add_sample({
                "bmi": np.random.normal(27, 5),
                "age": np.random.normal(55, 10),
                "triglycerides": np.random.normal(150, 50),
            })
        
        scheduler.run_check_now()
        
        assert len(callback_called) == 1
        assert callback_called[0] == drift_report
    
    def test_mlflow_logging(self, scheduler, mock_monitor):
        """Test that drift metrics are logged to MLflow."""
        with patch('Ian_ML.service.drift_scheduler.get_mlflow_manager') as mock_get_manager:
            mock_manager = MagicMock()
            mock_manager.is_available = True
            mock_context = MagicMock()
            mock_manager.start_run.return_value.__enter__ = MagicMock(return_value=mock_context)
            mock_manager.start_run.return_value.__exit__ = MagicMock(return_value=False)
            mock_get_manager.return_value = mock_manager
            
            # Add samples and run check
            for _ in range(10):
                scheduler.add_sample({
                    "bmi": np.random.normal(27, 5),
                    "age": np.random.normal(55, 10),
                    "triglycerides": np.random.normal(150, 50),
                })
            
            scheduler.run_check_now()
            
            # Verify MLflow logging was called
            mock_manager.log_metrics.assert_called_once()
    
    def test_mlflow_logging_disabled(self, mock_monitor):
        """Test that MLflow logging can be disabled."""
        config = SchedulerConfig(
            check_interval_hours=0.01,
            min_samples_for_check=5,
            enable_mlflow_logging=False,
        )
        
        scheduler = DriftScheduler(config=config, drift_monitor=mock_monitor)
        
        with patch('Ian_ML.service.drift_scheduler.get_mlflow_manager') as mock_get_manager:
            # Add samples and run check
            for _ in range(10):
                scheduler.add_sample({
                    "bmi": np.random.normal(27, 5),
                    "age": np.random.normal(55, 10),
                    "triglycerides": np.random.normal(150, 50),
                })
            
            scheduler.run_check_now()
            
            # MLflow manager should not be called when disabled
            mock_get_manager.assert_not_called()
    
    def test_get_status(self, scheduler):
        """Test get_status returns correct information."""
        status = scheduler.get_status()
        
        assert "running" in status
        assert "check_interval_hours" in status
        assert "buffer_size" in status
        assert "last_check_time" in status
        assert "last_drift_detected" in status
        assert "last_severity" in status
        
        assert status["running"] is False
        assert status["check_interval_hours"] == scheduler.config.check_interval_hours
    
    def test_buffer_cleared_after_check(self, scheduler, mock_monitor):
        """Test that buffer is cleared after drift check."""
        # Add samples
        for _ in range(10):
            scheduler.add_sample({
                "bmi": np.random.normal(27, 5),
                "age": np.random.normal(55, 10),
            })
        
        assert scheduler.get_status()["buffer_size"] > 0
        
        # Run check
        scheduler.run_check_now()
        
        # Buffer should be cleared
        assert scheduler.get_status()["buffer_size"] == 0
    
    def test_periodic_check(self, scheduler, mock_monitor):
        """Test that periodic checks run at configured interval."""
        # Add samples before starting scheduler
        for _ in range(20):
            scheduler.add_sample({
                "bmi": np.random.normal(27, 5),
                "age": np.random.normal(55, 10),
                "triglycerides": np.random.normal(150, 50),
            })
        
        # Start scheduler with very short interval
        scheduler.start()
        
        # Wait for at least one check cycle
        time.sleep(0.5)
        
        scheduler.stop()
        
        # Should have called check_feature_drift at least once
        assert mock_monitor.check_feature_drift.call_count >= 1


class TestSingletonFunctions:
    """Tests for singleton management functions."""
    
    def test_get_drift_scheduler_singleton(self):
        """Test that get_drift_scheduler returns singleton."""
        with patch('Ian_ML.service.drift_scheduler.DriftMonitor'):
            scheduler1 = get_drift_scheduler()
            scheduler2 = get_drift_scheduler()
            
            assert scheduler1 is scheduler2
    
    def test_start_stop_drift_scheduler(self):
        """Test start_drift_scheduler and stop_drift_scheduler functions."""
        with patch('Ian_ML.service.drift_scheduler.DriftMonitor'):
            # Reset singleton
            import Ian_ML.service.drift_scheduler as ds
            ds._scheduler = None
            
            scheduler = start_drift_scheduler()
            assert scheduler.is_running is True
            
            stop_drift_scheduler()
            assert scheduler.is_running is False


class TestSeverityToScore:
    """Tests for severity score conversion."""
    
    def test_severity_to_score(self):
        """Test severity string to numeric score conversion."""
        config = SchedulerConfig()
        scheduler = DriftScheduler(config=config)
        
        assert scheduler._severity_to_score("none") == 0.0
        assert scheduler._severity_to_score("low") == 0.25
        assert scheduler._severity_to_score("medium") == 0.5
        assert scheduler._severity_to_score("high") == 1.0
        assert scheduler._severity_to_score("unknown") == 0.0


class TestIntegrationWithDriftDetection:
    """Integration tests with actual drift detection."""
    
    @pytest.fixture
    def real_monitor(self):
        """Create a real DriftMonitor with test reference data."""
        from Ian_ML.service.drift_detection import DriftMonitor
        
        # Create reference data
        reference = {
            "bmi": np.random.normal(27, 5, 100),
            "age": np.random.normal(55, 10, 100),
            "triglycerides": np.random.normal(150, 50, 100),
        }
        
        return DriftMonitor(reference_data=reference)
    
    def test_real_drift_check(self, real_monitor):
        """Test drift check with real monitor and drifted data."""
        config = SchedulerConfig(min_samples_for_check=10)
        scheduler = DriftScheduler(config=config, drift_monitor=real_monitor)
        
        # Add drifted samples (significantly different distribution)
        for _ in range(20):
            scheduler.add_sample({
                "bmi": np.random.normal(35, 5),  # Higher mean
                "age": np.random.normal(55, 10),  # Same
                "triglycerides": np.random.normal(250, 50),  # Higher mean
            })
        
        report = scheduler.run_check_now()
        
        assert report is not None
        assert report.has_drift is True
        assert report.severity in ("low", "medium", "high")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
