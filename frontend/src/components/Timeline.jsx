import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertTriangle, XCircle, PlayCircle, Calendar } from 'lucide-react';

const STATUS_CONFIG = {
  PLANNED: { label: 'Planned', bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: '#3B82F6', icon: Calendar },
  IN_PROGRESS: { label: 'In Progress', bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: '#F59E0B', icon: PlayCircle },
  COMPLETED: { label: 'Completed', bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399', border: '#10B981', icon: CheckCircle },
  MISSED: { label: 'Missed', bg: 'rgba(239, 68, 68, 0.2)', text: '#F87171', border: '#EF4444', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelled', bg: 'rgba(107, 114, 128, 0.2)', text: '#9CA3AF', border: '#6B7280', icon: XCircle }
};

const Timeline = ({ selectedDate, tasks, onEditTask, onStatusChange }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time indicator every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Compute 24-hour day bounds in local time for selected date string
  const [y, m, d] = selectedDate.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 24, 0, 0, 0);

  // Is today currently selected?
  const todayStr = currentTime.toISOString().split('T')[0];
  const isTodaySelected = selectedDate === todayStr;

  // Calculate current time line offset (in px, total height = 1440px for 24 hours)
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
  const currentTimeTopPx = (currentMinutes / 1440) * 1440;

  const formatTime = (dateObj) => {
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="timeline-container glass-panel">
      <div className="timeline-wrapper">
        {/* Left Hours Axis */}
        <div className="timeline-hours-axis">
          {hours.map((hour) => (
            <div key={hour} className="hour-tick">
              <span className="hour-label">
                {String(hour).padStart(2, '0')}:00
              </span>
            </div>
          ))}
          <div className="hour-tick">
            <span className="hour-label">24:00</span>
          </div>
        </div>

        {/* Timeline Grid & Task Surface */}
        <div className="timeline-grid-surface">
          {/* Background Hour Grid Lines */}
          {hours.map((hour) => (
            <div key={hour} className="hour-line" />
          ))}

          {/* Glowing Red Current Time Line Indicator */}
          {isTodaySelected && (
            <div
              className="current-time-line"
              style={{ top: `${currentTimeTopPx}px` }}
            >
              <div className="current-time-dot" />
              <div className="current-time-badge">
                <Clock className="w-3.5 h-3.5 inline mr-1" />
                {formatTime(currentTime)}
              </div>
            </div>
          )}

          {/* Render Task Blocks */}
          {tasks.map((task) => {
            const taskStart = new Date(task.startDateTime);
            const taskEnd = new Date(task.endDateTime);

            const isStartBeforeDay = taskStart < dayStart;
            const isEndAfterDay = taskEnd > dayEnd;

            // Midnight clamping math
            const effectiveStart = new Date(Math.max(taskStart.getTime(), dayStart.getTime()));
            const effectiveEnd = new Date(Math.min(taskEnd.getTime(), dayEnd.getTime()));

            const startOffsetMinutes = (effectiveStart.getTime() - dayStart.getTime()) / 60000;
            const durationMinutes = (effectiveEnd.getTime() - effectiveStart.getTime()) / 60000;

            const topPx = (startOffsetMinutes / 1440) * 1440;
            const heightPx = Math.max((durationMinutes / 1440) * 1440, 28); // minimum 28px height

            const statusInfo = STATUS_CONFIG[task.status] || STATUS_CONFIG.PLANNED;
            const StatusIcon = statusInfo.icon;
            const categoryColor = task.category?.color || '#3B82F6';

            return (
              <div
                key={task.id}
                className={`task-block ${task.status.toLowerCase()}`}
                style={{
                  top: `${topPx}px`,
                  height: `${heightPx}px`,
                  borderLeftColor: categoryColor,
                  backgroundColor: statusInfo.bg
                }}
                onClick={() => onEditTask(task)}
              >
                <div className="task-block-header">
                  <div className="task-category-tag" style={{ backgroundColor: categoryColor }}>
                    {task.category?.name || 'General'}
                  </div>

                  {isStartBeforeDay && (
                    <span className="midnight-clamp-badge">cont. yesterday</span>
                  )}
                  {isEndAfterDay && (
                    <span className="midnight-clamp-badge">cont. tomorrow</span>
                  )}

                  <div className="task-status-pill" style={{ color: statusInfo.text, borderColor: statusInfo.border }}>
                    <StatusIcon className="w-3.5 h-3.5 mr-1" />
                    <span>{statusInfo.label}</span>
                  </div>
                </div>

                <div className="task-block-body">
                  <h4 className="task-title">{task.title}</h4>
                  {task.description && heightPx > 45 && (
                    <p className="task-description">{task.description}</p>
                  )}
                </div>

                <div className="task-block-footer">
                  <span className="task-time-range">
                    {formatTime(taskStart)} – {formatTime(taskEnd)} ({Math.round((taskEnd - taskStart) / 60000)}m)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
