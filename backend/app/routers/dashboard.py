"""Dashboard route — aggregated stats across all of the user's projects."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import ProjectMember, Task, TaskStatus, User
from ..schemas import DashboardOut, StatusBreakdown, TaskOut

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Projects the user belongs to.
    project_ids = [
        pid
        for (pid,) in db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    ]

    if not project_ids:
        return DashboardOut(
            project_count=0,
            total_tasks=0,
            assigned_to_me=0,
            overdue=0,
            status_breakdown=StatusBreakdown(),
        )

    total_tasks = (
        db.query(Task).filter(Task.project_id.in_(project_ids)).count()
    )

    my_tasks = (
        db.query(Task)
        .filter(
            Task.project_id.in_(project_ids),
            Task.assignee_id == current_user.id,
        )
        .order_by(Task.updated_at.desc())
        .all()
    )

    breakdown = StatusBreakdown()
    overdue = 0
    today = date.today()
    for task in my_tasks:
        if task.status == TaskStatus.todo:
            breakdown.todo += 1
        elif task.status == TaskStatus.in_progress:
            breakdown.in_progress += 1
        else:
            breakdown.done += 1
        if (
            task.due_date is not None
            and task.due_date < today
            and task.status != TaskStatus.done
        ):
            overdue += 1

    upcoming = sorted(
        (
            t
            for t in my_tasks
            if t.due_date is not None and t.status != TaskStatus.done
        ),
        key=lambda t: t.due_date,
    )

    return DashboardOut(
        project_count=len(project_ids),
        total_tasks=total_tasks,
        assigned_to_me=len(my_tasks),
        overdue=overdue,
        status_breakdown=breakdown,
        my_tasks=[TaskOut.model_validate(t) for t in my_tasks[:8]],
        upcoming=[TaskOut.model_validate(t) for t in upcoming[:8]],
    )
