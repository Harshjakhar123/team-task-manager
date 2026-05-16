"""Pydantic v2 schemas — request validation and response serialization."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import ProjectRole, TaskPriority, TaskStatus

# --------------------------------------------------------------------------
# Auth / Users
# --------------------------------------------------------------------------


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --------------------------------------------------------------------------
# Projects
# --------------------------------------------------------------------------


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=2000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: ProjectRole
    joined_at: datetime
    user: UserOut


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    owner_id: int
    created_at: datetime


class ProjectSummary(ProjectOut):
    """Project list item enriched with the caller's role and task counts."""

    my_role: ProjectRole
    member_count: int = 0
    task_count: int = 0
    open_task_count: int = 0


class ProjectDetail(ProjectOut):
    my_role: ProjectRole
    members: list[MemberOut] = []
    task_count: int = 0


# --------------------------------------------------------------------------
# Members
# --------------------------------------------------------------------------


class MemberAdd(BaseModel):
    email: EmailStr
    role: ProjectRole = ProjectRole.member


class MemberRoleUpdate(BaseModel):
    role: ProjectRole


# --------------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------------


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=4000)
    status: TaskStatus = TaskStatus.todo
    priority: TaskPriority = TaskPriority.medium
    assignee_id: int | None = None
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: int | None = None
    due_date: date | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    assignee_id: int | None
    created_by: int | None
    due_date: date | None
    created_at: datetime
    updated_at: datetime
    assignee: UserOut | None = None


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------


class StatusBreakdown(BaseModel):
    todo: int = 0
    in_progress: int = 0
    done: int = 0


class DashboardOut(BaseModel):
    project_count: int
    total_tasks: int
    assigned_to_me: int
    overdue: int
    status_breakdown: StatusBreakdown
    my_tasks: list[TaskOut] = []
    upcoming: list[TaskOut] = []
