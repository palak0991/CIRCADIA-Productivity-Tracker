import React, { useEffect, useState, useRef } from 'react';

const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [visible, setVisible] = useState(false);

  const dotRef = useRef(null);
  const ringRef = useRef(null);

  // Position tracking with physics / lerp
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const animFrameId = useRef(null);

  useEffect(() => {
    // Check if device supports fine mouse pointer
    const hasPointer = window.matchMedia('(pointer: fine)').matches;
    if (!hasPointer) {
      setEnabled(false);
      return;
    }
    setEnabled(true);

    const onMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!visible) setVisible(true);

      // Check if hovering over clickable elements
      const target = e.target;
      if (target) {
        const isClickable =
          target.closest('button, a, input, textarea, select, [role="button"]') ||
          target.classList.contains('activity-cell') ||
          target.classList.contains('timeline-task-bar') ||
          target.classList.contains('nlp-chip') ||
          target.classList.contains('preset-swatch') ||
          target.classList.contains('clickable');
        setHovered(!!isClickable);
      }
    };

    const onMouseDown = () => setClicked(true);
    const onMouseUp = () => setClicked(false);
    const onMouseLeave = () => setVisible(false);
    const onMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    // Smooth animation loop for trailing ring
    const render = () => {
      // Lerp ring position towards mouse position (smooth lag effect)
      const ease = 0.22;
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * ease;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * ease;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0) translate(-50%, -50%)`;
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [visible]);

  if (!enabled) return null;

  return (
    <div className={`custom-cursor-container ${visible ? 'cursor-visible' : 'cursor-hidden'}`}>
      {/* Precision Center Dot */}
      <div
        ref={dotRef}
        className={`custom-cursor-dot ${hovered ? 'dot-hovered' : ''} ${clicked ? 'dot-clicked' : ''}`}
      />
      {/* Smooth Trailing Glow Ring */}
      <div
        ref={ringRef}
        className={`custom-cursor-ring ${hovered ? 'ring-hovered' : ''} ${clicked ? 'ring-clicked' : ''}`}
      />
    </div>
  );
};

export default CustomCursor;
