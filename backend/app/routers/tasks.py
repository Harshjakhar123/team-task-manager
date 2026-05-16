"""Task routes: creation, assignment, status tracking and filtering.

Role rules
----------
* Any project member can create tasks and view all tasks in the project.
* Admins can edit/delete any task and assign it to anyone.
* Non-admin members can only edit a task that is assigned to them, and may
  not reassign it to a different user.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_membership, require_member
from ..models import (
    Project,
    ProjectMember,
    ProjectRole,
    Task,
    TaskPriority,
    TaskStatus,
    User,
)
from ..schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/api", tags=["tasks"])


def _validate_assignee(db: Session, project_id: int, assignee_id: int | None) -> None:
    """An assignee must be a member of the same project."""
    if assignee_id is None:
        return
    member = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == assignee_id,
        )
        .first()
    )
    if member is None:
        raise HTTPException(
            status_code=400,
            detail="Assignee must be a member of this project",
        )


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: int,
    status_filter: TaskStatus | None = Query(default=None, alias="status"),
    assignee_id: int | None = Query(default=None),
    priority: TaskPriority | None = Query(default=None),
    search: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(db, project_id, current_user)

    query = db.query(Task).filter(Task.project_id == project_id)
    if status_filter is not None:
        query = query.filter(Task.status == status_filter)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)
    if priority is not None:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.ilike(f"%{search.strip()}%"))

    tasks = query.order_by(Task.created_at.desc()).all()
    return [TaskOut.model_validate(t) for t in tasks]


@router.post(
    "/projects/{project_id}/tasks",
    response_model=TaskOut,
    status_code=status.HTTP_201_CREATED,
)
def create_task(
    project_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_member(db, project_id, current_user)
    _validate_assignee(db, project_id, payload.assignee_id)

    task = Task(
        project_id=project_id,
        title=payload.title.strip(),
        description=payload.description.strip(),
        status=payload.status,
        priority=payload.priority,
        assignee_id=payload.assignee_id,
        created_by=current_user.id,
        due_date=payload.due_date,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task)


def _get_task_for_member(db: Session, task_id: int, user: User) -> tuple[Task, ProjectMember]:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    membership = get_membership(db, task.project_id, user.id)
    if membership is None:
        raise HTTPException(
            status_code=403, detail="You are not a member of this project"
        )
    return task, membership


@router.get("/tasks/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task, _ = _get_task_for_member(db, task_id, current_user)
    return TaskOut.model_validate(task)


@router.put("/tasks/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task, membership = _get_task_for_member(db, task_id, current_user)
    is_admin = membership.role == ProjectRole.admin

    # Non-admins may only edit tasks assigned to them.
    if not is_admin and task.assignee_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Members can only update tasks assigned to them",
        )

    data = payload.model_dump(exclude_unset=True)

    # Non-admins cannot reassign a task to someone else.
    if not is_admin and "assignee_id" in data and data["assignee_id"] != task.assignee_id:
        raise HTTPException(
            status_code=403, detail="Only admins can reassign tasks"
        )

    if "assignee_id" in data:
        _validate_assignee(db, task.project_id, data["assignee_id"])

    for field in ("title", "description"):
        if field in data and data[field] is not None:
            data[field] = data[field].strip()

    for field, value in data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return TaskOut.model_validate(task)


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task, membership = _get_task_for_member(db, task_id, current_user)
    if membership.role != ProjectRole.admin:
        raise HTTPException(
            status_code=403, detail="Only admins can delete tasks"
        )
    db.delete(task)
    db.commit()
