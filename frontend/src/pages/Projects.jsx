import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../api/client.js'
import {
  Alert,
  EmptyState,
  Modal,
  PageLoader,
  RoleBadge,
  Spinner,
  formatDate,
} from '../components/ui.jsx'

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post('/projects', {
        name: form.name.trim(),
        description: form.description.trim(),
      })
      onCreated(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not create project'))
      setSubmitting(false)
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <div>
          <label className="label">Project name</label>
          <input
            className="input"
            required
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Mobile App Launch"
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
            placeholder="What is this project about?"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Spinner className="h-4 w-4" /> : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="card flex flex-col p-5 transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-800">{project.name}</h3>
        <RoleBadge role={project.my_role} />
      </div>
      <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm text-slate-500">
        {project.description || 'No description provided.'}
      </p>
      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>{project.member_count} members</span>
        <span>
          {project.open_task_count} open / {project.task_count} tasks
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Created {formatDate(project.created_at)}
      </p>
    </Link>
  )
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    api
      .get('/projects')
      .then((res) => setProjects(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(project) {
    setShowModal(false)
    navigate(`/projects/${project.id}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-sm text-slate-500">
            Workspaces you own or collaborate on.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          + New project
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <PageLoader label="Loading projects…" />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          message="Create your first project to start organising tasks and inviting your team."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary mt-2"
            >
              + New project
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
