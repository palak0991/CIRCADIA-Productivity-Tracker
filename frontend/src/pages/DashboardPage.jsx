import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '../components/Navbar';
import DateHeader from '../components/DateHeader';
import Timeline from '../components/Timeline';
import Clock24 from '../components/Clock24';
import TaskModal from '../components/TaskModal';
import CategoryModal from '../components/CategoryModal';
import AnalyticsPanel from '../components/AnalyticsPanel';
import { useAuth } from '../context/AuthContext';
import { getTasksForDate, createTask, updateTask, updateTaskStatus, deleteTask } from '../services/taskService';
import { getCategories, createCategory, deleteCategory } from '../services/categoryService';

const DashboardPage = () => {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [viewMode, setViewMode] = useState('split'); // 'split' | 'clock' | 'timeline'

  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // analyticsRefreshSignal increments after any task mutation to re-trigger analytics fetch
  const [analyticsRefreshSignal, setAnalyticsRefreshSignal] = useState(0);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTasksForDate(selectedDate, timezone);
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError('Failed to load tasks for selected date');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, timezone]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Task Handlers ───────────────────────────────────────────────────────────
  const handleOpenNewTask = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const refreshAll = () => {
    fetchTasks();
    setAnalyticsRefreshSignal(s => s + 1);
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (taskData.id) {
        await updateTask(taskData.id, taskData);
      } else {
        await createTask(taskData);
      }
      setIsTaskModalOpen(false);
      setTaskToEdit(null);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);
      setIsTaskModalOpen(false);
      setTaskToEdit(null);
      refreshAll();
    } catch (err) {
      alert('Failed to delete task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus(taskId, { status: newStatus });
      refreshAll();
    } catch (err) {
      alert('Failed to update task status');
    }
  };

  // ── Category Handlers ───────────────────────────────────────────────────────
  const handleCreateCategory = async (categoryData) => {
    try {
      await createCategory(categoryData);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await deleteCategory(categoryId);
      fetchCategories();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar onOpenCategories={() => setIsCategoryModalOpen(true)} />

      <main className="dashboard-main">
        <DateHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          timezone={timezone}
          onTimezoneChange={setTimezone}
          onAddNewTask={handleOpenNewTask}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {error && <div className="error-alert my-3">{error}</div>}

        {loading ? (
          <div className="glass-panel loading-skeleton">
            <div className="spinner" />
            <p>Loading 24-hour visualization...</p>
          </div>
        ) : (
          <div className={`dashboard-content-grid dashboard-view--${viewMode}`}>
            {/* ── 24-Hour Timeline Column ─────────────────────── */}
            {(viewMode === 'split' || viewMode === 'timeline') && (
              <div className="dashboard-timeline-col">
                <Timeline
                  selectedDate={selectedDate}
                  tasks={tasks}
                  onEditTask={handleEditTask}
                  onStatusChange={handleStatusChange}
                />
              </div>
            )}

            {/* ── 24-Hour Circular Clock Dial View Column (when in clock only mode) ─────────────────────── */}
            {viewMode === 'clock' && (
              <div className="dashboard-clock-main-col">
                <Clock24
                  tasks={tasks}
                  selectedDate={selectedDate}
                  onEditTask={handleEditTask}
                  timezone={timezone}
                />
              </div>
            )}

            {/* ── Right Sidebar: 24h Clock (in Split mode) + Analytics Panel ─────────────── */}
            <div className="dashboard-analytics-col">
              {viewMode === 'split' && (
                <Clock24
                  tasks={tasks}
                  selectedDate={selectedDate}
                  onEditTask={handleEditTask}
                  timezone={timezone}
                />
              )}

              <AnalyticsPanel
                date={selectedDate}
                timezone={timezone}
                refreshSignal={analyticsRefreshSignal}
              />
            </div>
          </div>
        )}
      </main>

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        taskToEdit={taskToEdit}
        categories={categories}
        selectedDate={selectedDate}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
};

export default DashboardPage;
