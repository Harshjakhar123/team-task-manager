"""Project and team-membership routes.

Role rules
----------
* Any authenticated user can create a project (and becomes its admin).
* Any member can view a project, its members and its tasks.
* Only admins can edit/delete a project and manage members.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, require_admin, require_member
from ..models import Project, ProjectMember, ProjectRole, Task, TaskStatus, User
from ..schemas import (
    MemberAdd,
    MemberOut,
    MemberRoleUpdate,
    ProjectCreate,
    ProjectDetail,
    ProjectSummary,
    ProjectUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _summary(db: Session, project: Project, role: ProjectRole) -> ProjectSummary:
    member_count = (
        db.query(func.count(ProjectMember.id))
        .filter(ProjectMember.project_id == project.id)
        .scalar()
    )
    task_count = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project.id)
        .scalar()
    )
    open_count = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project.id, Task.status != TaskStatus.done)
        .scalar()
    )
    return ProjectSummary(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        created_at=project.created_at,
        my_role=role,
        member_count=member_count or 0,
        task_count=task_count or 0,
        open_task_count=open_count or 0,
    )


def _detail(db: Session, project: Project, role: ProjectRole) -> ProjectDetail:
    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id)
        .order_by(ProjectMember.role, ProjectMember.joined_at)
        .all()
    )
    task_count = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project.id)
        .scalar()
    )
    return ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        owner_id=project.owner_id,
        created_at=project.created_at,
        my_role=role,
        members=[MemberOut.model_validate(m) for m in members],
        task_count=task_count or 0,
    )


@router.get("", response_model=list[ProjectSummary])
def list_projects(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """List every project the caller is a member of."""
    rows = (
        db.query(Project, ProjectMember.role)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .all()
    )
    return [_summary(db, project, role) for project, role in rows]


@router.post("", response_model=ProjectDetail, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(
        name=payload.name.strip(),
        description=payload.description.strip(),
        owner_id=current_user.id,
    )
    db.add(project)
    db.flush()  # assign project.id before creating the membership row

    db.add(
        ProjectMember(
            project_id=project.id,
            user_id=current_user.id,
            role=ProjectRole.admin,
        )
    )
    db.commit()
    db.refresh(project)
    return _detail(db, project, ProjectRole.admin)


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = require_member(db, project_id, current_user)
    project = db.get(Project, project_id)
    return _detail(db, project, membership.role)


@router.put("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(db, project_id, current_user)
    project = db.get(Project, project_id)
    if payload.name is not None:
        project.name = payload.name.strip()
    if payload.description is not None:
        project.description = payload.description.strip()
    db.commit()
    db.refresh(project)
    return _detail(db, project, ProjectRole.admin)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(db, project_id, current_user)
    project = db.get(Project, project_id)
    db.delete(project)
    db.commit()


# --------------------------------------------------------------------------
# Team membership
# --------------------------------------------------------------------------


@router.get("/{project_id}/members", response_model=list[MemberOut])
def list_members(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(db, project_id, current_user)
    members = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.role, ProjectMember.joined_at)
        .all()
    )
    return [MemberOut.model_validate(m) for m in members]


@router.post(
    "/{project_id}/members",
    response_model=MemberOut,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    project_id: int,
    payload: MemberAdd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add an existing user to the project by email (admin only)."""
    require_admin(db, project_id, current_user)

    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No registered user with that email — ask them to sign up first",
        )

    existing = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409, detail="User is already a member of this project"
        )

    member = ProjectMember(
        project_id=project_id, user_id=user.id, role=payload.role
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return MemberOut.model_validate(member)


@router.patch("/{project_id}/members/{user_id}", response_model=MemberOut)
def update_member_role(
    project_id: int,
    user_id: int,
    payload: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(db, project_id, current_user)
    project = db.get(Project, project_id)

    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.user_id == project.owner_id and payload.role != ProjectRole.admin:
        raise HTTPException(
            status_code=400, detail="The project owner must remain an admin"
        )

    member.role = payload.role
    db.commit()
    db.refresh(member)
    return MemberOut.model_validate(member)


@router.delete(
    "/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_member(
    project_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(db, project_id, current_user)
    project = db.get(Project, project_id)

    if user_id == project.owner_id:
        raise HTTPException(
            status_code=400, detail="The project owner cannot be removed"
        )

    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    # Unassign this user from any tasks in the project so nothing dangles.
    db.query(Task).filter(
        Task.project_id == project_id, Task.assignee_id == user_id
    ).update({Task.assignee_id: None})
    db.delete(member)
    db.commit()
