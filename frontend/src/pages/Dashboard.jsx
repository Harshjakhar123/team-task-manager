import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api/client.js'
import {
  Alert,
  EmptyState,
  PageLoader,
  PriorityBadge,
  STATUS_LABELS,
  StatusBadge,
  formatDate,
  isOverdue,
} from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent || 'text-slate-800'}`}>
        {value}
      </p>
    </div>
  )
}

function TaskRow({ task }) {
  const overdue = isOverdue(task.due_date, task.status)
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">
          {task.title}
        </p>
        <p className={`text-xs ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
          Due {formatDate(task.due_date)}
          {overdue && ' · Overdue'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <StatusBadge status={task.status} />
      </div>
    </li>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader label="Loading dashboard…" />
  if (error) return <Alert>{error}</Alert>

  const { status_breakdown: sb } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Hi {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Here's an overview of your tasks across all projects.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Projects" value={data.project_count} />
        <StatCard label="Tasks assigned to me" value={data.assigned_to_me} />
        <StatCard
          label="In progress"
          value={sb.in_progress}
          accent="text-amber-600"
        />
        <StatCard label="Overdue" value={data.overdue} accent="text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-base font-semibold text-slate-800">
            My tasks by status
          </h2>
          <div className="space-y-3">
            {['todo', 'in_progress', 'done'].map((key) => {
              const count = sb[key]
              const total = data.assigned_to_me || 1
              const pct = Math.round((count / total) * 100)
              return (
                <div key={key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-600">{STATUS_LABELS[key]}</span>
                    <span className="font-semibold text-slate-700">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-1 text-base font-semibold text-slate-800">
            Upcoming &amp; overdue
          </h2>
          <p className="mb-2 text-xs text-slate-400">
            Your open tasks with a due date
          </p>
          {data.upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Nothing due — you're all caught up.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.upcoming.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-slate-800">
          Recently updated tasks
        </h2>
        {data.my_tasks.length === 0 ? (
          <EmptyState
            title="No tasks assigned to you yet"
            message="Open a project to create tasks or have an admin assign some to you."
            action={
              <Link to="/projects" className="btn-primary mt-2">
                Go to projects
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.my_tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
