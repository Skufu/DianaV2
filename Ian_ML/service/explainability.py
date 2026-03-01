"""
DIANA Explainability Module
Provides SHAP-based explanations for diabetes risk predictions.

Usage:
    from Ian_ML.service.explainability import SHAPExplainer
    
    explainer = SHAPExplainer(model)
    explanation = explainer.explain(features, feature_names)
    
    # Returns human-readable contributions
    for contrib in explanation["contributions"]:
        print(f"{contrib['feature']}: {contrib['description']}")
"""

import base64
import importlib
import io
import logging
from typing import Any, List, Optional
import numpy as np

shap_module: Any | None = None
shap_available = False
try:
    shap_module = importlib.import_module("shap")
    shap_available = True
except ImportError:
    shap_module = None
    shap_available = False

matplotlib_available = False
plt: Any | None = None
try:
    matplotlib = importlib.import_module("matplotlib")
    matplotlib.use("Agg")
    plt = importlib.import_module("matplotlib.pyplot")
    matplotlib_available = True
except Exception:
    matplotlib_available = False
    plt = None

logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    SHAP-based model explainer for DIANA predictions.
    
    Provides:
    - SHAP values for each feature
    - Human-readable explanations for clinicians
    - Feature contribution summaries
    """
    
    def __init__(
        self,
        model: Any,
        model_type: str = "tree",
        background_data: Optional[np.ndarray] = None
    ):
        """
        Initialize SHAP explainer.
        
        Args:
            model: Trained model (sklearn, XGBoost, etc.)
            model_type: Type of model ("tree", "linear", "kernel")
            background_data: Background dataset for kernel explainer
        """
        self.model = model
        self.model_type = model_type
        self.background_data = background_data
        self._explainer = None
        
        if not shap_available:
            logger.warning("SHAP not installed. Explainability disabled.")
        else:
            self._setup_explainer()
    
    def _setup_explainer(self):
        """Initialize the appropriate SHAP explainer."""
        if not shap_available:
            return

        if shap_module is None:
            return
        
        try:
            if self.model_type == "tree":
                # For tree-based models (RF, XGBoost, GradientBoosting)
                self._explainer = shap_module.TreeExplainer(self.model)
            elif self.model_type == "linear":
                # For linear models (LogisticRegression, LinearSVC)
                self._explainer = shap_module.LinearExplainer(
                    self.model,
                    self.background_data if self.background_data is not None else np.zeros((1, 10))
                )
            else:
                # Kernel explainer for any model (slower)
                if self.background_data is None:
                    logger.warning("Kernel explainer requires background data")
                    return
                self._explainer = shap_module.KernelExplainer(
                    self.model.predict_proba if hasattr(self.model, 'predict_proba') else self.model.predict,
                    self.background_data
                )
            logger.info(f"SHAP {self.model_type} explainer initialized")
        except Exception as e:
            logger.error(f"Failed to initialize SHAP explainer: {e}")
            self._explainer = None
    
    @property
    def is_available(self) -> bool:
        """Check if SHAP is available and explainer is initialized."""
        return shap_available and self._explainer is not None
    
    def explain(
        self,
        features: np.ndarray,
        feature_names: List[str],
        class_index: Optional[int] = None
    ) -> dict[str, Any]:
        """
        Generate SHAP explanation for a prediction.
        
        Args:
            features: Feature array (1D for single instance or 2D)
            feature_names: List of feature names
            class_index: For multi-class, which class to explain (default: predicted class)
            
        Returns:
            Dictionary with:
            - base_value: Expected prediction (baseline)
            - shap_values: Per-feature SHAP values
            - feature_values: Actual feature values
            - feature_names: Feature names
            - contributions: Sorted human-readable contributions
        """
        if not self.is_available or self._explainer is None:
            return self._empty_explanation(feature_names)
        
        try:
            # Ensure 2D array
            if features.ndim == 1:
                features = features.reshape(1, -1)
            
            # Calculate SHAP values
            shap_values = self._explainer.shap_values(features)
            if shap_values is None:
                return self._empty_explanation(feature_names)
            
            # Handle multi-output (classification with multiple classes)
            if isinstance(shap_values, list):
                # For multi-class, use the specified class or the one with highest probability
                if class_index is not None:
                    shap_values = shap_values[class_index]
                else:
                    # Default to the last class (often "positive" class like Diabetic)
                    shap_values = shap_values[-1]
            
            # Get base value
            base_value = self._explainer.expected_value
            if isinstance(base_value, (list, np.ndarray)):
                base_value = base_value[-1] if class_index is None else base_value[class_index]

            if base_value is None:
                return self._empty_explanation(feature_names)
            
            # Get SHAP values for first instance
            instance_shap = shap_values[0] if getattr(shap_values, "ndim", 1) > 1 else shap_values
            instance_features = features[0]
            
            # Build contributions list
            contributions = self._build_contributions(
                instance_shap,
                instance_features,
                feature_names
            )
            
            return {
                "base_value": float(base_value),
                "shap_values": np.asarray(instance_shap, dtype=float).tolist(),
                "feature_values": np.asarray(instance_features, dtype=float).tolist(),
                "feature_names": feature_names,
                "contributions": contributions,
                "explainer_type": self.model_type
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}")
            return self._empty_explanation(feature_names)
    
    def _build_contributions(
        self,
        shap_values: np.ndarray,
        feature_values: np.ndarray,
        feature_names: List[str]
    ) -> list[dict[str, Any]]:
        """
        Build sorted, human-readable contributions.
        
        Returns:
            List of contribution dictionaries sorted by absolute impact
        """
        contributions = []
        
        for i, name in enumerate(feature_names):
            shap_val = float(shap_values[i])
            feat_val = float(feature_values[i])
            
            # Determine direction
            if abs(shap_val) < 0.01:
                direction = "neutral"
                description = f"{name} has minimal impact"
            elif shap_val > 0:
                direction = "increases risk"
                description = f"{name} = {feat_val:.1f} increases risk"
            else:
                direction = "decreases risk"
                description = f"{name} = {feat_val:.1f} decreases risk"
            
            contributions.append({
                "feature": name,
                "value": feat_val,
                "shap_value": shap_val,
                "impact": abs(shap_val),
                "direction": direction,
                "description": description
            })
        
        # Sort by absolute impact (most important first)
        contributions.sort(key=lambda x: x["impact"], reverse=True)
        
        return contributions
    
    def _empty_explanation(self, feature_names: List[str]) -> dict[str, Any]:
        """Return empty explanation when SHAP is unavailable."""
        return {
            "base_value": 0.0,
            "shap_values": [0.0] * len(feature_names),
            "feature_values": [0.0] * len(feature_names),
            "feature_names": feature_names,
            "contributions": [],
            "explainer_type": None,
            "error": "SHAP not available"
        }
    
    def get_summary(self, explanation: dict[str, Any], top_n: int = 3) -> str:
        """
        Generate a text summary of the explanation.
        
        Args:
            explanation: Output from explain()
            top_n: Number of top features to include
            
        Returns:
            Human-readable summary string
        """
        if not explanation.get("contributions"):
            return "Unable to generate explanation."
        
        contributions = explanation["contributions"][:top_n]
        
        # Group by direction
        increasing = [c for c in contributions if c["direction"] == "increases risk"]
        decreasing = [c for c in contributions if c["direction"] == "decreases risk"]
        
        parts = []
        
        if increasing:
            inc_features = ", ".join([c["feature"] for c in increasing])
            parts.append(f"Factors increasing risk: {inc_features}")
        
        if decreasing:
            dec_features = ", ".join([c["feature"] for c in decreasing])
            parts.append(f"Factors decreasing risk: {dec_features}")
        
        if not parts:
            return "No significant factors identified."
        
        return ". ".join(parts) + "."


def explain_prediction(
    model: Any,
    features: np.ndarray,
    feature_names: List[str],
    model_type: str = "tree"
) -> dict[str, Any]:
    """
    Convenience function to explain a single prediction.
    
    Args:
        model: Trained model
        features: Feature array
        feature_names: Feature names
        model_type: Type of model
        
    Returns:
        Explanation dictionary
    """
    explainer = SHAPExplainer(model, model_type)
    return explainer.explain(features, feature_names)


def format_for_clinician(explanation: dict[str, Any]) -> dict[str, Any]:
    """
    Format SHAP explanation for clinical display.
    
    Returns a simplified view suitable for non-technical users.
    """
    if not explanation.get("contributions"):
        return {
            "summary": "Unable to generate explanation.",
            "factors": [],
            "available": False
        }
    
    factors = []
    for contrib in explanation["contributions"][:5]:
        impact_pct = min(abs(contrib["shap_value"]) * 100, 100)
        
        factors.append({
            "name": _friendly_name(contrib["feature"]),
            "value": f"{contrib['value']:.1f}",
            "impact": f"{impact_pct:.0f}%",
            "direction": "↑" if contrib["direction"] == "increases risk" else "↓",
            "color": "red" if contrib["direction"] == "increases risk" else "green"
        })
    
    summary = _summary_from_contributions(explanation["contributions"])

    return {
        "summary": summary,
        "factors": factors,
        "available": True
    }


def generate_waterfall_plot(explanation: dict[str, Any], max_display: int = 10) -> Optional[str]:
    if not shap_available or not matplotlib_available or shap_module is None or plt is None:
        return None

    try:
        shap_values = np.array(explanation.get("shap_values", []), dtype=float)
        feature_values = np.array(explanation.get("feature_values", []), dtype=float)
        feature_names = explanation.get("feature_names", [])
        base_value = float(explanation.get("base_value", 0.0))

        if shap_values.size == 0 or feature_values.size == 0:
            return None

        shap_explanation = shap_module.Explanation(
            values=shap_values,
            base_values=base_value,
            data=feature_values,
            feature_names=feature_names,
        )

        plt.figure(figsize=(10, 6))
        shap_module.plots.waterfall(shap_explanation, show=False, max_display=max_display)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=100, bbox_inches='tight', facecolor='white', edgecolor='none')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode('utf-8')
    except Exception as e:
        logger.warning("Failed to generate SHAP waterfall plot: %s", e)
        return None


def _friendly_name(feature: str) -> str:
    """Convert feature name to friendly display name."""
    name_map = {
        "bmi": "Body Mass Index (BMI)",
        "triglycerides": "Triglycerides",
        "ldl": "LDL Cholesterol",
        "hdl": "HDL Cholesterol",
        "age": "Age",
        "hba1c": "HbA1c",
        "fbs": "Fasting Blood Sugar",
        "smoking_status": "Smoking Status",
        "physical_activity": "Physical Activity",
        "alcohol_use": "Alcohol Use"
    }
    return name_map.get(feature.lower(), feature.title())


def _summary_from_contributions(contributions: list[dict[str, Any]]) -> str:
    """Create clinician-facing summary without explainer re-initialization."""
    if not contributions:
        return "Unable to generate explanation."

    top = contributions[:3]
    increasing = [c["feature"] for c in top if c.get("direction") == "increases risk"]
    decreasing = [c["feature"] for c in top if c.get("direction") == "decreases risk"]

    parts = []
    if increasing:
        parts.append("Factors increasing risk: " + ", ".join(increasing))
    if decreasing:
        parts.append("Factors decreasing risk: " + ", ".join(decreasing))
    if not parts:
        return "No significant factors identified."
    return ". ".join(parts) + "."


if __name__ == "__main__":
    # Test with a simple model
    logging.basicConfig(level=logging.INFO)
    
    print(f"SHAP available: {shap_available}")
    
    if shap_available:
        from sklearn.ensemble import RandomForestClassifier
        
        # Create dummy model and data
        X = np.random.randn(100, 5)
        y = (X[:, 0] + X[:, 1] > 0).astype(int)
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X, y)
        
        # Test explanation
        explainer = SHAPExplainer(model, model_type="tree")
        
        test_features = np.array([0.5, -0.3, 0.8, -0.2, 0.1])
        feature_names = ["feature_a", "feature_b", "feature_c", "feature_d", "feature_e"]
        
        explanation = explainer.explain(test_features, feature_names)
        
        print("\nExplanation:")
        print(f"Base value: {explanation['base_value']:.4f}")
        print("\nTop contributions:")
        for contrib in explanation["contributions"][:3]:
            print(f"  {contrib['feature']}: {contrib['shap_value']:+.4f} ({contrib['direction']})")
        
        print("\nSummary:", explainer.get_summary(explanation))
