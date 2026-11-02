import React, { useEffect, useRef } from 'react';

const BackgroundAura = () => {
  const mouseGlowRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (mouseGlowRef.current) {
        mouseGlowRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="background-aura-viewport" aria-hidden="true">
      {/* Subtle interactive mouse spotlight glow */}
      <div ref={mouseGlowRef} className="mouse-ambient-glow" />

      {/* Floating Animated Orbs */}
      <div className="aura-orb orb-primary" />
      <div className="aura-orb orb-secondary" />
      <div className="aura-orb orb-tertiary" />
      <div className="aura-orb orb-quaternary" />

      {/* Subtle Grid Matrix Texture */}
      <div className="ambient-grid-overlay" />

      {/* Floating Starlight Particles */}
      <div className="ambient-particles">
        <span className="particle particle-1" />
        <span className="particle particle-2" />
        <span className="particle particle-3" />
        <span className="particle particle-4" />
        <span className="particle particle-5" />
      </div>
    </div>
  );
};

export default BackgroundAura;
