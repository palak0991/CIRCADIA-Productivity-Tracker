import React, { useState, useEffect } from 'react';
import {
  X, Trash2, Calendar, Clock, Tag, AlignLeft, CheckCircle,
  Play, Check, RotateCcw, Flame, Sparkles, Wand2, Loader2,
  AlertCircle, Info, CheckCircle2
} from 'lucide-react';
import { parseTaskNL } from '../services/taskService';

const SAMPLE_PROMPTS = [
  'Study DBMS for two hours tomorrow morning',
  'Complete my Java assignment today from 4 PM to 5:30 PM',
  'Gym workout for 45 minutes on Friday at 6 PM',
  'Prepare weekly project status presentation for Monday 10:00 AM to 11:30 AM',
  'Read research paper for one hour'
];

const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onActualTimeAction,
  taskToEdit,
  categories,
  selectedDate
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [actualStartDateTime, setActualStartDateTime] = useState('');
  const [actualEndDateTime, setActualEndDateTime] = useState('');
  const [status, setStatus] = useState('PLANNED');
  const [error, setError] = useState('');

  // Natural Language Task Creation state
  const [nlText, setNlText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseFeedback, setParseFeedback] = useState(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setCategoryId(taskToEdit.category?.id || (categories[0]?.id || ''));
      setStartDateTime(formatToDateTimeLocal(taskToEdit.startDateTime));
      setEndDateTime(formatToDateTimeLocal(taskToEdit.endDateTime));
      setActualStartDateTime(formatToDateTimeLocal(taskToEdit.actualStartDateTime));
      setActualEndDateTime(formatToDateTimeLocal(taskToEdit.actualEndDateTime));
      setStatus(taskToEdit.status || 'PLANNED');
      setNlText('');
      setParseFeedback(null);
    } else {
      setTitle('');
      setDescription('');
      setCategoryId(categories[0]?.id || '');
      const defaultStart = `${selectedDate}T09:00`;
      const defaultEnd = `${selectedDate}T10:00`;
      setStartDateTime(defaultStart);
      setEndDateTime(defaultEnd);
      setActualStartDateTime('');
      setActualEndDateTime('');
      setStatus('PLANNED');
      setNlText('');
      setParseFeedback(null);
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

  const handleNLPParse = async () => {
    if (!nlText.trim()) return;
    setIsParsing(true);
    setParseFeedback(null);
    setError('');

    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await parseTaskNL(nlText, userTz);

      if (res.title) {
        setTitle(res.title);
      }
      if (res.description) {
        setDescription(res.description);
      }
      if (res.categoryId) {
        setCategoryId(String(res.categoryId));
      }

      if (res.startDateTime) {
        setStartDateTime(formatToDateTimeLocal(res.startDateTime));
      }
      if (res.endDateTime) {
        setEndDateTime(formatToDateTimeLocal(res.endDateTime));
      } else if (res.durationMinutes && res.startDateTime) {
        const sDate = new Date(res.startDateTime);
        const eDate = new Date(sDate.getTime() + res.durationMinutes * 60000);
        setEndDateTime(formatToDateTimeLocal(eDate.toISOString()));
      }

      const questions = res.clarificationQuestions || [];
      const missing = res.missingFields || [];
      const hasIssues = questions.length > 0 || missing.length > 0 || res.requiresConfirmation;

      setParseFeedback({
        type: hasIssues ? 'warning' : 'success',
        title: hasIssues ? 'Draft Populated with Clarifications' : 'Task Draft Ready!',
        questions: questions,
        missing: missing,
        confidence: res.confidenceScore != null ? Math.round(res.confidenceScore * 100) : null
      });
    } catch (err) {
      console.error('NLP parsing error:', err);
      setParseFeedback({
        type: 'error',
        title: 'NLP Service Notice',
        questions: ['Natural language parsing could not be completed. You can still fill out the task manually below.']
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleQuickAction = async (action) => {
    if (!taskToEdit?.id || !onActualTimeAction) return;
    try {
      await onActualTimeAction(taskToEdit.id, action);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update actual time');
    }
  };

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

    const actualStartIso = actualStartDateTime ? new Date(actualStartDateTime).toISOString() : null;
    const actualEndIso = actualEndDateTime ? new Date(actualEndDateTime).toISOString() : null;

    onSave({
      id: taskToEdit?.id,
      title,
      description,
      categoryId: Number(categoryId),
      startDateTime: startIso,
      endDateTime: endIso,
      actualStartDateTime: actualStartIso,
      actualEndDateTime: actualEndIso,
      status
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card glass-panel task-modal-card">
        <div className="modal-header">
          <h3>{taskToEdit ? 'Edit Task' : 'Create New Task'}</h3>
          <button onClick={onClose} className="btn-icon text-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="error-alert">{error}</div>}

        {!taskToEdit && (
          <div className="nlp-box">
            <div className="nlp-box-header">
              <div className="nlp-box-title">
                <Sparkles className="w-4 h-4 text-accent-pink" />
                <span>Natural Language Quick Create</span>
              </div>
              <span className="nlp-box-subtitle">Describe your task in plain words & autofill</span>
            </div>

            <div className="nlp-input-row">
              <textarea
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="e.g. Study DBMS for two hours tomorrow morning"
                className="nlp-textarea"
                rows={2}
                disabled={isParsing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleNLPParse();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleNLPParse}
                disabled={isParsing || !nlText.trim()}
                className="btn btn-nlp"
                title="Parse task description with AI"
              >
                {isParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                <span>{isParsing ? 'Parsing...' : 'Autofill'}</span>
              </button>
            </div>

            <div className="nlp-examples">
              <span className="nlp-examples-label">Try quick example:</span>
              <div className="nlp-chips-scroll">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="nlp-chip"
                    onClick={() => {
                      setNlText(prompt);
                    }}
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            {parseFeedback && (
              <div className={`nlp-feedback-banner nlp-feedback-${parseFeedback.type}`}>
                <div className="nlp-feedback-header">
                  {parseFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {parseFeedback.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                  {parseFeedback.type === 'error' && <Info className="w-4 h-4 text-rose-500" />}
                  <span className="nlp-feedback-title">{parseFeedback.title}</span>
                  {parseFeedback.confidence != null && (
                    <span className="nlp-confidence-tag">{parseFeedback.confidence}% confidence</span>
                  )}
                </div>

                {parseFeedback.questions && parseFeedback.questions.length > 0 && (
                  <ul className="nlp-feedback-list">
                    {parseFeedback.questions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

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

          {/* Planned Time Interval */}
          <div className="form-section-title">Planned Time</div>
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

          {/* Actual Time Tracking Section (for existing tasks) */}
          {taskToEdit && (
            <div className="actual-time-section">
              <div className="actual-time-header">
                <span className="form-section-title">Actual Execution Tracking</span>
                {taskToEdit.isOverrunning && (
                  <span className="badge-overrun">
                    <Flame className="w-3.5 h-3.5 mr-1" />
                    Overrunning planned time!
                  </span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Actual Start</label>
                  <input
                    type="datetime-local"
                    value={actualStartDateTime}
                    onChange={(e) => setActualStartDateTime(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Actual End</label>
                  <input
                    type="datetime-local"
                    value={actualEndDateTime}
                    onChange={(e) => setActualEndDateTime(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Quick Execution Action Triggers */}
              <div className="actual-time-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleQuickAction('START')}
                >
                  <Play className="w-3.5 h-3.5 mr-1 text-accent fill-current" />
                  Stamp Start (Now)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleQuickAction('COMPLETE')}
                >
                  <Check className="w-3.5 h-3.5 mr-1 text-success" />
                  Stamp Complete (Now)
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleQuickAction('RESET')}
                  title="Reset actual time stamps"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-muted" />
                  Reset
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              placeholder="Add notes, links, or task objectives..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={2}
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
