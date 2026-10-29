import React, { useId } from 'react';
import styles from './site.module.css';

/**
 * An LPG cylinder drawn to scale: foot ring, body, shoulder, guard ring with hand holes
 * and the valve. The gas level inside fills on page load (`delay` staggers the line-up).
 */
export function Cylinder({ height, color, label, delay = 0 }: { height: number; color: string; label: string; delay?: number }) {
  const id = useId().replace(/:/g, '');
  // Wider as it gets bigger, but not in proportion: real cylinders grow mostly in height.
  const width = Math.round(height * 0.5);
  return (
    <div className={`${styles.cylinder} ${styles.rise}`} style={{ animationDelay: `${delay}ms`, maxWidth: width, flexBasis: width }}>
      <svg viewBox="0 0 100 200" width={width} height={height} role="img" aria-label={`${label} cylinder`}>
        <defs>
          <clipPath id={`body-${id}`}>
            <path d="M14 70 C14 46 30 36 50 36 C70 36 86 46 86 70 L86 176 Q86 184 78 184 L22 184 Q14 184 14 176 Z" />
          </clipPath>
          <linearGradient id={`shine-${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.22" stopColor="#fff" stopOpacity="0.32" />
            <stop offset="0.34" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        {/* foot ring */}
        <rect x="20" y="182" width="60" height="14" rx="3" fill="#13222e" />
        {/* empty body (steel) */}
        <path d="M14 70 C14 46 30 36 50 36 C70 36 86 46 86 70 L86 176 Q86 184 78 184 L22 184 Q14 184 14 176 Z" fill="#c3cbd2" />
        {/* gas level — the painted body, filling from the bottom */}
        <g clipPath={`url(#body-${id})`}>
          <rect className={styles.fill} style={{ animationDelay: `${delay + 450}ms` }} x="0" y="30" width="100" height="160" fill={color} />
          {/* vapour bubbles rising in the full cylinder */}
          <g className={styles.bubbles}>
            {[
              [30, 176, 3, 1.9],
              [58, 180, 2.4, 2.6],
              [72, 172, 2, 3.3],
              [44, 178, 1.8, 4.1],
            ].map(([cx, cy, r, s]) => (
              <circle key={cx} cx={cx} cy={cy} r={r} style={{ animationDelay: `${delay / 1000 + s}s` }} />
            ))}
          </g>
        </g>
        {/* shine */}
        <path d="M14 70 C14 46 30 36 50 36 C70 36 86 46 86 70 L86 176 Q86 184 78 184 L22 184 Q14 184 14 176 Z" fill={`url(#shine-${id})`} />
        {/* weld seam */}
        <line x1="14" y1="112" x2="86" y2="112" stroke="#13222e" strokeOpacity="0.18" strokeWidth="1.5" />
        {/* guard ring with hand holes */}
        <path d="M24 40 L24 14 Q24 8 30 8 L70 8 Q76 8 76 14 L76 40" fill="none" stroke="#13222e" strokeWidth="6" strokeLinejoin="round" />
        <rect x="34" y="16" width="32" height="9" rx="4.5" fill="#13222e" />
        {/* valve */}
        <rect x="44" y="24" width="12" height="14" rx="2" fill="#5b6b77" />
        <rect x="40" y="20" width="20" height="5" rx="2" fill="#13222e" />
        {/* weight stencilled on the body */}
        <text x="50" y="150" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" style={{ fontFamily: 'var(--font-site-display), sans-serif' }}>
          {label}
        </text>
      </svg>
    </div>
  );
}
