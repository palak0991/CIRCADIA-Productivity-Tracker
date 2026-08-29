import React, { useState, useEffect } from 'react';
import { X, Trash2, Calendar, Clock, Tag, AlignLeft, CheckCircle } from 'lucide-react';

const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  taskToEdit,
  categories,
  selectedDate
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [status, setStatus] = useState('PLANNED');
  const [error, setError] = useState('');

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setCategoryId(taskToEdit.category?.id || (categories[0]?.id || ''));
      setStartDateTime(formatToDateTimeLocal(taskToEdit.startDateTime));
      setEndDateTime(formatToDateTimeLocal(taskToEdit.endDateTime));
      setStatus(taskToEdit.status || 'PLANNED');
    } else {
      setTitle('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      // Default to starting at 09:00 AM on selectedDate, duration 1 hour
      const defaultStart = `${selectedDate}T09:00`;
      const defaultEnd = `${selectedDate}T10:00`;
      setStartDateTime(defaultStart);
      setEndDateTime(defaultEnd);
      setStatus('PLANNED');
    }
    setError('');
  }, [taskToEdit, selectedDate, categories, isOpen]);

  if (!isOpen) return null;

  function formatToDateTimeLocal(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!categoryId) {
      setError('Please select a category');
      return;
    }
    if (!startDateTime || !endDateTime) {
      setError('Start time and End time are required');
      return;
    }

    const startIso = new Date(startDateTime).toISOString();
    const endIso = new Date(endDateTime).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      setError('End time must be strictly after start time');
      return;
    }

    onSave({
      id: taskToEdit?.id,
      title,
      description,
      categoryId: Number(categoryId),
      startDateTime: startIso,
      endDateTime: endIso,
      status
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass-panel">
        <div className="modal-header">
          <h3>{taskToEdit ? 'Edit Task' : 'Create New Task'}</h3>
          <button onClick={onClose} className="btn-icon text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              placeholder="e.g. Study Data Structures"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-select"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select"
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="MISSED">Missed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date & Time</label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label>End Date & Time</label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              placeholder="Add notes, links, or task objectives..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="modal-actions">
            {taskToEdit && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(taskToEdit.id)}
                className="btn btn-danger"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                <span>Delete</span>
              </button>
            )}

            <div className="actions-right">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {taskToEdit ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
