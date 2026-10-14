import React, { useState, useEffect, useCallback, useMemo } from 'react';
import analyticsService from '../services/analyticsService';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieIcon,
  Grid
} from 'lucide-react';

function fmtMinutes(mins) {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return dateStr;
}

export default function ProductivityAnalytics({ timezone = 'UTC' }) {
  // Preset options: '7d', '14d', '30d', 'custom'
  const [preset, setPreset] = useState('7d');
  
  const defaultDates = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [trendView, setTrendView] = useState('daily'); // 'daily' | 'weekly'
  const [heatmapView, setHeatmapView] = useState('interactive'); // 'interactive' | 'seaborn'
  const [hoveredCell, setHoveredCell] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyPreset = (p) => {
    setPreset(p);
    const end = new Date();
    const start = new Date();
    if (p === '7d') {
      start.setDate(end.getDate() - 6);
    } else if (p === '14d') {
      start.setDate(end.getDate() - 13);
    } else if (p === '30d') {
      start.setDate(end.getDate() - 29);
    }
    if (p !== 'custom') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getProductivityAnalytics(startDate, endDate, timezone);
      setData(res);
    } catch (err) {
      console.error('Failed to load productivity analytics:', err);
      setError(err.response?.data?.message || 'Could not connect to Python Analytics engine. Please ensure Python service is running.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, timezone]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const overview = data?.overview;
  const heatmap = data?.heatmap;
  const dailyTrends = data?.dailyTrends || [];
  const weeklyTrends = data?.weeklyTrends || [];
  const categories = data?.categoryAnalysis || [];
  const overrun = data?.overrunAnalysis;

  // Max minutes for trend scaling
  const maxTrendMins = useMemo(() => {
    const list = trendView === 'daily' ? dailyTrends : weeklyTrends;
    if (!list.length) return 60;
    const maxVal = Math.max(...list.map(t => Math.max(t.plannedMinutes, t.actualMinutes)));
    return Math.max(maxVal, 60);
  }, [trendView, dailyTrends, weeklyTrends]);

  return (
    <div className="analytics-dashboard-view">
      {/* ── Control Header ────────────────────────────────────────── */}
      <div className="glass-panel analytics-top-header">
        <div className="header-meta">
          <div className="header-icon-wrap">
            <Sparkles className="w-6 h-6 text-pink-400" />
          </div>
          <div>
            <h2 className="analytics-headline">Productivity Analytics & Time Intelligence</h2>
            <p className="analytics-subline">
              Vectorized statistical insights powered by Python, Pandas & Seaborn • Timezone: <span className="text-pink-300 font-semibold">{timezone}</span>
            </p>
          </div>
        </div>

        <div className="analytics-filter-controls">
          <div className="preset-toggle-group">
            <button
              className={`preset-btn ${preset === '7d' ? 'active' : ''}`}
              onClick={() => applyPreset('7d')}
            >
              7 Days
            </button>
            <button
              className={`preset-btn ${preset === '14d' ? 'active' : ''}`}
              onClick={() => applyPreset('14d')}
            >
              14 Days
            </button>
            <button
              className={`preset-btn ${preset === '30d' ? 'active' : ''}`}
              onClick={() => applyPreset('30d')}
            >
              30 Days
            </button>
            <button
              className={`preset-btn ${preset === 'custom' ? 'active' : ''}`}
              onClick={() => setPreset('custom')}
            >
              Custom
            </button>
          </div>

          {preset === 'custom' && (
            <div className="custom-date-inputs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="date-picker-input"
              />
              <span className="text-pink-300 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="date-picker-input"
              />
            </div>
          )}

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="btn btn-secondary btn-sm refresh-analytics-btn"
            title="Recalculate metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────── */}
      {error && (
        <div className="error-alert my-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchAnalytics} className="btn btn-sm btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* ── Loading Skeleton ─────────────────────────────────────── */}
      {loading && !data && (
        <div className="glass-panel analytics-loader-card">
          <div className="spinner" />
          <p className="mt-3 text-pink-200 font-medium">Computing Pandas & Seaborn metrics...</p>
        </div>
      )}

      {/* ── Analytics Content ────────────────────────────────────── */}
      {data && (
        <div className="analytics-sections-container">
          {/* ── SECTION 1: KPI Overview Cards ─────────────────────── */}
          <div className="kpi-cards-grid">
            {/* Completion Rate */}
            <div className="glass-panel kpi-card kpi-card--primary">
              <div className="kpi-card-header">
                <span className="kpi-title">Completion Rate</span>
                <CheckCircle2 className="w-5 h-5 text-pink-400" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-big-number text-gradient-pink">
                  {overview.completionRate}%
                </span>
              </div>
              <div className="kpi-subtext">
                {overview.completedTasks} of {overview.totalTasks - overview.cancelledTasks} tasks completed
              </div>
              <div className="kpi-progress-bar">
                <div
                  className="kpi-progress-fill"
                  style={{ width: `${Math.min(overview.completionRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Task Breakdown */}
            <div className="glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Task Distribution</span>
                <Layers className="w-5 h-5 text-pink-400" />
              </div>
              <div className="kpi-value-row">
                <span className="kpi-big-number">{overview.totalTasks}</span>
                <span className="kpi-unit">Total</span>
              </div>
              <div className="status-chips-summary">
                <span className="chip chip--completed">{overview.completedTasks} done</span>
                <span className="chip chip--inprogress">{overview.inProgressTasks} active</span>
                <span className="chip chip--pending">{overview.pendingTasks} planned</span>
                {overview.overdueTasks > 0 && (
                  <span className="chip chip--overdue">{overview.overdueTasks} overdue</span>
                )}
              </div>
            </div>

            {/* Time Investment: Planned vs Actual */}
            <div className="glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Time Investment</span>
                <Clock className="w-5 h-5 text-pink-400" />
              </div>
              <div className="dual-metric-row">
                <div>
                  <div className="metric-label">Planned</div>
                  <div className="metric-value text-pink-300">{fmtMinutes(overview.totalPlannedMinutes)}</div>
                </div>
                <div className="metric-divider" />
                <div>
                  <div className="metric-label">Actual Logged</div>
                  <div className="metric-value text-pink-400 font-bold">{fmtMinutes(overview.totalActualMinutes)}</div>
                </div>
              </div>
              <div className="kpi-subtext">
                Based on {overview.actualDurationAvailableTasks} tasks with recorded actual timestamps
              </div>
            </div>

            {/* Duration Accuracy */}
            <div className="glass-panel kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-title">Avg Task Duration</span>
                <TrendingUp className="w-5 h-5 text-pink-400" />
              </div>
              <div className="dual-metric-row">
                <div>
                  <div className="metric-label">Avg Planned</div>
                  <div className="metric-value">{Math.round(overview.averagePlannedDurationMinutes)}m</div>
                </div>
                <div className="metric-divider" />
                <div>
                  <div className="metric-label">Avg Actual</div>
                  <div className="metric-value font-bold text-pink-300">
                    {Math.round(overview.averageActualDurationMinutes)}m
                  </div>
                </div>
              </div>
              <div className="kpi-subtext">
                {overview.averageActualDurationMinutes > overview.averagePlannedDurationMinutes
                  ? `Overruns avg +${Math.round(overview.averageActualDurationMinutes - overview.averagePlannedDurationMinutes)}m per task`
                  : 'Tasks completing within planned windows'}
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Daily & Weekly Trend Charts ────────────── */}
          <div className="glass-panel chart-section-card">
            <div className="chart-section-header">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-pink-400" />
                <h3 className="section-heading">Productivity & Time Trends</h3>
              </div>
              <div className="chart-view-toggle">
                <button
                  className={`toggle-pill ${trendView === 'daily' ? 'active' : ''}`}
                  onClick={() => setTrendView('daily')}
                >
                  Daily View
                </button>
                <button
                  className={`toggle-pill ${trendView === 'weekly' ? 'active' : ''}`}
                  onClick={() => setTrendView('weekly')}
                >
                  Weekly Rollup
                </button>
              </div>
            </div>

            <div className="trend-chart-container">
              {dailyTrends.length === 0 ? (
                <div className="chart-empty-state">No trend records found for this period.</div>
              ) : (
                <div className="bars-chart-wrapper">
                  <div className="chart-legend">
                    <span className="legend-item"><span className="legend-color legend--plan" /> Planned Time</span>
                    <span className="legend-item"><span className="legend-color legend--act" /> Actual Time</span>
                    <span className="legend-item"><span className="legend-color legend--rate" /> Completion Rate</span>
                  </div>

                  <div className="bars-scrollable-area">
                    {(trendView === 'daily' ? dailyTrends : weeklyTrends).map((item, idx) => {
                      const planHeight = maxTrendMins > 0 ? (item.plannedMinutes / maxTrendMins) * 100 : 0;
                      const actHeight = maxTrendMins > 0 ? (item.actualMinutes / maxTrendMins) * 100 : 0;
                      const label = trendView === 'daily' ? `${item.dayOfWeek} ${formatDate(item.date)}` : item.weekLabel;

                      return (
                        <div key={idx} className="chart-column-group" title={`${label}\nPlanned: ${fmtMinutes(item.plannedMinutes)}\nActual: ${fmtMinutes(item.actualMinutes)}\nCompletion: ${item.completionRate}%`}>
                          <div className="column-bars-slot">
                            {/* Completion badge */}
                            <span className="column-rate-badge">{Math.round(item.completionRate)}%</span>

                            <div className="dual-bars-flex">
                              {/* Planned bar */}
                              <div
                                className="trend-bar trend-bar--plan"
                                style={{ height: `${Math.max(planHeight, 4)}%` }}
                              />
                              {/* Actual bar */}
                              <div
                                className="trend-bar trend-bar--act"
                                style={{ height: `${Math.max(actHeight, item.actualMinutes > 0 ? 4 : 0)}%` }}
                              />
                            </div>
                          </div>
                          <span className="column-date-label">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION 3: Category Allocation & Overruns ─────────── */}
          <div className="glass-panel chart-section-card">
            <div className="chart-section-header">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-pink-400" />
                <h3 className="section-heading">Category Time Allocation & Accuracy</h3>
              </div>
              <span className="text-xs text-pink-300">
                {categories.length} {categories.length === 1 ? 'category' : 'categories'} active
              </span>
            </div>

            {categories.length === 0 ? (
              <div className="chart-empty-state">No category activity recorded.</div>
            ) : (
              <div className="categories-analytics-grid">
                {categories.map((cat, idx) => {
                  const maxMins = Math.max(...categories.map(c => Math.max(c.plannedMinutes, c.actualMinutes)), 1);
                  const planWidth = (cat.plannedMinutes / maxMins) * 100;
                  const actWidth = (cat.actualMinutes / maxMins) * 100;
                  const hasOverrun = cat.averageOverrunMinutes > 0;

                  return (
                    <div key={idx} className="category-analytic-card">
                      <div className="cat-card-header">
                        <div className="flex items-center gap-2">
                          <span className="cat-swatch" style={{ backgroundColor: cat.categoryColor }} />
                          <span className="cat-title-text">{cat.categoryName}</span>
                        </div>
                        <span className="cat-task-count-pill">{cat.completedTasks}/{cat.totalTasks} tasks</span>
                      </div>

                      <div className="cat-card-metrics-row">
                        <div>
                          <span className="text-xs text-pink-300">Plan: </span>
                          <span className="font-semibold text-white">{fmtMinutes(cat.plannedMinutes)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-pink-300">Actual: </span>
                          <span className="font-semibold text-pink-400">{fmtMinutes(cat.actualMinutes)}</span>
                        </div>
                        {cat.actualMinutes > 0 && (
                          <div className={`overrun-pill ${hasOverrun ? 'overrun-pill--pos' : 'overrun-pill--neg'}`}>
                            {hasOverrun ? `+${Math.round(cat.averageOverrunMinutes)}m avg overrun` : `${Math.round(cat.averageOverrunMinutes)}m under`}
                          </div>
                        )}
                      </div>

                      {/* Visual comparative bars */}
                      <div className="cat-tracks-dual">
                        <div className="cat-track-line">
                          <span className="track-marker">P</span>
                          <div className="track-rail">
                            <div
                              className="track-fill-bar"
                              style={{ width: `${planWidth}%`, backgroundColor: `${cat.categoryColor}88` }}
                            />
                          </div>
                        </div>
                        <div className="cat-track-line">
                          <span className="track-marker">A</span>
                          <div className="track-rail">
                            <div
                              className="track-fill-bar"
                              style={{
                                width: `${actWidth}%`,
                                backgroundColor: cat.actualMinutes > cat.plannedMinutes ? '#f43f5e' : cat.categoryColor
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── SECTION 4: Task Overrun Intelligence ─────────────── */}
          {overrun && (
            <div className="glass-panel chart-section-card">
              <div className="chart-section-header">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-pink-400" />
                  <h3 className="section-heading">Task Overrun Intelligence</h3>
                </div>
                <div className="overrun-stat-tags">
                  <span className="tag-stat tag-stat--over">
                    <ArrowUpRight className="w-3.5 h-3.5 inline mr-1" />
                    {overrun.totalOverrunningTasks} Overruns
                  </span>
                  <span className="tag-stat tag-stat--under">
                    <ArrowDownRight className="w-3.5 h-3.5 inline mr-1" />
                    {overrun.totalUnderrunningTasks} Early Finishes
                  </span>
                  <span className="tag-stat tag-stat--ontime">
                    {overrun.totalOnTimeTasks} On Time
                  </span>
                </div>
              </div>

              <div className="overrun-dual-lists">
                {/* Top Overrunning Tasks */}
                <div className="overrun-subcolumn">
                  <h4 className="subcolumn-title text-pink-400">
                    <ArrowUpRight className="w-4 h-4 inline mr-1" />
                    Tasks Taking Longer Than Planned
                  </h4>
                  {overrun.topOverrunningTasks.length === 0 ? (
                    <div className="overrun-empty">No task overruns detected. Great scheduling precision!</div>
                  ) : (
                    <div className="overrun-task-list">
                      {overrun.topOverrunningTasks.map((t, idx) => (
                        <div key={idx} className="overrun-item-row">
                          <div className="overrun-item-info">
                            <span className="overrun-item-title">{t.title}</span>
                            <span className="overrun-item-sub">
                              {t.categoryName} • Plan: {t.plannedMinutes}m | Act: {t.actualMinutes}m
                            </span>
                          </div>
                          <div className="overrun-badge-tag text-rose-300">
                            +{t.differenceMinutes}m {t.overrunPercentage != null ? `(+${t.overrunPercentage}%)` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Underrunning Tasks */}
                <div className="overrun-subcolumn">
                  <h4 className="subcolumn-title text-emerald-300">
                    <ArrowDownRight className="w-4 h-4 inline mr-1" />
                    Tasks Finished Ahead of Schedule
                  </h4>
                  {overrun.topUnderrunningTasks.length === 0 ? (
                    <div className="overrun-empty">No early completion records in this period.</div>
                  ) : (
                    <div className="overrun-task-list">
                      {overrun.topUnderrunningTasks.map((t, idx) => (
                        <div key={idx} className="overrun-item-row">
                          <div className="overrun-item-info">
                            <span className="overrun-item-title">{t.title}</span>
                            <span className="overrun-item-sub">
                              {t.categoryName} • Plan: {t.plannedMinutes}m | Act: {t.actualMinutes}m
                            </span>
                          </div>
                          <div className="overrun-badge-tag text-emerald-300">
                            {t.differenceMinutes}m {t.overrunPercentage != null ? `(${t.overrunPercentage}%)` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 5: 24×7 Productivity Heatmap ─────────────── */}
          {heatmap && (
            <div className="glass-panel chart-section-card">
              <div className="chart-section-header">
                <div className="flex items-center gap-2">
                  <Grid className="w-5 h-5 text-pink-400" />
                  <div>
                    <h3 className="section-heading">24-Hour Productivity Heatmap (Day × Hour)</h3>
                    <p className="text-xs text-pink-300">
                      {heatmap.totalActivityPoints} task activities mapped across local hours 00:00 - 23:00
                    </p>
                  </div>
                </div>

                <div className="chart-view-toggle">
                  <button
                    className={`toggle-pill ${heatmapView === 'interactive' ? 'active' : ''}`}
                    onClick={() => setHeatmapView('interactive')}
                  >
                    Interactive Grid
                  </button>
                  <button
                    className={`toggle-pill ${heatmapView === 'seaborn' ? 'active' : ''}`}
                    onClick={() => setHeatmapView('seaborn')}
                  >
                    Seaborn Heatmap Plot
                  </button>
                </div>
              </div>

              {heatmapView === 'interactive' ? (
                <div className="heatmap-interactive-container">
                  {/* Hours Header (00 to 23) */}
                  <div className="heatmap-grid-scroll">
                    <div className="heatmap-hours-header">
                      <div className="day-label-placeholder" />
                      {heatmap.hours.map((h) => (
                        <div key={h} className="hour-col-label">
                          {h.toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>

                    {/* Heatmap Rows (Mon - Sun) */}
                    {heatmap.days.map((dayName, dayIdx) => (
                      <div key={dayName} className="heatmap-row">
                        <span className="heatmap-day-label">{dayName}</span>
                        <div className="heatmap-cells-strip">
                          {heatmap.matrix[dayIdx].map((val, hourIdx) => {
                            // Compute intensity 0..4
                            const intensity = heatmap.maxActivity > 0 ? (val / heatmap.maxActivity) : 0;
                            let cellBg = 'rgba(255, 255, 255, 0.04)';
                            if (val > 0) {
                              if (intensity < 0.25) cellBg = '#831843';
                              else if (intensity < 0.5) cellBg = '#be185d';
                              else if (intensity < 0.75) cellBg = '#ec4899';
                              else cellBg = '#f472b6';
                            }

                            return (
                              <div
                                key={hourIdx}
                                className={`heatmap-cell ${val > 0 ? 'has-activity' : ''}`}
                                style={{ backgroundColor: cellBg }}
                                onMouseEnter={() => setHoveredCell({ day: dayName, hour: hourIdx, count: val })}
                                onMouseLeave={() => setHoveredCell(null)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Heatmap Tooltip & Legend */}
                  <div className="heatmap-footer">
                    <div className="heatmap-tooltip-display">
                      {hoveredCell ? (
                        <span className="text-pink-300 font-medium">
                          {hoveredCell.day} at {hoveredCell.hour.toString().padStart(2, '0')}:00 →{' '}
                          <strong className="text-white">{hoveredCell.count} task{hoveredCell.count !== 1 ? 's' : ''}</strong>
                        </span>
                      ) : (
                        <span className="text-pink-400/60 text-xs">Hover over any cell to inspect activity</span>
                      )}
                    </div>

                    <div className="heatmap-legend">
                      <span className="text-xs text-pink-300">Less</span>
                      <span className="legend-cell" style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }} />
                      <span className="legend-cell" style={{ backgroundColor: '#831843' }} />
                      <span className="legend-cell" style={{ backgroundColor: '#be185d' }} />
                      <span className="legend-cell" style={{ backgroundColor: '#ec4899' }} />
                      <span className="legend-cell" style={{ backgroundColor: '#f472b6' }} />
                      <span className="text-xs text-pink-300">More</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Seaborn Matplotlib Render */
                <div className="seaborn-heatmap-render-wrap">
                  {data.heatmapImageBase64 ? (
                    <div className="seaborn-image-box">
                      <img
                        src={data.heatmapImageBase64}
                        alt="Productivity Heatmap rendered via Seaborn"
                        className="seaborn-image-element"
                      />
                      <div className="seaborn-caption">
                        Rendered with Python 3, Seaborn (v0.13.2) & Matplotlib
                      </div>
                    </div>
                  ) : (
                    <div className="chart-empty-state">No Seaborn visual available for this selection.</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
