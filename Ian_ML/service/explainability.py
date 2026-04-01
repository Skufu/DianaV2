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
import math
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


def _sanitize_number(value: Any) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(numeric) or math.isinf(numeric):
        return None
    return numeric


def _sanitize_list(values: list[Any]) -> list[float | None]:
    return [_sanitize_number(v) for v in values]


def _extract_estimator(model: Any) -> tuple[Any, str]:
    """Recursively unwrap wrapper models to find the underlying estimator.

    Handles: CalibratedClassifierCV, Pipeline, and nested combinations.
    Returns tuple of (inner_estimator, detected_model_type) where model_type
    is one of: "tree", "linear", "kernel".

    The detected_model_type is determined by the actual estimator class found.
    """
    working_model: Any = model

    # CalibratedClassifierCV wraps an estimator
    try:
        from sklearn.calibration import CalibratedClassifierCV
        if isinstance(working_model, CalibratedClassifierCV):
            inner = getattr(working_model, "estimator", None)
            if inner is not None:
                return _extract_estimator(inner)
    except ImportError:
        pass

    # Pipeline: take the last step
    named_steps = getattr(working_model, "named_steps", None)
    if isinstance(named_steps, dict) and named_steps:
        steps = list(named_steps.values())
        return _extract_estimator(steps[-1])

    steps_attr = getattr(working_model, "steps", None)
    if isinstance(steps_attr, list) and steps_attr:
        return _extract_estimator(steps_attr[-1][1])

    # Detect model type based on class name
    class_name = type(working_model).__name__

    # Tree-based estimators
    tree_types = (
        "RandomForestClassifier", "RandomForestRegressor",
        "GradientBoostingClassifier", "GradientBoostingRegressor",
        "XGBClassifier", "XGBRegressor",
        "LGBMClassifier", "LGBMRegressor",
        "DecisionTreeClassifier", "DecisionTreeRegressor",
        "ExtraTreesClassifier", "ExtraTreesRegressor",
    )
    if class_name in tree_types:
        return working_model, "tree"

    # Linear estimators
    linear_types = (
        "LogisticRegression", "LinearRegression",
        "Ridge", "RidgeClassifier",
        "Lasso", "ElasticNet",
        "SGDClassifier", "SGDRegressor",
        "LinearSVC", "LinearSVR",
    )
    if class_name in linear_types:
        return working_model, "linear"

    # If we can't determine the type, return the model and let caller decide
    return working_model, "kernel"


def _extract_tree_model(model: Any) -> Any:
    """Legacy wrapper for backward compatibility.

    Recursively unwrap wrapper models to find a tree-based estimator.
    Returns the inner estimator or None if not a tree-based model.
    """
    estimator, model_type = _extract_estimator(model)
    if model_type == "tree":
        return estimator
    return None


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
            # Auto-detect model type from the actual model if not explicitly specified
            # or if specified as "tree" but model is actually linear
            _, detected_type = _extract_estimator(self.model)
            effective_type = self.model_type

            # If user specified "tree" but we detected a linear model, use linear
            if self.model_type == "tree" and detected_type == "linear":
                effective_type = "linear"
                logger.info(
                    "Auto-adjusting explainer type from 'tree' to 'linear' "
                    "based on model class: %s", type(self.model).__name__
                )
            # If user specified "tree" but model isn't tree-based, try kernel fallback
            elif self.model_type == "tree" and detected_type != "tree":
                effective_type = "kernel"
                logger.info(
                    "Model is not tree-based (%s), falling back to KernelExplainer",
                    type(self.model).__name__
                )

            if effective_type == "tree":
                # Try to extract raw tree model from wrappers (CalibratedClassifierCV, Pipeline)
                tree_model = _extract_tree_model(self.model)
                if tree_model is not None:
                    try:
                        self._explainer = shap_module.TreeExplainer(tree_model)
                        logger.info("SHAP TreeExplainer initialized (extracted %s from wrapper)",
                                    type(tree_model).__name__)
                        return
                    except Exception as inner_e:
                        logger.warning("TreeExplainer failed on extracted model: %s", inner_e)
                else:
                    # Try directly (model might already be a supported tree type)
                    try:
                        self._explainer = shap_module.TreeExplainer(self.model)
                        logger.info("SHAP TreeExplainer initialized directly")
                        return
                    except Exception as inner_e:
                        logger.warning("TreeExplainer failed on model: %s", inner_e)

                # Fallback: use KernelExplainer with predict_proba on the full model
                logger.info("Falling back to KernelExplainer for tree model type")
                predict_fn = (
                    self.model.predict_proba if hasattr(self.model, 'predict_proba')
                    else self.model.predict
                )
                if self.background_data is not None:
                    # Explicitly set nsamples to avoid SHAP 0.50.0 auto-calculation bug
                    # Default "auto" can produce incorrect maskMatrix sizes
                    n_features = self.background_data.shape[1] if self.background_data.ndim > 1 else len(self.background_data)
                    nsamples = min(200, 2 * (n_features + 1))
                    self._explainer = shap_module.KernelExplainer(
                        predict_fn,
                        self.background_data,
                        nsamples=nsamples
                    )
                else:
                    logger.warning("No background data for KernelExplainer fallback; explainer unavailable")
                    return
            elif effective_type == "linear":
                # For linear models (LogisticRegression, LinearSVC)
                # Extract the actual linear model from Pipeline if needed
                linear_model, _ = _extract_estimator(self.model)

                # For LinearExplainer with Pipeline models, we need the masker
                # Use the background data or create a default masker
                if self.background_data is not None:
                    masker = shap_module.maskers.Independent(self.background_data)
                else:
                    # Create a default masker with zeros
                    # Try to infer feature dimension from the model
                    n_features = None
                    if hasattr(linear_model, 'coef_'):
                        n_features = linear_model.coef_.shape[-1] if hasattr(linear_model.coef_, 'shape') else None
                    if n_features is None:
                        n_features = 10  # Default fallback
                    masker = shap_module.maskers.Independent(np.zeros((1, n_features)))

                try:
                    self._explainer = shap_module.LinearExplainer(linear_model, masker)
                    logger.info("SHAP LinearExplainer initialized for %s", type(linear_model).__name__)
                except Exception as linear_e:
                    logger.warning("LinearExplainer failed: %s", linear_e)
                    # Fallback to KernelExplainer
                    if self.background_data is not None:
                        predict_fn = (
                            self.model.predict_proba if hasattr(self.model, 'predict_proba')
                            else self.model.predict
                        )
                        n_features = self.background_data.shape[1] if self.background_data.ndim > 1 else len(self.background_data)
                        nsamples = min(200, 2 * (n_features + 1))
                        self._explainer = shap_module.KernelExplainer(
                            predict_fn,
                            self.background_data,
                            nsamples=nsamples
                        )
                        logger.info("Falling back to KernelExplainer after LinearExplainer failure")
                    else:
                        logger.error("No background data for KernelExplainer fallback")
                        return
            else:
                # Kernel explainer for any model (slower)
                if self.background_data is None:
                    logger.warning("Kernel explainer requires background data")
                    return
                # Explicitly set nsamples to avoid SHAP 0.50.0 auto-calculation bug
                n_features = self.background_data.shape[1] if self.background_data.ndim > 1 else len(self.background_data)
                nsamples = min(200, 2 * (n_features + 1))
                predict_fn = (
                    self.model.predict_proba if hasattr(self.model, 'predict_proba')
                    else self.model.predict
                )
                self._explainer = shap_module.KernelExplainer(
                    predict_fn,
                    self.background_data,
                    nsamples=nsamples
                )
                logger.info("SHAP KernelExplainer initialized")
            logger.info(f"SHAP {effective_type} explainer initialized")
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
        class_index: Optional[int] = None,
        feature_values_override: Optional[np.ndarray] = None
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
                    shap_values = np.array(shap_values[class_index])
                else:
                    # Default to the last class (often "positive" class like Diabetic / At-Risk)
                    shap_values = np.array(shap_values[-1])
            else:
                shap_values = np.array(shap_values)
            
            # Get base value
            base_value = self._explainer.expected_value
            if isinstance(base_value, (list, np.ndarray)):
                idx = class_index if class_index is not None else -1
                base_value = float(np.array(base_value).flat[idx])
            else:
                base_value = float(base_value)

            if base_value is None:
                return self._empty_explanation(feature_names)
            
            # Get SHAP values for first instance — ensure 1D
            if shap_values.ndim > 1:
                instance_shap = shap_values[0]
            else:
                instance_shap = shap_values
            # If still multi-dimensional (e.g. multi-class per-sample), take last class
            if instance_shap.ndim > 1:
                instance_shap = instance_shap[:, -1]
            instance_shap = np.asarray(instance_shap, dtype=float).ravel()
            
            instance_features = np.asarray(features[0], dtype=float).ravel()
            if feature_values_override is not None:
                try:
                    override_values = np.asarray(feature_values_override, dtype=float).ravel()
                    if override_values.shape[0] == instance_features.shape[0]:
                        instance_features = override_values
                except Exception:
                    logger.warning("Failed to apply feature_values_override; using model-space values")
            
            # Build contributions list
            contributions = self._build_contributions(
                instance_shap,
                instance_features,
                feature_names
            )
            
            return {
                "base_value": _sanitize_number(base_value),
                "shap_values": _sanitize_list(instance_shap.tolist()),
                "feature_values": _sanitize_list(instance_features.tolist()),
                "feature_names": feature_names,
                "contributions": contributions,
                "explainer_type": self.model_type
            }
            
        except Exception as e:
            logger.error(f"SHAP explanation failed: {e}", exc_info=True)
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
            shap_val = _sanitize_number(shap_values[i])
            feat_val = _sanitize_number(feature_values[i])
            
            # Determine direction
            if shap_val is None or feat_val is None:
                direction = "neutral"
                description = f"{name} has unavailable data"
                impact = 0.0
            elif abs(shap_val) < 0.01:
                direction = "neutral"
                description = f"{name} has minimal impact"
                impact = abs(shap_val)
            elif shap_val > 0:
                direction = "increases risk"
                description = f"{name} = {feat_val:.1f} increases risk"
                impact = abs(shap_val)
            else:
                direction = "decreases risk"
                description = f"{name} = {feat_val:.1f} decreases risk"
                impact = abs(shap_val)
            
            contributions.append({
                "feature": name,
                "value": feat_val,
                "shap_value": shap_val,
                "impact": impact,
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
        base_value_raw = explanation.get("base_value", 0.0)
        base_value = _sanitize_number(base_value_raw)
        if base_value is None:
            base_value = 0.0

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
        "alcohol_use": "Alcohol Use",
        "smoking_encoded": "Smoking Status",
        "activity_encoded": "Activity Level",
        "alcohol_encoded": "Alcohol Use",
        "bmi_category": "BMI Category",
        "tg_hdl_ratio": "TG/HDL Ratio",
        "metabolic_syndrome_score": "Metabolic Score",
        "waist_circumference": "Waist Circumference",
        "family_history_diabetes": "Family History",
        "systolic": "Systolic Blood Pressure",
        "diastolic": "Diastolic Blood Pressure",
        "crp": "C-Reactive Protein (CRP)",
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
