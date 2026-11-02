import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Trash2, Calendar, Clock, Tag, AlignLeft, CheckCircle,
  Play, Check, RotateCcw, Flame, Sparkles, Wand2, Loader2,
  AlertCircle, Info, CheckCircle2, ArrowRight, CornerDownLeft,
  CalendarDays, Hourglass, Layers, PlayCircle, XCircle, AlertTriangle
} from 'lucide-react';
import { parseTaskNL } from '../services/taskService';

const SAMPLE_PROMPTS = [
  'Study DBMS for two hours tomorrow morning',
  'Complete my Java assignment today from 4 PM to 5:30 PM',
  'Read for 45 minutes tomorrow at 7 PM',
  'Work on my project for 90 minutes this Saturday',
  'Prepare for my SQL interview tomorrow from 10 AM to noon'
];

const STATUS_ICONS = {
  PLANNED: CalendarDays,
  IN_PROGRESS: PlayCircle,
  COMPLETED: CheckCircle2,
  MISSED: AlertTriangle,
  CANCELLED: XCircle
};

const TaskModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onActualTimeAction,
  taskToEdit,
  categories = [],
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

  // Keyboard shortcut listener for Esc and Ctrl/Cmd+Enter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const submitBtn = document.getElementById('task-modal-submit-btn');
        if (submitBtn) submitBtn.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Real-time planned duration computation
  const plannedDuration = useMemo(() => {
    if (!startDateTime || !endDateTime) return null;
    const s = new Date(startDateTime);
    const e = new Date(endDateTime);
    const diffMs = e.getTime() - s.getTime();
    if (isNaN(diffMs)) return null;
    if (diffMs <= 0) {
      return { isInvalid: true, text: 'End time must be after start time' };
    }
    const totalMinutes = Math.round(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0 && mins > 0) {
      return { isInvalid: false, text: `${hours} hr ${mins} min duration` };
    }
    if (hours > 0) {
      return { isInvalid: false, text: `${hours} hr duration` };
    }
    return { isInvalid: false, text: `${mins} min duration` };
  }, [startDateTime, endDateTime]);

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
        title: hasIssues ? 'Draft Populated with Clarifications' : 'Task Draft Generated Successfully!',
        questions: questions,
        missing: missing,
        extracted: {
          title: res.title,
          date: res.date,
          startTime: res.startTime,
          endTime: res.endTime,
          duration: res.durationMinutes ? `${res.durationMinutes}m` : null,
          category: res.categoryName
        },
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

  const currentCategory = categories.find((c) => String(c.id) === String(categoryId));

  return (
    <div className="modal-backdrop task-studio-backdrop">
      <div className="modal-card task-studio-card glass-panel" role="dialog" aria-modal="true">
        {/* Modal Header */}
        <div className="task-studio-header">
          <div className="header-left">
            <div className="task-studio-icon-glow">
              {taskToEdit ? <Clock className="w-5 h-5 text-indigo-400" /> : <Sparkles className="w-5 h-5 text-pink-400" />}
            </div>
            <div>
              <h3 className="task-studio-title">{taskToEdit ? 'Edit Task Schedule' : 'Create New Task'}</h3>
              <p className="task-studio-subtitle">
                {taskToEdit ? 'Modify timings, actual execution, or category details' : 'Describe in plain English or configure details manually'}
              </p>
            </div>
          </div>

          <div className="header-right">
            <span className="kbd-shortcut-pill" title="Press Escape to close">
              ESC
            </span>
            <button
              onClick={onClose}
              className="btn-icon-close"
              aria-label="Close modal"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="task-studio-error-banner">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Natural Language Quick Create (Only for New Tasks) ──────────────── */}
        {!taskToEdit && (
          <div className="nl-studio-container">
            <div className="nl-studio-header">
              <div className="nl-studio-tag">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                <span>AI Language Studio</span>
              </div>
              <span className="nl-shortcut-hint">
                Type naturally, then press <kbd className="kbd-mini">Enter ↵</kbd>
              </span>
            </div>

            <div className="nl-prompt-input-wrapper">
              <textarea
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="Describe your task... e.g. 'Study DBMS for two hours tomorrow morning'"
                className="nl-prompt-textarea"
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
                className="btn-nl-magic"
                title="Autofill task fields with AI"
              >
                {isParsing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Wand2 className="w-4 h-4 text-white" />
                )}
                <span>{isParsing ? 'Extracting...' : 'Magic Autofill'}</span>
              </button>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="nl-prompts-carousel">
              <span className="nl-prompts-label">Quick test prompts:</span>
              <div className="nl-prompts-scroll">
                {SAMPLE_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="nl-prompt-pill"
                    onClick={() => setNlText(prompt)}
                  >
                    <ArrowRight className="w-3 h-3 text-pink-400 opacity-60 mr-1" />
                    <span>"{prompt}"</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Parsing Feedback / Extraction Chips */}
            {parseFeedback && (
              <div className={`nl-feedback-card nl-feedback-${parseFeedback.type}`}>
                <div className="nl-feedback-top">
                  <div className="flex items-center gap-2">
                    {parseFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {parseFeedback.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    {parseFeedback.type === 'error' && <Info className="w-4 h-4 text-rose-400" />}
                    <span className="nl-feedback-headline">{parseFeedback.title}</span>
                  </div>
                  {parseFeedback.confidence != null && (
                    <span className="nl-confidence-badge">{parseFeedback.confidence}% Confidence</span>
                  )}
                </div>

                {parseFeedback.extracted && parseFeedback.type !== 'error' && (
                  <div className="nl-tokens-row">
                    {parseFeedback.extracted.date && (
                      <span className="nl-token-chip">
                        <Calendar className="w-3 h-3 mr-1 text-sky-400" />
                        {parseFeedback.extracted.date}
                      </span>
                    )}
                    {parseFeedback.extracted.startTime && (
                      <span className="nl-token-chip">
                        <Clock className="w-3 h-3 mr-1 text-emerald-400" />
                        {parseFeedback.extracted.startTime}
                        {parseFeedback.extracted.endTime && ` → ${parseFeedback.extracted.endTime}`}
                      </span>
                    )}
                    {parseFeedback.extracted.duration && (
                      <span className="nl-token-chip">
                        <Hourglass className="w-3 h-3 mr-1 text-purple-400" />
                        {parseFeedback.extracted.duration}
                      </span>
                    )}
                    {parseFeedback.extracted.category && (
                      <span className="nl-token-chip">
                        <Tag className="w-3 h-3 mr-1 text-pink-400" />
                        {parseFeedback.extracted.category}
                      </span>
                    )}
                  </div>
                )}

                {parseFeedback.questions && parseFeedback.questions.length > 0 && (
                  <ul className="nl-feedback-questions">
                    {parseFeedback.questions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Main Structured Task Form ──────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="task-studio-form">
          <div className="task-studio-section-label">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Task Configuration</span>
          </div>

          {/* Task Title */}
          <div className="form-group">
            <label className="field-label">
              <span>Task Title</span>
              <span className="required-star">*</span>
            </label>
            <div className="studio-input-wrap">
              <input
                type="text"
                placeholder="e.g. Study Data Structures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="studio-input"
                required
              />
            </div>
          </div>

          {/* Category & Status Row */}
          <div className="form-row-dual">
            {/* Category Selector with visual preview */}
            <div className="form-group flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="field-label">
                  <span>Category</span>
                  <span className="required-star">*</span>
                </label>
                {currentCategory && (
                  <span className="cat-color-indicator" style={{ backgroundColor: currentCategory.color }}>
                    {currentCategory.name}
                  </span>
                )}
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="studio-select"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Selector */}
            <div className="form-group flex-1">
              <label className="field-label">
                <span>Task Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="studio-select"
              >
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="MISSED">Missed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Planned Schedule Section */}
          <div className="planned-schedule-panel">
            <div className="schedule-panel-header">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="schedule-label">Planned Time Interval</span>
              </div>
              {plannedDuration && (
                <span className={`duration-pill ${plannedDuration.isInvalid ? 'duration-pill--error' : 'duration-pill--valid'}`}>
                  <Hourglass className="w-3 h-3 mr-1" />
                  {plannedDuration.text}
                </span>
              )}
            </div>

            <div className="form-row-dual">
              <div className="form-group flex-1">
                <label className="field-sublabel">Start Time</label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="studio-input"
                  required
                />
              </div>

              <div className="form-group flex-1">
                <label className="field-sublabel">End Time</label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="studio-input"
                  required
                />
              </div>
            </div>
          </div>

          {/* Actual Execution Tracking Section (when editing) */}
          {taskToEdit && (
            <div className="actual-execution-panel">
              <div className="actual-panel-header">
                <div className="flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-indigo-400" />
                  <span className="schedule-label">Actual Work Tracking</span>
                </div>
                {taskToEdit.isOverrunning && (
                  <span className="badge-overrun-pulsing">
                    <Flame className="w-3.5 h-3.5 mr-1" />
                    Overrunning planned time!
                  </span>
                )}
              </div>

              <div className="form-row-dual">
                <div className="form-group flex-1">
                  <label className="field-sublabel">Actual Start</label>
                  <input
                    type="datetime-local"
                    value={actualStartDateTime}
                    onChange={(e) => setActualStartDateTime(e.target.value)}
                    className="studio-input"
                  />
                </div>

                <div className="form-group flex-1">
                  <label className="field-sublabel">Actual End</label>
                  <input
                    type="datetime-local"
                    value={actualEndDateTime}
                    onChange={(e) => setActualEndDateTime(e.target.value)}
                    className="studio-input"
                  />
                </div>
              </div>

              <div className="actual-quick-actions">
                <button
                  type="button"
                  className="btn-quick-stamp stamp-start"
                  onClick={() => handleQuickAction('START')}
                >
                  <Play className="w-3.5 h-3.5 mr-1 text-indigo-400 fill-current" />
                  <span>Stamp Start (Now)</span>
                </button>
                <button
                  type="button"
                  className="btn-quick-stamp stamp-complete"
                  onClick={() => handleQuickAction('COMPLETE')}
                >
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  <span>Stamp Complete (Now)</span>
                </button>
                <button
                  type="button"
                  className="btn-quick-stamp stamp-reset"
                  onClick={() => handleQuickAction('RESET')}
                  title="Reset actual time stamps"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1 text-muted" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="form-group">
            <label className="field-label">
              <span>Description / Notes</span>
              <span className="optional-tag">(Optional)</span>
            </label>
            <textarea
              placeholder="Add notes, links, or task objectives..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="studio-textarea"
              rows={2}
            />
          </div>

          {/* Modal Actions */}
          <div className="task-studio-actions">
            {taskToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(taskToEdit.id)}
                className="btn-studio-danger"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                <span>Delete Task</span>
              </button>
            ) : (
              <div className="shortcut-save-hint">
                <span>Press</span>
                <kbd className="kbd-mini">⌘ / Ctrl + Enter</kbd>
                <span>to save</span>
              </div>
            )}

            <div className="actions-right">
              <button
                type="button"
                onClick={onClose}
                className="btn-studio-secondary"
              >
                Cancel
              </button>
              <button
                id="task-modal-submit-btn"
                type="submit"
                className="btn-studio-primary"
              >
                {taskToEdit ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    <span>Create Task</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
