"""
FastAPI Backend Service for FYND Predict
AI Demand Intelligence & Forecasting API
"""

import os
import sys
import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from services.predictor.engine import ForecastingEngine

app = FastAPI(
    title="FYND Predict API",
    version="1.0.0",
    description="Real AI Demand Forecasting, Model Training, & Decision Intelligence Engine for Perishable Retail"
)

# Enable CORS for local Vite dev server and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = ForecastingEngine()

# In-memory training jobs store (for status tracking)
active_jobs: Dict[str, Dict[str, Any]] = {}


# --- Request & Response Models ---

class TrainingRequest(BaseModel):
    dataset_path: str = Field(default="data/C30_Dataset_CSVs/Product_Daily_History.csv", description="Relative or absolute path to dataset")
    holdout_days: int = Field(default=14, ge=7, le=35, description="Days for chronological holdout validation")
    dataset_version: str = Field(default="C30-90D-v1.0")


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    active_model: Optional[str]
    models_count: int


# --- Background Worker Function ---

def _execute_training_job(job_id: str, dataset_path: str, holdout_days: int, dataset_version: str):
    active_jobs[job_id]["status"] = "running"
    active_jobs[job_id]["message"] = "Preprocessing time-series and engineering leak-free lag features..."

    try:
        abs_path = os.path.abspath(dataset_path)
        if not os.path.exists(abs_path):
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = f"Dataset file not found: {dataset_path}"
            return

        result = engine.run_training_pipeline(abs_path, holdout_days=holdout_days, dataset_version=dataset_version)

        if result.get("status") == "failed":
            active_jobs[job_id]["status"] = "failed"
            active_jobs[job_id]["error"] = result.get("error")
            active_jobs[job_id]["validation_report"] = result.get("validation_report")
        else:
            active_jobs[job_id]["status"] = "completed"
            active_jobs[job_id]["result"] = result
            active_jobs[job_id]["message"] = f"Successfully trained and selected {result.get('selected_model')}."

    except Exception as e:
        active_jobs[job_id]["status"] = "failed"
        active_jobs[job_id]["error"] = str(e)


# --- API Endpoints ---

@app.get("/api/forecast/health", response_model=HealthResponse)
def health_check():
    """Checks service readiness and model availability."""
    models = engine.registry.list_models()
    active_item = engine.registry.load_active_model()
    active_name = active_item[1].get("model_name") if active_item else None

    return {
        "status": "ready",
        "service": "FYND Predict Engine",
        "version": "1.0.0",
        "active_model": active_name,
        "models_count": len(models)
    }


@app.post("/api/forecast/datasets/validate")
async def validate_dataset_upload(file: UploadFile = File(...)):
    """Uploads and validates a dataset CSV/Excel file, producing a quality profile."""
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds safe 25MB limit.")

    report = engine.validate_dataset(content, filename=file.filename or "upload.csv")
    return report


@app.post("/api/forecast/train")
def start_training(req: TrainingRequest, background_tasks: BackgroundTasks):
    """Spawns an asynchronous chronological training and benchmarking job."""
    job_id = f"job_{uuid.uuid4().hex[:8]}"

    active_jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "message": "Training job initialized.",
        "dataset_path": req.dataset_path,
        "holdout_days": req.holdout_days,
        "result": None,
        "error": None
    }

    background_tasks.add_task(
        _execute_training_job,
        job_id,
        req.dataset_path,
        req.holdout_days,
        req.dataset_version
    )

    return {
        "job_id": job_id,
        "status": "queued",
        "message": "Training job started. Query /api/forecast/train/{job_id} for live progress."
    }


@app.get("/api/forecast/train/{job_id}")
def get_training_status(job_id: str):
    """Retrieves real-time status and benchmark results for a training job."""
    if job_id not in active_jobs:
        raise HTTPException(status_code=404, detail="Training job not found.")
    return active_jobs[job_id]


@app.get("/api/forecast/models")
def list_registered_models():
    """Returns all registered model versions and their holdout validation scores."""
    return engine.registry.list_models()


@app.get("/api/forecast/results")
def get_forecast_results(
    location_id: Optional[str] = Query(None, description="Filter by location (e.g. CAFE01)"),
    product_id: Optional[str] = Query(None, description="Filter by product (e.g. CAF01)"),
    horizon_days: int = Query(7, ge=1, le=14)
):
    """Returns out-of-sample forward forecast results."""
    if engine.cached_results is None:
        # If cache is empty, load default training result from default dataset
        default_csv = "data/C30_Dataset_CSVs/Product_Daily_History.csv"
        if os.path.exists(default_csv):
            engine.run_training_pipeline(default_csv)

    if not engine.cached_results or "forecast_rows" not in engine.cached_results:
        return {"forecasts": [], "count": 0}

    rows = engine.cached_results["forecast_rows"]
    filtered = rows

    if location_id and location_id != 'all':
        filtered = [r for r in filtered if r['location_id'] == location_id]
    if product_id and product_id != 'all':
        filtered = [r for r in filtered if r['product_id'] == product_id]

    return {
        "forecasts": filtered,
        "count": len(filtered),
        "selected_model": engine.cached_results.get("selected_model"),
        "kpis": engine.cached_results.get("summary_kpis")
    }


@app.get("/api/forecast/insights")
def get_demand_insights(location_id: Optional[str] = Query(None)):
    """Returns empirical peak weekdays, SKU rankings, and explainable recommendations."""
    if engine.cached_results is None:
        default_csv = "data/C30_Dataset_CSVs/Product_Daily_History.csv"
        if os.path.exists(default_csv):
            engine.run_training_pipeline(default_csv)

    if not engine.cached_results:
        return {"error": "No model trained yet."}

    return engine.cached_results.get("insights", {})


@app.get("/api/forecast/latest")
def get_latest_full_report():
    """Returns complete latest training, validation, comparison, and forecast state."""
    if engine.cached_results is None:
        default_csv = "data/C30_Dataset_CSVs/Product_Daily_History.csv"
        if os.path.exists(default_csv):
            engine.run_training_pipeline(default_csv)

    if not engine.cached_results:
        raise HTTPException(status_code=404, detail="No training run has been executed yet.")

    return engine.cached_results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
