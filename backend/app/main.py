"""FastAPI application entrypoint.

In production the built React app is copied into ``backend/static`` (see the
root Dockerfile) and served by this same process, so the whole product runs as
a single Railway service with no CORS configuration required.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from .config import settings
from .database import Base, engine
from .routers import auth, dashboard, projects, tasks

# Create tables on startup. For a small app this is sufficient; a larger one
# would manage schema changes with Alembic migrations instead.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Team Task Manager API",
    description="REST API for projects, teams and tasks with role-based access.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.ENV}


# --------------------------------------------------------------------------
# Serve the compiled React single-page app (production only).
# --------------------------------------------------------------------------

STATIC_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "static")
)
INDEX_FILE = os.path.join(STATIC_DIR, "index.html")


if os.path.isfile(INDEX_FILE):

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        """Serve static assets, falling back to index.html for client routes."""
        # Resolve the requested path and make sure it stays inside STATIC_DIR.
        candidate = os.path.abspath(os.path.join(STATIC_DIR, full_path))
        if (
            full_path
            and candidate.startswith(STATIC_DIR)
            and os.path.isfile(candidate)
        ):
            return FileResponse(candidate)
        return FileResponse(INDEX_FILE)

else:

    @app.get("/", include_in_schema=False)
    def root():
        return JSONResponse(
            {
                "message": "Team Task Manager API is running.",
                "docs": "/docs",
                "health": "/api/health",
            }
        )
