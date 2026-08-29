import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Globe, Clock, AlignVerticalSpaceAround, LayoutDashboard } from 'lucide-react';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Kolkata', label: 'IST (Asia/Kolkata)' },
  { value: 'America/New_York', label: 'EST/EDT (America/New_York)' },
  { value: 'Europe/London', label: 'GMT/BST (Europe/London)' },
  { value: 'Asia/Tokyo', label: 'JST (Asia/Tokyo)' }
];

const DateHeader = ({
  selectedDate,
  onDateChange,
  timezone,
  onTimezoneChange,
  onAddNewTask,
  viewMode = 'split',
  onViewModeChange
}) => {

  const formatDateString = (dStr) => {
    const [year, month, day] = dStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d - 1);
    const newStr = dateObj.toISOString().split('T')[0];
    onDateChange(newStr);
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + 1);
    const newStr = dateObj.toISOString().split('T')[0];
    onDateChange(newStr);
  };

  const handleToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    onDateChange(todayStr);
  };

  return (
    <div className="glass-panel date-header-bar">
      <div className="date-controls">
        <div className="btn-group">
          <button onClick={handlePrevDay} className="btn btn-secondary btn-icon" title="Previous Day">
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button onClick={handleToday} className="btn btn-secondary btn-sm" title="Jump to Today">
            Today
          </button>

          <button onClick={handleNextDay} className="btn btn-secondary btn-icon" title="Next Day">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="date-picker-wrapper">
          <Calendar className="w-5 h-5 text-accent" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="date-input"
          />
          <span className="date-display-label">{formatDateString(selectedDate)}</span>
        </div>
      </div>

      <div className="header-right-actions">
        {/* View Mode Toggle */}
        <div className="view-mode-toggle btn-group">
          <button
            onClick={() => onViewModeChange && onViewModeChange('split')}
            className={`btn btn-sm ${viewMode === 'split' ? 'btn-primary' : 'btn-secondary'}`}
            title="Split: Timeline + 24H Clock"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="view-mode-text">Split</span>
          </button>
          <button
            onClick={() => onViewModeChange && onViewModeChange('clock')}
            className={`btn btn-sm ${viewMode === 'clock' ? 'btn-primary' : 'btn-secondary'}`}
            title="24-Hour Circular Clock Dial"
          >
            <Clock className="w-4 h-4" />
            <span className="view-mode-text">Clock Dial</span>
          </button>
          <button
            onClick={() => onViewModeChange && onViewModeChange('timeline')}
            className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            title="24-Hour Linear Timeline"
          >
            <AlignVerticalSpaceAround className="w-4 h-4" />
            <span className="view-mode-text">Timeline</span>
          </button>
        </div>

        <div className="timezone-select-wrapper">
          <Globe className="w-4 h-4 text-muted" />
          <select
            value={timezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            className="select-input"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <button onClick={onAddNewTask} className="btn btn-primary btn-md">
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>
    </div>
  );
};

export default DateHeader;
