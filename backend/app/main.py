import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .api import routes

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProcureLens AI API",
    description="Deterministic evaluation, compliance matrix, and risk analysis for vendor proposals.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
cors_origins_raw = os.getenv("CORS_ORIGINS")
origins = ["*"]  # Fallback

if cors_origins_raw:
    try:
        origins = json.loads(cors_origins_raw)
    except Exception:
        # Fallback to splitting by comma if it's not a JSON list
        origins = [x.strip() for x in cors_origins_raw.split(",") if x.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(routes.router)

@app.get("/")
def read_root():
    return {
        "app": "ProcureLens AI API",
        "version": "1.0.0",
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
        "docs": "/docs"
    }
