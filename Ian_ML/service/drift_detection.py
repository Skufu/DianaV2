"""
DIANA Drift Detection Module
Monitors model performance by detecting feature and prediction distribution shifts.

Usage:
    from Ian_ML.service.drift_detection import DriftMonitor
    
    monitor = DriftMonitor(reference_data)
    report = monitor.check_feature_drift(current_data)
    
    if report.has_drift:
        monitor.alert(report)
"""

import json
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, cast
import numpy as np

try:
    from scipy import stats as scipy_stats
except ImportError:
    scipy_stats = None

SCIPY_AVAILABLE = scipy_stats is not None

logger = logging.getLogger(__name__)

# Default paths
DEFAULT_REFERENCE_PATH = Path(__file__).parent / "monitoring" / "reference_data.json"
DEFAULT_ALERTS_PATH = Path(__file__).parent / "monitoring" / "alerts.json"


@dataclass
class DriftReport:
    """Report of detected drift."""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    has_drift: bool = False
    severity: str = "none"  # "none", "low", "medium", "high"
    feature_drifts: dict[str, dict[str, Any]] = field(default_factory=dict)
    prediction_drift: Optional[dict[str, Any]] = None
    recommendations: list[str] = field(default_factory=list)
    
    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Alert:
    """Drift alert for logging and notification."""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    alert_type: str = "drift"  # "drift", "performance", "error"
    severity: str = "low"
    message: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    acknowledged: bool = False


class DriftMonitor:
    """
    Monitors for data and prediction drift.
    
    Uses statistical tests:
    - PSI (Population Stability Index) for feature drift
    - KS-test (Kolmogorov-Smirnov) for distribution comparison
    """
    
    # PSI thresholds
    PSI_LOW = 0.1
    PSI_MEDIUM = 0.2
    PSI_HIGH = 0.25
    
    # KS-test significance level
    KS_ALPHA = 0.05
    
    def __init__(
        self,
        reference_data: Optional[dict[str, np.ndarray]] = None,
        reference_path: Optional[Path] = None,
        alerts_path: Optional[Path] = None
    ):
        """
        Initialize drift monitor.
        
        Args:
            reference_data: Dict of feature name -> reference values
            reference_path: Path to load/save reference data
            alerts_path: Path to save alerts
        """
        self.reference_path = reference_path or DEFAULT_REFERENCE_PATH
        self.alerts_path = alerts_path or DEFAULT_ALERTS_PATH
        
        # Ensure directories exist
        self.reference_path.parent.mkdir(parents=True, exist_ok=True)
        
        self.reference_data: dict[str, np.ndarray] = {}
        self.reference_metadata: dict[str, Any] = {}
        self.alerts: list[Alert] = []
        
        if reference_data:
            self.set_reference(reference_data)
        else:
            self._load_reference()
        
        self._load_alerts()
        
        if not SCIPY_AVAILABLE:
            logger.warning("scipy not installed. Drift detection limited.")
    
    def _load_reference(self):
        """Load reference data from file."""
        if self.reference_path.exists():
            try:
                with open(self.reference_path, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, dict) and isinstance(data.get("features"), dict):
                        self.reference_data = {
                            k: np.array(v) for k, v in data.get("features", {}).items()
                        }
                        self.reference_metadata = data.get("metadata") or {}
                    else:
                        self.reference_data = {
                            k: np.array(v) for k, v in data.items()
                        }
                        self.reference_metadata = {}
                logger.info(f"Loaded reference data: {list(self.reference_data.keys())}")
            except Exception as e:
                logger.error(f"Failed to load reference data: {e}")
    
    def _save_reference(self):
        """Save reference data to file."""
        try:
            data = {
                "metadata": self.reference_metadata,
                "features": {k: v.tolist() for k, v in self.reference_data.items()},
            }
            with open(self.reference_path, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save reference data: {e}")
    
    def _load_alerts(self):
        """Load alerts from file."""
        if self.alerts_path.exists():
            try:
                with open(self.alerts_path, 'r') as f:
                    data = json.load(f)
                    self.alerts = [Alert(**a) for a in data]
            except Exception as e:
                logger.error(f"Failed to load alerts: {e}")
    
    def _save_alerts(self):
        """Save alerts to file."""
        try:
            with open(self.alerts_path, 'w') as f:
                json.dump([asdict(a) for a in self.alerts], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save alerts: {e}")
    
    @staticmethod
    def _parse_iso8601(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None

    def _normalize_baseline_metadata(
        self,
        metadata: Optional[dict[str, Any]],
        reference_features: list[str],
        sample_count: int,
    ) -> dict[str, Any]:
        md = dict(metadata or {})
        now = datetime.now().isoformat()

        def _str(name: str, fallback: str = "") -> str:
            value = md.get(name, fallback)
            return str(value).strip() if value is not None else fallback

        default_stale_after = datetime.fromtimestamp(datetime.now().timestamp() + 90 * 24 * 3600).isoformat()

        normalized = {
            "baseline_id": _str("baseline_id"),
            "baseline_version": _str("baseline_version"),
            "model_version": _str("model_version"),
            "dataset_hash": _str("dataset_hash"),
            "feature_schema_version": _str("feature_schema_version"),
            "source_kind": _str("source_kind", "manual_reference"),
            "created_at": _str("created_at", now),
            "refreshed_at": _str("refreshed_at"),
            "stale_after": _str("stale_after", default_stale_after),
            "sample_count": int(md.get("sample_count") or sample_count),
            "reference_features": md.get("reference_features") or reference_features,
        }

        if not normalized["baseline_id"]:
            normalized["baseline_id"] = f"local-{normalized['created_at']}"
        if not normalized["baseline_version"]:
            normalized["baseline_version"] = "v1"
        if not normalized["feature_schema_version"]:
            normalized["feature_schema_version"] = f"features:{len(reference_features)}"

        return normalized

    def get_baseline_metadata(
        self,
        active_model_version: Optional[str] = None,
        active_dataset_hash: Optional[str] = None,
        active_feature_schema_version: Optional[str] = None,
    ) -> dict[str, Any]:
        if not self.reference_data:
            return {
                "baseline_id": "",
                "baseline_version": "",
                "model_version": "",
                "dataset_hash": "",
                "feature_schema_version": "",
                "source_kind": "",
                "created_at": "",
                "refreshed_at": "",
                "stale_after": "",
                "sample_count": 0,
                "reference_features": [],
                "lineage_status": "missing_reference",
            }

        sample_count = min((len(v) for v in self.reference_data.values()), default=0)
        reference_features = list(self.reference_data.keys())
        md = self._normalize_baseline_metadata(self.reference_metadata, reference_features, sample_count)

        lineage_status = "healthy"

        stale_after_dt = self._parse_iso8601(md.get("stale_after"))
        if stale_after_dt is not None and datetime.now(stale_after_dt.tzinfo) > stale_after_dt:
            lineage_status = "stale_reference"

        baseline_model_version = str(md.get("model_version") or "").strip()
        if active_model_version and baseline_model_version and baseline_model_version != active_model_version:
            lineage_status = "reference_mismatch"

        baseline_dataset_hash = str(md.get("dataset_hash") or "").strip()
        if active_dataset_hash:
            if not baseline_dataset_hash:
                lineage_status = "lineage_incomplete"
            elif baseline_dataset_hash != active_dataset_hash:
                lineage_status = "reference_mismatch"

        baseline_schema_version = str(md.get("feature_schema_version") or "").strip()
        if active_feature_schema_version and baseline_schema_version and baseline_schema_version != active_feature_schema_version:
            lineage_status = "reference_mismatch"

        if not md.get("reference_features"):
            lineage_status = "partial_reference"

        md["lineage_status"] = lineage_status
        return md

    def set_reference(self, data: dict[str, np.ndarray], metadata: Optional[dict[str, Any]] = None) -> None:
        """
        Set reference data for comparison.
        
        Args:
            data: Dict of feature name -> array of reference values
        """
        self.reference_data = {
            k: np.array(v) if not isinstance(v, np.ndarray) else v
            for k, v in data.items()
        }
        sample_count = min((len(v) for v in self.reference_data.values()), default=0)
        reference_features = list(self.reference_data.keys())
        self.reference_metadata = self._normalize_baseline_metadata(
            metadata,
            reference_features,
            sample_count,
        )
        self._save_reference()
        logger.info(f"Reference data set: {list(self.reference_data.keys())}")
    
    def calculate_psi(
        self,
        reference: np.ndarray,
        current: np.ndarray,
        n_bins: int = 10
    ) -> float:
        """
        Calculate Population Stability Index (PSI).
        
        PSI measures the shift in distribution between reference and current data.
        
        Args:
            reference: Reference distribution
            current: Current distribution
            n_bins: Number of bins for discretization
            
        Returns:
            PSI value (0 = no shift, >0.25 = significant shift)
        """
        # Create bins from reference data
        try:
            _, bin_edges = np.histogram(reference, bins=n_bins)
        except Exception:
            return 0.0
        
        # Calculate proportions
        ref_counts, _ = np.histogram(reference, bins=bin_edges)
        cur_counts, _ = np.histogram(current, bins=bin_edges)
        
        # Convert to proportions (with smoothing to avoid division by zero)
        ref_props = (ref_counts + 0.001) / (len(reference) + 0.001 * n_bins)
        cur_props = (cur_counts + 0.001) / (len(current) + 0.001 * n_bins)
        
        # Calculate PSI
        psi = np.sum((cur_props - ref_props) * np.log(cur_props / ref_props))
        
        return float(psi)
    
    def ks_test(
        self,
        reference: np.ndarray,
        current: np.ndarray
    ) -> tuple[float, float]:
        """
        Perform Kolmogorov-Smirnov test.
        
        Args:
            reference: Reference distribution
            current: Current distribution
            
        Returns:
            Tuple of (statistic, p-value)
        """
        if not SCIPY_AVAILABLE or scipy_stats is None:
            return (0.0, 1.0)

        try:
            statistic, p_value = scipy_stats.ks_2samp(reference, current)
            return (float(cast(float, statistic)), float(cast(float, p_value)))
        except Exception as e:
            logger.error(f"KS-test failed: {e}")
            return (0.0, 1.0)
    
    def check_feature_drift(
        self,
        current_data: dict[str, np.ndarray]
    ) -> DriftReport:
        """
        Check for drift in feature distributions.
        
        Args:
            current_data: Dict of feature name -> current values
            
        Returns:
            DriftReport with per-feature analysis
        """
        report = DriftReport()
        feature_drifts = {}
        max_severity = "none"
        
        for feature, current_values in current_data.items():
            if feature not in self.reference_data:
                logger.warning(f"No reference data for feature: {feature}")
                continue
            
            reference_values = self.reference_data[feature]
            current_array = np.array(current_values)
            
            # Calculate PSI
            psi = self.calculate_psi(reference_values, current_array)
            
            # Perform KS-test
            ks_stat, ks_pvalue = self.ks_test(reference_values, current_array)
            
            # Determine drift severity
            if psi >= self.PSI_HIGH:
                severity = "high"
            elif psi >= self.PSI_MEDIUM:
                severity = "medium"
            elif psi >= self.PSI_LOW:
                severity = "low"
            else:
                severity = "none"
            
            has_significant_drift = psi >= self.PSI_LOW or ks_pvalue < self.KS_ALPHA
            
            feature_drifts[feature] = {
                "psi": psi,
                "ks_statistic": ks_stat,
                "ks_pvalue": ks_pvalue,
                "severity": severity,
                "drifted": has_significant_drift,
                "reference_mean": float(np.mean(reference_values)),
                "reference_std": float(np.std(reference_values)),
                "current_mean": float(np.mean(current_array)),
                "current_std": float(np.std(current_array))
            }
            
            if has_significant_drift:
                report.has_drift = True
                # Update max severity
                severity_order = {"none": 0, "low": 1, "medium": 2, "high": 3}
                if severity_order.get(severity, 0) > severity_order.get(max_severity, 0):
                    max_severity = severity
        
        report.feature_drifts = feature_drifts
        report.severity = max_severity
        
        # Generate recommendations
        if report.has_drift:
            report.recommendations = self._generate_recommendations(feature_drifts)
        
        return report
    
    def check_prediction_drift(
        self,
        current_predictions: np.ndarray,
        reference_predictions: Optional[np.ndarray] = None
    ) -> dict[str, Any]:
        """
        Check for drift in prediction distribution.
        
        Args:
            current_predictions: Current prediction values/probabilities
            reference_predictions: Reference predictions (uses stored if None)
            
        Returns:
            Dict with drift analysis
        """
        if reference_predictions is None:
            reference_predictions = self.reference_data.get("_predictions")
        
        if reference_predictions is None:
            return {"error": "No reference predictions available"}
        
        current_array = np.array(current_predictions)
        reference_array = np.array(reference_predictions)
        
        psi = self.calculate_psi(reference_array, current_array)
        ks_stat, ks_pvalue = self.ks_test(reference_array, current_array)
        
        return {
            "psi": psi,
            "ks_statistic": ks_stat,
            "ks_pvalue": ks_pvalue,
            "drifted": psi >= self.PSI_LOW,
            "reference_mean": float(np.mean(reference_array)),
            "current_mean": float(np.mean(current_array))
        }
    
    def _generate_recommendations(self, feature_drifts: dict[str, dict[str, Any]]) -> list[str]:
        """Generate recommendations based on detected drift."""
        recommendations = []
        
        drifted_features = [
            (k, v) for k, v in feature_drifts.items() 
            if v.get("drifted", False)
        ]
        
        if not drifted_features:
            return ["No significant drift detected."]
        
        high_drift = [k for k, v in drifted_features if v["severity"] == "high"]
        
        if high_drift:
            recommendations.append(
                f"HIGH PRIORITY: Significant drift in {', '.join(high_drift)}. "
                "Consider retraining the model."
            )
        
        for feature, drift_info in drifted_features:
            ref_mean = drift_info["reference_mean"]
            cur_mean = drift_info["current_mean"]
            shift = ((cur_mean - ref_mean) / ref_mean * 100) if ref_mean != 0 else 0
            
            if abs(shift) > 20:
                recommendations.append(
                    f"{feature}: Mean shifted by {shift:+.1f}% "
                    f"(reference: {ref_mean:.2f} → current: {cur_mean:.2f})"
                )
        
        if len(drifted_features) > 3:
            recommendations.append(
                "Multiple features show drift. Consider reviewing data collection process."
            )
        
        return recommendations
    
    def create_alert(
        self,
        report: DriftReport
    ) -> Optional[Alert]:
        """
        Create an alert from a drift report.
        
        Args:
            report: DriftReport to create alert from
            
        Returns:
            Created Alert or None if no drift
        """
        if not report.has_drift:
            return None
        
        drifted = [k for k, v in report.feature_drifts.items() if v.get("drifted")]
        
        alert = Alert(
            alert_type="drift",
            severity=report.severity,
            message=f"Drift detected in {len(drifted)} feature(s): {', '.join(drifted)}",
            details={
                "features": drifted,
                "recommendations": report.recommendations
            }
        )
        
        self.alerts.append(alert)
        self._save_alerts()
        
        logger.warning(f"DRIFT ALERT: {alert.message}")
        
        return alert
    
    def get_alerts(
        self,
        unacknowledged_only: bool = False,
        limit: int = 50
    ) -> list[dict[str, Any]]:
        """
        Get recent alerts.
        
        Args:
            unacknowledged_only: Filter to only unacknowledged alerts
            limit: Maximum alerts to return
            
        Returns:
            List of alert dictionaries
        """
        alerts = self.alerts
        
        if unacknowledged_only:
            alerts = [a for a in alerts if not a.acknowledged]
        
        # Sort by timestamp descending
        alerts = sorted(alerts, key=lambda a: a.timestamp, reverse=True)
        
        return [asdict(a) for a in alerts[:limit]]
    
    def acknowledge_alert(self, timestamp: str) -> bool:
        """
        Acknowledge an alert.
        
        Args:
            timestamp: Alert timestamp to acknowledge
            
        Returns:
            True if alert was found and acknowledged
        """
        for alert in self.alerts:
            if alert.timestamp == timestamp:
                alert.acknowledged = True
                self._save_alerts()
                return True
        return False
    
    def get_status(self) -> dict[str, Any]:
        """
        Get current monitoring status.
        
        Returns:
            Dict with status information
        """
        unacked_alerts = len([a for a in self.alerts if not a.acknowledged])
        
        return {
            "reference_features": list(self.reference_data.keys()),
            "reference_set": len(self.reference_data) > 0,
            "total_alerts": len(self.alerts),
            "unacknowledged_alerts": unacked_alerts,
            "last_check": self.alerts[-1].timestamp if self.alerts else None,
            "scipy_available": SCIPY_AVAILABLE,
            "drift_baseline": self.get_baseline_metadata(),
        }


# Singleton instance
_monitor: Optional[DriftMonitor] = None


def get_drift_monitor() -> DriftMonitor:
    """Get or create singleton drift monitor."""
    global _monitor
    if _monitor is None:
        _monitor = DriftMonitor()
    return _monitor


if __name__ == "__main__":
    # Test drift detection
    logging.basicConfig(level=logging.INFO)
    
    # Create reference data
    np.random.seed(42)
    reference = {
        "bmi": np.random.normal(27, 5, 1000),
        "age": np.random.normal(55, 10, 1000),
        "triglycerides": np.random.normal(150, 50, 1000)
    }
    
    # Create current data with some drift
    current = {
        "bmi": np.random.normal(29, 5, 200),  # Shifted mean
        "age": np.random.normal(55, 10, 200),  # No drift
        "triglycerides": np.random.normal(180, 60, 200)  # Shifted mean and variance
    }
    
    # Test monitor
    monitor = DriftMonitor(reference_data=reference)
    
    print("Checking for drift...")
    report = monitor.check_feature_drift(current)
    
    print(f"\nDrift detected: {report.has_drift}")
    print(f"Severity: {report.severity}")
    
    print("\nFeature analysis:")
    for feature, info in report.feature_drifts.items():
        print(f"  {feature}:")
        print(f"    PSI: {info['psi']:.4f}")
        print(f"    Drifted: {info['drifted']}")
        print(f"    Mean shift: {info['reference_mean']:.2f} → {info['current_mean']:.2f}")
    
    print("\nRecommendations:")
    for rec in report.recommendations:
        print(f"  - {rec}")
    
    # Create alert
    if report.has_drift:
        alert = monitor.create_alert(report)
        if alert is not None:
            print(f"\nAlert created: {alert.message}")
