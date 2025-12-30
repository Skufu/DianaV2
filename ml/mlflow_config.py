"""
DIANA MLflow Configuration Module
Provides experiment tracking, model logging, and model registry utilities.

Usage:
    from ml.mlflow_config import MLflowManager
    
    manager = MLflowManager()
    with manager.start_run("training_run"):
        manager.log_params({"n_estimators": 100})
        manager.log_metrics({"accuracy": 0.92, "auc": 0.95})
        manager.log_model(model, "random_forest")
"""

import os
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime

try:
    import mlflow
    from mlflow.tracking import MlflowClient
    from mlflow.models import infer_signature
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False
    mlflow = None
    MlflowClient = None

import joblib

logger = logging.getLogger(__name__)

# Default paths
DEFAULT_TRACKING_URI = "file:///" + str(Path(__file__).parent.parent / "mlruns").replace("\\", "/")
DEFAULT_EXPERIMENT_NAME = "diana-diabetes-prediction"


class MLflowManager:
    """
    MLflow integration manager for DIANA ML pipeline.
    
    Handles:
    - Experiment tracking
    - Model versioning
    - Artifact logging
    - Model registry operations
    """
    
    def __init__(
        self,
        tracking_uri: Optional[str] = None,
        experiment_name: str = DEFAULT_EXPERIMENT_NAME
    ):
        """
        Initialize MLflow manager.
        
        Args:
            tracking_uri: MLflow tracking server URI or local path
            experiment_name: Name of the experiment to use
        """
        self.tracking_uri = tracking_uri or os.environ.get(
            "MLFLOW_TRACKING_URI", DEFAULT_TRACKING_URI
        )
        self.experiment_name = experiment_name
        self._client = None
        self._active_run = None
        
        if MLFLOW_AVAILABLE:
            self._setup_mlflow()
        else:
            logger.warning("MLflow not installed. Model versioning disabled.")
    
    def _setup_mlflow(self):
        """Configure MLflow settings."""
        # Ensure tracking directory exists for local storage
        if self.tracking_uri.startswith("file://"):
            # Strip file:// prefix for directory creation
            local_path = self.tracking_uri.replace("file:///", "").replace("file://", "")
            Path(local_path).mkdir(parents=True, exist_ok=True)
        elif not self.tracking_uri.startswith(("http://", "https://")):
            Path(self.tracking_uri).mkdir(parents=True, exist_ok=True)
        
        mlflow.set_tracking_uri(self.tracking_uri)
        
        # Create or get experiment
        experiment = mlflow.get_experiment_by_name(self.experiment_name)
        if experiment is None:
            mlflow.create_experiment(self.experiment_name)
        mlflow.set_experiment(self.experiment_name)
        
        self._client = MlflowClient()
        logger.info(f"MLflow configured: {self.tracking_uri}")
    
    @property
    def client(self) -> Optional[Any]:
        """Get MLflow client instance."""
        return self._client
    
    @property
    def is_available(self) -> bool:
        """Check if MLflow is available."""
        return MLFLOW_AVAILABLE
    
    def start_run(self, run_name: Optional[str] = None, tags: Optional[Dict] = None):
        """
        Start an MLflow run as a context manager.
        
        Args:
            run_name: Optional name for the run
            tags: Optional tags to add to the run
            
        Returns:
            MLflow run context manager or no-op context
        """
        if not MLFLOW_AVAILABLE:
            return _NoOpContext()
        
        return mlflow.start_run(run_name=run_name, tags=tags)
    
    def log_params(self, params: Dict[str, Any]) -> None:
        """Log parameters to current run."""
        if not MLFLOW_AVAILABLE:
            return
        mlflow.log_params(params)
    
    def log_metrics(self, metrics: Dict[str, float], step: Optional[int] = None) -> None:
        """Log metrics to current run."""
        if not MLFLOW_AVAILABLE:
            return
        mlflow.log_metrics(metrics, step=step)
    
    def log_artifact(self, local_path: str, artifact_path: Optional[str] = None) -> None:
        """Log a file or directory as an artifact."""
        if not MLFLOW_AVAILABLE:
            return
        mlflow.log_artifact(local_path, artifact_path)
    
    def log_model(
        self,
        model: Any,
        artifact_path: str,
        model_type: str = "sklearn",
        input_example: Optional[Any] = None,
        registered_model_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Log a model to MLflow.
        
        Args:
            model: The model object to log
            artifact_path: Path within the artifact store
            model_type: Type of model ("sklearn", "xgboost", "custom")
            input_example: Example input for signature inference
            registered_model_name: If provided, register model to registry
            
        Returns:
            Model URI if logged successfully
        """
        if not MLFLOW_AVAILABLE:
            return None
        
        try:
            signature = None
            if input_example is not None:
                import numpy as np
                import pandas as pd
                # Try to infer signature
                try:
                    if hasattr(model, 'predict'):
                        if isinstance(input_example, pd.DataFrame):
                            output_example = model.predict(input_example)
                        else:
                            output_example = model.predict(np.array([input_example]))
                        signature = infer_signature(input_example, output_example)
                except Exception as e:
                    logger.warning(f"Could not infer signature: {e}")
            
            if model_type == "sklearn":
                model_info = mlflow.sklearn.log_model(
                    model,
                    artifact_path,
                    signature=signature,
                    registered_model_name=registered_model_name
                )
            elif model_type == "xgboost":
                model_info = mlflow.xgboost.log_model(
                    model,
                    artifact_path,
                    signature=signature,
                    registered_model_name=registered_model_name
                )
            else:
                # Generic Python model
                model_info = mlflow.pyfunc.log_model(
                    artifact_path,
                    python_model=model,
                    signature=signature,
                    registered_model_name=registered_model_name
                )
            
            logger.info(f"Model logged to: {model_info.model_uri}")
            return model_info.model_uri
            
        except Exception as e:
            logger.error(f"Failed to log model: {e}")
            return None
    
    def register_model(
        self,
        model_uri: str,
        name: str,
        tags: Optional[Dict[str, str]] = None
    ) -> Optional[Any]:
        """
        Register a model to the MLflow Model Registry.
        
        Args:
            model_uri: URI of the logged model (e.g., "runs:/<run_id>/model")
            name: Name for the registered model
            tags: Optional tags for the model version
            
        Returns:
            ModelVersion object if successful
        """
        if not MLFLOW_AVAILABLE or self._client is None:
            return None
        
        try:
            result = mlflow.register_model(model_uri, name)
            
            if tags:
                for key, value in tags.items():
                    self._client.set_model_version_tag(
                        name, result.version, key, value
                    )
            
            logger.info(f"Registered model: {name} version {result.version}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to register model: {e}")
            return None
    
    def transition_model_stage(
        self,
        name: str,
        version: int,
        stage: str = "Production"
    ) -> bool:
        """
        Transition a model version to a new stage.
        
        Args:
            name: Registered model name
            version: Model version number
            stage: Target stage ("Staging", "Production", "Archived")
            
        Returns:
            True if successful
        """
        if not MLFLOW_AVAILABLE or self._client is None:
            return False
        
        try:
            self._client.transition_model_version_stage(
                name=name,
                version=version,
                stage=stage,
                archive_existing_versions=(stage == "Production")
            )
            logger.info(f"Model {name} v{version} -> {stage}")
            return True
        except Exception as e:
            logger.error(f"Failed to transition model: {e}")
            return False
    
    def get_latest_model(
        self,
        name: str,
        stage: str = "Production"
    ) -> Optional[Any]:
        """
        Load the latest model version from a stage.
        
        Args:
            name: Registered model name
            stage: Stage to load from ("Production", "Staging", etc.)
            
        Returns:
            Loaded model or None
        """
        if not MLFLOW_AVAILABLE:
            return None
        
        try:
            model_uri = f"models:/{name}/{stage}"
            model = mlflow.pyfunc.load_model(model_uri)
            logger.info(f"Loaded model: {model_uri}")
            return model
        except Exception as e:
            logger.warning(f"Could not load model {name}/{stage}: {e}")
            return None
    
    def get_model_versions(self, name: str) -> List[Dict]:
        """
        Get all versions of a registered model.
        
        Args:
            name: Registered model name
            
        Returns:
            List of version info dictionaries
        """
        if not MLFLOW_AVAILABLE or self._client is None:
            return []
        
        try:
            versions = self._client.search_model_versions(f"name='{name}'")
            return [
                {
                    "version": v.version,
                    "stage": v.current_stage,
                    "status": v.status,
                    "created_at": v.creation_timestamp,
                    "run_id": v.run_id,
                    "description": v.description
                }
                for v in versions
            ]
        except Exception as e:
            logger.error(f"Failed to get model versions: {e}")
            return []
    
    def get_run_metrics(self, run_id: str) -> Dict[str, float]:
        """Get metrics from a specific run."""
        if not MLFLOW_AVAILABLE or self._client is None:
            return {}
        
        try:
            run = self._client.get_run(run_id)
            return run.data.metrics
        except Exception as e:
            logger.error(f"Failed to get run metrics: {e}")
            return {}
    
    def list_experiments(self) -> List[Dict]:
        """List all experiments."""
        if not MLFLOW_AVAILABLE or self._client is None:
            return []
        
        try:
            experiments = self._client.search_experiments()
            return [
                {
                    "id": exp.experiment_id,
                    "name": exp.name,
                    "artifact_location": exp.artifact_location,
                    "lifecycle_stage": exp.lifecycle_stage
                }
                for exp in experiments
            ]
        except Exception as e:
            logger.error(f"Failed to list experiments: {e}")
            return []
    
    def list_runs(
        self,
        experiment_name: Optional[str] = None,
        max_results: int = 100
    ) -> List[Dict]:
        """
        List runs from an experiment.
        
        Args:
            experiment_name: Experiment name (uses current if None)
            max_results: Maximum runs to return
            
        Returns:
            List of run info dictionaries
        """
        if not MLFLOW_AVAILABLE or self._client is None:
            return []
        
        try:
            exp_name = experiment_name or self.experiment_name
            experiment = mlflow.get_experiment_by_name(exp_name)
            
            if experiment is None:
                return []
            
            runs = self._client.search_runs(
                experiment_ids=[experiment.experiment_id],
                max_results=max_results,
                order_by=["start_time DESC"]
            )
            
            return [
                {
                    "run_id": run.info.run_id,
                    "run_name": run.info.run_name,
                    "status": run.info.status,
                    "start_time": run.info.start_time,
                    "end_time": run.info.end_time,
                    "metrics": run.data.metrics,
                    "params": run.data.params
                }
                for run in runs
            ]
        except Exception as e:
            logger.error(f"Failed to list runs: {e}")
            return []


class _NoOpContext:
    """No-operation context manager when MLflow is not available."""
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


# Singleton instance
_manager: Optional[MLflowManager] = None


def get_mlflow_manager() -> MLflowManager:
    """Get or create the singleton MLflow manager."""
    global _manager
    if _manager is None:
        _manager = MLflowManager()
    return _manager


def log_training_run(
    model: Any,
    model_name: str,
    model_type: str,
    metrics: Dict[str, float],
    params: Dict[str, Any],
    artifacts: Optional[Dict[str, str]] = None,
    register: bool = False
) -> Optional[str]:
    """
    Convenience function to log a complete training run.
    
    Args:
        model: Trained model object
        model_name: Name for the model
        model_type: Type of model ("sklearn", "xgboost")
        metrics: Performance metrics
        params: Training parameters
        artifacts: Dict of {name: local_path} for additional artifacts
        register: Whether to register model to registry
        
    Returns:
        Run ID if successful
    """
    manager = get_mlflow_manager()
    
    if not manager.is_available:
        logger.warning("MLflow not available. Skipping logging.")
        return None
    
    run_name = f"{model_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    with manager.start_run(run_name=run_name) as run:
        # Log parameters
        manager.log_params(params)
        
        # Log metrics
        manager.log_metrics(metrics)
        
        # Log model
        registered_name = f"diana-{model_name}" if register else None
        manager.log_model(
            model,
            artifact_path="model",
            model_type=model_type,
            registered_model_name=registered_name
        )
        
        # Log additional artifacts
        if artifacts:
            for name, path in artifacts.items():
                if Path(path).exists():
                    manager.log_artifact(path, name)
        
        return run.info.run_id


if __name__ == "__main__":
    # Test MLflow configuration
    logging.basicConfig(level=logging.INFO)
    
    manager = MLflowManager()
    print(f"MLflow available: {manager.is_available}")
    print(f"Tracking URI: {manager.tracking_uri}")
    
    if manager.is_available:
        # Test run
        with manager.start_run(run_name="test_run"):
            manager.log_params({"test_param": "value"})
            manager.log_metrics({"test_metric": 0.95})
        
        print("Test run completed successfully!")
        
        # List runs
        runs = manager.list_runs()
        print(f"Found {len(runs)} runs")
