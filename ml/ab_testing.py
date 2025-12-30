"""
DIANA A/B Testing Module
Provides infrastructure for comparing model versions in production.

Usage:
    from ml.ab_testing import ABTestManager
    
    manager = ABTestManager()
    
    # Create a test
    manager.create_test("new_model_v2", 
                        baseline="v1", 
                        challenger="v2",
                        traffic_split=0.1)
    
    # Route predictions
    model_version, model = manager.route_request("patient_123", "new_model_v2")
    
    # Record and analyze
    manager.record_prediction(test_name, model_version, features, result)
    results = manager.get_comparison("new_model_v2")
"""

import json
import hashlib
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

# Default storage path
DEFAULT_AB_TESTS_PATH = Path(__file__).parent / "monitoring" / "ab_tests.json"
DEFAULT_PREDICTIONS_PATH = Path(__file__).parent / "monitoring" / "ab_predictions.json"


@dataclass
class ABTestConfig:
    """Configuration for an A/B test."""
    test_name: str
    baseline_version: str
    challenger_version: str
    traffic_split: float  # Fraction of traffic to challenger (0.0 - 1.0)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    end_at: Optional[str] = None
    status: str = "active"  # "active", "paused", "completed"
    description: str = ""
    
    def __post_init__(self):
        if not 0.0 <= self.traffic_split <= 1.0:
            raise ValueError("traffic_split must be between 0.0 and 1.0")


@dataclass
class PredictionRecord:
    """Record of a prediction made during an A/B test."""
    test_name: str
    model_version: str
    patient_hash: str  # Hashed patient ID for privacy
    features: Dict[str, float]
    prediction: Dict
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    actual_outcome: Optional[str] = None  # Can be set later for validation


class ABTestManager:
    """
    Manages A/B tests for model comparison.
    
    Features:
    - Deterministic routing (same patient always gets same model)
    - Prediction recording for later analysis
    - Comparison metrics between versions
    """
    
    def __init__(
        self,
        tests_path: Optional[Path] = None,
        predictions_path: Optional[Path] = None
    ):
        """
        Initialize A/B test manager.
        
        Args:
            tests_path: Path to store test configurations
            predictions_path: Path to store prediction records
        """
        self.tests_path = tests_path or DEFAULT_AB_TESTS_PATH
        self.predictions_path = predictions_path or DEFAULT_PREDICTIONS_PATH
        
        # Ensure directories exist
        self.tests_path.parent.mkdir(parents=True, exist_ok=True)
        
        self._tests: Dict[str, ABTestConfig] = {}
        self._predictions: List[PredictionRecord] = []
        
        self._load_tests()
        self._load_predictions()
    
    def _load_tests(self):
        """Load test configurations from file."""
        if self.tests_path.exists():
            try:
                with open(self.tests_path, 'r') as f:
                    data = json.load(f)
                    for test_data in data:
                        test = ABTestConfig(**test_data)
                        self._tests[test.test_name] = test
                logger.info(f"Loaded {len(self._tests)} A/B tests")
            except Exception as e:
                logger.error(f"Failed to load A/B tests: {e}")
    
    def _save_tests(self):
        """Save test configurations to file."""
        try:
            with open(self.tests_path, 'w') as f:
                json.dump([asdict(t) for t in self._tests.values()], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save A/B tests: {e}")
    
    def _load_predictions(self):
        """Load prediction records from file."""
        if self.predictions_path.exists():
            try:
                with open(self.predictions_path, 'r') as f:
                    data = json.load(f)
                    self._predictions = [PredictionRecord(**p) for p in data]
                logger.info(f"Loaded {len(self._predictions)} prediction records")
            except Exception as e:
                logger.error(f"Failed to load predictions: {e}")
    
    def _save_predictions(self):
        """Save prediction records to file."""
        try:
            with open(self.predictions_path, 'w') as f:
                json.dump([asdict(p) for p in self._predictions], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save predictions: {e}")
    
    def create_test(
        self,
        test_name: str,
        baseline_version: str,
        challenger_version: str,
        traffic_split: float = 0.1,
        description: str = ""
    ) -> ABTestConfig:
        """
        Create a new A/B test.
        
        Args:
            test_name: Unique name for the test
            baseline_version: Version ID of baseline model
            challenger_version: Version ID of challenger model
            traffic_split: Fraction of traffic to challenger (default 10%)
            description: Optional description
            
        Returns:
            Created ABTestConfig
        """
        if test_name in self._tests:
            raise ValueError(f"Test '{test_name}' already exists")
        
        test = ABTestConfig(
            test_name=test_name,
            baseline_version=baseline_version,
            challenger_version=challenger_version,
            traffic_split=traffic_split,
            description=description
        )
        
        self._tests[test_name] = test
        self._save_tests()
        
        logger.info(f"Created A/B test: {test_name} ({baseline_version} vs {challenger_version})")
        return test
    
    def get_test(self, test_name: str) -> Optional[ABTestConfig]:
        """Get a test configuration by name."""
        return self._tests.get(test_name)
    
    def list_tests(self, status: Optional[str] = None) -> List[ABTestConfig]:
        """
        List all tests, optionally filtered by status.
        
        Args:
            status: Filter by status ("active", "paused", "completed")
            
        Returns:
            List of test configurations
        """
        tests = list(self._tests.values())
        if status:
            tests = [t for t in tests if t.status == status]
        return tests
    
    def update_test_status(self, test_name: str, status: str) -> bool:
        """
        Update the status of a test.
        
        Args:
            test_name: Name of the test
            status: New status ("active", "paused", "completed")
            
        Returns:
            True if successful
        """
        if test_name not in self._tests:
            return False
        
        self._tests[test_name].status = status
        if status == "completed":
            self._tests[test_name].end_at = datetime.now().isoformat()
        
        self._save_tests()
        return True
    
    def route_request(
        self,
        patient_id: str,
        test_name: str
    ) -> Tuple[str, str]:
        """
        Deterministically route a request to a model version.
        
        Uses hash-based routing to ensure same patient always gets same model.
        
        Args:
            patient_id: Unique patient identifier
            test_name: Name of the A/B test
            
        Returns:
            Tuple of (model_version, "baseline" or "challenger")
        """
        test = self._tests.get(test_name)
        if not test or test.status != "active":
            # Default to baseline if test not found or inactive
            return (test.baseline_version if test else "default", "baseline")
        
        # Hash patient ID for deterministic routing
        hash_value = int(hashlib.md5(patient_id.encode()).hexdigest(), 16)
        bucket = (hash_value % 100) / 100.0
        
        if bucket < test.traffic_split:
            return (test.challenger_version, "challenger")
        else:
            return (test.baseline_version, "baseline")
    
    def record_prediction(
        self,
        test_name: str,
        model_version: str,
        patient_id: str,
        features: Dict[str, float],
        prediction: Dict
    ) -> None:
        """
        Record a prediction for later analysis.
        
        Args:
            test_name: Name of the A/B test
            model_version: Which version made the prediction
            patient_id: Patient identifier (will be hashed)
            features: Input features
            prediction: Model prediction output
        """
        # Hash patient ID for privacy
        patient_hash = hashlib.sha256(patient_id.encode()).hexdigest()[:16]
        
        record = PredictionRecord(
            test_name=test_name,
            model_version=model_version,
            patient_hash=patient_hash,
            features=features,
            prediction=prediction
        )
        
        self._predictions.append(record)
        
        # Save periodically (every 10 predictions)
        if len(self._predictions) % 10 == 0:
            self._save_predictions()
    
    def record_outcome(
        self,
        patient_id: str,
        actual_outcome: str
    ) -> int:
        """
        Record actual outcome for validation.
        
        Args:
            patient_id: Patient identifier
            actual_outcome: Actual diagnosis/outcome
            
        Returns:
            Number of predictions updated
        """
        patient_hash = hashlib.sha256(patient_id.encode()).hexdigest()[:16]
        
        updated = 0
        for pred in self._predictions:
            if pred.patient_hash == patient_hash and pred.actual_outcome is None:
                pred.actual_outcome = actual_outcome
                updated += 1
        
        if updated > 0:
            self._save_predictions()
        
        return updated
    
    def get_comparison(self, test_name: str) -> Dict:
        """
        Get comparison metrics between baseline and challenger.
        
        Args:
            test_name: Name of the A/B test
            
        Returns:
            Dictionary with comparison metrics
        """
        test = self._tests.get(test_name)
        if not test:
            return {"error": f"Test '{test_name}' not found"}
        
        # Filter predictions for this test
        test_predictions = [p for p in self._predictions if p.test_name == test_name]
        
        baseline_preds = [p for p in test_predictions if p.model_version == test.baseline_version]
        challenger_preds = [p for p in test_predictions if p.model_version == test.challenger_version]
        
        def analyze_predictions(preds: List[PredictionRecord]) -> Dict:
            if not preds:
                return {"count": 0}
            
            # Calculate statistics
            probabilities = [p.prediction.get("probability", 0) for p in preds]
            
            result = {
                "count": len(preds),
                "avg_probability": float(np.mean(probabilities)) if probabilities else 0,
                "std_probability": float(np.std(probabilities)) if probabilities else 0,
            }
            
            # If we have outcomes, calculate accuracy
            with_outcomes = [p for p in preds if p.actual_outcome is not None]
            if with_outcomes:
                correct = sum(
                    1 for p in with_outcomes 
                    if p.prediction.get("prediction") == p.actual_outcome
                )
                result["validated_count"] = len(with_outcomes)
                result["accuracy"] = correct / len(with_outcomes)
            
            # Distribution of predictions
            pred_counts = {}
            for p in preds:
                pred_class = p.prediction.get("prediction", "Unknown")
                pred_counts[pred_class] = pred_counts.get(pred_class, 0) + 1
            result["prediction_distribution"] = pred_counts
            
            return result
        
        return {
            "test_name": test_name,
            "status": test.status,
            "traffic_split": test.traffic_split,
            "created_at": test.created_at,
            "baseline": {
                "version": test.baseline_version,
                "metrics": analyze_predictions(baseline_preds)
            },
            "challenger": {
                "version": test.challenger_version,
                "metrics": analyze_predictions(challenger_preds)
            },
            "total_predictions": len(test_predictions)
        }
    
    def delete_test(self, test_name: str, delete_predictions: bool = False) -> bool:
        """
        Delete a test and optionally its predictions.
        
        Args:
            test_name: Name of the test to delete
            delete_predictions: Whether to also delete prediction records
            
        Returns:
            True if successful
        """
        if test_name not in self._tests:
            return False
        
        del self._tests[test_name]
        self._save_tests()
        
        if delete_predictions:
            self._predictions = [p for p in self._predictions if p.test_name != test_name]
            self._save_predictions()
        
        return True


# Singleton instance
_manager: Optional[ABTestManager] = None


def get_ab_manager() -> ABTestManager:
    """Get or create the singleton A/B test manager."""
    global _manager
    if _manager is None:
        _manager = ABTestManager()
    return _manager


if __name__ == "__main__":
    # Test A/B testing functionality
    logging.basicConfig(level=logging.INFO)
    
    manager = ABTestManager()
    
    # Create a test
    try:
        test = manager.create_test(
            test_name="test_clinical_v2",
            baseline_version="v1.0",
            challenger_version="v2.0",
            traffic_split=0.2,
            description="Testing new clinical model"
        )
        print(f"Created test: {test.test_name}")
    except ValueError as e:
        print(f"Test already exists: {e}")
    
    # Test routing
    for i in range(10):
        patient_id = f"patient_{i:03d}"
        version, group = manager.route_request(patient_id, "test_clinical_v2")
        print(f"{patient_id} -> {version} ({group})")
    
    # Record some predictions
    manager.record_prediction(
        test_name="test_clinical_v2",
        model_version="v1.0",
        patient_id="patient_001",
        features={"bmi": 28.5, "age": 55},
        prediction={"prediction": "Pre-diabetic", "probability": 0.65}
    )
    
    # Get comparison
    comparison = manager.get_comparison("test_clinical_v2")
    print(f"\nComparison: {json.dumps(comparison, indent=2)}")
