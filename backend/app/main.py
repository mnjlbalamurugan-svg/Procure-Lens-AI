import os
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .api import routes

# Initialize tables
Base.metadata.create_all(bind=engine)

def seed_judge_user():
    db = SessionLocal()
    try:
        from . import models
        from .utils.auth import get_password_hash
        
        username = os.getenv("DEMO_USERNAME", "judge")
        password = os.getenv("DEMO_PASSWORD", "ProcureAI@2026")
        
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            hashed = get_password_hash(password)
            db_user = models.User(username=username, hashed_password=hashed)
            db.add(db_user)
            db.commit()
            print(f"Demo user '{username}' seeded successfully.")
    except Exception as e:
        print(f"Error seeding demo user: {e}")
    finally:
        db.close()

seed_judge_user()


app = FastAPI(
    title="ProcureLens AI API",
    description="Deterministic evaluation, compliance matrix, and risk analysis for vendor proposals.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
cors_origins_raw = os.getenv("CORS_ORIGINS")
default_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:3000",
    "https://procure-lens-ai-frontend.onrender.com"
]

origins = default_origins

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Register routes
app.include_router(routes.auth_router)
app.include_router(routes.router)


@app.get("/")
def read_root():
    return {
        "app": "ProcureLens AI API",
        "version": "1.0.0",
        "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
        "docs": "/docs"
    }
