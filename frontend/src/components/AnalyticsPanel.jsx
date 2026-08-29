import { useEffect, useState, useCallback } from 'react';
import analyticsService from '../services/analyticsService';

/* ──────────────────────────────────────────────
   Small helpers
────────────────────────────────────────────── */
function fmt(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function ScoreRing({ score }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  const color =
    score >= 75 ? '#22c55e' :
    score >= 40 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="score-ring-wrapper">
      <svg width="130" height="130" className="score-ring-svg">
        {/* Track */}
        <circle
          cx="65" cy="65" r={r}
          fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        {/* Progress arc */}
        <circle
          cx="65" cy="65" r={r}
          fill="none" stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="score-ring-label">
        <span className="score-value" style={{ color }}>{Math.round(score)}</span>
        <span className="score-unit">/ 100</span>
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div className="stat-badge" style={{ borderLeft: `3px solid ${color}` }}>
      <span className="stat-badge-value">{value}</span>
      <span className="stat-badge-label">{label}</span>
    </div>
  );
}

function CategoryBar({ cat, maxMinutes }) {
  const pct = maxMinutes > 0 ? (cat.plannedMinutes / maxMinutes) * 100 : 0;
  const completedPct = cat.plannedMinutes > 0
    ? (cat.completedMinutes / cat.plannedMinutes) * 100
    : 0;

  return (
    <div className="cat-bar-row">
      <div className="cat-bar-meta">
        <span className="cat-dot" style={{ background: cat.color }} />
        <span className="cat-name">{cat.categoryName}</span>
        <span className="cat-time">{fmt(cat.plannedMinutes)}</span>
      </div>
      <div className="cat-bar-track">
        {/* Full planned width container */}
        <div
          className="cat-bar-planned"
          style={{ width: `${pct}%`, background: `${cat.color}33` }}
        >
          {/* Completed fill */}
          <div
            className="cat-bar-completed"
            style={{ width: `${completedPct}%`, background: cat.color }}
          />
        </div>
      </div>
      <span className="cat-task-count">{cat.taskCount} task{cat.taskCount !== 1 ? 's' : ''}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main AnalyticsPanel component
────────────────────────────────────────────── */
export default function AnalyticsPanel({ date, timezone, refreshSignal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getDayAnalytics(date, timezone);
      setData(result);
    } catch (e) {
      setError('Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, [date, timezone]);

  useEffect(() => { load(); }, [load, refreshSignal]);

  return (
    <div className={`analytics-panel ${collapsed ? 'analytics-panel--collapsed' : ''}`}>
      {/* Header */}
      <div className="analytics-header" onClick={() => setCollapsed(c => !c)}>
        <h3 className="analytics-title">
          <span className="analytics-title-icon">📊</span>
          Day Analytics
        </h3>
        <button className="analytics-collapse-btn" aria-label={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className="analytics-body">
          {loading && <div className="analytics-loading"><div className="spinner" /></div>}
          {error && <p className="analytics-error">{error}</p>}

          {data && !loading && (
            <>
              {/* Score + stats row */}
              <div className="analytics-top-row">
                <div className="analytics-score-section">
                  <ScoreRing score={data.productivityScore} />
                  <p className="analytics-score-caption">Productivity Score</p>
                </div>

                <div className="analytics-stats-grid">
                  <StatBadge label="Completed" value={data.completedTasks}  color="#22c55e" />
                  <StatBadge label="Missed"    value={data.missedTasks}     color="#ef4444" />
                  <StatBadge label="Planned"   value={data.plannedTasks}    color="#3b82f6" />
                  <StatBadge label="In Prog."  value={data.inProgressTasks} color="#f59e0b" />
                  <StatBadge label="Planned"   value={fmt(data.totalPlannedMinutes)}   color="#a855f7" />
                  <StatBadge label="Done"      value={fmt(data.totalCompletedMinutes)} color="#06b6d4" />
                </div>
              </div>

              {/* Category breakdown */}
              {data.categoryBreakdown?.length > 0 && (
                <div className="analytics-category-section">
                  <h4 className="analytics-section-title">By Category</h4>
                  {(() => {
                    const maxMin = Math.max(...data.categoryBreakdown.map(c => c.plannedMinutes), 1);
                    return data.categoryBreakdown.map(cat => (
                      <CategoryBar key={cat.categoryId} cat={cat} maxMinutes={maxMin} />
                    ));
                  })()}
                </div>
              )}

              {data.totalTasks === 0 && (
                <p className="analytics-empty">No tasks for this day yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
