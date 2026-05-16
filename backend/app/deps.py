"""Shared FastAPI dependencies and authorization helpers."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Project, ProjectMember, ProjectRole, User
from .security import decode_token

_bearer = HTTPBearer(auto_error=True)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Bearer JWT."""
    payload = decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = db.get(User, int(payload["sub"]))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists"
        )
    return user


# --------------------------------------------------------------------------
# Project-scoped authorization helpers
# --------------------------------------------------------------------------


def get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_membership(db: Session, project_id: int, user_id: int) -> ProjectMember | None:
    return (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )


def require_member(db: Session, project_id: int, user: User) -> ProjectMember:
    """Ensure the project exists and the user belongs to it."""
    get_project_or_404(db, project_id)
    membership = get_membership(db, project_id, user.id)
    if membership is None:
        raise HTTPException(
            status_code=403, detail="You are not a member of this project"
        )
    return membership


def require_admin(db: Session, project_id: int, user: User) -> ProjectMember:
    """Ensure the user is an admin of the project."""
    membership = require_member(db, project_id, user)
    if membership.role != ProjectRole.admin:
        raise HTTPException(
            status_code=403,
            detail="Admin role required for this action",
        )
    return membership
