import React, { useState, useEffect, useMemo } from 'react';

/**
 * Helper to convert polar coordinates to Cartesian (SVG space)
 */
function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Creates an SVG path for an annular sector (donut wedge)
 */
function describeDonutArc(x, y, innerRadius, outerRadius, startAngle, endAngle) {
  // Ensure angle difference is within (0, 360)
  let diff = endAngle - startAngle;
  if (diff >= 360) diff = 359.999;
  if (diff <= 0) return '';

  const end = startAngle + diff;
  const startOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, end);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, end);

  const largeArcFlag = diff > 180 ? '1' : '0';

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 0, startInner.x, startInner.y,
    'Z'
  ].join(' ');
}

function formatMinutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function Clock24({ tasks = [], selectedDate, onEditTask, timezone = 'UTC' }) {
  const [hoveredTask, setHoveredTask] = useState(null);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState(0);

  // Update live red hand every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const timeString = now.toLocaleTimeString('en-GB', {
          timeZone: timezone,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const [h, m, s] = timeString.split(':').map(Number);
        setCurrentTimeMinutes(h * 60 + m + (s || 0) / 60);
      } catch (e) {
        setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const size = 340;
  const center = size / 2;
  const outerR = 140;
  const innerR = 85;
  const tickR = 152;

  // Process task arcs for the selected date
  const taskArcs = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const targetDateObj = new Date(selectedDate + 'T00:00:00Z');
    const dayStartSec = targetDateObj.getTime() / 1000;
    const dayEndSec = dayStartSec + 86400;

    return tasks.map(task => {
      const taskStartSec = new Date(task.startDateTime).getTime() / 1000;
      const taskEndSec = new Date(task.endDateTime).getTime() / 1000;

      // Clamp to selected day
      const effectiveStartSec = Math.max(dayStartSec, taskStartSec);
      const effectiveEndSec = Math.min(dayEndSec, taskEndSec);

      if (effectiveEndSec <= effectiveStartSec) return null;

      // Calculate minutes within 0..1440
      const startMin = (effectiveStartSec - dayStartSec) / 60;
      const endMin = (effectiveEndSec - dayStartSec) / 60;

      const startAngle = (startMin / 1440) * 360;
      const endAngle = (endMin / 1440) * 360;

      return {
        ...task,
        startMin,
        endMin,
        startAngle,
        endAngle,
        isMidnightClamped: taskStartSec < dayStartSec || taskEndSec > dayEndSec,
        path: describeDonutArc(center, center, innerR, outerR, startAngle, endAngle)
      };
    }).filter(Boolean);
  }, [tasks, selectedDate, center, innerR, outerR]);

  // Generate 24 hour ticks
  const hourTicks = useMemo(() => {
    const ticks = [];
    for (let h = 0; h < 24; h++) {
      const angle = (h / 24) * 360;
      const isMajor = h % 6 === 0;
      const isSemiMajor = h % 3 === 0;
      const pInner = polarToCartesian(center, center, isMajor ? 142 : isSemiMajor ? 145 : 148, angle);
      const pOuter = polarToCartesian(center, center, tickR, angle);
      const pLabel = polarToCartesian(center, center, 164, angle);

      ticks.push({
        hour: h,
        angle,
        isMajor,
        isSemiMajor,
        pInner,
        pOuter,
        pLabel,
        label: isMajor || isSemiMajor ? `${String(h).padStart(2, '0')}:00` : `${h}`
      });
    }
    return ticks;
  }, [center, tickR]);

  // Current time angle
  const currentTimeAngle = (currentTimeMinutes / 1440) * 360;
  const handOuter = polarToCartesian(center, center, outerR + 10, currentTimeAngle);
  const handInner = polarToCartesian(center, center, innerR - 8, currentTimeAngle);

  // Check if selectedDate is today
  const isToday = new Date().toISOString().split('T')[0] === selectedDate;

  return (
    <div className="clock24-container glass-panel">
      <div className="clock24-header">
        <h3 className="clock24-title">
          <span className="clock24-title-icon">⏱️</span>
          24-Hour Visual Dial
        </h3>
        <span className="clock24-sub">Full day continuous timeline</span>
      </div>

      <div className="clock24-svg-wrapper">
        <svg
          viewBox="0 0 340 340"
          className="clock24-svg"
        >
          <defs>
            {/* Ambient Background Gradient for Day / Night */}
            <radialGradient id="clockBgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#0F172A" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#0B0F17" stopOpacity="1" />
            </radialGradient>

            {/* Glowing filter for active hover */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Red pointer glow */}
            <filter id="redGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Clock Face Background */}
          <circle
            cx={center}
            cy={center}
            r={outerR}
            fill="url(#clockBgGrad)"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
          />

          {/* Empty Track for 24h Donut */}
          <path
            d={describeDonutArc(center, center, innerR, outerR, 0, 360)}
            fill="rgba(255, 255, 255, 0.02)"
            stroke="rgba(255, 255, 255, 0.04)"
            strokeWidth="1"
          />

          {/* 4 Quadrant Divider Lines (00:00, 06:00, 12:00, 18:00) */}
          <line x1={center} y1={center - outerR} x2={center} y2={center - innerR} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
          <line x1={center + innerR} y1={center} x2={center + outerR} y2={center} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
          <line x1={center} y1={center + innerR} x2={center} y2={center + outerR} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
          <line x1={center - outerR} y1={center} x2={center - innerR} y2={center} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />

          {/* Color-Coded Task Donut Arcs */}
          {taskArcs.map(arc => {
            const isHovered = hoveredTask?.id === arc.id;
            const color = arc.category?.color || '#3B82F6';

            return (
              <g key={arc.id} className="clock24-task-group">
                <path
                  d={arc.path}
                  fill={color}
                  fillOpacity={isHovered ? 0.95 : 0.75}
                  stroke={isHovered ? '#FFFFFF' : 'rgba(0,0,0,0.3)'}
                  strokeWidth={isHovered ? 2 : 1}
                  filter={isHovered ? 'url(#glow)' : undefined}
                  style={{
                    cursor: 'pointer',
                    transition: 'fill-opacity 0.2s, stroke 0.2s, transform 0.2s',
                    transformOrigin: `${center}px ${center}px`,
                    transform: isHovered ? 'scale(1.02)' : 'none'
                  }}
                  onMouseEnter={() => setHoveredTask(arc)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => onEditTask && onEditTask(arc)}
                />
              </g>
            );
          })}

          {/* Hour Ticks & Labels */}
          {hourTicks.map(t => (
            <g key={t.hour} className="clock-tick-group">
              <line
                x1={t.pInner.x}
                y1={t.pInner.y}
                x2={t.pOuter.x}
                y2={t.pOuter.y}
                stroke={t.isMajor ? '#94A3B8' : t.isSemiMajor ? 'rgba(148, 163, 184, 0.6)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={t.isMajor ? 2 : t.isSemiMajor ? 1.5 : 1}
              />
              {(t.isMajor || t.isSemiMajor) && (
                <text
                  x={t.pLabel.x}
                  y={t.pLabel.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={t.isMajor ? '8.5' : '7'}
                  fontWeight={t.isMajor ? '700' : '600'}
                  fill={t.isMajor ? '#F8FAFC' : '#94A3B8'}
                  className="clock24-hour-label"
                >
                  {t.label}
                </text>
              )}
            </g>
          ))}

          {/* Real-Time Glowing Red Hand (when looking at Today) */}
          {isToday && (
            <g className="clock24-current-hand" filter="url(#redGlow)">
              <line
                x1={handInner.x}
                y1={handInner.y}
                x2={handOuter.x}
                y2={handOuter.y}
                stroke="#F43F5E"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle
                cx={handOuter.x}
                cy={handOuter.y}
                r="4.5"
                fill="#F43F5E"
                stroke="#FFF"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Center Hub - Inner Information Circle */}
          <circle
            cx={center}
            cy={center}
            r={innerR - 6}
            fill="#0F172A"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />
        </svg>

        {/* Center Overlay Information */}
        <div className="clock24-center-content">
          {hoveredTask ? (
            <div className="clock24-hover-card" onClick={() => onEditTask && onEditTask(hoveredTask)}>
              <span
                className="clock24-hover-cat-badge"
                style={{ backgroundColor: hoveredTask.category?.color || '#3B82F6' }}
              >
                {hoveredTask.category?.name}
              </span>
              <p className="clock24-hover-title">{hoveredTask.title}</p>
              <p className="clock24-hover-time">
                {formatMinutesToTime(Math.round(hoveredTask.startMin))} – {formatMinutesToTime(Math.round(hoveredTask.endMin))}
              </p>
              <span className="clock24-hover-hint">Click to edit</span>
            </div>
          ) : (
            <div className="clock24-default-center">
              <span className="clock24-center-badge">24H DIAL</span>
              <span className="clock24-live-time">
                {formatMinutesToTime(Math.round(currentTimeMinutes))}
              </span>
              <span className="clock24-center-count">
                {tasks.length} task{tasks.length !== 1 ? 's' : ''} planned
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clock Legend / Cardinal Labels */}
      <div className="clock24-cardinals">
        <span className="cardinal-item"><span className="cardinal-icon">🌙</span> 00:00 Night</span>
        <span className="cardinal-item"><span className="cardinal-icon">🌅</span> 06:00 Morning</span>
        <span className="cardinal-item"><span className="cardinal-icon">☀️</span> 12:00 Afternoon</span>
        <span className="cardinal-item"><span className="cardinal-icon">🌇</span> 18:00 Evening</span>
      </div>
    </div>
  );
}
