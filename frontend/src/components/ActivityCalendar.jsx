import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Flame, Trophy, Calendar, Clock, CheckCircle2, ChevronRight, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import analyticsService from '../services/analyticsService';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ActivityCalendar = ({ timezone = 'UTC', refreshSignal = 0, onSelectDate }) => {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredDay, setHoveredDay] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await analyticsService.getActivityCalendar(365, timezone);
      setCalendarData(data);
    } catch (err) {
      console.error('Failed to load activity calendar:', err);
      setError('Could not load activity calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [timezone]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar, refreshSignal]);

  // Group daily contributions into Month Blocks matching the LeetCode visual reference
  const monthBlocks = useMemo(() => {
    if (!calendarData || !calendarData.dailyContributions || calendarData.dailyContributions.length === 0) {
      return [];
    }

    const contributions = calendarData.dailyContributions;
    const monthsMap = new Map();

    contributions.forEach((dayItem) => {
      // dayItem.date is 'YYYY-MM-DD'
      const [yearStr, monthStr] = dayItem.date.split('-');
      const monthKey = `${yearStr}-${monthStr}`;

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          key: monthKey,
          year: parseInt(yearStr, 10),
          monthIndex: parseInt(monthStr, 10) - 1,
          monthName: MONTH_NAMES[parseInt(monthStr, 10) - 1],
          days: []
        });
      }
      monthsMap.get(monthKey).days.push(dayItem);
    });

    const blocks = [];
    monthsMap.forEach((monthObj) => {
      // Build columns of 7 rows (Sunday=0 to Saturday=6)
      const columns = [];
      let currentColumn = new Array(7).fill(null);

      monthObj.days.forEach((dayItem) => {
        const [y, m, d] = dayItem.date.split('-').map(Number);
        // Create local date to determine day of week
        const dt = new Date(y, m - 1, d);
        const dayOfWeek = dt.getDay(); // 0 is Sunday, 6 is Saturday

        currentColumn[dayOfWeek] = dayItem;

        // When Saturday (row 6) is reached, end this column and start next
        if (dayOfWeek === 6) {
          columns.push(currentColumn);
          currentColumn = new Array(7).fill(null);
        }
      });

      // If last column has any days, push it
      if (currentColumn.some((c) => c !== null)) {
        columns.push(currentColumn);
      }

      blocks.push({
        ...monthObj,
        columns
      });
    });

    return blocks;
  }, [calendarData]);

  const formatMinutes = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="activity-calendar-card glass-panel">
      {/* ── Header & KPI Statistics Bar ───────────────────────────────── */}
      <div className="activity-header">
        <div className="activity-title-group">
          <div className="activity-icon-badge">
            <Flame className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="activity-title">Live Activity & Work History</h3>
            <p className="activity-subtitle">
              Interactive 365-day contribution calendar powered by your actual logged tasks
            </p>
          </div>
        </div>

        <button
          onClick={fetchCalendar}
          className="btn btn-secondary btn-sm activity-refresh-btn"
          title="Refresh activity data"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {error && (
        <div className="error-alert my-3">
          <AlertCircle className="w-4 h-4 mr-1 inline" />
          {error}
        </div>
      )}

      {/* ── Key Metrics Cards ────────────────────────────────────────── */}
      {calendarData && (
        <div className="activity-stats-row">
          <div className="activity-stat-card">
            <div className="stat-icon-wrapper stat-streak">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Current Streak</span>
              <span className="stat-value text-orange-400">
                {calendarData.currentStreak} {calendarData.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          <div className="activity-stat-card">
            <div className="stat-icon-wrapper stat-longest">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Longest Streak</span>
              <span className="stat-value text-amber-400">
                {calendarData.longestStreak} {calendarData.longestStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>

          <div className="activity-stat-card">
            <div className="stat-icon-wrapper stat-active">
              <Calendar className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Active Days</span>
              <span className="stat-value text-emerald-400">
                {calendarData.totalActiveDays} <span className="stat-unit">/ 365</span>
              </span>
            </div>
          </div>

          <div className="activity-stat-card">
            <div className="stat-icon-wrapper stat-time">
              <Clock className="w-4 h-4 text-teal-400" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Work Logged</span>
              <span className="stat-value text-teal-400">
                {formatMinutes(calendarData.totalWorkMinutes)}
              </span>
            </div>
          </div>

          <div className="activity-stat-card">
            <div className="stat-icon-wrapper stat-completed">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="stat-content">
              <span className="stat-label">Tasks Completed</span>
              <span className="stat-value text-cyan-400">
                {calendarData.totalTasksCompleted}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── LeetCode Matrix Heatmap View ─────────────────────────────── */}
      <div className="activity-heatmap-container">
        {loading && !calendarData ? (
          <div className="activity-loading-skeleton">
            <div className="spinner" />
            <p>Loading activity contribution calendar...</p>
          </div>
        ) : (
          <div className="activity-grid-scroll">
            <div className="activity-grid-wrapper">
              {/* Weekday Row Labels (Mon, Wed, Fri subtly indicated) */}
              <div className="activity-weekdays-column">
                <span className="weekday-label"></span>
                <span className="weekday-label">Mon</span>
                <span className="weekday-label"></span>
                <span className="weekday-label">Wed</span>
                <span className="weekday-label"></span>
                <span className="weekday-label">Fri</span>
                <span className="weekday-label"></span>
              </div>

              {/* Month Blocks Container */}
              <div className="activity-months-group">
                {monthBlocks.map((month) => (
                  <div key={month.key} className="activity-month-block">
                    {/* Columns of 7 square cells */}
                    <div className="activity-month-columns">
                      {month.columns.map((col, colIdx) => (
                        <div key={colIdx} className="activity-column">
                          {col.map((dayItem, rowIdx) => {
                            if (!dayItem) {
                              return <div key={rowIdx} className="activity-cell activity-cell--empty" />;
                            }
                            const isSelected = selectedDay?.date === dayItem.date;
                            return (
                              <button
                                key={dayItem.date}
                                type="button"
                                className={`activity-cell activity-level-${dayItem.level} ${isSelected ? 'activity-cell--selected' : ''}`}
                                onMouseEnter={() => setHoveredDay(dayItem)}
                                onMouseLeave={() => setHoveredDay(null)}
                                onClick={() => setSelectedDay(dayItem)}
                                aria-label={`${dayItem.date}: ${dayItem.count} tasks, ${dayItem.workMinutes} minutes`}
                              />
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Month Label below or above the columns */}
                    <span className="activity-month-label">{month.monthName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Hover Tooltip (Desktop) ─────────────────────────────────── */}
        {hoveredDay && (
          <div className="activity-hover-preview">
            <div className="preview-header">
              <span className="preview-date">{formatDateLabel(hoveredDay.date)}</span>
              <span className="preview-badge">Level {hoveredDay.level}</span>
            </div>
            <div className="preview-stats">
              {hoveredDay.count > 0 ? (
                <>
                  <span className="preview-count font-semibold">
                    {hoveredDay.count} {hoveredDay.count === 1 ? 'task completed' : 'tasks completed'}
                  </span>
                  <span className="preview-divider">•</span>
                  <span className="preview-duration">{formatMinutes(hoveredDay.workMinutes)} active work</span>
                </>
              ) : (
                <span className="preview-empty">No activity logged on this day</span>
              )}
            </div>
            {hoveredDay.tasks && hoveredDay.tasks.length > 0 && (
              <div className="preview-tasks-list">
                {hoveredDay.tasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="preview-task-item">
                    <span className="preview-cat-dot" style={{ backgroundColor: t.categoryColor || '#22C55E' }} />
                    <span className="preview-task-title">{t.title}</span>
                    <span className="preview-task-time">{formatMinutes(t.durationMinutes)}</span>
                  </div>
                ))}
                {hoveredDay.tasks.length > 3 && (
                  <span className="preview-more-tasks">+{hoveredDay.tasks.length - 3} more tasks</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Footer Legend ───────────────────────────────────────────── */}
        <div className="activity-footer">
          <div className="activity-legend">
            <span className="legend-label">Less</span>
            <div className="legend-swatch activity-level-0" title="0 work" />
            <div className="legend-swatch activity-level-1" title="1 - 30 minutes" />
            <div className="legend-swatch activity-level-2" title="31 - 90 minutes" />
            <div className="legend-swatch activity-level-3" title="91 - 180 minutes" />
            <div className="legend-swatch activity-level-4" title="180+ minutes" />
            <span className="legend-label">More</span>
          </div>

          <span className="activity-hint">
            Click any cell to view tasks or jump to day planner
          </span>
        </div>
      </div>

      {/* ── Selected Day Detailed Drawer / Inspection Card ───────────── */}
      {selectedDay && (
        <div className="activity-selected-card">
          <div className="selected-card-header">
            <div>
              <h4 className="selected-card-title">{formatDateLabel(selectedDay.date)}</h4>
              <p className="selected-card-subtitle">
                {selectedDay.count > 0
                  ? `${selectedDay.count} tasks completed (${formatMinutes(selectedDay.workMinutes)} total work)`
                  : 'No tasks completed on this date.'}
              </p>
            </div>
            {onSelectDate && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onSelectDate(selectedDay.date)}
              >
                <span>Open in 24h Visualizer</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </div>

          {selectedDay.tasks && selectedDay.tasks.length > 0 && (
            <div className="selected-tasks-grid">
              {selectedDay.tasks.map((task) => (
                <div key={task.id} className="selected-task-row">
                  <div className="selected-task-cat-strip" style={{ backgroundColor: task.categoryColor || '#22C55E' }} />
                  <div className="selected-task-info">
                    <span className="selected-task-name">{task.title}</span>
                    <span className="selected-task-cat-name">{task.categoryName}</span>
                  </div>
                  <span className="selected-task-dur">{formatMinutes(task.durationMinutes)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivityCalendar;
