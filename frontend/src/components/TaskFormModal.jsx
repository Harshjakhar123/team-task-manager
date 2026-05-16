import { useState } from 'react'
import api, { errorMessage } from '../api/client.js'
import {
  Alert,
  Modal,
  PRIORITY_OPTIONS,
  STATUS_LABELS,
  STATUS_OPTIONS,
  Spinner,
} from './ui.jsx'

// Create or edit a task. Pass `task` to edit, omit it to create.
// `readOnly` renders the form disabled (used when the viewer lacks edit rights).
export default function TaskFormModal({
  projectId,
  members,
  task,
  canDelete,
  readOnly = false,
  onClose,
  onSaved,
  onDeleted,
}) {
  const isEdit = Boolean(task)
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id ? String(task.assignee_id) : '',
    due_date: task?.due_date || '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      due_date: form.due_date || null,
    }
    try {
      const res = isEdit
        ? await api.put(`/tasks/${task.id}`, payload)
        : await api.post(`/projects/${projectId}/tasks`, payload)
      onSaved(res.data)
    } catch (err) {
      setError(errorMessage(err, 'Could not save task'))
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/tasks/${task.id}`)
      onDeleted(task.id)
    } catch (err) {
      setError(errorMessage(err, 'Could not delete task'))
      setDeleting(false)
    }
  }

  const title = readOnly ? 'Task details' : isEdit ? 'Edit task' : 'New task'

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {readOnly && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            You can only edit tasks assigned to you.
          </p>
        )}

        <div>
          <label className="label">Title</label>
          <input
            className="input"
            required
            disabled={readOnly}
            value={form.title}
            onChange={update('title')}
            placeholder="What needs to be done?"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={3}
            disabled={readOnly}
            value={form.description}
            onChange={update('description')}
            placeholder="Add any details…"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              disabled={readOnly}
              value={form.status}
              onChange={update('status')}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input capitalize"
              disabled={readOnly}
              value={form.priority}
              onChange={update('priority')}
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Assignee</label>
            <select
              className="input"
              disabled={readOnly}
              value={form.assignee_id}
              onChange={update('assignee_id')}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              type="date"
              className="input"
              disabled={readOnly}
              value={form.due_date || ''}
              onChange={update('due_date')}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <div>
            {isEdit && canDelete && !readOnly && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? <Spinner className="h-4 w-4" /> : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? (
                  <Spinner className="h-4 w-4" />
                ) : isEdit ? (
                  'Save changes'
                ) : (
                  'Create task'
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}
