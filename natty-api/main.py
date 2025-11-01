import os
import io
import base64
import json
from typing import Dict, Any

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.responses import JSONResponse

# If you prefer using a .env file locally:
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass

# --- OpenAI client (python SDK >= 1.0.0) ---
# pip install openai
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    # Don’t crash app; we’ll raise a nice 400 on analyze calls instead.
    pass

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI(title="NattyCheck API")

# CORS (open for dev; lock down later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # set to your app origin in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------
class AnalyzeResponse(BaseModel):
    overallScore: int
    confidence: float  # 0..1
    summary: Dict[str, int]  # { upperBody, lowerBody, symmetry, posture } as %
    natty: Dict[str, Any]    # { status: "NATURAL"|"ENHANCED", confidence: 0..1 }
    ratios: Dict[str, float] # { shoulderToWaist, quadToHeight, armToWaist }
    posture: Dict[str, Any]  # posture details
    quality: Dict[str, Dict[str, Any]]  # per-view quality/notes
    completedAt: str

# ---------- Utils ----------
MAX_BYTES = 6 * 1024 * 1024  # 6MB per image (Render free tier friendly)
ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"}

def _validate_and_b64(img: UploadFile) -> str:
    if img.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported content-type: {img.content_type}")
    raw = img.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_BYTES:
        raise HTTPException(status_code=413, detail=f"Image too large (> {MAX_BYTES//1024//1024}MB)")
    # Convert HEIC/HEIF to JPEG? (Skipped here—phone usually sends JPG/PNG. Handle later if needed.)
    b64 = base64.b64encode(raw).decode("ascii")
    # Prefer jpeg for data URL; png is also fine
    mime = "image/jpeg" if "jpeg" in img.content_type or "jpg" in img.content_type else "image/png"
    return f"data:{mime};base64,{b64}"

SYSTEM_INSTRUCTIONS = (
    "You are NattyCheck, an AI for physique analysis. "
    "Given 3 photos (front, side, back), estimate physique metrics and return STRICT JSON ONLY. "
    "Do not include prose—just valid JSON. Scores are 0-100 integers; confidences 0-1 floats."
)

USER_TASK = (
    "Analyze the physique from these images and return ONLY JSON with this shape:\n"
    "{\n"
    '  "overallScore": <int 0-100>,\n'
    '  "confidence": <float 0..1>,\n'
    '  "summary": { "upperBody": <int>, "lowerBody": <int>, "symmetry": <int>, "posture": <int> },\n'
    '  "natty": { "status": "NATURAL" | "ENHANCED", "confidence": <float 0..1> },\n'
    '  "ratios": { "shoulderToWaist": <float>, "quadToHeight": <float>, "armToWaist": <float> },\n'
    '  "posture": { "grade": "Excellent" | "Good" | "Fair" | "Poor", "spinalAlignmentDeltaDeg": <int>, "scapularBalance": "Symmetrical" | "Left-tilt" | "Right-tilt" },\n'
    '  "quality": {\n'
    '    "front": { "ok": <bool>, "notes": [<string>...] },\n'
    '    "side":  { "ok": <bool>, "notes": [<string>...] },\n'
    '    "back":  { "ok": <bool>, "notes": [<string>...] }\n'
    "  },\n"
    '  "completedAt": "<ISO 8601 timestamp UTC>"\n'
    "}\n"
    "Assume typical indoor lighting if uncertain. If a view is unusable, set ok=false and add a note (e.g., 'move back', 'improve lighting')."
)

# ---------- Routes ----------
@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    front: UploadFile = File(...),
    side: UploadFile = File(...),
    back: UploadFile = File(...),
):
    """
    Accepts three images (multipart/form-data): front, side, back.
    Sends them to GPT-4o-mini Vision and returns a structured JSON report.
    """
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=400, detail="OPENAI_API_KEY is not set on the server.")

    # Read & encode images
    try:
        front_b64 = _validate_and_b64(front)
        side_b64  = _validate_and_b64(side)
        back_b64  = _validate_and_b64(back)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid images: {e}")

    # Build the multi-part vision message
    content_blocks = [
        {"type": "text", "text": USER_TASK},
        {"type": "image_url", "image_url": {"url": front_b64}},
        {"type": "image_url", "image_url": {"url": side_b64}},
        {"type": "image_url", "image_url": {"url": back_b64}},
    ]

    # Call OpenAI – request strict JSON back
    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTIONS},
                {"role": "user", "content": content_blocks},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or "{}"
        data = json.loads(raw)
    except Exception as e:
        # If the model returns non-JSON for any reason, surface a readable error.
        raise HTTPException(status_code=502, detail=f"AI parsing error: {e}")

    # Validate against our response model (raises 422 on mismatch)
    try:
        out = AnalyzeResponse(**data)
    except Exception as e:
        # Return model’s JSON so you can see what it produced for debugging
        return JSONResponse(status_code=502, content={"error": "SchemaMismatch", "raw": data, "detail": str(e)})

    return out
