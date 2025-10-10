from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any
import uuid, time

app = FastAPI(title="NattyCheck API (MVP)")

# Allow calls from your phone/Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev only; lock down later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store (dev only)
JOBS: Dict[str, Dict[str, Any]] = {}

class AnalyzeRequest(BaseModel):
    frontUrl: str | None = None
    sideUrl: str | None = None
    backUrl: str | None = None
    userId: str | None = None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
def analyze(req: AnalyzeRequest, bg: BackgroundTasks):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "jobId": job_id,
        "status": "queued",
        "message": "Queued",
        "results": None,
        "createdAt": time.time(),
    }
    bg.add_task(run_fake_pipeline, job_id)
    return {"jobId": job_id, "status": "queued"}

@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        return {"error": "not_found"}
    return job

def run_fake_pipeline(job_id: str):
    JOBS[job_id]["status"] = "processing"
    JOBS[job_id]["message"] = "Analyzing…"
    for _ in range(5):
        time.sleep(1)
    results = {
        "schemaVersion": 1,
        "completedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "confidence": 0.92,
        "overallScore": 83,
        "summary": {"upperBody": 86, "lowerBody": 79, "symmetry": 88, "posture": 90},
        "ratios": {"shoulderToWaist": 1.41, "quadToHeight": 0.58, "armToWaist": 0.39},
        "regions": {
            "upper": [
                {"name": "Shoulders", "ratio": 1.41, "percent": 90, "tag": "balanced"},
                {"name": "Chest", "ratio": 1.20, "percent": 84, "tag": "strong"},
                {"name": "Lats", "ratio": 1.18, "percent": 68, "tag": "lagging"},
                {"name": "Traps", "ratio": 0.82, "percent": 76, "tag": "balanced"},
                {"name": "Arms", "ratio": 0.39, "percent": 80, "tag": "balanced"}
            ],
            "lower": [
                {"name": "Quads", "ratio": 0.58, "percent": 83, "tag": "balanced"},
                {"name": "Hamstrings", "ratio": 0.46, "percent": 70, "tag": "lagging"},
                {"name": "Glutes", "ratio": 1.05, "percent": 88, "tag": "strong"},
                {"name": "Calves", "ratio": 0.42, "percent": 74, "tag": "balanced"}
            ]
        },
        "posture": {"grade": "Excellent", "spinalAlignmentDeltaDeg": 3, "scapularBalance": "Symmetrical"},
        "natty": {"status": "NATURAL", "confidence": 0.80},
        "quality": {
            "front": {"ok": True, "notes": []},
            "side":  {"ok": True, "notes": []},
            "back":  {"ok": True, "notes": []}
        }
    }
    JOBS[job_id]["status"] = "done"
    JOBS[job_id]["message"] = "Complete"
    JOBS[job_id]["results"] = results
