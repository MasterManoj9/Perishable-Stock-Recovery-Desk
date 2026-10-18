"""
Model Registry and Artifact Persistence Engine
FYND Predict - AI Demand Intelligence
"""

import os
import json
import joblib
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple


class ModelRegistry:
    """Manages model artifacts, metadata versioning, and serialized estimator loading."""

    def __init__(self, storage_dir: str = "artifacts"):
        self.storage_dir = os.path.abspath(storage_dir)
        os.makedirs(self.storage_dir, exist_ok=True)
        self.registry_file = os.path.join(self.storage_dir, "model_registry.json")
        self._ensure_registry_file()

    def _ensure_registry_file(self):
        if not os.path.exists(self.registry_file):
            with open(self.registry_file, "w", encoding="utf-8") as f:
                json.dump({"active_model_id": None, "models": []}, f, indent=2)

    def _load_registry_data(self) -> Dict[str, Any]:
        with open(self.registry_file, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_registry_data(self, data: Dict[str, Any]):
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def save_model(
        self,
        model_id: str,
        model_instance: Any,
        metadata: Dict[str, Any],
        is_selected: bool = True
    ) -> str:
        """Serializes trained model artifact to disk and records metadata."""
        artifact_filename = f"{model_id}.joblib"
        artifact_path = os.path.join(self.storage_dir, artifact_filename)

        # 1. Serialize estimator
        joblib.dump(model_instance, artifact_path)

        # 2. Record metadata
        reg_data = self._load_registry_data()
        record = {
            "model_id": model_id,
            "model_name": metadata.get("model_name", "Trained Model"),
            "model_family": metadata.get("model_family", "unknown"),
            "training_run_id": metadata.get("training_run_id"),
            "dataset_version": metadata.get("dataset_version", "v1.0"),
            "trained_at": datetime.utcnow().isoformat() + "Z",
            "artifact_path": artifact_path,
            "validation_metrics": metadata.get("validation_metrics", {}),
            "feature_schema": metadata.get("feature_schema", []),
            "hyperparameters": metadata.get("hyperparameters", {}),
            "is_selected": is_selected,
            "status": "ready"
        }

        # If this is selected, demote previous active selection
        if is_selected:
            reg_data["active_model_id"] = model_id
            for m in reg_data.get("models", []):
                m["is_selected"] = False

        reg_data["models"].insert(0, record)
        self._save_registry_data(reg_data)

        return artifact_path

    def load_active_model(self) -> Optional[Tuple[Any, Dict[str, Any]]]:
        """Loads currently active serialized model and its registry metadata."""
        reg_data = self._load_registry_data()
        active_id = reg_data.get("active_model_id")
        if not active_id:
            return None

        for m in reg_data.get("models", []):
            if m["model_id"] == active_id:
                path = m["artifact_path"]
                if os.path.exists(path):
                    model = joblib.load(path)
                    return model, m
        return None

    def list_models(self) -> List[Dict[str, Any]]:
        """Returns all registered models and their validation benchmarks."""
        reg_data = self._load_registry_data()
        return reg_data.get("models", [])

    def get_model_metadata(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Fetches metadata for a specific model ID."""
        reg_data = self._load_registry_data()
        for m in reg_data.get("models", []):
            if m["model_id"] == model_id:
                return m
        return None
