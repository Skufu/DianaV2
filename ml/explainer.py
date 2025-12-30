"""
DIANA SHAP Explainer Module
Provides model interpretability using SHAP values.

Usage:
    from ml.explainer import SHAPExplainer
    explainer = SHAPExplainer(model, scaler, feature_names)
    explanation = explainer.explain(features)
"""

import numpy as np
import shap
import matplotlib
matplotlib.use('Agg')  # Non-GUI backend for server
import matplotlib.pyplot as plt
import io
import base64
from typing import Dict, List, Optional, Any
import joblib
from pathlib import Path


class SHAPExplainer:
    """
    SHAP-based model explainer for diabetes risk predictions.
    Generates feature importance explanations for individual predictions.
    """
    
    def __init__(
        self,
        model: Any,
        scaler: Any,
        feature_names: List[str],
        background_data: Optional[np.ndarray] = None
    ):
        """
        Initialize SHAP explainer.
        
        Args:
            model: Trained sklearn/xgboost model
            scaler: Fitted StandardScaler
            feature_names: List of feature names
            background_data: Optional background data for SHAP (uses KernelExplainer if None)
        """
        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names
        self._explainer = None
        self._background_data = background_data
        
    def _get_explainer(self) -> shap.Explainer:
        """Lazy-load SHAP explainer."""
        if self._explainer is None:
            try:
                # Try TreeExplainer for tree-based models (faster)
                self._explainer = shap.TreeExplainer(self.model)
            except Exception:
                # Fall back to Explainer for other model types
                if self._background_data is not None:
                    self._explainer = shap.Explainer(
                        self.model.predict_proba if hasattr(self.model, 'predict_proba') 
                        else self.model.predict,
                        self._background_data
                    )
                else:
                    # Create synthetic background data
                    background = np.zeros((1, len(self.feature_names)))
                    self._explainer = shap.Explainer(
                        self.model.predict_proba if hasattr(self.model, 'predict_proba')
                        else self.model.predict,
                        background
                    )
        return self._explainer
    
    def explain(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate SHAP explanation for a single prediction.
        
        Args:
            features: Dictionary of feature name -> value
            
        Returns:
            Dictionary with:
                - base_value: Expected model output
                - shap_values: List of (feature_name, shap_value, feature_value)
                - prediction: Model prediction
        """
        # Prepare feature array in correct order
        feature_array = np.array([[features.get(f, 0) for f in self.feature_names]])
        
        # Scale features
        scaled_features = self.scaler.transform(feature_array)
        
        # Get SHAP values
        explainer = self._get_explainer()
        shap_values = explainer(scaled_features)
        
        # Handle multi-class output (use positive class for binary)
        values = shap_values.values[0]
        if len(values.shape) > 1:
            values = values[:, 1]  # Get positive class SHAP values
            
        base_value = shap_values.base_values[0]
        if hasattr(base_value, '__len__'):
            base_value = base_value[1]  # Positive class base value
        
        # Create explanation dict
        explanation = {
            "base_value": float(base_value),
            "shap_values": [
                {
                    "feature": name,
                    "shap_value": float(values[i]),
                    "feature_value": float(features.get(name, 0))
                }
                for i, name in enumerate(self.feature_names)
            ],
            "feature_names": self.feature_names,
            "raw_shap_values": [float(v) for v in values]
        }
        
        # Add prediction
        try:
            if hasattr(self.model, 'predict_proba'):
                proba = self.model.predict_proba(scaled_features)[0]
                explanation["prediction"] = float(proba[1]) if len(proba) > 1 else float(proba[0])
            else:
                explanation["prediction"] = float(self.model.predict(scaled_features)[0])
        except Exception:
            explanation["prediction"] = None
            
        return explanation
    
    def generate_waterfall_plot(self, features: Dict[str, float]) -> str:
        """
        Generate a SHAP waterfall plot as a base64-encoded PNG.
        
        Args:
            features: Dictionary of feature name -> value
            
        Returns:
            Base64-encoded PNG string
        """
        # Prepare feature array
        feature_array = np.array([[features.get(f, 0) for f in self.feature_names]])
        scaled_features = self.scaler.transform(feature_array)
        
        # Get SHAP values
        explainer = self._get_explainer()
        shap_values = explainer(scaled_features)
        
        # Create waterfall plot
        plt.figure(figsize=(10, 6))
        shap.plots.waterfall(shap_values[0], show=False, max_display=10)
        plt.tight_layout()
        
        # Save to bytes
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', 
                    facecolor='white', edgecolor='none')
        plt.close()
        buf.seek(0)
        
        # Encode to base64
        return base64.b64encode(buf.read()).decode('utf-8')
    
    def generate_force_plot(self, features: Dict[str, float]) -> str:
        """
        Generate a SHAP force plot as a base64-encoded PNG.
        
        Args:
            features: Dictionary of feature name -> value
            
        Returns:
            Base64-encoded PNG string
        """
        # Prepare feature array
        feature_array = np.array([[features.get(f, 0) for f in self.feature_names]])
        scaled_features = self.scaler.transform(feature_array)
        
        # Get SHAP values
        explainer = self._get_explainer()
        shap_values = explainer(scaled_features)
        
        # Handle values extraction for force plot
        values = shap_values.values[0]
        base_value = shap_values.base_values[0]
        
        if len(values.shape) > 1:
            values = values[:, 1]
        if hasattr(base_value, '__len__'):
            base_value = base_value[1]
        
        # Create force plot
        plt.figure(figsize=(12, 3))
        shap.force_plot(
            base_value,
            values,
            feature_array[0],
            feature_names=self.feature_names,
            matplotlib=True,
            show=False
        )
        plt.tight_layout()
        
        # Save to bytes
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close()
        buf.seek(0)
        
        return base64.b64encode(buf.read()).decode('utf-8')


# Singleton instances for clinical and ADA models
_clinical_explainer = None
_ada_explainer = None


def get_clinical_explainer() -> Optional[SHAPExplainer]:
    """Get or create SHAP explainer for clinical model."""
    global _clinical_explainer
    if _clinical_explainer is None:
        try:
            from ml.predict import CLINICAL_FEATURES, CLINICAL_MODELS_DIR
            
            model_path = CLINICAL_MODELS_DIR / "best_model.joblib"
            scaler_path = CLINICAL_MODELS_DIR / "scaler.joblib"
            
            if model_path.exists() and scaler_path.exists():
                model = joblib.load(model_path)
                scaler = joblib.load(scaler_path)
                _clinical_explainer = SHAPExplainer(model, scaler, CLINICAL_FEATURES)
        except Exception as e:
            print(f"Could not initialize clinical SHAP explainer: {e}")
    return _clinical_explainer


def get_ada_explainer() -> Optional[SHAPExplainer]:
    """Get or create SHAP explainer for ADA baseline model."""
    global _ada_explainer
    if _ada_explainer is None:
        try:
            from ml.predict import REQUIRED_FEATURES
            
            models_dir = Path(__file__).parent.parent / "models"
            model_path = models_dir / "best_model.joblib"
            scaler_path = models_dir / "scaler.joblib"
            
            if model_path.exists() and scaler_path.exists():
                model = joblib.load(model_path)
                scaler = joblib.load(scaler_path)
                _ada_explainer = SHAPExplainer(model, scaler, REQUIRED_FEATURES)
        except Exception as e:
            print(f"Could not initialize ADA SHAP explainer: {e}")
    return _ada_explainer
