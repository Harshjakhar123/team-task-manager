# Team Task Manager

A full-stack web app where teams create projects, assign tasks, and track
progress with **role-based access control** (Admin / Member).

> **Live demo:** _add your Railway URL here after deploying_
> **Repository:** _add your GitHub URL here_

---

## ✨ Features

- **Authentication** — email/password signup & login secured with JWT and
  bcrypt-hashed passwords.
- **Projects & teams** — create projects, invite registered users, and manage
  per-project roles.
- **Role-based access control** — the project creator is its **Admin**;
  Admins manage members and all tasks, while **Members** can create tasks and
  update only the ones assigned to them.
- **Tasks** — create, assign, prioritise (low/medium/high), set due dates and
  track status across a **To Do / In Progress / Done** board.
- **Dashboard** — aggregated stats: project count, tasks assigned to you,
  status breakdown, and overdue / upcoming tasks.
- **Validation & relationships** — server-side validation (Pydantic) and
  proper foreign-key relationships between users, projects, members and tasks.

---

## 🧰 Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Frontend   | React 18, Vite, React Router, Tailwind CSS, Axios     |
| Backend    | FastAPI, SQLAlchemy 2, Pydantic v2                    |
| Database   | PostgreSQL (SQLite fallback for local dev)            |
| Auth       | JWT (PyJWT) + bcrypt                                  |
| Deployment | Docker (multi-stage) on Railway                       |

The frontend is compiled and served by the FastAPI backend, so the entire
product runs as **one Railway service** + a Postgres plugin.

---

## 📁 Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, static SPA serving
│   │   ├── config.py        # env-driven settings
│   │   ├── database.py      # SQLAlchemy engine & session
│   │   ├── models.py        # User, Project, ProjectMember, Task
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── security.py      # password hashing + JWT
│   │   ├── deps.py          # auth & role-check dependencies
│   │   ├── seed.py          # demo data seeder
│   │   └── routers/         # auth, projects, tasks, dashboard
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/           # Login, Signup, Dashboard, Projects, ProjectDetail
│   │   ├── components/      # Layout, ProtectedRoute, TaskFormModal, ui
│   │   ├── context/         # AuthContext
│   │   └── api/client.js    # Axios instance + JWT interceptor
│   └── package.json
├── Dockerfile               # multi-stage build (frontend + backend)
├── railway.json             # Railway deploy config
└── README.md
```

---

## 🗄️ Data Model

```
User ──< ProjectMember >── Project ──< Task >── User (assignee / creator)
```

- **User** — `id, name, email (unique), password_hash, created_at`
- **Project** — `id, name, description, owner_id, created_at`
- **ProjectMember** — join table carrying the per-project `role` (`admin` /
  `member`); unique on `(project_id, user_id)`
- **Task** — `id, project_id, title, description, status, priority,
  assignee_id, created_by, due_date, created_at, updated_at`

---

## 🚀 Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) PostgreSQL — omit it and the backend uses a local SQLite file.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

# Optional: copy env template and adjust
cp .env.example .env

# Optional: load demo data (3 users + a sample project)
python -m app.seed

uvicorn app.main:app --reload --port 8000
```

API is now at <http://localhost:8000> · interactive docs at
<http://localhost:8000/docs>.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App is at <http://localhost:5173>. The Vite dev server proxies `/api` to the
backend on port 8000, so no extra configuration is needed.

### Demo accounts (after running the seeder)

| Email           | Password      | Role in sample project |
| --------------- | ------------- | ---------------------- |
| admin@demo.com  | password123   | Admin                  |
| maya@demo.com   | password123   | Member                 |
| sam@demo.com    | password123   | Member                 |

---

## 🌐 Deploy to Railway

The repo ships a multi-stage `Dockerfile` and `railway.json`, so deployment is
straightforward.

1. **Push the code to GitHub.**
2. In [Railway](https://railway.app), create a **New Project → Deploy from
   GitHub repo** and select this repository.
3. Add a database: **New → Database → PostgreSQL**.
4. Open the app service → **Variables** and set:
   - `DATABASE_URL` → reference the Postgres variable:
     `${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET` → a long random string
   - `ENV` → `production`
5. Railway detects the `Dockerfile`, builds the frontend + backend, and
   deploys. The healthcheck hits `/api/health`.
6. Under **Settings → Networking**, click **Generate Domain** to get the
   public URL.
7. (Optional) Seed demo data once via the service shell:
   `python -m app.seed`.

The database tables are created automatically on first startup.

---

## 🔌 API Overview

All endpoints are prefixed with `/api`. Protected routes require an
`Authorization: Bearer <token>` header.

### Auth
| Method | Path               | Description              |
| ------ | ------------------ | ------------------------ |
| POST   | `/api/auth/signup` | Register & receive token |
| POST   | `/api/auth/login`  | Log in & receive token   |
| GET    | `/api/auth/me`     | Current user             |

### Projects & Members
| Method | Path                                       | Access        |
| ------ | ------------------------------------------ | ------------- |
| GET    | `/api/projects`                            | Member        |
| POST   | `/api/projects`                            | Any user      |
| GET    | `/api/projects/{id}`                       | Member        |
| PUT    | `/api/projects/{id}`                       | Admin         |
| DELETE | `/api/projects/{id}`                       | Admin         |
| GET    | `/api/projects/{id}/members`               | Member        |
| POST   | `/api/projects/{id}/members`               | Admin         |
| PATCH  | `/api/projects/{id}/members/{user_id}`     | Admin         |
| DELETE | `/api/projects/{id}/members/{user_id}`     | Admin         |

### Tasks
| Method | Path                              | Access                          |
| ------ | --------------------------------- | ------------------------------- |
| GET    | `/api/projects/{id}/tasks`        | Member (filters: status etc.)   |
| POST   | `/api/projects/{id}/tasks`        | Member                          |
| GET    | `/api/tasks/{id}`                 | Member                          |
| PUT    | `/api/tasks/{id}`                 | Admin, or assignee of the task  |
| DELETE | `/api/tasks/{id}`                 | Admin                           |

### Dashboard
| Method | Path             | Description                      |
| ------ | ---------------- | -------------------------------- |
| GET    | `/api/dashboard` | Aggregated stats for the user    |

Full interactive documentation is available at `/docs` on any running
instance.

---

## 🔐 Role-Based Access Control

Roles are scoped **per project** via the `ProjectMember` join table.

| Action                         | Admin | Member                         |
| ------------------------------- | :---: | ------------------------------ |
| View project, members & tasks   |  ✅   | ✅                             |
| Create tasks                    |  ✅   | ✅                             |
| Edit / delete project           |  ✅   | ❌                             |
| Add / remove members, set roles |  ✅   | ❌                             |
| Edit any task / reassign tasks  |  ✅   | ❌                             |
| Update a task assigned to them  |  ✅   | ✅ (own tasks only)            |
| Delete a task                   |  ✅   | ❌                             |

Enforcement lives in `backend/app/deps.py` (`require_member`,
`require_admin`) and the per-route checks in the task router.
