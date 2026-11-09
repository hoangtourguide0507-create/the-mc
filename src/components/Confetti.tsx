import React, { useMemo } from 'react';

const COLORS = ['#F2B84B', '#7FBF6A', '#E0643E', '#3E9B94', '#F7C35C', '#9FD68A'];

interface ConfettiProps {
  /** Increase this number to fire a new burst. 0 renders nothing. */
  trigger: number;
  /** Pieces per burst. */
  count?: number;
}

/**
 * Pure-CSS confetti burst (no canvas, no dependency).
 * Each trigger value change regenerates the pieces under a new key,
 * so the same component can fire two bursts one after another.
 */
export const Confetti: React.FC<ConfettiProps> = ({ trigger, count = 60 }) => {
  const pieces = useMemo(() => {
    if (trigger <= 0) return [];
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.random() * 1.6 + 0.2) * Math.PI; // upward fan
      const dist = 90 + Math.random() * 120;
      return {
        id: i,
        color: COLORS[i % COLORS.length],
        dx: `${Math.cos(angle) * dist * (Math.random() < 0.5 ? -1 : 1)}px`,
        dy: `${-Math.abs(Math.sin(angle)) * dist - 40}px`,
        rot: `${Math.round(Math.random() * 720 - 360)}deg`,
        delay: `${Math.round(Math.random() * 120)}ms`,
        w: 6 + Math.round(Math.random() * 6),
        h: 8 + Math.round(Math.random() * 8),
        round: Math.random() < 0.3,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, count]);

  if (pieces.length === 0) return null;

  return (
    <div key={trigger} className="pointer-events-none absolute left-1/2 top-24 z-10 h-0 w-0">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute block animate-confetti-burst"
          style={
            {
              width: p.w,
              height: p.h,
              background: p.color,
              borderRadius: p.round ? '9999px' : '2px',
              animationDelay: p.delay,
              '--dx': p.dx,
              '--dy': p.dy,
              '--rot': p.rot,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
