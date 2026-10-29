'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './site.module.css';

/**
 * The four order steps on a road. Once the road scrolls into view the delivery truck
 * drives along it, and each step lights up as the truck passes it.
 */
export function OrderRoad({ steps }: { steps: { title: string; text: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const drive = 3.6; // seconds, matches the CSS
  return (
    <div ref={ref} className={`${styles.road} ${on ? styles.roadOn : ''}`}>
      <div className={styles.roadLine} aria-hidden="true" />
      <svg className={styles.truck} viewBox="0 0 74 40" aria-hidden="true">
        <path d="M50 12 H62 L70 22 V32 H50 Z" fill="#c61f2a" />
        <rect x="54" y="15" width="8" height="7" rx="1" fill="#e6eaee" />
        <rect x="2" y="26" width="48" height="6" fill="#13222e" />
        {[6, 16, 26, 36].map((x) => (
          <rect key={x} x={x} y="10" width="8" height="16" rx="3" fill="#1e5ba8" />
        ))}
        <circle cx="14" cy="34" r="5" fill="#13222e" />
        <circle cx="60" cy="34" r="5" fill="#13222e" />
        <circle cx="14" cy="34" r="2" fill="#c3cbd2" />
        <circle cx="60" cy="34" r="2" fill="#c3cbd2" />
      </svg>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          // Lights up when the truck reaches the middle of this step's column.
          <li key={s.title} className={styles.step} style={{ '--lit-at': `${0.2 + drive * ((i + 0.5) / steps.length)}s` } as React.CSSProperties}>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
