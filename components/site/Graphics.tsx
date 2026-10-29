import React from 'react';
import styles from './site.module.css';

/** The delivery truck that drives into the hero and parks before the cylinders are unloaded. */
export function HeroTruck() {
  return (
    <svg className={styles.heroTruck} viewBox="0 0 220 110" aria-hidden="true">
      {/* exhaust puffs while it drives in */}
      <g className={styles.exhaust}>
        <circle cx="10" cy="86" r="5" />
        <circle cx="2" cy="80" r="4" />
      </g>
      {/* flatbed */}
      <rect x="14" y="70" width="128" height="12" rx="2" fill="#13222e" />
      <rect x="14" y="40" width="6" height="32" fill="#13222e" />
      {/* cylinders still on the bed */}
      {[26, 48, 70, 92, 114].map((x, i) => (
        <g key={x}>
          <rect x={x} y="34" width="18" height="36" rx="7" fill={i % 2 ? '#1e5ba8' : '#c61f2a'} />
          <rect x={x + 5} y="28" width="8" height="8" rx="2" fill="#13222e" />
        </g>
      ))}
      {/* hazard stripe on the bed edge */}
      <rect x="14" y="80" width="128" height="4" fill="url(#hz)" />
      <defs>
        <pattern id="hz" width="8" height="4" patternUnits="userSpaceOnUse" patternTransform="skewX(-45)">
          <rect width="4" height="4" fill="#f5c518" />
          <rect x="4" width="4" height="4" fill="#13222e" />
        </pattern>
      </defs>
      {/* cab */}
      <path d="M146 40 H182 Q188 40 191 45 L206 66 Q208 69 208 73 V88 H146 Z" fill="#c61f2a" />
      <path d="M156 46 H180 Q184 46 186 49 L196 64 H156 Z" fill="#cfe1f2" />
      <rect x="146" y="74" width="62" height="5" fill="#9e1620" />
      <rect x="200" y="78" width="10" height="6" rx="2" fill="#f5c518" />
      {/* wheels */}
      {[42, 118, 182].map((cx) => (
        <g key={cx} className={styles.wheel} style={{ transformOrigin: `${cx}px 90px` }}>
          <circle cx={cx} cy="90" r="13" fill="#13222e" />
          <circle cx={cx} cy="90" r="5" fill="#c3cbd2" />
          <rect x={cx - 1.5} y="79" width="3" height="22" fill="#5b6b77" />
        </g>
      ))}
    </svg>
  );
}

/**
 * Pressure gauge: the needle sweeps to "Full" when its row scrolls into view
 * (the row carries `data-reveal`; CSS rotates the needle once it gets `data-in`).
 */
export function Gauge() {
  return (
    <svg className={styles.gauge} viewBox="0 0 120 72" aria-hidden="true">
      <path d="M12 64 A48 48 0 0 1 108 64" fill="none" stroke="#e6eaee" strokeWidth="12" strokeLinecap="round" />
      <path d="M12 64 A48 48 0 0 1 36 22" fill="none" stroke="#c61f2a" strokeWidth="12" strokeLinecap="round" />
      <path d="M84 22 A48 48 0 0 1 108 64" fill="none" stroke="#1f9d55" strokeWidth="12" strokeLinecap="round" />
      <g className={styles.needle}>
        <line x1="60" y1="64" x2="60" y2="22" stroke="#13222e" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx="60" cy="64" r="6" fill="#13222e" />
      <text x="12" y="71" fontSize="9" fill="#5b6b77">E</text>
      <text x="101" y="71" fontSize="9" fill="#5b6b77">F</text>
    </svg>
  );
}

/** A lit LPG burner: the clean blue flame of gas burning right. */
export function Flame() {
  return (
    <svg className={styles.flameArt} viewBox="0 0 160 150" aria-hidden="true">
      <g className={styles.flames}>
        {[30, 55, 80, 105, 130].map((x, i) => (
          <g key={x} className={styles.flameTongue} style={{ animationDelay: `${i * 110}ms`, transformOrigin: `${x}px 96px` }}>
            <path d={`M${x} 96 C${x - 13} 78 ${x - 7} 58 ${x} 38 C${x + 7} 58 ${x + 13} 78 ${x} 96 Z`} fill="#2f7de1" />
            <path d={`M${x} 96 C${x - 7} 84 ${x - 4} 72 ${x} 60 C${x + 4} 72 ${x + 7} 84 ${x} 96 Z`} fill="#bfe0ff" />
          </g>
        ))}
      </g>
      {/* burner ring */}
      <ellipse cx="80" cy="100" rx="66" ry="12" fill="#13222e" />
      <ellipse cx="80" cy="97" rx="58" ry="7" fill="#3d4f5c" />
      <rect x="22" y="110" width="116" height="14" rx="4" fill="#3d4f5c" />
      <rect x="40" y="124" width="10" height="20" fill="#3d4f5c" />
      <rect x="110" y="124" width="10" height="20" fill="#3d4f5c" />
    </svg>
  );
}
