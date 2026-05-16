import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { errorMessage } from '../api/client.js'
import TaskFormModal from '../components/TaskFormModal.jsx'
import {
  Alert,
  EmptyState,
  Modal,
  PageLoader,
  PriorityBadge,
  RoleBadge,
  Spinner,
  STATUS_LABELS,
  STATUS_OPTIONS,
  formatDate,
  initials,
  isOverdue,
} from '../components/ui.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/* -------------------------------------------------------------------------- */
/*  Task card                                                                 */
/* -------------------------------------------------------------------------- */

function TaskCard({ task, members, canEdit, onOpen, onQuickStatus }) {
  const assignee = members.find((m) => m.user.id === task.assignee_id)?.user
  const overdue = isOverdue(task.due_date, task.status)

  return (
    <div
      onClick={onOpen}
      className="card cursor-pointer space-y-2 p-3 transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="line-clamp-2 text-xs text-slate-500">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span
          className={`text-xs ${overdue ? 'font-medium text-red-600' : 'text-slate-400'}`}
        >
          {task.due_date ? `Due ${formatDate(task.due_date)}` : 'No due date'}
          {overdue && ' · Overdue'}
        </span>
        {assignee ? (
          <span
            title={assignee.name}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600"
          >
            {initials(assignee.name)}
          </span>
        ) : (
          <span className="text-xs text-slate-300">Unassigned</span>
        )}
      </div>

      {canEdit && (
        <select
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onQuickStatus(task, e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Team panel                                                                */
/* -------------------------------------------------------------------------- */

function TeamPanel({ project, isAdmin, currentUserId, onChange }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function addMember(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post(`/projects/${project.id}/members`, {
        email: email.trim(),
        role,
      })
      setEmail('')
      setRole('member')
      await onChange()
    } catch (err) {
      setError(errorMessage(err, 'Could not add member'))
    } finally {
      setBusy(false)
    }
  }

  async function changeRole(userId, newRole) {
    try {
      await api.patch(`/projects/${project.id}/members/${userId}`, {
        role: newRole,
      })
      await onChange()
    } catch (err) {
      setError(errorMessage(err, 'Could not update role'))
    }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member from the project?')) return
    try {
      await api.delete(`/projects/${project.id}/members/${userId}`)
      await onChange()
    } catch (err) {
      setError(errorMessage(err, 'Could not remove member'))
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert>{error}</Alert>}

      {isAdmin && (
        <form onSubmit={addMember} className="card p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Add a team member
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              required
              className="input"
              placeholder="Registered user's email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="input sm:w-40"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button disabled={busy} className="btn-primary sm:w-auto">
              {busy ? <Spinner className="h-4 w-4" /> : 'Add'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            The person must already have an account.
          </p>
        </form>
      )}

      <div className="card divide-y divide-slate-100">
        {project.members.map((m) => {
          const isOwner = m.user.id === project.owner_id
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {initials(m.user.name)}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {m.user.name}
                    {m.user.id === currentUserId && (
                      <span className="ml-1 text-xs text-slate-400">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">{m.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner && (
                  <span className="text-xs text-slate-400">Owner</span>
                )}
                {isAdmin && !isOwner ? (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole(m.user.id, e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.user.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <RoleBadge role={m.role} />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Project settings modal                                                    */
/* -------------------------------------------------------------------------- */

function SettingsModal({ project, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    name: project.name,
    description: project.description,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await api.put(`/projects/${project.id}`, {
        name: form.name.trim(),
        description: form.description.trim(),
      })
      onSaved(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not save project'))
      setSaving(false)
    }
  }

  async function remove() {
    if (
      !window.confirm(
        'Delete this project? All its tasks and members will be removed.',
      )
    )
      return
    setDeleting(true)
    try {
      await api.delete(`/projects/${project.id}`)
      onDeleted()
    } catch (err) {
      setError(errorMessage(err, 'Could not delete project'))
      setDeleting(false)
    }
  }

  return (
    <Modal title="Project settings" onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label">Project name</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            className="btn-danger"
          >
            {deleting ? <Spinner className="h-4 w-4" /> : 'Delete project'}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner className="h-4 w-4" /> : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('tasks')

  const [search, setSearch] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const [taskModal, setTaskModal] = useState(null) // { task } | { task: null }
  const [showSettings, setShowSettings] = useState(false)

  const isAdmin = project?.my_role === 'admin'

  async function loadProject() {
    const res = await api.get(`/projects/${id}`)
    setProject(res.data)
    return res.data
  }

  async function loadTasks() {
    const res = await api.get(`/projects/${id}/tasks`)
    setTasks(res.data)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadProject(), loadTasks()])
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        search &&
        !t.title.toLowerCase().includes(search.toLowerCase())
      )
        return false
      if (assigneeFilter && String(t.assignee_id) !== assigneeFilter)
        return false
      return true
    })
  }, [tasks, search, assigneeFilter])

  function canEditTask(task) {
    return isAdmin || task.assignee_id === user?.id
  }

  async function quickStatus(task, status) {
    try {
      const res = await api.put(`/tasks/${task.id}`, { status })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? res.data : t)))
    } catch (err) {
      setError(errorMessage(err, 'Could not update status'))
    }
  }

  function handleTaskSaved(saved) {
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === saved.id)
      return exists
        ? prev.map((t) => (t.id === saved.id ? saved : t))
        : [saved, ...prev]
    })
    setTaskModal(null)
  }

  function handleTaskDeleted(taskId) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    setTaskModal(null)
  }

  if (loading) return <PageLoader label="Loading project…" />
  if (error && !project) return <Alert>{error}</Alert>
  if (!project) return null

  const columns = STATUS_OPTIONS.map((status) => ({
    status,
    tasks: filteredTasks.filter((t) => t.status === status),
  }))

  return (
    <div className="space-y-5">
      <Link to="/projects" className="text-sm text-brand-600 hover:underline">
        ← All projects
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">
              {project.name}
            </h1>
            <RoleBadge role={project.my_role} />
          </div>
          {project.description && (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {project.description}
            </p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowSettings(true)}
            className="btn-secondary"
          >
            ⚙ Settings
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { key: 'tasks', label: `Tasks (${tasks.length})` },
          { key: 'team', label: `Team (${project.members.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input sm:w-64"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="input sm:w-48"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="">All assignees</option>
              {project.members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setTaskModal({ task: null })}
              className="btn-primary ml-auto"
            >
              + Add task
            </button>
          </div>

          {tasks.length === 0 ? (
            <EmptyState
              title="No tasks yet"
              message="Create the first task and assign it to a team member."
              action={
                <button
                  onClick={() => setTaskModal({ task: null })}
                  className="btn-primary mt-2"
                >
                  + Add task
                </button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {columns.map((col) => (
                <div key={col.status} className="rounded-xl bg-slate-200/50 p-3">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-slate-700">
                      {STATUS_LABELS[col.status]}
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                      {col.tasks.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {col.tasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        members={project.members}
                        canEdit={canEditTask(task)}
                        onOpen={() => setTaskModal({ task })}
                        onQuickStatus={quickStatus}
                      />
                    ))}
                    {col.tasks.length === 0 && (
                      <p className="px-1 py-4 text-center text-xs text-slate-400">
                        Nothing here
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'team' && (
        <TeamPanel
          project={project}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onChange={loadProject}
        />
      )}

      {taskModal && (
        <TaskFormModal
          projectId={project.id}
          members={project.members}
          task={taskModal.task}
          canDelete={isAdmin}
          readOnly={taskModal.task ? !canEditTask(taskModal.task) : false}
          onClose={() => setTaskModal(null)}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}

      {showSettings && (
        <SettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => {
            setProject((p) => ({ ...p, ...updated }))
            setShowSettings(false)
          }}
          onDeleted={() => navigate('/projects')}
        />
      )}
    </div>
  )
}
