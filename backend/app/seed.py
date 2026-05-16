"""Seed the database with demo data.

Run from the ``backend`` directory:  python -m app.seed

Safe to run repeatedly — it skips seeding if the demo admin already exists.
"""
from datetime import date, timedelta

from .database import Base, SessionLocal, engine
from .models import (
    Project,
    ProjectMember,
    ProjectRole,
    Task,
    TaskPriority,
    TaskStatus,
    User,
)
from .security import hash_password

DEMO_PASSWORD = "password123"


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == "admin@demo.com").first():
            print("Demo data already present — nothing to do.")
            return

        admin = User(
            name="Alex Admin",
            email="admin@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        member1 = User(
            name="Maya Member",
            email="maya@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        member2 = User(
            name="Sam Member",
            email="sam@demo.com",
            password_hash=hash_password(DEMO_PASSWORD),
        )
        db.add_all([admin, member1, member2])
        db.flush()

        project = Project(
            name="Website Redesign",
            description="Revamp the marketing site with a new design system.",
            owner_id=admin.id,
        )
        db.add(project)
        db.flush()

        db.add_all(
            [
                ProjectMember(
                    project_id=project.id, user_id=admin.id, role=ProjectRole.admin
                ),
                ProjectMember(
                    project_id=project.id,
                    user_id=member1.id,
                    role=ProjectRole.member,
                ),
                ProjectMember(
                    project_id=project.id,
                    user_id=member2.id,
                    role=ProjectRole.member,
                ),
            ]
        )

        today = date.today()
        db.add_all(
            [
                Task(
                    project_id=project.id,
                    title="Design new landing page",
                    description="High-fidelity mockups for the hero and features.",
                    status=TaskStatus.in_progress,
                    priority=TaskPriority.high,
                    assignee_id=member1.id,
                    created_by=admin.id,
                    due_date=today + timedelta(days=3),
                ),
                Task(
                    project_id=project.id,
                    title="Set up component library",
                    description="Reusable buttons, cards and form controls.",
                    status=TaskStatus.todo,
                    priority=TaskPriority.medium,
                    assignee_id=member2.id,
                    created_by=admin.id,
                    due_date=today + timedelta(days=7),
                ),
                Task(
                    project_id=project.id,
                    title="Audit current analytics",
                    description="Document tracking gaps before the migration.",
                    status=TaskStatus.todo,
                    priority=TaskPriority.low,
                    assignee_id=member1.id,
                    created_by=admin.id,
                    due_date=today - timedelta(days=2),  # intentionally overdue
                ),
                Task(
                    project_id=project.id,
                    title="Write project brief",
                    description="Scope, timeline and success metrics.",
                    status=TaskStatus.done,
                    priority=TaskPriority.medium,
                    assignee_id=admin.id,
                    created_by=admin.id,
                    due_date=today - timedelta(days=5),
                ),
            ]
        )

        db.commit()
        print("Seeded demo data:")
        print("  admin@demo.com / password123  (Admin)")
        print("  maya@demo.com  / password123  (Member)")
        print("  sam@demo.com   / password123  (Member)")
    finally:
        db.close()


if __name__ == "__main__":
    run()
